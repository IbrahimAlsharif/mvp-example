"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Timeline, type DataItem, type TimelineOptions } from "vis-timeline/standalone";
import { DataSet } from "vis-data";
import "vis-timeline/styles/vis-timeline-graph2d.css";
import type { EventVM } from "@/lib/events/view";
import { hasLocation, hasMedia } from "@/lib/events/view";

export type ZoomLevel = "day" | "week" | "month" | "year";

const SPAN_MS: Record<ZoomLevel, number> = {
  day: 2 * 86_400_000, // ~2 days visible
  week: 14 * 86_400_000, // ~2 weeks
  month: 90 * 86_400_000, // ~3 months
  year: 730 * 86_400_000, // ~2 years
};

/**
 * Horizontal, zoomable timeline (vis-timeline). RTL-aware, brand-styled via
 * the `vis-event` class (see globals). Events become clickable items; clicking
 * one calls `onSelect`. Zoom buttons set the visible window; panning emits the
 * visible range through `onRangeChange` so the map can mirror it.
 */
export function HorizontalTimeline({
  events,
  zoom,
  onZoomChange,
  onSelect,
  onRangeChange,
}: {
  events: EventVM[];
  zoom: ZoomLevel;
  onZoomChange: (z: ZoomLevel) => void;
  onSelect: (id: string | null) => void;
  onRangeChange?: (start: Date, end: Date) => void;
}) {
  const t = useTranslations("timeline");
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const onSelectRef = useRef(onSelect);
  const onRangeRef = useRef(onRangeChange);
  const zoomRef = useRef(zoom);
  onSelectRef.current = onSelect;
  onRangeRef.current = onRangeChange;
  zoomRef.current = zoom;

  // Create the timeline once.
  useEffect(() => {
    if (!containerRef.current) return;
    const options: TimelineOptions = {
      rtl: true,
      stack: true,
      maxHeight: 420,
      minHeight: 220,
      horizontalScroll: true,
      zoomKey: "ctrlKey",
      orientation: { axis: "bottom" },
      // Generous item/axis margins so event chips never sit flush against the
      // RTL right edge of the track (was clipping the newest event).
      margin: { item: 16, axis: 16 },
      tooltip: { followMouse: true },
      // vis-timeline ships no Arabic moment locale, so the axis would render in
      // English. Format labels ourselves via Intl for proper Arabic months/days.
      format: {
        minorLabels: arLabel as (d: Date, scale: string, step: number) => string,
        majorLabels: arMajorLabel as (d: Date, scale: string, step: number) => string,
      },
    };
    const timeline = new Timeline(containerRef.current, new DataSet<DataItem>([]), options);
    timeline.on("select", (props: { items: (string | number)[] }) => {
      onSelectRef.current(props.items.length ? String(props.items[0]) : null);
    });
    timeline.on("rangechanged", (props: { start: Date; end: Date }) => {
      onRangeRef.current?.(props.start, props.end);
    });
    timelineRef.current = timeline;
    return () => {
      timeline.destroy();
      timelineRef.current = null;
    };
  }, []);

  // Feed items whenever the filtered event set changes.
  useEffect(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    const items: DataItem[] = events.map((e) => ({
      id: e.id,
      start: new Date(e.occurredOn),
      type: "box",
      content: itemContent(e),
      className: "vis-event",
      title: e.note ?? undefined,
    }));
    tl.setItems(new DataSet<DataItem>(items));
    // Don't use `tl.fit()`: with a couple of nearby events it collapses to a
    // ~2-day window, which drops vis-timeline onto an hour-of-day scale and
    // renders the track as an empty grid (12:00 · 16:00 …). For a life archive
    // that reads as broken. Instead frame the events centred in a window at
    // least as wide as the current zoom span, so the default view is always a
    // content-dense year/month rail.
    if (items.length > 0) frameEvents(tl, items, zoomRef.current);
  }, [events]);

  /** Centre the events in a window no narrower than the current zoom span. */
  function frameEvents(tl: Timeline, items: DataItem[], z: ZoomLevel) {
    const times = items.map((i) => new Date(i.start as Date).getTime());
    const lo = Math.min(...times);
    const hi = Math.max(...times);
    const center = (lo + hi) / 2;
    // Window = the wider of (events' own span + 20% padding) and the zoom span.
    const span = Math.max((hi - lo) * 1.2, SPAN_MS[z]);
    tl.setWindow(new Date(center - span / 2), new Date(center + span / 2), {
      animation: false,
    });
  }

  function applyZoom(z: ZoomLevel) {
    onZoomChange(z);
    const tl = timelineRef.current;
    if (!tl) return;
    const win = tl.getWindow();
    const center = (win.start.getTime() + win.end.getTime()) / 2;
    const half = SPAN_MS[z] / 2;
    tl.setWindow(new Date(center - half), new Date(center + half), { animation: true });
  }

  return (
    <div data-testid="horizontal-timeline">
      {/* zoom controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["day", "week", "month", "year"] as ZoomLevel[]).map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => applyZoom(z)}
            data-testid={`zoom-${z}`}
            aria-pressed={zoom === z}
            className={`tap-target rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              zoom === z ? "bg-brand-gradient text-white shadow-brand" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t(`zoom${z[0].toUpperCase()}${z.slice(1)}` as "zoomDay")}
          </button>
        ))}
        <div className="ms-auto flex items-center gap-1">
          <IconBtn label={t("zoomOut")} onClick={() => timelineRef.current?.zoomOut(0.5)}>−</IconBtn>
          <IconBtn label={t("zoomIn")} onClick={() => timelineRef.current?.zoomIn(0.5)}>＋</IconBtn>
          <IconBtn label={t("fit")} onClick={() => timelineRef.current?.fit()}>⛶</IconBtn>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-card"
      />
    </div>
  );
}

// Arabic axis labels via Intl (vis-timeline has no bundled `ar` moment locale).
// `scale` is one of millisecond|second|minute|hour|weekday|day|week|month|year.
// vis passes a moment-like object (not a native Date), so coerce via valueOf().
const AR = "ar";
function toDate(d: Date | { valueOf(): number }): Date {
  return d instanceof Date ? d : new Date(d.valueOf());
}
function arLabel(input: Date | { valueOf(): number }, scale: string): string {
  const date = toDate(input);
  switch (scale) {
    case "year":
      return date.toLocaleDateString(AR, { year: "numeric" });
    case "month":
      return date.toLocaleDateString(AR, { month: "short" });
    case "week":
    case "day":
      return date.toLocaleDateString(AR, { day: "numeric" });
    case "weekday":
      return date.toLocaleDateString(AR, { weekday: "short", day: "numeric" });
    case "hour":
    case "minute":
      return date.toLocaleTimeString(AR, { hour: "2-digit", minute: "2-digit" });
    default:
      return date.toLocaleDateString(AR);
  }
}
function arMajorLabel(input: Date | { valueOf(): number }, scale: string): string {
  const date = toDate(input);
  switch (scale) {
    case "year":
      return "";
    case "month":
    case "week":
    case "day":
    case "weekday":
      return date.toLocaleDateString(AR, { month: "long", year: "numeric" });
    case "hour":
    case "minute":
      return date.toLocaleDateString(AR, { weekday: "long", day: "numeric", month: "long" });
    default:
      return date.toLocaleDateString(AR, { year: "numeric" });
  }
}

function itemContent(e: EventVM): string {
  const icons = `${hasMedia(e) ? "📷" : ""}${hasLocation(e) ? "📍" : ""}`;
  const label = (e.note ?? "حدث").slice(0, 24);
  // vis-timeline renders this as HTML; keep it tiny + escaped.
  return `<span class="vis-event-label">${escapeHtml(label)} ${icons}</span>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="tap-target flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200"
    >
      {children}
    </button>
  );
}
