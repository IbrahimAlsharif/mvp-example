"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  // Dialog plumbing (FEAT-SMO F6): a labelled, focus-trapped, ESC-closable modal
  // — matching the sibling EventModal's standard so the two dialogs are
  // consistent and keyboard/SR-operable.
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

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

  // Move focus into the dialog on open so keyboard/SR users land inside it.
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // ESC closes; Tab is trapped within the dialog (forward + back wrap).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

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
    // Structured place: a typed place is stored on its own placeName column
    // (J2.4) — no longer folded into the note text.
    const placeName = place.trim() || null;
    const cleanNote = note.trim() || null;

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: cleanNote,
          occurredOn,
          circle,
          legacyConsent: false,
          mediaPublicIds: persistedIds,
          location,
          placeName,
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
        note: cleanNote,
        occurredOn,
        circle,
        media: persistedIds.map((publicId) => ({ publicId })),
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        placeName,
      });
    } catch {
      setError("save_failed");
      setSubmitting(false);
    }
  }

  // Desktop: place the card on the opposite vertical side from where a node
  // bubble would sit, clamped horizontally so it never spills off the rail
  // edges. Exposed as CSS vars so the rail-anchored position applies ONLY at
  // sm+ (see the sm: utilities below); on phones the dialog is a fixed,
  // scrollable bottom sheet instead, so its Save button is always reachable
  // (FEAT-SMO F4).
  const anchorStyle = {
    "--qa-left": `clamp(9rem, ${anchor.xPct * 100}%, calc(100% - 9rem))`,
    "--qa-y": "calc(50% + 3.5rem)",
  } as React.CSSProperties;
  // On desktop, open above the click point (when a node bubble sits below) or
  // below it (default) — mirrors the prior anchor.up behavior.
  const anchorEdge = anchor.up ? "sm:[inset-block-end:var(--qa-y)]" : "sm:[inset-block-start:var(--qa-y)]";

  return (
    <>
      {/* click-away scrim — dimmed on mobile (it's a modal sheet), transparent
          on desktop (keeps the timeline visible behind the rail-anchored card) */}
      <div
        className="fixed inset-0 z-20 bg-cosmic-bg/50 backdrop-blur-sm sm:absolute sm:bg-transparent sm:backdrop-blur-none"
        onClick={onClose}
        data-testid="quick-add-scrim"
      />
      <div
        ref={dialogRef}
        className={`cosmic-panel fixed inset-x-3 bottom-3 z-30 max-h-[85vh] w-auto overflow-y-auto rounded-2xl p-3 shadow-glow-blue sm:absolute sm:inset-x-auto sm:bottom-auto sm:max-h-none sm:w-[19rem] sm:-translate-x-1/2 sm:overflow-visible sm:[inset-inline-start:var(--qa-left)] ${anchorEdge}`}
        style={anchorStyle}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="quick-add-popup"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-extrabold text-cosmic-ink">
              {t("quickAddTitle")}
            </h3>
            <p className="truncate text-[13px] text-cosmic-muted">
              {t("quickAddAt")} {dateLabel}
            </p>
          </div>
          <button
            ref={firstFieldRef}
            type="button"
            onClick={onClose}
            aria-label={t("quickAddCancel")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cosmic-border text-cosmic-muted transition-colors hover:bg-cosmic-surface2 focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* time */}
        <label className="mb-2 flex items-center gap-2">
          <span className="w-12 shrink-0 text-[13px] font-bold text-cosmic-muted">{t("quickAddTime")}</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="min-h-[44px] flex-1 rounded-lg border border-cosmic-border bg-cosmic-surface/60 px-2 py-2 text-sm tabular-nums text-cosmic-ink focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
            data-testid="quick-add-time"
          />
        </label>

        {/* place */}
        <label className="mb-2 flex items-center gap-2">
          <span className="flex w-12 shrink-0 items-center gap-1 text-[13px] font-bold text-cosmic-muted">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {t("quickAddPlace")}
          </span>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder={t("quickAddPlacePlaceholder")}
            className="min-h-[44px] flex-1 rounded-lg border border-cosmic-border bg-cosmic-surface/60 px-2 py-2 text-sm text-cosmic-ink placeholder:text-cosmic-muted focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
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
          className="mb-2 w-full resize-none rounded-lg border border-cosmic-border bg-cosmic-surface/60 px-2.5 py-2 text-sm text-cosmic-ink placeholder:text-cosmic-muted focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
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
          className="mb-2 flex min-h-[44px] w-full items-center justify-center gap-3 rounded-lg border border-dashed border-cosmic-border py-2 text-[13px] font-bold text-cosmic-muted transition-colors hover:bg-cosmic-surface2 hover:text-cosmic-ink focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
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
          <p className="mb-2 text-[13px] font-bold text-rose-400" role="alert">
            {t("quickAddFailed")}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            data-testid="quick-add-save"
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-cosmic-blue px-3 py-2.5 text-sm font-bold text-white shadow-glow-blue transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60 disabled:translate-y-0 disabled:opacity-40"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {submitting ? t("quickAddSaving") : t("quickAddSave")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-cosmic-border px-3 py-2.5 text-sm font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2 focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
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
