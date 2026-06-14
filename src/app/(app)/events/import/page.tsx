"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { uploadFile, newUploadKey, UploadError } from "@/lib/media/client-upload";
import { readExif } from "@/lib/media/exif";
import { dayKey } from "@/lib/events/date";
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
type Row = {
  name: string;
  status: "pending" | "uploading" | "saving" | "done" | "failed";
  date?: string;
  reason?: string;
};

export default function BulkImportPage() {
  const t = useTranslations("import");
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  const done = rows.filter((r) => r.status === "done").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  function patch(i: number, next: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...next } : r)));
  }

  async function importOne(file: File, i: number): Promise<boolean> {
    patch(i, { status: "uploading" });
    // Backfill the original capture date from EXIF; fall back to local today.
    const exif = await readExif(file);
    const date = exif.date ?? dayKey(new Date());
    patch(i, { date });

    let publicId: string;
    try {
      const handle = await uploadFile(file, { uploadKey: newUploadKey() });
      publicId = handle.publicId;
    } catch (e) {
      patch(i, { status: "failed", reason: e instanceof UploadError ? e.message : "upload_failed" });
      return false;
    }

    patch(i, { status: "saving" });
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurredOn: new Date(`${date}T12:00:00.000Z`).toISOString(),
          circle: "ME_ONLY", // import default — never over-share
          legacyConsent: false,
          mediaPublicIds: [publicId],
          submitKey: newUploadKey(),
          location: exif.lat != null && exif.lng != null ? { lat: exif.lat, lng: exif.lng } : null,
        }),
      });
      if (!res.ok) {
        patch(i, { status: "failed", reason: `save_${res.status}` });
        return false;
      }
      patch(i, { status: "done" });
      return true;
    } catch {
      patch(i, { status: "failed", reason: "save_failed" });
      return false;
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setRows(list.map((f) => ({ name: f.name, status: "pending" })));
    setRunning(true);
    // import_started carries only the structural item count (G4) — no filenames.
    safeEmit("import_started", { item_count: list.length });
    // Sequential to keep drop-protection legible (each item commits before next).
    let success = 0;
    let dropped = 0;
    for (let i = 0; i < list.length; i++) {
      const ok = await importOne(list[i], i);
      if (ok) success++;
      else dropped++;
    }
    // import_completed reconciles N selected = N succeeded + N dropped (US-0.3
    // taxonomy). A nonzero dropped_count is a durability/trust signal (G2),
    // distinct from telemetry-transport loss. Completing an import attains the
    // populated_timeline funnel stage.
    safeEmit("import_completed", {
      item_count: list.length,
      success_count: success,
      dropped_count: dropped,
    });
    if (success > 0) safeEmit("funnel_stage_attained", { stage: "populated_timeline" });
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
                    ? `✓ ${r.date ?? ""}`
                    : r.status === "failed"
                      ? `✕ ${r.reason ?? ""}`
                      : t(`status_${r.status}` as "status_pending")}
                </span>
              </li>
            ))}
          </ul>

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
