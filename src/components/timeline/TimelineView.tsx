"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { EventVM } from "@/lib/events/view";
import { applyFilters, emptyFilters, withinRange, type TimelineFilters as Filters } from "@/lib/events/filter";
import { EventCard } from "@/components/EventCard";
import { TimelineFilters, type View } from "./TimelineFilters";
import { HorizontalTimeline, type ZoomLevel } from "./HorizontalTimeline";

// Leaflet is browser-only — load the map without SSR.
const EventMap = dynamic(() => import("./EventMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-neutral-200/70 bg-white/60 text-sm text-neutral-400">
      …
    </div>
  ),
});

/**
 * Interactive timeline shell: owns filters, zoom level, the visible time
 * window, the current view (timeline | map), and the selected event. Filtered
 * events feed the horizontal timeline; the map additionally intersects them
 * with the visible window so it mirrors what the timeline shows.
 */
export function TimelineView({ events, ownerName }: { events: EventVM[]; ownerName: string }) {
  const t = useTranslations("timeline");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [view, setView] = useState<View>("timeline");
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null);
  // Default selection = newest event, so a card is always visible on landing.
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id ?? null);

  const filtered = useMemo(() => applyFilters(events, filters), [events, filters]);

  // The map mirrors the timeline's visible window (when one has been emitted).
  const mapEvents = useMemo(() => {
    if (!range) return filtered;
    return filtered.filter((e) => withinRange(e, range.start, range.end));
  }, [filtered, range]);

  const selected =
    filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div data-testid="timeline-view">
      <TimelineFilters
        filters={filters}
        onChange={setFilters}
        view={view}
        onViewChange={setView}
        shown={filtered.length}
        total={events.length}
      />

      {view === "timeline" ? (
        <HorizontalTimeline
          events={filtered}
          zoom={zoom}
          onZoomChange={setZoom}
          onSelect={setSelectedId}
          onRangeChange={(start, end) => setRange({ start, end })}
        />
      ) : (
        <EventMap events={mapEvents} />
      )}

      {filtered.length === 0 && (
        <p
          data-testid="timeline-no-results"
          className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-8 text-center text-sm text-neutral-500"
        >
          {t("noResults")}
        </p>
      )}

      {/* Selected-event detail (also guarantees a visible event card). */}
      {selected && (
        <div className="mt-5" data-testid="selected-event">
          <EventCard event={selected} ownerName={ownerName} />
        </div>
      )}
    </div>
  );
}
