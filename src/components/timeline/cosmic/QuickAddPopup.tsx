"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PrivacyCircle } from "@prisma/client";
import { ImagePlus, Film, Mic, FileText, X, Loader2, MapPin } from "lucide-react";
import { CircleSelector } from "@/components/CircleSelector";
import { uploadFile, newUploadKey, UploadError } from "@/lib/media/client-upload";
import { readExif } from "@/lib/media/exif";
import type { EventVM } from "@/lib/events/view";

/**
 * Quick-add popup for the cosmic timeline (FEAT-FNO).
 *
 * Opened by clicking the rail at a chosen instant. The popup is PRE-FILLED with
 * the date+time the cursor landed on (the click maps a rail position back to a
 * real timestamp), and lets the user adjust the time, add a place, and attach
 * content of any kind — text, images, video, audio, or all together — or just a
 * note. It saves through the same atomic `/api/events` path as the full form,
 * then hands the freshly-saved event back so the timeline can render it directly
 * without a round-trip refresh.
 */

type Item = {
  name: string;
  type: string;
  status: "uploading" | "persisted" | "failed";
  publicId?: string;
  previewUrl?: string;
};

const ACCEPT = "image/*,video/*,audio/*";

export function QuickAddPopup({
  /** The instant the user clicked on the rail, as an ISO string. */
  atISO,
  /** Pixel anchor of the click within the rail, for popup placement. */
  anchor,
  onClose,
  onSaved,
}: {
  atISO: string;
  anchor: { xPct: number; up: boolean };
  onClose: () => void;
  onSaved: (event: EventVM) => void;
}) {
  const t = useTranslations("cosmic");
  const fileRef = useRef<HTMLInputElement>(null);

  // Date is fixed by the click; time is editable (defaults to the clicked time).
  const at = new Date(atISO);
  const [time, setTime] = useState(() => at.toISOString().slice(11, 16)); // HH:mm (UTC)
  const dateLabel = at.toLocaleDateString("ar", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [note, setNote] = useState("");
  const [place, setPlace] = useState("");
  const [circle, setCircle] = useState<PrivacyCircle>("ME_ONLY"); // G1 default
  const [items, setItems] = useState<Item[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploading = items.some((i) => i.status === "uploading");
  const persistedIds = items.filter((i) => i.status === "persisted").map((i) => i.publicId!);
  const canSave = !uploading && !submitting && (note.trim().length > 0 || persistedIds.length > 0);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const idx = items.length;
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      setItems((prev) => [...prev, { name: file.name, type: file.type, status: "uploading", previewUrl }]);

      // Pull a coordinate from the photo's EXIF if the user hasn't typed a place
      // pin — keeps the quick-add flow as low-friction as the full form.
      readExif(file).then((exif) => {
        if (exif.lat != null && exif.lng != null) setLocation((l) => l ?? { lat: exif.lat!, lng: exif.lng! });
      });

      try {
        const { publicId } = await uploadFile(file, { uploadKey: newUploadKey() });
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, status: "persisted", publicId } : it)));
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

  async function onSave() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    // Compose the absolute instant from the clicked date + the (editable) time.
    const occurredOn = new Date(`${atISO.slice(0, 10)}T${time}:00.000Z`).toISOString();
    // Fold a typed place into the note so it's preserved even though the event
    // model only stores free-text + coordinates (no separate place field).
    const composedNote = place.trim()
      ? `${note.trim()}${note.trim() ? "\n" : ""}📍 ${place.trim()}`.trim()
      : note.trim();

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: composedNote || null,
          occurredOn,
          circle,
          legacyConsent: false,
          mediaPublicIds: persistedIds,
          location,
          submitKey: newUploadKey(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError("save_failed");
        setSubmitting(false);
        return;
      }
      // Hand the saved event straight back so the rail renders it immediately.
      onSaved({
        id: data.eventId,
        note: composedNote || null,
        occurredOn,
        circle,
        media: persistedIds.map((publicId) => ({ publicId })),
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      });
    } catch {
      setError("save_failed");
      setSubmitting(false);
    }
  }

  // Place the card on the opposite vertical side from where a node bubble would
  // sit, and clamp horizontally so it never spills off the rail edges.
  const left = `clamp(9rem, ${anchor.xPct * 100}%, calc(100% - 9rem))`;

  return (
    <>
      {/* click-away scrim (transparent — keeps the timeline visible behind) */}
      <div className="absolute inset-0 z-20" onClick={onClose} data-testid="quick-add-scrim" />
      <div
        className="cosmic-panel absolute z-30 w-[19rem] -translate-x-1/2 rounded-2xl p-3 shadow-glow-blue"
        style={{ left, [anchor.up ? "bottom" : "top"]: "calc(50% + 3.5rem)" }}
        dir="rtl"
        role="dialog"
        aria-label={t("quickAddTitle")}
        data-testid="quick-add-popup"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-cosmic-ink">{t("quickAddTitle")}</h3>
            <p className="truncate text-[11px] text-cosmic-muted">
              {t("quickAddAt")} {dateLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("quickAddCancel")}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cosmic-border text-cosmic-muted transition-colors hover:bg-cosmic-surface2"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* time */}
        <label className="mb-2 flex items-center gap-2">
          <span className="w-12 shrink-0 text-[11px] font-bold text-cosmic-muted">{t("quickAddTime")}</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="flex-1 rounded-lg border border-cosmic-border bg-cosmic-surface/60 px-2 py-1.5 text-xs tabular-nums text-cosmic-ink focus:outline-none focus:ring-1 focus:ring-cosmic-blue/60"
            data-testid="quick-add-time"
          />
        </label>

        {/* place */}
        <label className="mb-2 flex items-center gap-2">
          <span className="flex w-12 shrink-0 items-center gap-1 text-[11px] font-bold text-cosmic-muted">
            <MapPin className="h-3 w-3" aria-hidden /> {t("quickAddPlace")}
          </span>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder={t("quickAddPlacePlaceholder")}
            className="flex-1 rounded-lg border border-cosmic-border bg-cosmic-surface/60 px-2 py-1.5 text-xs text-cosmic-ink placeholder:text-cosmic-muted focus:outline-none focus:ring-1 focus:ring-cosmic-blue/60"
            data-testid="quick-add-place"
          />
        </label>

        {/* content: note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={t("quickAddNotePlaceholder")}
          data-testid="quick-add-note"
          className="mb-2 w-full resize-none rounded-lg border border-cosmic-border bg-cosmic-surface/60 px-2.5 py-2 text-xs text-cosmic-ink placeholder:text-cosmic-muted focus:outline-none focus:ring-1 focus:ring-cosmic-blue/60"
        />

        {/* content: media (images / video / audio — any kind, or all) */}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
          data-testid="quick-add-files"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mb-2 flex w-full items-center justify-center gap-3 rounded-lg border border-dashed border-cosmic-border py-2 text-[11px] font-bold text-cosmic-muted transition-colors hover:bg-cosmic-surface2 hover:text-cosmic-ink"
          data-testid="quick-add-media-btn"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          <Film className="h-4 w-4" aria-hidden />
          <Mic className="h-4 w-4" aria-hidden />
          <span>{t("quickAddMediaHint")}</span>
        </button>

        {items.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5" data-testid="quick-add-items">
            {items.map((it, i) => (
              <li
                key={i}
                className="group relative flex items-center gap-1 rounded-md border border-cosmic-border bg-cosmic-surface/60 px-1.5 py-1 text-[10px] text-cosmic-ink"
              >
                <KindIcon type={it.type} />
                <span className="max-w-[5rem] truncate">{it.name}</span>
                {it.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin text-cosmic-muted" aria-hidden />}
                {it.status === "failed" && <span className="text-rose-400">!</span>}
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  aria-label={t("removeMedia")}
                  className="text-cosmic-muted hover:text-rose-400"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* circle */}
        <div className="mb-2">
          <CircleSelector value={circle} onChange={setCircle} hasMedia={items.length > 0} />
        </div>

        {error && (
          <p className="mb-2 text-[11px] font-bold text-rose-400" role="alert">
            {t("quickAddFailed")}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            data-testid="quick-add-save"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-cosmic-blue to-cosmic-purple px-3 py-2 text-[11px] font-bold text-white shadow-glow-blue transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {submitting ? t("quickAddSaving") : t("quickAddSave")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-cosmic-border px-3 py-2 text-[11px] font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2"
          >
            {t("quickAddCancel")}
          </button>
        </div>
      </div>
    </>
  );
}

function KindIcon({ type }: { type: string }) {
  const cls = "h-3 w-3 text-cosmic-muted";
  if (type.startsWith("image/")) return <ImagePlus className={cls} aria-hidden />;
  if (type.startsWith("video/")) return <Film className={cls} aria-hidden />;
  if (type.startsWith("audio/")) return <Mic className={cls} aria-hidden />;
  return <FileText className={cls} aria-hidden />;
}
