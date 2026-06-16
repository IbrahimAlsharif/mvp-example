"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Video, Mic, Upload, Square, X, Loader2 } from "lucide-react";
import { useRecorder, takePhoto } from "@/lib/capture/useRecorder";
import type { RecordKind } from "@/lib/capture/record";

/**
 * One media card in the redesigned moment popup (FEAT-JZW): a labeled tile
 * (صورة / فيديو / صوت) offering BOTH live capture (التقاط for photo, تسجيل for
 * audio/video — via the FEAT-RTD capture lib) and file upload (رفع — the existing
 * uploadFile path, wired by the parent through `onFiles`). A captured still or
 * stopped recording is handed to the parent as a File via `onCapturedFile`, which
 * uploads it exactly like a picked file, so both paths converge on one pipeline.
 *
 * While recording, the card shows an elapsed mm:ss readout with stop/cancel; for
 * video it also shows the live camera preview. A capture non-grant surfaces an
 * inline hint pointing the user at the upload button (never a dead-end).
 */
type CardKind = "image" | "audio" | "video";

const ICON: Record<CardKind, typeof Camera> = { image: Camera, video: Video, audio: Mic };
const ACCEPT: Record<CardKind, string> = { image: "image/*", video: "video/*", audio: "audio/*" };

export function MediaCard({
  kind,
  onCapturedFile,
  onFiles,
}: {
  kind: CardKind;
  /** A live-captured photo or stopped recording, to upload like a picked file. */
  onCapturedFile: (file: File) => void;
  /** Files picked via the رفع (upload) button. */
  onFiles: (files: FileList | null) => void;
}) {
  const t = useTranslations("cosmic");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [busy, setBusy] = useState(false); // photo shot in flight

  // Photo has no recording state machine; audio/video do.
  const recordable = kind !== "image";
  const recorder = useRecorder((recordable ? kind : "audio") as RecordKind);

  // Attach the live preview stream to the <video> while recording video.
  useEffect(() => {
    if (kind === "video" && videoRef.current) {
      videoRef.current.srcObject = recorder.previewStream;
    }
  }, [kind, recorder.previewStream]);

  const label = kind === "image" ? t("mediaPhoto") : kind === "video" ? t("mediaVideo") : t("mediaAudio");
  const Icon = ICON[kind];
  const captureLabel = kind === "image" ? t("mediaCapture") : t("mediaRecord");

  async function onCaptureClick() {
    if (kind === "image") {
      setBusy(true);
      try {
        const file = await takePhoto();
        if (file) onCapturedFile(file);
      } finally {
        setBusy(false);
      }
      return;
    }
    // audio / video → start recording
    await recorder.start();
  }

  async function onStop() {
    const file = await recorder.stop();
    if (file) onCapturedFile(file);
  }

  const isRecording = recorder.state === "recording" || recorder.state === "stopping";

  return (
    <div
      className="cosmic-inset flex flex-col gap-2 rounded-2xl p-3"
      data-testid={`media-card-${kind}`}
    >
      <span className="flex items-center justify-end gap-1.5 text-[13px] font-bold text-cosmic-ink">
        {label}
        <Icon className="h-4 w-4 text-cosmic-muted" aria-hidden />
      </span>

      {isRecording ? (
        <div className="flex flex-col gap-2" data-testid={`media-card-${kind}-recording`}>
          {kind === "video" && (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-24 w-full rounded-lg bg-black object-cover"
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-rose-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden />
              {t("mediaRecording")} {recorder.elapsed}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onStop}
                disabled={recorder.state === "stopping"}
                aria-label={t("mediaStop")}
                data-testid={`media-card-${kind}-stop`}
                className="flex items-center gap-1 rounded-lg bg-cosmic-blue px-2.5 py-1.5 text-[12px] font-bold text-white disabled:opacity-50"
              >
                <Square className="h-3.5 w-3.5" aria-hidden /> {t("mediaStop")}
              </button>
              <button
                type="button"
                onClick={recorder.cancel}
                aria-label={t("mediaCancel")}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-cosmic-border text-cosmic-muted hover:bg-cosmic-surface2"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {/* capture (التقاط / تسجيل) */}
          <button
            type="button"
            onClick={onCaptureClick}
            disabled={busy}
            data-testid={`media-card-${kind}-capture`}
            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-gradient-to-l from-cosmic-blue to-cosmic-purple px-2 py-2 text-[12px] font-bold text-white shadow-glow-blue transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Icon className="h-3.5 w-3.5" aria-hidden />}
            {captureLabel}
          </button>
          {/* upload (رفع) */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            data-testid={`media-card-${kind}-upload`}
            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-cosmic-border px-2 py-2 text-[12px] font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden /> {t("mediaUpload")}
          </button>
        </div>
      )}

      {recorder.denied && (
        <p className="text-[11px] font-medium text-rose-500" role="alert">
          {t("mediaCaptureDenied")}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT[kind]}
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
        data-testid={`media-card-${kind}-files`}
      />
    </div>
  );
}
