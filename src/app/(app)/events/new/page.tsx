"use client";

import { Suspense, useState } from "react";
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
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-6 text-2xl font-bold">{t("newTitle")}</h1>
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t("note")}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="rounded-lg border border-neutral-300 p-2.5"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">{t("date")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-neutral-300 p-2.5"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm">{t("uploadPending")}</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,video/mp4,audio/wav,audio/mpeg"
            onChange={(e) => onFiles(e.target.files)}
            data-testid="file-input"
          />
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {items.map((it, i) => (
              <li key={i} data-testid={`media-item-${it.status}`} className="text-neutral-700">
                {it.name} — {it.status}
              </li>
            ))}
          </ul>
        </div>

        <CircleSelector value={circle} onChange={setCircle} hasMedia={hasMedia} />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={legacyConsent}
            onChange={(e) => setLegacyConsent(e.target.checked)}
          />
          <span className="text-sm">السماح بإدراج هذه الذكرى ضمن الإرث الرقمي مستقبلًا</span>
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          onClick={onSave}
          disabled={!canSave}
          data-testid="save-event"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-white disabled:opacity-50"
        >
          {submitting ? t("saving") : uploading ? t("uploadPending") : t("save")}
        </button>
      </div>
    </main>
  );
}
