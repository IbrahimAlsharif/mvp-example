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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="public-warning-title" className="mb-3 text-lg font-bold">
          {t("publicWarningTitle")}
        </h2>
        <p className="mb-6 text-sm text-neutral-700">{t("publicWarningBody")}</p>
        <div className="flex justify-start gap-3">
          <button
            type="button"
            onClick={onConfirm}
            data-testid="public-warning-confirm"
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-white"
          >
            {t("publicWarningConfirm")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-300 px-5 py-2.5"
          >
            {t("publicWarningCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
