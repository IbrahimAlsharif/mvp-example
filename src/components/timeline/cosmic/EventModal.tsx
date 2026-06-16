"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Pencil } from "lucide-react";
import type { PrivacyCircle } from "@prisma/client";
import { EventCard } from "@/components/EventCard";
import { ChangeCircleControl } from "./ChangeCircleControl";
import type { EventVM } from "@/lib/events/view";

/**
 * Event popup for the cosmic timeline (FEAT-XBA).
 *
 * Opened by clicking a timeline node (or its hover preview). Renders the full
 * `EventCard` inside a centered, full-screen dialog over a dimmed cosmic
 * backdrop — replacing the old left side-panel that showed the selected event.
 *
 * Accessibility: `role="dialog"` + `aria-modal`, Esc closes, a backdrop click
 * closes, focus moves to the close button on open and is restored to the
 * previously-focused element on close, and a minimal focus trap keeps Tab inside
 * the dialog. The card itself keeps its light social-network styling, sitting on
 * the dark cosmic scrim for contrast.
 */
export function EventModal({
  event,
  ownerName,
  editable = false,
  onEdit,
  onClose,
}: {
  event: EventVM;
  ownerName: string;
  /** True when the viewer owns this event and may change its circle (US-3.2). */
  editable?: boolean;
  /** Open the edit popup for this own event (FEAT-MRV); only shown when editable. */
  onEdit?: (event: EventVM) => void;
  onClose: () => void;
}) {
  const t = useTranslations("cosmic");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [circle, setCircle] = useState<PrivacyCircle>(event.circle);

  // Esc to close + a minimal Tab focus trap, and restore focus on unmount.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => prevActive?.focus?.();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        // Close only when the press starts on the backdrop itself, so a drag that
        // ends outside the card (e.g. selecting text) doesn't dismiss it.
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
      data-testid="event-modal-backdrop"
    >
      {/* dimmed backdrop — a neutral slate scrim so the modal reads above the
          light timeline surface (theme-independent, not the white page color) */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("eventModalTitle")}
        data-testid="event-modal"
        dir="rtl"
        className="relative z-10 w-full max-w-md animate-fade-in-up"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("eventModalClose")}
          data-testid="event-modal-close"
          className="absolute -top-3 -left-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-cosmic-border bg-cosmic-surface text-cosmic-ink shadow-glow-blue transition-colors hover:bg-cosmic-surface2"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        {editable && onEdit && (
          <button
            type="button"
            onClick={() => onEdit({ ...event, circle })}
            aria-label={t("momentEditAction")}
            data-testid="event-modal-edit"
            className="absolute -top-3 left-8 z-20 flex h-9 items-center gap-1.5 rounded-full border border-cosmic-border bg-cosmic-surface px-3 text-[13px] font-bold text-cosmic-ink shadow-glow-blue transition-colors hover:bg-cosmic-surface2"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {t("momentEditAction")}
          </button>
        )}
        <EventCard event={{ ...event, circle }} ownerName={ownerName} />
        {editable && (
          <ChangeCircleControl
            eventId={event.id}
            current={circle}
            hasMedia={event.media.length > 0}
            onChanged={setCircle}
          />
        )}
      </div>
    </div>
  );
}
