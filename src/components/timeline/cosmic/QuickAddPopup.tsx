"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { PrivacyCircle } from "@prisma/client";
import { X, Loader2, Clock, ImagePlus, Film, Mic, FileText } from "lucide-react";
import { CircleSelector } from "@/components/CircleSelector";
import { MediaCard } from "./MediaCard";
import { uploadFile, newUploadKey, UploadError } from "@/lib/media/client-upload";
import { readExif } from "@/lib/media/exif";
import type { EventVM } from "@/lib/events/view";

/**
 * Moment popup for the cosmic timeline (FEAT-FNO → redesigned in FEAT-JZW).
 *
 * A CENTERED modal titled "لحظة جديدة" opened by the add-now FAB, a rail click,
 * or (later) an edit action. It shows the moment's day, a large note field, three
 * media cards (صورة/فيديو/صوت) each offering live capture AND file upload, the
 * "من يراها؟" privacy row, and footer actions أضف اللحظة + تفاصيل أكثر. It saves
 * through the same atomic `/api/events` path as the full form, anchoring the day
 * at noon UTC like every other create path, then hands the freshly-saved event
 * back so the timeline renders it without a refresh.
 *
 * `occurredOn` is DATE-ONLY in this app (no clock time in the schema — the full
 * form and importer both anchor every event to noon UTC, and the timeline reads
 * instants in UTC to avoid off-by-one date drift), so this popup captures only the
 * day, not a time of day.
 */

type Item = {
  name: string;
  type: string;
  status: "uploading" | "persisted" | "failed";
  publicId?: string;
  previewUrl?: string;
};

export function QuickAddPopup({
  /** The instant the user chose, as an ISO string (create mode). */
  atISO,
  /** When present, the popup is in EDIT mode for this existing moment (FEAT-MRV). */
  event,
  onClose,
  onSaved,
}: {
  atISO: string;
  event?: EventVM;
  onClose: () => void;
  onSaved: (event: EventVM) => void;
}) {
  const t = useTranslations("cosmic");
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const isEdit = !!event;
  // In edit mode the day comes from the event; in create mode from atISO.
  const at = new Date(isEdit ? event!.occurredOn : atISO);
  const dateLabel = at.toLocaleDateString("ar", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const [note, setNote] = useState(isEdit ? (event!.note ?? "") : "");
  // Circle in edit mode is shown but kept as-is (circle changes have their own
  // revocation path via PATCH); the body PUT does not change it.
  const [circle, setCircle] = useState<PrivacyCircle>(isEdit ? event!.circle : "ME_ONLY"); // G1 default
  const [items, setItems] = useState<Item[]>(
    isEdit
      ? event!.media.map((m) => ({ name: m.publicId, type: "image/*", status: "persisted", publicId: m.publicId }))
      : [],
  );
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    isEdit && event!.lat != null && event!.lng != null ? { lat: event!.lat, lng: event!.lng } : null,
  );
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

  // Upload a File (picked OR live-captured) through the shared media pipeline.
  // We append a placeholder item, then mark it persisted/failed by matching the
  // object identity of the entry we added (robust to concurrent uploads, unlike
  // index math when several captures fire back-to-back).
  async function uploadOne(file: File) {
    const entry: Item = {
      name: file.name,
      type: file.type,
      status: "uploading",
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    };
    setItems((prev) => [...prev, entry]);

    // Pull a coordinate from a photo's EXIF if there's no location yet.
    readExif(file).then((exif) => {
      if (exif.lat != null && exif.lng != null) setLocation((l) => l ?? { lat: exif.lat!, lng: exif.lng! });
    });

    try {
      const { publicId } = await uploadFile(file, { uploadKey: newUploadKey() });
      setItems((prev) => prev.map((it) => (it === entry ? { ...it, status: "persisted", publicId } : it)));
    } catch (e) {
      const reason = e instanceof UploadError ? e.message : "failed";
      setItems((prev) => prev.map((it) => (it === entry ? { ...it, status: "failed" } : it)));
      setError(reason);
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) await uploadOne(file);
  }

  function removeItem(target: Item) {
    setItems((prev) => prev.filter((it) => it !== target));
  }

  async function onSave() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    // Anchor the chosen day at noon UTC — the same date-only convention the full
    // form and importer use, so an event sits on the same instant from any path
    // and reads back on the correct day for every viewer. In edit mode the day is
    // preserved from the event being edited.
    const dayISO = isEdit ? event!.occurredOn : atISO;
    const occurredOn = new Date(`${dayISO.slice(0, 10)}T12:00:00.000Z`).toISOString();
    const cleanNote = note.trim() || null;
    const placeName = isEdit ? (event!.placeName ?? null) : null;

    try {
      const res = isEdit
        ? await fetch(`/api/events/${event!.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: cleanNote, occurredOn, mediaPublicIds: persistedIds, location, placeName }),
          })
        : await fetch("/api/events", {
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
      onSaved({
        id: isEdit ? event!.id : data.eventId,
        note: cleanNote,
        occurredOn,
        circle,
        media: persistedIds.map((publicId) => ({ publicId })),
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        placeName,
        isOwn: true,
      });
    } catch {
      setError("save_failed");
      setSubmitting(false);
    }
  }

  // "تفاصيل أكثر" → the full create form, carrying the chosen day so the user
  // doesn't lose their place. It's an escape hatch to the richer form, not a
  // handoff of in-progress note/media state.
  function onMoreDetails() {
    router.push(`/events/new?on=${atISO.slice(0, 10)}`);
  }

  return (
    <>
      {/* dimmed backdrop — a centered modal on all viewports */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
        data-testid="quick-add-scrim"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
        <div
          ref={dialogRef}
          className="cosmic-panel relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-5 shadow-glow-blue"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-testid="quick-add-popup"
          onClick={(e) => e.stopPropagation()}
        >
          {/* header: close (left) + title */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <button
              ref={firstFieldRef}
              type="button"
              onClick={onClose}
              aria-label={t("quickAddCancel")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-cosmic-muted transition-colors hover:bg-cosmic-surface2 focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <h3 id={titleId} className="text-xl font-extrabold text-cosmic-ink">
              {isEdit ? t("momentEditTitle") : t("momentNewTitle")}
            </h3>
          </div>

          {/* date row with clock icon */}
          <p className="mb-4 flex items-center justify-center gap-1.5 text-[13px] font-bold text-cosmic-blue">
            <Clock className="h-4 w-4" aria-hidden />
            <span className="tabular-nums">{dateLabel}</span>
          </p>

          {/* note */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t("momentNotePlaceholder")}
            data-testid="quick-add-note"
            className="mb-4 w-full resize-none rounded-2xl border border-cosmic-border bg-cosmic-surface/60 px-3.5 py-3 text-sm text-cosmic-ink placeholder:text-cosmic-muted focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
          />

          {/* media cards: each offers live capture AND upload */}
          <p className="mb-2 text-center text-[12px] text-cosmic-muted">{t("momentMediaSubtitle")}</p>
          <div className="mb-3 grid grid-cols-2 gap-2" data-testid="quick-add-media">
            <MediaCard kind="image" onCapturedFile={uploadOne} onFiles={onFiles} />
            <MediaCard kind="video" onCapturedFile={uploadOne} onFiles={onFiles} />
            <div className="col-span-2">
              <MediaCard kind="audio" onCapturedFile={uploadOne} onFiles={onFiles} />
            </div>
          </div>

          {/* attached items */}
          {items.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-1.5" data-testid="quick-add-items">
              {items.map((it, i) => (
                <li
                  key={i}
                  className="group relative flex items-center gap-1 rounded-md border border-cosmic-border bg-cosmic-surface/60 px-1.5 py-1 text-[10px] text-cosmic-ink"
                >
                  <KindIcon type={it.type} />
                  <span className="max-w-[5rem] truncate">{it.name}</span>
                  {it.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin text-cosmic-muted" aria-hidden />}
                  {it.status === "failed" && <span className="text-rose-500">!</span>}
                  <button
                    type="button"
                    onClick={() => removeItem(it)}
                    aria-label={t("removeMedia")}
                    className="text-cosmic-muted hover:text-rose-500"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* who sees it? */}
          <p className="mb-1.5 text-[13px] font-bold text-cosmic-muted">{t("momentWhoSees")}</p>
          <div className="mb-4">
            <CircleSelector value={circle} onChange={setCircle} hasMedia={items.length > 0} variant="pills" />
          </div>

          {error && (
            <p className="mb-2 text-[13px] font-bold text-rose-500" role="alert">
              {t("quickAddFailed")}
            </p>
          )}

          {/* footer actions — تفاصيل أكثر is a create-only escape hatch to the
              full form; in edit mode we show a plain cancel instead. */}
          <div className="flex items-center gap-2">
            {isEdit ? (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] rounded-2xl border border-cosmic-border px-4 py-2.5 text-sm font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2 focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
              >
                {t("quickAddCancel")}
              </button>
            ) : (
              <button
                type="button"
                onClick={onMoreDetails}
                data-testid="quick-add-more-details"
                className="min-h-[48px] rounded-2xl border border-cosmic-border px-4 py-2.5 text-sm font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2 focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
              >
                {t("momentMoreDetails")}
              </button>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              data-testid="quick-add-save"
              className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-l from-cosmic-blue to-cosmic-purple px-4 py-2.5 text-sm font-bold text-white shadow-glow-blue transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60 disabled:translate-y-0 disabled:opacity-40"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {submitting ? t("quickAddSaving") : isEdit ? t("momentSaveBtn") : t("momentAddBtn")}
            </button>
          </div>
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
