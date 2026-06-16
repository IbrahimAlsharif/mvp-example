import { requestMediaStream } from "@/lib/capture/permissions";
import type { PermissionResult } from "@/lib/capture/types";

/**
 * Live capture primitives (FEAT-RTD) layered on top of the permission helpers in
 * [permissions.ts](./permissions.ts): turn a granted camera/mic MediaStream into
 * a saved File the existing upload path can consume.
 *
 * Two capabilities:
 *  - `capturePhoto` — open the camera, grab a single still frame, return an
 *    image/jpeg File. The stream is opened and torn down internally.
 *  - `startRecording` — a MediaRecorder-based audio/video recorder returning a
 *    handle with stop()/cancel(); stop() resolves to a webm File. The caller owns
 *    the lifetime and MUST call stop() or cancel() to release the device.
 *
 * The pure bits (MIME selection, filename, duration format) are exported and unit
 * tested without a browser; the stream/recorder bits are guarded so importing the
 * module on the server is safe.
 */

export type RecordKind = "audio" | "video";

/** A best-fit MIME candidate list per kind, widest-support first. */
const MIME_CANDIDATES: Record<RecordKind, string[]> = {
  // webm/opus is the broadly-supported recording container on Chromium/Firefox;
  // mp4 is the Safari path. Plain type strings are the last-resort fallback.
  audio: ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"],
  video: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"],
};

/** File extension for a chosen MIME type (the bit before any `;codecs=`). */
export function extensionForMime(mime: string): string {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base.endsWith("/webm")) return "webm";
  if (base.endsWith("/mp4")) return "mp4";
  if (base.endsWith("/ogg")) return "ogg";
  if (base.endsWith("/jpeg")) return "jpg";
  // Fall back to the subtype after the slash.
  return base.split("/")[1] || "bin";
}

/**
 * Pick the first supported recording MIME for a kind. Pass a custom
 * `isSupported` (defaults to MediaRecorder.isTypeSupported) so this is unit
 * testable without a browser. Returns "" when nothing matches — callers let the
 * browser choose its own default in that case.
 */
export function pickRecordingMime(
  kind: RecordKind,
  isSupported: (mime: string) => boolean = defaultIsTypeSupported,
): string {
  for (const candidate of MIME_CANDIDATES[kind]) {
    if (isSupported(candidate)) return candidate;
  }
  return "";
}

function defaultIsTypeSupported(mime: string): boolean {
  if (typeof MediaRecorder === "undefined") return false;
  try {
    return MediaRecorder.isTypeSupported(mime);
  } catch {
    return false;
  }
}

/** A stable, human-ish filename for a captured blob (UTC, second precision). */
export function captureFilename(prefix: string, ext: string, at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}` +
    `-${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}`;
  return `${prefix}-${stamp}.${ext}`;
}

/** mm:ss for a recording elapsed-time readout (clamps negatives to 0). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Stop and release every track on a stream (idempotent, null-safe). */
export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}

export type PhotoResult =
  | { result: "granted"; file: File }
  | { result: Exclude<PermissionResult, "granted">; file: null };

/**
 * Open the camera, grab one still frame, and return it as an image/jpeg File.
 * The stream is opened just for the shot and always torn down before returning,
 * so we never leave the camera light on. A non-grant maps to the same result
 * enum the permission layer uses, and the caller falls back to upload.
 */
export async function capturePhoto(filenameStamp: Date = stampNow()): Promise<PhotoResult> {
  const { result, stream } = await requestMediaStream("camera");
  if (result !== "granted" || !stream) {
    return { result: result === "granted" ? "unsupported" : result, file: null };
  }
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => undefined);
    // Wait for real frame dimensions before drawing (metadata may lag play()).
    if (!video.videoWidth) {
      await new Promise<void>((res) => {
        video.onloadedmetadata = () => res();
        // Safety timeout so a stuck stream can't hang the capture forever.
        setTimeout(res, 1500);
      });
    }
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { result: "unsupported", file: null };
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    if (!blob) return { result: "unsupported", file: null };
    const name = captureFilename("photo", "jpg", filenameStamp);
    return { result: "granted", file: new File([blob], name, { type: "image/jpeg" }) };
  } catch {
    return { result: "unsupported", file: null };
  } finally {
    stopStream(stream);
  }
}

export type Recording = {
  /** The live stream — for a video preview element while recording. */
  stream: MediaStream;
  /** Chosen container MIME (may be "" if the browser picked its own). */
  mime: string;
  /** Stop recording and resolve the captured File (releases the device). */
  stop: () => Promise<File>;
  /** Abort without producing a file (releases the device). */
  cancel: () => void;
};

export type StartResult =
  | { result: "granted"; recording: Recording }
  | { result: Exclude<PermissionResult, "granted">; recording: null };

/**
 * Begin an audio or video recording. Opens the mic (audio) or camera+mic (video)
 * stream, starts a MediaRecorder, and hands back a handle. The handle's stop()
 * resolves to a File named for the moment; cancel() discards. Either path stops
 * all tracks so the device indicator clears. A non-grant returns the result enum
 * with no recording so the caller can fall back to upload.
 */
export async function startRecording(kind: RecordKind): Promise<StartResult> {
  if (typeof MediaRecorder === "undefined") return { result: "unsupported", recording: null };
  // Video needs camera (+ its audio); audio-only needs the mic.
  const modality = kind === "video" ? "camera" : "mic";
  const { result, stream } = await requestMediaStream(modality);
  if (result !== "granted" || !stream) {
    return { result: result === "granted" ? "unsupported" : result, recording: null };
  }

  const mime = pickRecordingMime(kind);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  } catch {
    stopStream(stream);
    return { result: "unsupported", recording: null };
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  let settled = false;
  const recording: Recording = {
    stream,
    mime,
    stop: () =>
      new Promise<File>((resolve, reject) => {
        if (settled) return reject(new Error("recording already finished"));
        recorder.onstop = () => {
          settled = true;
          stopStream(stream);
          const outMime = recorder.mimeType || mime || (kind === "video" ? "video/webm" : "audio/webm");
          const ext = extensionForMime(outMime);
          const name = captureFilename(kind, ext, stampNow());
          resolve(new File(chunks, name, { type: outMime }));
        };
        try {
          recorder.stop();
        } catch (e) {
          settled = true;
          stopStream(stream);
          reject(e);
        }
      }),
    cancel: () => {
      if (settled) return;
      settled = true;
      try {
        recorder.stop();
      } catch {
        // ignore — we're discarding anyway
      }
      stopStream(stream);
    },
  };
  return { result: "granted", recording };
}

/** `new Date()` is mocked away in some test contexts; isolate the call here. */
function stampNow(): Date {
  return new Date();
}
