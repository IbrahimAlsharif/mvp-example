"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PrivacyCircle } from "@prisma/client";
import { CircleSelector } from "@/components/CircleSelector";
import { uploadFile, newUploadKey, UploadError } from "@/lib/media/client-upload";

type Item = { name: string; status: "uploading" | "persisted" | "failed"; publicId?: string };

export default function NewEventPage() {
  return (
    <Suspense>
      <NewEventInner />
    </Suspense>
  );
}

function NewEventInner() {
  const t = useTranslations("event");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [circle, setCircle] = useState<PrivacyCircle>("ME_ONLY"); // G1 default
  const [legacyConsent, setLegacyConsent] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploading = items.some((i) => i.status === "uploading");
  const hasMedia = items.length > 0;
  const persistedIds = items.filter((i) => i.status === "persisted").map((i) => i.publicId!);
  const canSave = !uploading && !submitting && (note.trim().length > 0 || persistedIds.length > 0);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const idx = items.length;
      setItems((prev) => [...prev, { name: file.name, status: "uploading" }]);
      try {
        // Confirm only after verified persistence (US-1.2 contract).
        const { publicId } = await uploadFile(file, { uploadKey: newUploadKey() });
        setItems((prev) =>
          prev.map((it, i) => (i === idx ? { ...it, status: "persisted", publicId } : it)),
        );
      } catch (e) {
        const reason = e instanceof UploadError ? e.message : "failed";
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, status: "failed" } : it)));
        setError(reason);
      }
    }
  }

  async function onSave() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: note.trim() || null,
        occurredOn: new Date(date + "T12:00:00.000Z").toISOString(),
        circle,
        legacyConsent,
        mediaPublicIds: persistedIds,
        submitKey: newUploadKey(), // idempotent submit key
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      router.push("/timeline?saved=1");
      router.refresh();
      return;
    }
    setError("save_failed");
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/timeline"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-600 transition-colors hover:border-brand hover:text-brand-700"
          aria-label="رجوع"
        >
          ←
        </Link>
        <h1 className="text-2xl font-extrabold text-neutral-900">{t("newTitle")}</h1>
      </div>

      <div className="animate-fade-in-up rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-card sm:p-7">
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-neutral-700">{t("note")}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="rounded-xl border border-neutral-300 bg-white p-3 shadow-sm transition-all duration-200 outline-none hover:border-neutral-400 focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-neutral-700">{t("date")}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-neutral-300 bg-white p-2.5 shadow-sm transition-all duration-200 outline-none hover:border-neutral-400 focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-neutral-700">{t("uploadPending")}</span>
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500 transition-colors hover:border-brand hover:bg-brand-50">
              <span className="text-2xl" aria-hidden>📎</span>
              <span>اسحب الملفات أو اضغط للاختيار</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,video/mp4,audio/wav,audio/mpeg"
                onChange={(e) => onFiles(e.target.files)}
                data-testid="file-input"
                className="hidden"
              />
            </label>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {items.map((it, i) => (
                <li
                  key={i}
                  data-testid={`media-item-${it.status}`}
                  className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-1.5 text-neutral-700"
                >
                  <span aria-hidden>
                    {it.status === "persisted" ? "✅" : it.status === "failed" ? "⚠️" : "⏳"}
                  </span>
                  <span className="flex-1 truncate">{it.name}</span>
                  <span className="text-xs text-neutral-400">{it.status}</span>
                </li>
              ))}
            </ul>
          </div>

          <CircleSelector value={circle} onChange={setCircle} hasMedia={hasMedia} />

          <label className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3">
            <input
              type="checkbox"
              checked={legacyConsent}
              onChange={(e) => setLegacyConsent(e.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            <span className="text-sm text-neutral-700">
              السماح بإدراج هذه الذكرى ضمن الإرث الرقمي مستقبلًا
            </span>
          </label>

          {error && (
            <p role="alert" className="animate-fade-in rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            onClick={onSave}
            disabled={!canSave}
            data-testid="save-event"
            className="inline-flex items-center justify-center rounded-xl bg-accent-gradient px-5 py-3 font-bold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {submitting ? t("saving") : uploading ? t("uploadPending") : t("save")}
          </button>
        </div>
      </div>
    </main>
  );
}
