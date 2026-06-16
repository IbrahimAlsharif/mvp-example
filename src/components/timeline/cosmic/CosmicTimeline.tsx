"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock3 } from "lucide-react";
import type { EventVM } from "@/lib/events/view";
import { hasLocation, hasMedia } from "@/lib/events/view";
import { granularityToZoom, type Granularity } from "@/lib/timeline/granularity";

/**
 * Custom cosmic timeline (matches the reference command-center look, not
 * vis-timeline): a single horizontal rail split into الماضي (past) / المستقبل
 * (future) by a glowing vertical NOW divider. Events render as neon nodes whose
 * glow color + icon derive from their media kind; a compact title bubble floats
 * above alternating nodes, and hovering (or focusing) a node reveals a richer
 * preview card (note snippet + date + media thumbnail + circle). Clicking a node
 * or its preview opens the full event in a popup. Past nodes sit on the
 * start-side of NOW, future on the end-side, each positioned by how far its date
 * is from "now" within the rail.
 *
 * Zoom is part of the timeline itself and behaves like a video/audio editor
 * (NLE/DAW): scroll the wheel / pinch the trackpad over the rail to zoom the
 * time axis in/out, a timecode-style ruler with date ticks runs along the rail,
 * and a compact zoom widget (− slider +) sits in the panel corner. The visible
 * half-window (`spanDays`) shrinks as you zoom in so events spread apart.
 */

type Kind = "image" | "audio" | "video" | "location" | "note";

// RGB triplets legible on the light timeline surface — these match the
// redefined cosmic-* tokens (brand blue, deepened teal/rose/violet, accent
// orange) so node glow, connectors, and chips stay readable on white.
const KIND_GLOW: Record<Kind, string> = {
  image: "37,99,235", // brand blue
  audio: "225,29,72", // rose-600
  video: "13,148,136", // teal-600
  location: "124,58,237", // violet-600
  note: "234,88,12", // accent orange
};

const KIND_ICON: Record<Kind, string> = {
  image: "🖼️",
  audio: "🎙️",
  video: "🎬",
  location: "📍",
  note: "✨",
};

function kindOf(e: EventVM): Kind {
  if (hasMedia(e)) {
    const id = e.media[0]?.publicId.toLowerCase() ?? "";
    if (/\.(mp3|wav|m4a|ogg|aac)$/.test(id) || id.includes("audio")) return "audio";
    if (/\.(mp4|mov|webm|avi)$/.test(id) || id.includes("video")) return "video";
    return "image";
  }
  if (hasLocation(e)) return "location";
  return "note";
}

// ── Zoom model (DAW-style) ───────────────────────────────────────────────────
// `zoom` is a 0..100 dial mapped log-scaled to the visible half-window in days,
// so each step is a constant ratio between a tight 7-day view and a wide ~30y
// view. Lower zoom = zoomed in (short window, events spread); higher = zoomed
// out. The wheel/pinch and the +/− buttons all nudge this one value.
const ZOOM_MIN = 0;
const ZOOM_MAX = 100;
const ZOOM_STEP = 8; // +/− button nudge
const WHEEL_STEP = 6; // per wheel notch
const SPAN_MIN_DAYS = 7;
const SPAN_MAX_DAYS = 365 * 30;

function zoomToSpanDays(zoom: number): number {
  const f = clamp(zoom, ZOOM_MIN, ZOOM_MAX) / 100;
  const lnMin = Math.log(SPAN_MIN_DAYS);
  const lnMax = Math.log(SPAN_MAX_DAYS);
  return Math.round(Math.exp(lnMin + f * (lnMax - lnMin)));
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export type CursorInstant = {
  /** ISO instant at the cursor, snapped to the day at 12:00 UTC noon. */
  atISO: string;
  /** Which half the cursor is on (matches node/ruler placement). */
  side: "past" | "future";
  /** Center-based positional fraction (for placing the tooltip over its tick). */
  pct: number;
  /** Physical cursor fraction within the rail, 0=left edge … 1=right edge. */
  xPct: number;
};

/**
 * Pure cursor→instant mapping for the cosmic rail (exported for unit tests).
 *
 * RTL gotcha that this encodes: nodes and ruler ticks position the PAST half with
 * `right: calc(50% + …)`, which `dir="rtl"` MIRRORS to the physical LEFT. So the
 * past renders to the screen-LEFT of NOW and the future to the screen-RIGHT —
 * the cursor mapping must agree (past = screen-left). The date is snapped to the
 * day at 12:00 UTC noon (the instant the create form saves at) because at year/
 * month zoom a pixel spans days, so a precise clock time would be noise.
 */
export function mapCursorToInstant({
  clientX,
  railLeft,
  railWidth,
  centerX,
  now,
  spanDays,
}: {
  clientX: number;
  railLeft: number;
  railWidth: number;
  centerX: number;
  /** The time (ms) at the rail's geometric center — `now` when un-panned, or the
   *  panned center instant once the user has dragged the axis (FEAT-PPU). */
  now: number;
  spanDays: number;
}): CursorInstant {
  const halfWidth = railWidth / 2;
  // Signed distance from the center as a fraction of a half-width; <0 = screen-
  // left = past (relative to the center instant).
  const fromCenter = clamp((clientX - centerX) / halfWidth, -1, 1);
  const isPast = fromCenter < 0;
  // Invert the node/ruler placement `pct = INNER + frac·(OUTER−INNER)` (pct is a
  // half-width fraction, so |fromCenter|·0.5) to recover the time fraction.
  const out = clamp(Math.abs(fromCenter), 0, 1) * 0.5;
  const frac = clamp((out - INNER) / (OUTER - INNER), 0, 1);
  const offsetDays = Math.round(frac * spanDays);
  const day = new Date(now + (isPast ? -offsetDays : offsetDays) * 86_400_000);
  const at = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12, 0, 0);
  // Re-derive pct from the SNAPPED date so the tooltip sits where a node carrying
  // this date would render, not where the raw unrounded cursor was.
  const snappedFrac = clamp(offsetDays / spanDays, 0, 1);
  const pct = INNER + snappedFrac * (OUTER - INNER);
  const side: "past" | "future" = isPast ? "past" : "future";
  const xPct = clamp((clientX - railLeft) / railWidth, 0, 1);
  return { atISO: new Date(at).toISOString(), side, pct, xPct };
}

export function CosmicTimeline({
  events,
  nowISO,
  onOpen,
  onAddAt,
  audienceControl,
}: {
  events: EventVM[];
  nowISO: string;
  /** Open an event in a popup — fired by clicking a node or its hover preview. */
  onOpen: (id: string) => void;
  /** Open the centered moment popup at a real instant (ISO). */
  onAddAt?: (atISO: string) => void;
  /** Audience filter control (الكل/لي/مَن تحب) rendered in the header (FEAT-BVK). */
  audienceControl?: React.ReactNode;
}) {
  const t = useTranslations("cosmic");

  // NOW is a LIVE clock, not a frozen server timestamp. We seed from the
  // server-rendered `nowISO` so the first client render matches SSR (no
  // hydration mismatch), then tick it forward every second on the client.
  // Because nodes/ticks are positioned by real time distance from `now`, the
  // axis quietly advances and events drift future → now → past as time passes.
  const [now, setNow] = useState(() => new Date(nowISO).getTime());
  useEffect(() => {
    // Snap to the real current instant on mount (the server value may be a few
    // hundred ms stale by hydration), then advance once per second.
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Zoom lives INSIDE the timeline (not the page toolbar). Default 50 ≈ a
  // multi-year window. spanDays derives from it.
  const [zoom, setZoom] = useState(50);
  const spanDays = useMemo(() => zoomToSpanDays(zoom), [zoom]);

  // Pan: a time offset (ms) added to NOW to get the instant at the rail's
  // geometric center (FEAT-PPU). 0 = centered on NOW; dragging the rail moves it,
  // and the الآن button resets it. The NOW divider then sits at its real offset
  // from the panned center (and can scroll off-screen).
  const [panMs, setPanMs] = useState(0);
  const centerMs = now + panMs;

  // Wheel / trackpad-pinch over the rail zooms the time axis, like an NLE, and
  // we preventDefault so the page doesn't scroll under it. React attaches wheel
  // listeners as PASSIVE, where preventDefault is a no-op (and warns), so we bind
  // a NON-passive native listener on the rail via the effect below instead of an
  // onWheel prop. Scroll up (deltaY < 0) = zoom IN = lower zoom (DAW convention).
  const wheelLock = useRef(0);

  // Split + position by REAL time distance from the CENTER instant within the
  // half-window. "Past"/"future" here mean left/right of the panned center, not
  // of NOW — when un-panned they coincide.
  const { past, future } = useMemo(() => {
    const span = Math.max(1, spanDays) * 86_400_000; // ms in the half-window
    const ev = [...events].sort(
      (a, b) => new Date(a.occurredOn).getTime() - new Date(b.occurredOn).getTime(),
    );
    const p = ev.filter((e) => new Date(e.occurredOn).getTime() <= centerMs);
    const f = ev.filter((e) => new Date(e.occurredOn).getTime() > centerMs);
    return {
      past: layout(p, centerMs, span),
      future: layout(f, centerMs, span),
    };
  }, [events, centerMs, spanDays]);

  // Ruler ticks: evenly spaced marks across each half, labeled with the date at
  // that offset from the CENTER instant so the visible window reads like an
  // editor's timecode.
  const ticks = useMemo(() => buildTicks(centerMs, spanDays), [centerMs, spanDays]);

  // Where the live NOW divider sits relative to the panned center, as a signed
  // half-width fraction (0 = center). Maps NOW's day-offset from center through
  // the same INNER/OUTER placement the nodes use. Beyond the rail edge it's
  // hidden (the user has panned NOW out of view).
  const nowMarker = useMemo(() => {
    const offsetDays = (now - centerMs) / 86_400_000;
    const frac = offsetDays / Math.max(1, spanDays); // signed, may exceed ±1
    if (Math.abs(frac) > 1) return null;
    const side: "past" | "future" = frac <= 0 ? "past" : "future";
    const pct = INNER + Math.min(1, Math.abs(frac)) * (OUTER - INNER);
    return { side, pct };
  }, [now, centerMs, spanDays]);

  // ── Hover readout + click-to-add ─────────────────────────────────────────────
  // The rail is a time axis: a cursor X within it maps back to a real instant
  // using the same INNER/OUTER + span mapping the nodes use, inverted. We track
  // the hovered instant so a tooltip can show the exact day/date/time the user
  // is about to click, then emit that instant on click for the quick-add popup.
  const railRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ atISO: string; side: "past" | "future"; pct: number } | null>(null);

  // Bind the wheel-zoom as a NON-passive native listener so preventDefault is
  // honored (a React onWheel prop is passive → preventDefault no-ops and warns).
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Coalesce high-frequency trackpad events to keep steps perceptible.
      const ts = e.timeStamp;
      if (ts - wheelLock.current < 16) return;
      wheelLock.current = ts;
      const dir = e.deltaY < 0 ? -1 : 1; // up → zoom in (smaller window)
      setZoom((z) => clamp(z + dir * WHEEL_STEP, ZOOM_MIN, ZOOM_MAX));
    };
    rail.addEventListener("wheel", onWheel, { passive: false });
    return () => rail.removeEventListener("wheel", onWheel);
  }, []);

  const instantFromClientX = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail) return null;
      const rect = rail.getBoundingClientRect();
      if (rect.width <= 0) return null;
      // The rail's GEOMETRIC center represents the (possibly panned) center
      // instant. With pan the NOW divider moves off-center, so we no longer
      // measure against it — the geometric center + centerMs define the mapping.
      const centerX = rect.left + rect.width / 2;
      return mapCursorToInstant({
        clientX,
        railLeft: rect.left,
        railWidth: rect.width,
        centerX,
        now: centerMs,
        spanDays,
      });
    },
    [centerMs, spanDays],
  );

  // ── Drag-to-pan (FEAT-PPU) ──────────────────────────────────────────────────
  // Dragging the rail horizontally pans the time axis. The rail is RTL with the
  // PAST on the screen-right, so dragging the content to the RIGHT (positive
  // deltaX) reveals EARLIER time → the center instant moves into the past
  // (negative ms). We convert pixels → days using the same half-width ↔ spanDays
  // scale the nodes use, so a drag moves time at the on-screen rate. A drag past
  // a small threshold suppresses the click-to-add that would otherwise fire.
  const drag = useRef<{ startX: number; startPan: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onRailPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return; // nodes handle their own clicks
    drag.current = { startX: e.clientX, startPan: panMs, moved: false };
    setDragging(true);
  }, [panMs]);

  const onRailPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) {
        const r = instantFromClientX(e.clientX);
        if (r) setHover(r);
        return;
      }
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const halfWidth = rect.width / 2;
      const dx = e.clientX - d.startX;
      if (Math.abs(dx) > 4) d.moved = true;
      // dx>0 (drag right) → past → negative ms. Pixels → days via half-width:span.
      const msPerPx = (spanDays * 86_400_000) / Math.max(1, halfWidth);
      setPanMs(d.startPan - dx * msPerPx);
      setHover(null);
    },
    [instantFromClientX, spanDays],
  );

  const endDrag = useCallback(() => {
    setDragging(false);
    // Keep `moved` readable for the click handler this tick, then clear next tick.
    const d = drag.current;
    if (d) setTimeout(() => (drag.current = null), 0);
  }, []);

  const onRailMove = useCallback(
    (e: React.MouseEvent) => {
      if (drag.current) return; // pointer-move drives hover/drag while pressed
      const r = instantFromClientX(e.clientX);
      if (r) setHover(r);
    },
    [instantFromClientX],
  );

  const onRailClick = useCallback(
    (e: React.MouseEvent) => {
      // Ignore clicks that originate on a node button (those select an event).
      if ((e.target as HTMLElement).closest("[data-node]")) return;
      // Ignore the click that ends a pan-drag (don't open quick-add on a drag).
      if (drag.current?.moved) return;
      const r = instantFromClientX(e.clientX);
      // The popup is centered, so we pass only the chosen instant.
      if (r) onAddAt?.(r.atISO);
    },
    [instantFromClientX, onAddAt],
  );

  // الآن: snap the axis back to the live NOW (clear any pan). FEAT-PPU.
  const recenterNow = useCallback(() => setPanMs(0), []);

  // Add-now FAB (FEAT-QVT): an always-visible "+" on the NOW divider opens
  // quick-add anchored to the CURRENT moment — no rail aiming, no navigation
  // away. We snap to today's day (the date-only convention the popup saves at)
  // and anchor the popup at the rail center (xPct 0.5) since NOW sits there.
  const onAddNow = useCallback(() => {
    const day = new Date(now);
    const at = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12, 0, 0);
    onAddAt?.(new Date(at).toISOString());
  }, [now, onAddAt]);

  // Keyboard equivalent of clicking the rail (FEAT-SMO F2): the rail is a
  // focusable control, so Enter/Space opens quick-add at NOW (rail center) —
  // giving keyboard and screen-reader users a path that mouse-only clicking
  // otherwise denied them. The user can then edit the date in the popup.
  const onRailKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if ((e.target as HTMLElement).closest("[data-node]")) return;
      e.preventDefault();
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const r = instantFromClientX(rect.left + rect.width / 2);
      if (r) onAddAt?.(r.atISO);
    },
    [instantFromClientX, onAddAt],
  );

  // NOW divider placement: centered when un-panned, else offset to its real
  // position (or null when panned out of view). Same right/left RTL convention
  // as the ruler/nodes (past = right).
  const nowPos = nowMarker
    ? nowMarker.side === "past"
      ? { right: `calc(50% + ${nowMarker.pct * 100}%)` }
      : { left: `calc(50% + ${nowMarker.pct * 100}%)` }
    : null;
  const panned = panMs !== 0;

  return (
    <section className="cosmic-panel relative px-4 py-6 sm:px-8" data-testid="cosmic-timeline">
      {/* Column titles */}
      <div className="mb-2 flex items-start justify-between gap-2 text-center">
        <h3 className="flex-1 text-sm font-bold text-cosmic-purple">{t("futureTitle")}</h3>
        <h2 className="px-4 text-base font-extrabold text-cosmic-ink">{t("timelineTitle")}</h2>
        <h3 className="flex-1 text-sm font-bold text-cosmic-blue">{t("pastTitle")}</h3>
      </div>

      {/* Audience filter (الكل / لي / مَن تحب) — centered under the title (FEAT-BVK). */}
      {audienceControl && <div className="mb-1 flex justify-center">{audienceControl}</div>}

      {/* Toolbar: الآن recenter (start) + zoom cluster + المدى label (end), per
          mockup 2. */}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={recenterNow}
          aria-label={t("recenterNowHint")}
          title={t("recenterNowHint")}
          data-testid="recenter-now"
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cosmic-amber/60 ${
            panned
              ? "border-cosmic-amber bg-cosmic-amber/15 text-cosmic-amber"
              : "border-cosmic-border text-cosmic-muted hover:bg-cosmic-surface2"
          }`}
        >
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          {t("recenterNow")}
        </button>
        <ZoomWidget zoom={zoom} setZoom={setZoom} spanDays={spanDays} t={t} />
      </div>

      {/* Rail — drag pans the axis; wheel/pinch zooms; hover reads out the instant
          under the cursor; a click on empty axis opens quick-add at that date */}
      <div
        ref={railRef}
        className={`relative mt-2 h-64 touch-pan-y select-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cosmic-blue/60 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        dir="rtl"
        role="button"
        tabIndex={0}
        aria-label={t("railAddHint")}
        onPointerDown={onRailPointerDown}
        onPointerMove={onRailPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseMove={onRailMove}
        onMouseLeave={() => setHover(null)}
        onClick={onRailClick}
        onKeyDown={onRailKeyDown}
        data-testid="timeline-rail"
      >
        {/* Hover readout: day · date · time at the cursor (hidden while dragging). */}
        {hover && !dragging && (
          <HoverReadout atISO={hover.atISO} side={hover.side} pct={hover.pct} hint={t("clickToAddHint")} />
        )}
        {/* time ruler (DAW-style timecode) just above the axis */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-[calc(50%+1.75rem)]">
          {ticks.map((tk) => (
            <div
              key={tk.key}
              className="absolute flex -translate-x-1/2 flex-col items-center"
              style={{ [tk.side === "past" ? "right" : "left"]: `calc(50% + ${tk.pct * 100}%)` }}
            >
              <span className="text-[9px] tabular-nums text-cosmic-muted">{tk.label}</span>
              <span className="mt-0.5 h-1.5 w-px bg-cosmic-border" />
            </div>
          ))}
        </div>

        {/* the horizontal axis line */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-l from-cosmic-purple/40 via-cosmic-border to-cosmic-blue/40" />

        {/* NOW divider — at the live-now position relative to the panned center
            (centered when un-panned; hidden when panned out of view). */}
        {nowPos && (
          <div
            data-now
            className="absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center"
            style={nowPos}
          >
            <div className="h-full w-[3px] rounded-full bg-gradient-to-b from-cosmic-amber/10 via-cosmic-amber to-cosmic-amber/10 shadow-glow-amber" />
            <span className="absolute top-3 rounded-md bg-cosmic-amber px-2 py-0.5 text-[10px] font-black tracking-widest text-cosmic-bg shadow-glow-amber">
              {t("now")}
            </span>
            {/* Add-now FAB (FEAT-QVT): "+" on the NOW divider. Opens quick-add at
                the current moment. `data-node` keeps it off the add-on-rail click. */}
            {onAddAt && (
              <button
                type="button"
                data-node
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNow();
                }}
                aria-label={t("addNow")}
                title={t("addNow")}
                data-testid="add-now-fab"
                className="group/now absolute top-[calc(50%+3.5rem)] z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-cosmic-amber text-2xl font-black leading-none text-cosmic-bg shadow-glow-amber transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cosmic-amber/70"
              >
                <span aria-hidden className="-mt-0.5">+</span>
                <span className="cosmic-inset pointer-events-none absolute top-full mt-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-bold text-cosmic-ink opacity-0 transition-opacity group-hover/now:opacity-100 group-focus-visible/now:opacity-100">
                  {t("addNowHint")}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Past side (start / right in RTL) */}
        {past.map((n, i) => (
          <Node key={n.e.id} n={n} side="past" up={i % 2 === 0} onOpen={onOpen} t={t} />
        ))}
        {/* Future side (end / left in RTL) */}
        {future.map((n, i) => (
          <Node key={n.e.id} n={n} side="future" up={i % 2 === 0} onOpen={onOpen} t={t} />
        ))}
      </div>

      {/* Hints line (mockup 2): drag to pan • scroll to zoom • click to add. */}
      <p className="mt-3 text-center text-[11px] text-cosmic-muted" data-testid="rail-hints">
        {t("railHints")}
      </p>
    </section>
  );
}

/** In-panel DAW-style zoom widget: − slider + with a live ± window label. */
function ZoomWidget({
  zoom,
  setZoom,
  spanDays,
  t,
}: {
  zoom: number;
  setZoom: (fn: (z: number) => number) => void;
  spanDays: number;
  t: (k: string, v?: Record<string, number>) => string;
}) {
  return (
    <div className="cosmic-inset mx-auto mb-1 flex w-max items-center gap-2 rounded-full px-3 py-1.5" dir="rtl">
      <span className="text-[10px] text-cosmic-muted">🔍</span>
      {/* Zoom IN = shorter window = lower zoom, so "+" decreases zoom. */}
      <button
        type="button"
        onClick={() => setZoom((z) => clamp(z - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}
        disabled={zoom <= ZOOM_MIN}
        aria-label={t("zoomIn")}
        title={t("zoomIn")}
        className="flex h-5 w-5 items-center justify-center rounded-md border border-cosmic-border text-xs font-bold leading-none text-cosmic-ink transition-colors hover:bg-cosmic-surface2 disabled:opacity-40"
      >
        +
      </button>
      <input
        type="range"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        // Visually, dragging right should zoom IN (editor convention), so the
        // slider runs reversed against the underlying zoom value.
        value={ZOOM_MAX - zoom}
        onChange={(e) => {
          const v = ZOOM_MAX - Number(e.target.value);
          setZoom(() => clamp(v, ZOOM_MIN, ZOOM_MAX));
        }}
        className="h-1 w-36 cursor-pointer accent-cosmic-amber"
        aria-label={t("zoomTimeframe")}
      />
      <button
        type="button"
        onClick={() => setZoom((z) => clamp(z + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}
        disabled={zoom >= ZOOM_MAX}
        aria-label={t("zoomOut")}
        title={t("zoomOut")}
        className="flex h-5 w-5 items-center justify-center rounded-md border border-cosmic-border text-xs font-bold leading-none text-cosmic-ink transition-colors hover:bg-cosmic-surface2 disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-[5.5rem] text-center text-[10px] tabular-nums text-cosmic-amber" data-testid="range-label">
        {t("rangeLabel")}: {formatSpan(spanDays, t)}
      </span>

      {/* Granularity presets (US-2.1 AC-2): one click jumps to a year/month/day
          span while keeping the NOW/center anchor — switching down lands at the
          same point in time, not at "today". Reaches any granularity in 1 click
          (well under the <4-click AC-3 bar). */}
      <span className="mx-1 h-3 w-px bg-cosmic-border" aria-hidden />
      {(["year", "month", "day"] as Granularity[]).map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => setZoom(() => granularityToZoom(g))}
          aria-label={t(`granularity_${g}` as "granularity_year")}
          title={t(`granularity_${g}` as "granularity_year")}
          className="rounded-md border border-cosmic-border px-1.5 py-0.5 text-[10px] font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cosmic-amber/50"
        >
          {t(`granularity_${g}` as "granularity_year")}
        </button>
      ))}
    </div>
  );
}

type Positioned = { e: EventVM; pct: number; kind: Kind };

// Each half of the rail covers 0%..46% out from center. We keep a small inner
// margin so a node sitting exactly at NOW doesn't collide with the divider.
const INNER = 0.04;
const OUTER = 0.46;

// Minimum horizontal gap (as a fraction of half-width) between two node centers
// before they'd visibly overlap. A node bubble is ~44px; on a typical rail half
// (~640px) that's ~3.4%. We fan collisions out by this step so each node keeps
// its own clickable hit area even when events share an instant.
const NODE_GAP = 0.035;

/**
 * Position events by their real temporal distance from NOW within the visible
 * half-window (`span`, in ms). frac = |Δt| / span, clamped to [0,1], so the
 * mapping is linear in time: halve `span` (zoom in) and every node moves twice
 * as far from center; out-of-window events clamp to the edge.
 *
 * Date-only events are all anchored to noon UTC, so any two on the same day map
 * to the IDENTICAL pct and would stack into one unclickable pile. After the base
 * mapping we walk the nodes outward-sorted and push any that land within NODE_GAP
 * of the previous one further out by NODE_GAP, fanning a same-instant cluster
 * into a clickable row. The nudge is purely visual (it doesn't change the event's
 * time) and is clamped to OUTER so a fanned cluster never spills past the edge.
 */
function layout(side: EventVM[], now: number, span: number): Positioned[] {
  const placed = side
    .map((e) => {
      const dt = Math.abs(new Date(e.occurredOn).getTime() - now);
      const frac = Math.min(1, dt / span);
      return { e, pct: INNER + frac * (OUTER - INNER), kind: kindOf(e) };
    })
    .sort((a, b) => a.pct - b.pct);

  for (let i = 1; i < placed.length; i++) {
    const minPct = placed[i - 1].pct + NODE_GAP;
    if (placed[i].pct < minPct) placed[i].pct = Math.min(OUTER, minPct);
  }
  return placed;
}

type Tick = { key: string; side: "past" | "future"; pct: number; label: string };

/**
 * Ruler ticks for the visible window: a few evenly spaced marks on each side of
 * NOW, each labeled with the actual date at that time offset. The label format
 * adapts to the zoom level (day view → day/month, wider → month/year) so the
 * ruler stays readable like an editor's timecode.
 */
function buildTicks(now: number, spanDays: number): Tick[] {
  const dayMs = 86_400_000;
  const fmt: Intl.DateTimeFormatOptions =
    spanDays <= 31
      ? { day: "numeric", month: "short" }
      : spanDays <= 365 * 2
        ? { month: "short", year: "2-digit" }
        : { year: "numeric" };
  const df = new Intl.DateTimeFormat("ar", fmt);
  // Three evenly spaced marks per side (skip the innermost on-center tick which
  // would just repeat the center date), so the ruler reads like the mockup.
  const fracs = [
    INNER + (OUTER - INNER) * 0.34,
    INNER + (OUTER - INNER) * 0.67,
    OUTER,
  ];
  const ticks: Tick[] = [];
  for (const side of ["past", "future"] as const) {
    const sign = side === "past" ? -1 : 1;
    for (const frac of fracs) {
      const offsetDays = ((frac - INNER) / (OUTER - INNER)) * spanDays;
      const date = now + sign * offsetDays * dayMs;
      ticks.push({ key: `${side}-${frac}`, side, pct: frac, label: df.format(date) });
    }
  }
  return ticks;
}

/** Human-readable label for the half-window span, prefixed with ± (each side). */
function formatSpan(days: number, t: (k: string, v?: Record<string, number>) => string): string {
  if (days >= 365) return `± ${t("spanYears", { n: Math.round(days / 365) })}`;
  if (days >= 30) return `± ${t("spanMonths", { n: Math.round(days / 30) })}`;
  return `± ${t("spanDays", { n: days })}`;
}

/**
 * Floating tooltip following the cursor along the rail, showing the weekday,
 * full date, and time at the hovered instant plus a "click to add" hint, so the
 * user can aim a click precisely before opening the quick-add popup (FEAT-FNO).
 */
function HoverReadout({
  atISO,
  side,
  pct,
  hint,
}: {
  atISO: string;
  side: "past" | "future";
  pct: number;
  hint: string;
}) {
  // Read the snapped instant in UTC so the date/time match what was computed
  // (noon UTC) regardless of the viewer's timezone — no off-by-one date drift.
  const utc = { timeZone: "UTC" } as const;
  const d = new Date(atISO);
  const day = d.toLocaleDateString("ar", { weekday: "long", ...utc });
  const date = d.toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric", ...utc });
  const time = d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit", ...utc });
  // Place from CENTER with the same formula the ruler ticks use (past = right,
  // future = left in RTL) so the card sits exactly over the tick it names.
  const posStyle =
    side === "past" ? { right: `calc(50% + ${pct * 100}%)` } : { left: `calc(50% + ${pct * 100}%)` };
  return (
    <div
      className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-[calc(50%+3.25rem)]"
      style={{ ...posStyle }}
      data-testid="hover-readout"
    >
      {/* guide line down to the axis */}
      <span className="absolute left-1/2 top-full h-12 w-px -translate-x-1/2 bg-cosmic-amber/40" />
      <div className="cosmic-inset whitespace-nowrap rounded-lg px-2.5 py-1.5 text-center shadow-glow-amber">
        <div className="text-[11px] font-bold text-cosmic-ink">{day}</div>
        <div className="text-[10px] tabular-nums text-cosmic-muted">
          {date} · {time}
        </div>
        <div className="mt-0.5 text-[9px] font-medium text-cosmic-amber">{hint}</div>
      </div>
    </div>
  );
}

// Arabic label per privacy circle, shown on the hover preview card.
const CIRCLE_LABEL: Record<string, string> = {
  FAMILY: "العائلة",
  PUBLIC_UNLISTED: "عام (غير مُدرج)",
  ME_ONLY: "أنا فقط",
};

/**
 * A timeline node. At rest it shows the neon icon + a compact title bubble.
 * Hovering or keyboard-focusing the node reveals a richer PREVIEW card (note
 * snippet, full date, media thumbnail, privacy circle); the preview is part of
 * the same button so the whole hit area — node, bubble, and preview — opens the
 * event popup on click (`onOpen`). `data-node` + stopPropagation keep this click
 * from being read as an add-on-rail click.
 */
function Node({
  n,
  side,
  up,
  onOpen,
  t,
}: {
  n: Positioned;
  side: "past" | "future";
  up: boolean;
  onOpen: (id: string) => void;
  t: (k: string, v?: Record<string, number>) => string;
}) {
  const glow = KIND_GLOW[n.kind];
  // In RTL: past = start side (right) → use `right`; future = end (left) → `left`.
  const posStyle =
    side === "past" ? { right: `calc(50% + ${n.pct * 100}%)` } : { left: `calc(50% + ${n.pct * 100}%)` };
  const label = (n.e.note ?? "حدث").slice(0, 18);
  const date = new Date(n.e.occurredOn).toLocaleDateString("ar", { month: "short", year: "numeric" });

  // Richer copy for the hover preview.
  const snippet = (n.e.note ?? "").trim().slice(0, 90);
  const fullDate = new Date(n.e.occurredOn).toLocaleDateString("ar", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Only show a thumbnail for image media — video/audio publicIds aren't images
  // and would render a broken <img>; their kind icon already conveys the type.
  const thumb = n.kind === "image" ? n.e.media[0]?.publicId : undefined;
  const circleLabel = CIRCLE_LABEL[n.e.circle] ?? n.e.circle;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // don't let the rail treat this as an add-click
        onOpen(n.e.id);
      }}
      data-node
      style={{ ...posStyle, ["--glow" as string]: glow }}
      className="group absolute top-1/2 z-10 -translate-y-1/2 cursor-pointer focus:z-30 focus:outline-none hover:z-30"
      aria-label={t("openEvent")}
      title={label}
    >
      {/* connector from axis to bubble */}
      <span
        className={`absolute left-1/2 w-px -translate-x-1/2 bg-[rgba(var(--glow),0.5)] ${
          up ? "bottom-1/2 h-10" : "top-1/2 h-10"
        }`}
      />

      {/* compact title bubble (resting state) — fades out as the preview appears */}
      <span
        className={`cosmic-inset absolute left-1/2 w-max max-w-[9rem] -translate-x-1/2 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-bold text-cosmic-ink transition-opacity duration-150 group-hover:opacity-0 group-focus:opacity-0 ${
          up ? "bottom-[calc(50%+2.5rem)]" : "top-[calc(50%+2.5rem)]"
        }`}
        style={{ borderColor: `rgba(${glow},0.5)` }}
      >
        {label}
        <span className="block text-[9px] font-medium text-cosmic-muted">{date}</span>
      </span>

      {/* rich preview card — revealed on hover / focus, sits on the same side as
          the bubble. pointer-events stay enabled so a click on it opens the popup
          (the whole node is one button, so the click bubbles up to onOpen). */}
      <span
        className={`cosmic-panel invisible absolute left-1/2 z-30 w-60 -translate-x-1/2 scale-95 rounded-2xl p-3 text-right opacity-0 shadow-glow-blue transition-all duration-150 group-hover:visible group-hover:scale-100 group-hover:opacity-100 group-focus:visible group-focus:scale-100 group-focus:opacity-100 ${
          up ? "bottom-[calc(50%+2.5rem)]" : "top-[calc(50%+2.5rem)]"
        }`}
        style={{ borderColor: `rgba(${glow},0.5)` }}
        data-testid="event-preview"
        dir="rtl"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-cosmic-ink">
            <span className="text-sm leading-none">{KIND_ICON[n.kind]}</span>
            {fullDate}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{ color: `rgb(${glow})`, background: `rgba(${glow},0.14)` }}
          >
            {circleLabel}
          </span>
        </span>

        {thumb && (
          <img
            src={`/api/media/${thumb}`}
            alt=""
            className="mt-2 h-24 w-full rounded-lg object-cover"
            loading="lazy"
          />
        )}

        {snippet ? (
          <span className="mt-2 block whitespace-pre-wrap text-[11px] leading-relaxed text-cosmic-ink/90">
            {snippet}
            {(n.e.note?.length ?? 0) > 90 ? "…" : ""}
          </span>
        ) : (
          <span className="mt-2 block text-[11px] italic text-cosmic-muted">{t("noNote")}</span>
        )}

        {n.e.placeName && (
          <span className="mt-1.5 flex items-center gap-1 text-[10px] text-cosmic-muted">
            <span aria-hidden>📍</span>
            <span className="truncate">{n.e.placeName}</span>
          </span>
        )}

        <span className="mt-2 block text-[10px] font-bold text-cosmic-blue">{t("openEventHint")}</span>
      </span>

      {/* the node — a SOLID colored disc with a white glyph + ring (mockup 2),
          replacing the earlier tinted-fill chip. Color comes from the kind glow. */}
      <span
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-lg text-white ring-2 ring-white/70 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:scale-[1.07]"
        style={{
          background: `rgb(${glow})`,
          boxShadow: `0 8px 20px -6px rgba(${glow},0.6)`,
        }}
      >
        {KIND_ICON[n.kind]}
      </span>
    </button>
  );
}
