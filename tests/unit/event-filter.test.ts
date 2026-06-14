import { describe, it, expect } from "vitest";
import type { PrivacyCircle } from "@prisma/client";
import { applyFilters, emptyFilters, locatedEvents, withinRange } from "@/lib/events/filter";
import type { EventVM } from "@/lib/events/view";

function ev(over: Partial<EventVM> = {}): EventVM {
  return {
    id: over.id ?? "e1",
    note: over.note ?? "note",
    occurredOn: over.occurredOn ?? "2026-06-14T00:00:00.000Z",
    circle: over.circle ?? "ME_ONLY",
    media: over.media ?? [],
    lat: over.lat ?? null,
    lng: over.lng ?? null,
  };
}

const circle = (c: PrivacyCircle): Set<PrivacyCircle> => new Set([c]);

describe("applyFilters", () => {
  it("returns everything when no filters are set", () => {
    const events = [ev({ id: "a" }), ev({ id: "b", circle: "FAMILY" })];
    expect(applyFilters(events, emptyFilters)).toHaveLength(2);
  });

  it("filters by a single circle", () => {
    const events = [ev({ id: "me", circle: "ME_ONLY" }), ev({ id: "fam", circle: "FAMILY" })];
    const out = applyFilters(events, { ...emptyFilters, circles: circle("FAMILY") });
    expect(out.map((e) => e.id)).toEqual(["fam"]);
  });

  it("filters by multiple circles (union)", () => {
    const events = [
      ev({ id: "me", circle: "ME_ONLY" }),
      ev({ id: "fam", circle: "FAMILY" }),
      ev({ id: "pub", circle: "PUBLIC_UNLISTED" }),
    ];
    const out = applyFilters(events, {
      ...emptyFilters,
      circles: new Set<PrivacyCircle>(["ME_ONLY", "PUBLIC_UNLISTED"]),
    });
    expect(out.map((e) => e.id).sort()).toEqual(["me", "pub"]);
  });

  it("filters by inclusive date range (day granularity)", () => {
    const events = [
      ev({ id: "before", occurredOn: "2026-05-31T12:00:00.000Z" }),
      ev({ id: "start", occurredOn: "2026-06-01T00:00:00.000Z" }),
      ev({ id: "mid", occurredOn: "2026-06-15T23:59:00.000Z" }),
      ev({ id: "end", occurredOn: "2026-06-30T08:00:00.000Z" }),
      ev({ id: "after", occurredOn: "2026-07-01T00:00:00.000Z" }),
    ];
    const out = applyFilters(events, { ...emptyFilters, from: "2026-06-01", to: "2026-06-30" });
    expect(out.map((e) => e.id)).toEqual(["start", "mid", "end"]);
  });

  it("honors an open-ended (from only) range", () => {
    const events = [
      ev({ id: "old", occurredOn: "2025-01-01T00:00:00.000Z" }),
      ev({ id: "new", occurredOn: "2026-06-14T00:00:00.000Z" }),
    ];
    const out = applyFilters(events, { ...emptyFilters, from: "2026-01-01", to: null });
    expect(out.map((e) => e.id)).toEqual(["new"]);
  });

  it("filters by hasMedia tri-state", () => {
    const events = [
      ev({ id: "with", media: [{ publicId: "p1" }] }),
      ev({ id: "without", media: [] }),
    ];
    expect(applyFilters(events, { ...emptyFilters, hasMedia: true }).map((e) => e.id)).toEqual(["with"]);
    expect(applyFilters(events, { ...emptyFilters, hasMedia: false }).map((e) => e.id)).toEqual(["without"]);
    expect(applyFilters(events, { ...emptyFilters, hasMedia: null })).toHaveLength(2);
  });

  it("filters by hasLocation tri-state", () => {
    const events = [
      ev({ id: "located", lat: 25.2, lng: 55.3 }),
      ev({ id: "nowhere", lat: null, lng: null }),
    ];
    expect(applyFilters(events, { ...emptyFilters, hasLocation: true }).map((e) => e.id)).toEqual(["located"]);
    expect(applyFilters(events, { ...emptyFilters, hasLocation: false }).map((e) => e.id)).toEqual(["nowhere"]);
  });

  it("combines filters (AND across dimensions)", () => {
    const events = [
      ev({ id: "match", circle: "FAMILY", media: [{ publicId: "p" }], lat: 1, lng: 2, occurredOn: "2026-06-10T00:00:00.000Z" }),
      ev({ id: "wrongCircle", circle: "ME_ONLY", media: [{ publicId: "p" }], lat: 1, lng: 2, occurredOn: "2026-06-10T00:00:00.000Z" }),
      ev({ id: "noMedia", circle: "FAMILY", media: [], lat: 1, lng: 2, occurredOn: "2026-06-10T00:00:00.000Z" }),
    ];
    const out = applyFilters(events, {
      circles: circle("FAMILY"),
      from: "2026-06-01",
      to: "2026-06-30",
      hasMedia: true,
      hasLocation: true,
    });
    expect(out.map((e) => e.id)).toEqual(["match"]);
  });
});

describe("withinRange", () => {
  it("includes events inside the visible window, excludes outside", () => {
    const e = ev({ occurredOn: "2026-06-14T00:00:00.000Z" });
    expect(withinRange(e, new Date("2026-06-01"), new Date("2026-06-30"))).toBe(true);
    expect(withinRange(e, new Date("2026-07-01"), new Date("2026-07-31"))).toBe(false);
  });
});

describe("locatedEvents", () => {
  it("keeps only events with coordinates", () => {
    const events = [ev({ id: "a", lat: 1, lng: 2 }), ev({ id: "b" })];
    const out = locatedEvents(events);
    expect(out.map((e) => e.id)).toEqual(["a"]);
    // narrowed type: lat/lng are non-null
    expect(out[0].lat).toBe(1);
  });
});
