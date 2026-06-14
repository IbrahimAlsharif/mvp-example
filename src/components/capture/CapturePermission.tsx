"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Upload, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { isModalitySupported, requestMediaStream } from "@/lib/capture/permissions";
import { detectBrowser, reenableKey } from "@/lib/capture/browser";
import { fallbackForResult, type CaptureModality, type PermissionResult } from "@/lib/capture/types";
import { emit } from "@/lib/telemetry";

/**
 * Just-in-time capture permission for one modality (US-0.2).
 *
 * Flow: the user taps "take a photo" / "record voice" → we show ONE Arabic-first
 * rationale interstitial (AC-1, AC-11: at most one custom rationale before the
 * native prompt) → on "allow" we request the browser permission in context.
 *  - granted  → onLiveStream(stream) so the parent can capture (handed to US-1.2).
 *  - denied/dismissed/unsupported → never a dead-end: we reveal the upload
 *    fallback (onFallback) plus browser-specific re-enable guidance (AC-3/6/7).
 *
 * Unsupported browsers route straight to upload without ever showing a broken
 * native prompt (AC-6). All outcomes are reported as content-blind telemetry
 * enums — no media, no coordinates (G4).
 */
export function CapturePermission({
  modality,
  onLiveStream,
  onFallback,
}: {
  modality: Extract<CaptureModality, "camera" | "mic">;
  onLiveStream: (stream: MediaStream) => void;
  onFallback: () => void;
}) {
  const t = useTranslations("capture");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<PermissionResult | null>(null);
  const [supported, setSupported] = useState(true);
  const browserRef = useRef(detectBrowser());

  // Detect support without forcing any prompt on load (AC-6, NFR).
  useEffect(() => {
    setSupported(isModalitySupported(modality));
  }, [modality]);

  const Icon = modality === "camera" ? Camera : Mic;
  const title = modality === "camera" ? t("cameraTitle") : t("micTitle");
  const rationale = modality === "camera" ? t("cameraRationale") : t("micRationale");

  function openRationale() {
    if (!supported) {
      // Straight to fallback; never show a broken native prompt (AC-6).
      setResult("unsupported");
      emit("capture_permission_result", { permission_type: modality, result: "unsupported" });
      emit("capture_fallback_used", { fallback_type: "upload" });
      onFallback();
      return;
    }
    setOpen(true);
  }

  async function allow() {
    emit("capture_permission_requested", { permission_type: modality });
    const { result: r, stream } = await requestMediaStream(modality);
    setResult(r);
    setOpen(false);
    emit("capture_permission_result", { permission_type: modality, result: r });
    if (r === "granted" && stream) {
      onLiveStream(stream);
      return;
    }
    const fb = fallbackForResult(modality, r);
    if (fb) emit("capture_fallback_used", { fallback_type: fb });
    onFallback();
  }

  const denied = result === "denied" || result === "dismissed" || result === "unsupported";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={openRationale}
        data-testid={`capture-${modality}`}
        className="tap-target inline-flex items-center gap-1.5 rounded-2xl border border-white/60 bg-white/40 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-white/70"
      >
        <Icon className="h-3.5 w-3.5" aria-hidden /> {title}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="rounded-2xl border border-brand/20 bg-brand-50/50 p-4 text-sm"
          data-testid={`rationale-${modality}`}
        >
          <p className="flex items-start gap-2 text-neutral-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span>{rationale}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={allow}
              data-testid={`allow-${modality}`}
              className="tap-target rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white"
            >
              {t("allow")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                emit("capture_fallback_used", { fallback_type: "upload" });
                onFallback();
              }}
              className="tap-target inline-flex items-center gap-1 rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden /> {t("useUpload")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("skip")}
              className="tap-target inline-flex h-8 w-8 items-center justify-center rounded-xl text-neutral-500"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {denied && (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800"
          data-testid={`reenable-${modality}`}
        >
          <p>{result === "unsupported" ? t("unsupportedHint") : t("deniedHint")}</p>
          {result !== "unsupported" && (
            <>
              <p className="mt-2 font-semibold">{t("reenableTitle")}</p>
              <p className="mt-1 leading-relaxed">{t(reenableKey(browserRef.current))}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
