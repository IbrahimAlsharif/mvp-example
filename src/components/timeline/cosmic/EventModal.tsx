"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { EventCard } from "@/components/EventCard";
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
  onClose,
}: {
  event: EventVM;
  ownerName: string;
  onClose: () => void;
}) {
  const t = useTranslations("cosmic");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
      {/* dimmed cosmic backdrop */}
      <div className="absolute inset-0 bg-cosmic-bg/80 backdrop-blur-sm" aria-hidden />

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
        <EventCard event={event} ownerName={ownerName} />
      </div>
    </div>
  );
}
