"use client";

import { useTranslations } from "next-intl";

/**
 * Blocking child-media warning for transitions to Public (US-3.1 AC-4, G3).
 *
 * Shown on EVERY transition to PUBLIC_UNLISTED on a media-bearing event, before
 * the circle is applied. The trigger is content-blind — fired by the Public
 * action itself, never by any automated detection of media contents (G3). The
 * circle is applied only if the owner acknowledges; declining leaves it
 * unchanged. Reused by both the create form (US-1.1) and edit.
 */
export function PublicWarningDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("circle");
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-warning-title"
      data-testid="public-warning"
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md animate-fade-in-up rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-2xl">
          ⚠️
        </div>
        <h2 id="public-warning-title" className="mb-2 text-lg font-extrabold text-neutral-900">
          {t("publicWarningTitle")}
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-neutral-600">{t("publicWarningBody")}</p>
        <div className="flex justify-start gap-3">
          <button
            type="button"
            onClick={onConfirm}
            data-testid="public-warning-confirm"
            className="rounded-xl bg-accent-gradient px-5 py-2.5 font-bold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            {t("publicWarningConfirm")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            {t("publicWarningCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
