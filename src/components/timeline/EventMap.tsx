"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { EventVM } from "@/lib/events/view";
import { absoluteDate } from "@/lib/events/date";

// Brand-colored teardrop built from inline SVG → divIcon. Avoids Leaflet's
// default-icon asset path (which breaks under bundlers) entirely.
const brandIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:24px;height:24px;border-radius:50% 50% 50% 0;
    background:linear-gradient(135deg,#2563EB 0%,#4F46E5 55%,#F97316 130%);
    transform:rotate(-45deg);box-shadow:0 4px 10px -2px rgba(37,99,235,.5);
    border:2px solid #fff"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -22],
});

/**
 * Leaflet map of located events. Rendered client-only (loaded via next/dynamic
 * with ssr:false in TimelineView). `events` is already the filtered + visible
 * set; only those with coordinates get a pin. Auto-fits to the markers.
 */
export default function EventMap({ events }: { events: EventVM[] }) {
  const t = useTranslations("timeline");
  const located = useMemo(
    () => events.filter((e): e is EventVM & { lat: number; lng: number } => e.lat != null && e.lng != null),
    [events],
  );

  if (located.length === 0) {
    return (
      <div
        data-testid="map-empty"
        className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 text-sm text-neutral-500"
      >
        🗺️ {t("noLocatedEvents")}
      </div>
    );
  }

  const center: [number, number] = [located[0].lat, located[0].lng];
  const bounds = L.latLngBounds(located.map((e) => [e.lat, e.lng] as [number, number]));

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/70 shadow-card" data-testid="event-map">
      <MapContainer
        center={center}
        bounds={located.length > 1 ? bounds : undefined}
        zoom={located.length > 1 ? undefined : 12}
        scrollWheelZoom
        style={{ height: 420, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((e) => (
          <Marker key={e.id} position={[e.lat, e.lng]} icon={brandIcon}>
            <Popup>
              <div className="text-sm" dir="rtl">
                <p className="font-bold">{e.note ?? "حدث"}</p>
                <p className="text-xs text-neutral-500">{absoluteDate(e.occurredOn)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
