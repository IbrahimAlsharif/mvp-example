"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Play, Pause } from "lucide-react";
import { absoluteDate } from "@/lib/events/date";

type Span = "year" | "decade" | "life";
type Frame = { eventId: string; occurredOn: string; note: string | null; media: { publicId: string }[] };

/**
 * Life Playback player (US-2.3). Fetches a server-built, per-viewer
 * circle-filtered sequence and auto-advances frame by frame ("one year in N
 * seconds" pacing). Pause and scrub are supported. Privacy is NOT a client
 * concern here — the server already excluded out-of-circle events; the client
 * only renders what it was given.
 */
const FRAME_MS = 2500; // ~continuous-story pacing per frame

export function PlaybackPlayer() {
  const t = useTranslations("playback");
  const [span, setSpan] = useState<Span>("year");
  const [frames, setFrames] = useState<Frame[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (s: Span) => {
    setError(false);
    setFrames(null);
    setIdx(0);
    try {
      const res = await fetch(`/api/playback?span=${s}`);
      if (!res.ok) return setError(true);
      const data = await res.json();
      setFrames(data.frames as Frame[]);
      setPlaying((data.frames as Frame[]).length > 0);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load(span);
  }, [span, load]);

  // Auto-advance while playing; stop at the end (no out-of-order frames).
  useEffect(() => {
    if (!playing || !frames || frames.length === 0) return;
    timer.current = setTimeout(() => {
      setIdx((i) => {
        if (i + 1 >= frames.length) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, FRAME_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, idx, frames]);

  const current = frames?.[idx];

  return (
    <main className="timeline-cosmic mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8" dir="rtl">
      <Link href="/timeline" className="inline-flex items-center gap-1 text-sm text-cosmic-muted hover:underline">
        <ArrowRight className="h-4 w-4" aria-hidden /> {t("back")}
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-cosmic-ink">{t("title")}</h1>

      {/* Span chooser (J5 step 1) */}
      <div className="mt-4 flex gap-2">
        {(["year", "decade", "life"] as Span[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpan(s)}
            className={`rounded-xl border px-3 py-1.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cosmic-amber/50 ${
              span === s ? "border-cosmic-amber bg-cosmic-surface2 text-cosmic-amber" : "border-cosmic-border text-cosmic-ink"
            }`}
          >
            {t(`span_${s}` as "span_year")}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" aria-live="assertive" className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
          {t("failed")}
        </p>
      )}

      {/* Stage */}
      <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-3xl border border-cosmic-border bg-cosmic-surface/40 p-6">
        {frames && frames.length === 0 && <p className="text-cosmic-muted">{t("empty")}</p>}
        {current && (
          <figure className="flex w-full flex-col items-center gap-3" aria-live="polite">
            {current.media[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${current.media[0].publicId}`}
                alt=""
                className="max-h-[22rem] w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-cosmic-surface2 text-cosmic-muted">
                {current.note ?? t("noMedia")}
              </div>
            )}
            <figcaption className="text-center text-sm text-cosmic-ink">
              <time dateTime={current.occurredOn}>{absoluteDate(current.occurredOn)}</time>
              {current.note && <p className="mt-1 text-cosmic-muted">{current.note}</p>}
            </figcaption>
          </figure>
        )}
      </div>

      {/* Controls (J5 step 4): pause + scrub */}
      {frames && frames.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? t("pause") : t("play")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-cosmic-amber text-cosmic-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-cosmic-amber/50"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={idx}
            onChange={(e) => {
              setPlaying(false);
              setIdx(Number(e.target.value)); // scrub/seek (AC-3)
            }}
            aria-label={t("scrub")}
            className="h-1 flex-1 cursor-pointer accent-cosmic-amber"
          />
          <span className="text-xs tabular-nums text-cosmic-muted">
            {idx + 1} / {frames.length}
          </span>
        </div>
      )}
    </main>
  );
}
