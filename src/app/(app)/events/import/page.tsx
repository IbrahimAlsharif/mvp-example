"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { uploadFile, newUploadKey, UploadError, computeChecksum } from "@/lib/media/client-upload";
import { readExif } from "@/lib/media/exif";
import { resolveImportDate } from "@/lib/events/import-date";
import { safeEmit } from "@/lib/telemetry";

/**
 * J1 dated bulk import — the highest-leverage activation lever (seed a populated
 * timeline immediately). Per the MVP scope decisions it is co-designed with:
 *   - Me-Only default  (every imported item is ME_ONLY — never over-shared),
 *   - dated            (each item's date is backfilled from its photo's EXIF;
 *                       falls back to today's LOCAL date when EXIF has none),
 *   - no-scan          (content-blind — the client only reads EXIF date/GPS),
 *   - drop-protection  (an item is only counted imported after its event
 *                       commits via the atomic, idempotent /api/events; a failed
 *                       item is reported, never silently dropped).
 */
type ItemResult = "done" | "failed" | "dupskipped";
type Row = {
  name: string;
  status: "pending" | "uploading" | "saving" | "done" | "failed" | "dupskipped";
  date?: string;
  needsReview?: boolean;
  reason?: string;
};

export default function BulkImportPage() {
  const t = useTranslations("import");
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [reconciled, setReconciled] = useState(false);

  const done = rows.filter((r) => r.status === "done").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const dupskipped = rows.filter((r) => r.status === "dupskipped").length;

  function patch(i: number, next: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...next } : r)));
  }

  async function importOne(file: File, i: number): Promise<ItemResult> {
    patch(i, { status: "uploading" });
    // Backfill the original capture date from EXIF; flag implausible/missing
    // dates with a fallback so the item is imported, never dropped (AC-3).
    const exif = await readExif(file);
    const resolved = resolveImportDate(exif.date, Date.now(), new Date());
    patch(i, { date: resolved.date, needsReview: resolved.needsReview });

    let publicId: string;
    try {
      const handle = await uploadFile(file, { uploadKey: newUploadKey() });
      publicId = handle.publicId;
    } catch (e) {
      patch(i, { status: "failed", reason: e instanceof UploadError ? e.message : "upload_failed" });
      return "failed";
    }

    patch(i, { status: "saving" });
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurredOn: new Date(`${resolved.date}T12:00:00.000Z`).toISOString(),
          circle: "ME_ONLY", // import default — never over-share (G1)
          legacyConsent: false, // per-item consent recorded at ingest, not-yet-released (G5)
          mediaPublicIds: [publicId],
          submitKey: newUploadKey(),
          // Geo-minimization (AC-13): do NOT auto-carry embedded GPS into an
          // imported item — location stays empty/non-default-visible at ingest.
          location: null,
        }),
      });
      if (!res.ok) {
        patch(i, { status: "failed", reason: `save_${res.status}` });
        return "failed";
      }
      patch(i, { status: "done" });
      return "done";
    } catch {
      patch(i, { status: "failed", reason: "save_failed" });
      return "failed";
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setRows(list.map((f) => ({ name: f.name, status: "pending" })));
    setRunning(true);
    setReconciled(false);
    const hasVideo = list.some((f) => f.type.startsWith("video/"));
    // bulk_import_started: structural count only (G4) — no filenames/content.
    safeEmit("bulk_import_started", { selected_count: list.length, has_video: hasVideo });

    // Cross-session/device dedupe (AC-9): hash each file and ask the server which
    // checksums already exist on this account's timeline, BEFORE uploading, so a
    // re-imported library is skipped (not silently discarded, not duplicated).
    const checksums = await Promise.all(list.map((f) => computeChecksum(f)));
    let duplicates = new Set<string>();
    try {
      const res = await fetch("/api/import/dedupe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checksums }),
      });
      if (res.ok) duplicates = new Set<string>((await res.json()).duplicates ?? []);
    } catch {
      // Dedupe is best-effort; a failure just means no items are pre-skipped.
    }

    // Sequential per-item: each commits before the next (legible drop-protection).
    let imported = 0;
    let failedCount = 0;
    let dupCount = 0;
    let exifDates = 0;
    let fallbackDates = 0;
    for (let i = 0; i < list.length; i++) {
      if (duplicates.has(checksums[i])) {
        patch(i, { status: "dupskipped" });
        dupCount++;
        continue;
      }
      const result = await importOne(list[i], i);
      if (result === "done") imported++;
      else failedCount++;
      // Tally date provenance from the row the item just wrote.
      setRows((prev) => {
        const r = prev[i];
        if (r?.needsReview) fallbackDates++;
        else if (r?.status === "done") exifDates++;
        return prev;
      });
      if (result === "failed") {
        safeEmit("bulk_import_item_failed", { failure_reason: "persistence", retry_offered: true });
      }
    }

    // Reconciliation receipt (AC-6): N selected = N imported + N failed + N dup.
    safeEmit("bulk_import_completed", {
      imported_count: imported,
      failed_count: failedCount,
      duplicate_skipped_count: dupCount,
      exif_date_count: exifDates,
      fallback_date_count: fallbackDates,
    });
    safeEmit("bulk_import_reconciled", {
      selected_count: list.length,
      imported_count: imported,
      failed_count: failedCount,
    });
    // Populated-timeline funnel stage on a successful import (US-0.3).
    if (imported > 0) safeEmit("funnel_stage_attained", { stage: "populated_timeline" });
    setReconciled(true);
    setRunning(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8" dir="rtl">
      <Link href="/timeline" className="text-sm text-cosmic-muted hover:underline">
        ← {t("back")}
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold">{t("title")}</h1>
      <p className="mt-1 text-sm text-cosmic-muted">{t("subtitle")}</p>

      <label className="mt-6 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-cosmic-border p-8 text-center hover:bg-cosmic-surface2">
        <span className="text-3xl">🖼️</span>
        <span className="text-sm font-bold">{t("pick")}</span>
        <span className="text-xs text-cosmic-muted">{t("hint")}</span>
        <input
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          disabled={running}
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>

      {rows.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-sm font-bold">
            {t("progress", { done, total: rows.length, failed })}
          </div>
          <ul className="space-y-1 text-sm">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border border-cosmic-border px-3 py-2">
                <span className="truncate">{r.name}</span>
                <span
                  className={
                    r.status === "done"
                      ? "text-emerald-400"
                      : r.status === "failed"
                        ? "text-red-400"
                        : "text-cosmic-muted"
                  }
                >
                  {r.status === "done"
                    ? `✓ ${r.date ?? ""}${r.needsReview ? " ⚑" : ""}`
                    : r.status === "failed"
                      ? `✕ ${r.reason ?? ""}`
                      : r.status === "dupskipped"
                        ? `⊘ ${t("dupSkipped")}`
                        : t(`status_${r.status}` as "status_pending")}
                </span>
              </li>
            ))}
          </ul>

          {/* Reconciliation receipt (AC-6): proves N selected = N imported +
              N failed + N duplicate-skipped, item-accounted — no silent drop. */}
          {reconciled && (
            <div role="status" aria-live="polite" className="mt-4 rounded-xl border border-cosmic-border bg-cosmic-surface/60 p-3 text-sm">
              <p className="font-bold">{t("reconcileTitle")}</p>
              <p className="mt-1 text-cosmic-muted">
                {t("reconcileBody", {
                  selected: rows.length,
                  imported: done,
                  failed,
                  duplicate: dupskipped,
                })}
              </p>
              {rows.some((r) => r.needsReview && r.status === "done") && (
                <p className="mt-1 text-amber-300">{t("reviewFlag")}</p>
              )}
            </div>
          )}

          {!running && (
            <button
              onClick={() => router.push("/timeline")}
              className="mt-5 rounded-xl bg-accent-gradient px-5 py-3 font-bold text-white"
            >
              {t("doneCta", { done })}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
