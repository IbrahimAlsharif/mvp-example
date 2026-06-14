"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PrivacyCircle } from "@prisma/client";
import {
  ArrowRight,
  ImagePlus,
  Sparkles,
  MapPin,
  CalendarDays,
  X,
  Image as ImageIcon,
  Film,
  Mic,
  FileText,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { CircleSelector } from "@/components/CircleSelector";
import { uploadFile, newUploadKey, UploadError } from "@/lib/media/client-upload";
import { readExif } from "@/lib/media/exif";
import { dayKey } from "@/lib/events/date";

type Item = {
  name: string;
  type: string;
  status: "uploading" | "persisted" | "failed";
  publicId?: string;
  previewUrl?: string;
};

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
  // Default to the user's LOCAL date, not UTC. `new Date().toISOString()` is
  // UTC, so just after local midnight in a positive-offset timezone it yields
  // yesterday — silently dating a new memory to the wrong day. dayKey() uses
  // local Y/M/D, matching how the timeline groups events.
  const [date, setDate] = useState(() => dayKey(new Date()));
  const [circle, setCircle] = useState<PrivacyCircle>("ME_ONLY"); // G1 default
  const [legacyConsent, setLegacyConsent] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dateFromPhoto, setDateFromPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI compose state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiStub, setAiStub] = useState(false);

  const uploading = items.some((i) => i.status === "uploading");
  const hasMedia = items.length > 0;
  const persistedIds = items.filter((i) => i.status === "persisted").map((i) => i.publicId!);
  const canSave = !uploading && !submitting && (note.trim().length > 0 || persistedIds.length > 0);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const idx = items.length;
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      setItems((prev) => [...prev, { name: file.name, type: file.type, status: "uploading", previewUrl }]);

      // Auto-fill date + location from the photo's own metadata (no manual step).
      readExif(file).then((exif) => {
        if (exif.lat != null && exif.lng != null) setLocation({ lat: exif.lat, lng: exif.lng });
        if (exif.date) {
          setDate(exif.date);
          setDateFromPhoto(true);
        }
      });

      try {
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

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function runAi(mode: "generate" | "improve") {
    const text = mode === "generate" ? aiPrompt.trim() : note.trim();
    if (!text) return;
    setAiBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, text, date, hasMedia }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("ai_failed");
        return;
      }
      setAiSuggestion(data.text);
      setAiStub(data.engine === "stub");
    } catch {
      setError("ai_failed");
    } finally {
      setAiBusy(false);
    }
  }

  function applyAi() {
    if (aiSuggestion) setNote(aiSuggestion);
    setAiSuggestion(null);
    setAiPrompt("");
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
        location, // auto-extracted from photo EXIF, or null
        submitKey: newUploadKey(),
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
    <main className="relative mx-auto min-h-screen max-w-2xl px-5 py-8 sm:py-12">
      <div className="aurora" aria-hidden />

      <header className="mb-7 flex items-center gap-3">
        <Link
          href="/timeline"
          className="tap-target flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-neutral-700 backdrop-blur transition-all hover:bg-white/80"
          aria-label={t("back")}
        >
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
        <div className="flex flex-col">
          <h1 className="bg-brand-gradient bg-clip-text text-2xl font-extrabold text-transparent">
            {t("newTitle")}
          </h1>
          <p className="text-sm text-neutral-500">{t("newSubtitle")}</p>
        </div>
      </header>

      <div className="glass animate-fade-in-up flex flex-col gap-6 rounded-3xl p-6 sm:p-8">
        {/* Note + AI compose */}
        <section className="flex flex-col gap-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder={t("notePlaceholder")}
            data-testid="note-input"
            className="glass-inset w-full rounded-2xl p-4 text-neutral-800 shadow-sm outline-none transition-all placeholder:text-neutral-400 focus:ring-4 focus:ring-brand/20"
          />

          <div className="rounded-2xl border border-brand/20 bg-brand-50/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-700">
              <Sparkles className="h-4 w-4" aria-hidden />
              {t("aiTitle")}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t("aiPromptPlaceholder")}
                data-testid="ai-prompt"
                className="glass-inset min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:ring-4 focus:ring-brand/20"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => runAi("generate")}
                  disabled={aiBusy || !aiPrompt.trim()}
                  data-testid="ai-generate"
                  className="tap-target inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-brand transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {t("aiGenerate")}
                </button>
                <button
                  type="button"
                  onClick={() => runAi("improve")}
                  disabled={aiBusy || !note.trim()}
                  data-testid="ai-improve"
                  className="tap-target inline-flex items-center justify-center rounded-xl border border-brand/30 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-40"
                >
                  {t("aiImprove")}
                </button>
              </div>
            </div>

            {aiSuggestion && (
              <div className="animate-fade-in mt-3 rounded-xl border border-white/70 bg-white/60 p-3" data-testid="ai-suggestion">
                <p className="whitespace-pre-wrap text-sm text-neutral-800">{aiSuggestion}</p>
                {aiStub && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-neutral-500">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {t("aiStubNote")}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={applyAi}
                    data-testid="ai-apply"
                    className="tap-target inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <Check className="h-3.5 w-3.5" /> {t("aiApply")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSuggestion(null)}
                    className="tap-target rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-white/60"
                  >
                    {t("aiDiscard")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Media — type is detected from the file, no manual picker */}
        <section className="flex flex-col gap-3">
          <label
            className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand/30 bg-brand-50/30 p-7 text-center transition-all hover:border-brand/60 hover:bg-brand-50/60"
            data-testid="dropzone"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-brand transition-transform group-hover:-translate-y-0.5">
              <ImagePlus className="h-6 w-6" aria-hidden />
            </span>
            <span className="font-semibold text-neutral-700">{t("dropHint")}</span>
            <span className="text-xs text-neutral-500">{t("dropSub")}</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,video/mp4,audio/wav,audio/mpeg"
              onChange={(e) => onFiles(e.target.files)}
              data-testid="file-input"
              className="hidden"
            />
          </label>

          {items.length > 0 && (
            <ul className="grid grid-cols-3 gap-3" data-testid="media-grid">
              {items.map((it, i) => (
                <li
                  key={i}
                  data-testid={`media-item-${it.status}`}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-white/60 bg-neutral-100 shadow-sm"
                >
                  {it.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.previewUrl} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-400" aria-hidden>
                      <MediaKindIcon type={it.type} />
                    </div>
                  )}
                  <span
                    className={`absolute bottom-1.5 start-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white ${
                      it.status === "persisted" ? "bg-emerald-500" : it.status === "failed" ? "bg-red-500" : "bg-neutral-500"
                    }`}
                  >
                    {it.status === "persisted" ? (
                      <Check className="h-3 w-3" />
                    ) : it.status === "failed" ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    aria-label={t("removeMedia")}
                    className="absolute top-1.5 end-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Date + auto-detected location (read from the photo, editable date) */}
        <section className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/40 px-3 py-2.5">
            <CalendarDays className="h-4 w-4 text-neutral-500" aria-hidden />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setDateFromPhoto(false);
              }}
              data-testid="date-input"
              className="bg-transparent text-sm text-neutral-800 outline-none"
            />
          </label>
          {dateFromPhoto && (
            <span className="text-xs text-neutral-500">{t("dateFromPhoto")}</span>
          )}
          {location && (
            <span className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-medium text-emerald-700" data-testid="location-badge">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {t("locationFromPhoto")}
            </span>
          )}
        </section>

        {/* Privacy */}
        <CircleSelector value={circle} onChange={setCircle} hasMedia={hasMedia} />

        <label className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/40 p-4">
          <input
            type="checkbox"
            checked={legacyConsent}
            onChange={(e) => setLegacyConsent(e.target.checked)}
            className="h-5 w-5 accent-brand"
          />
          <span className="text-sm text-neutral-700">{t("legacyConsent")}</span>
        </label>

        {error && (
          <p role="alert" className="animate-fade-in rounded-2xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          onClick={onSave}
          disabled={!canSave}
          data-testid="save-event"
          className="tap-target inline-flex items-center justify-center rounded-2xl bg-accent-gradient px-8 py-3.5 font-bold text-white shadow-accent transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {submitting ? t("saving") : uploading ? t("uploadPending") : t("save")}
        </button>
      </div>
    </main>
  );
}

function MediaKindIcon({ type }: { type: string }) {
  if (type.startsWith("video/")) return <Film className="h-7 w-7" />;
  if (type.startsWith("audio/")) return <Mic className="h-7 w-7" />;
  if (type.startsWith("image/")) return <ImageIcon className="h-7 w-7" />;
  return <FileText className="h-7 w-7" />;
}
