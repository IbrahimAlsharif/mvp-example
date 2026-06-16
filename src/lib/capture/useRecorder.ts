"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PermissionResult } from "@/lib/capture/types";
import {
  capturePhoto,
  formatDuration,
  startRecording,
  stopStream,
  type RecordKind,
  type Recording,
} from "@/lib/capture/record";

/**
 * React wrapper around the live-capture primitives (FEAT-RTD).
 *
 * Drives one recorder's state machine — idle → recording → stopping → idle — and
 * exposes an elapsed-time readout (ticked once per second) plus a live preview
 * stream for video. On a non-grant it surfaces the result enum so the UI can show
 * the upload fallback. The hook owns teardown: unmounting mid-recording cancels
 * it and releases the device.
 */

export type RecorderState = "idle" | "recording" | "stopping";

export type UseRecorder = {
  state: RecorderState;
  /** Seconds elapsed, formatted mm:ss, while recording. */
  elapsed: string;
  /** Live stream while recording (attach to a <video> for video preview). */
  previewStream: MediaStream | null;
  /** Last non-grant result, for showing the upload fallback hint; null if fine. */
  denied: Exclude<PermissionResult, "granted"> | null;
  /** Begin recording this kind; resolves false on a non-grant. */
  start: () => Promise<boolean>;
  /** Stop and resolve the captured File (null if not recording). */
  stop: () => Promise<File | null>;
  /** Abort without producing a file. */
  cancel: () => void;
};

export function useRecorder(kind: RecordKind): UseRecorder {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [denied, setDenied] = useState<Exclude<PermissionResult, "granted"> | null>(null);

  const recRef = useRef<Recording | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle") return false;
    setDenied(null);
    const { result, recording } = await startRecording(kind);
    if (result !== "granted" || !recording) {
      setDenied(result);
      return false;
    }
    recRef.current = recording;
    setPreviewStream(recording.stream);
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setState("recording");
    clearTick();
    tickRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 250);
    return true;
  }, [state, kind, clearTick]);

  const stop = useCallback(async () => {
    const rec = recRef.current;
    if (!rec || state !== "recording") return null;
    setState("stopping");
    clearTick();
    try {
      const file = await rec.stop();
      return file;
    } finally {
      recRef.current = null;
      setPreviewStream(null);
      setState("idle");
    }
  }, [state, clearTick]);

  const cancel = useCallback(() => {
    clearTick();
    recRef.current?.cancel();
    recRef.current = null;
    setPreviewStream(null);
    setElapsedMs(0);
    setState("idle");
  }, [clearTick]);

  // Teardown on unmount: cancel any in-flight recording and release the device.
  useEffect(() => {
    return () => {
      clearTick();
      recRef.current?.cancel();
      recRef.current = null;
    };
  }, [clearTick]);

  return {
    state,
    elapsed: formatDuration(elapsedMs),
    previewStream,
    denied,
    start,
    stop,
    cancel,
  };
}

/**
 * One-shot photo capture helper for React callers (no persistent state). Returns
 * the File on grant, or null on any non-grant (the UI falls back to upload).
 */
export async function takePhoto(): Promise<File | null> {
  const { result, file } = await capturePhoto();
  return result === "granted" ? file : null;
}

// Re-export so popup code imports capture surface from one place.
export { stopStream };
