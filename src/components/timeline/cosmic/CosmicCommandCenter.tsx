"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PrivacyCircle } from "@prisma/client";
import type { EventVM } from "@/lib/events/view";
import { applyFilters, emptyFilters, type TimelineFilters as Filters } from "@/lib/events/filter";
import { CosmicTimeline } from "./CosmicTimeline";
import { LifeCircles } from "./LifeCircles";
import { QuickAddPopup } from "./QuickAddPopup";
import { EventModal } from "./EventModal";

const EventMap = dynamic(() => import("../EventMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[220px] items-center justify-center rounded-2xl border border-cosmic-border bg-cosmic-surface/50 text-sm text-cosmic-muted">
      …
    </div>
  ),
});

// RGB triplets matching the redefined light cosmic-* tokens so the filter pills'
// tinted fill + text stay legible on the white surface.
const CIRCLES: { key: PrivacyCircle; labelKey: string; glow: string }[] = [
  { key: "FAMILY", labelKey: "family", glow: "37,99,235" },
  { key: "PUBLIC_UNLISTED", labelKey: "public_unlisted", glow: "124,58,237" },
  { key: "PUBLIC", labelKey: "public", glow: "16,185,129" },
  { key: "ME_ONLY", labelKey: "me_only", glow: "234,88,12" },
];

// Interest galaxies — PRESENTATIONAL SCAFFOLD (no data model for interests).
const INTERESTS = [
  { label: "شِعر", icon: "🪶" },
  { label: "رسم", icon: "🎨" },
  { label: "أدب", icon: "📖" },
];

// The relationship/interest sidebars (LifeCircles + interest galaxies) are
// presentational scaffolds backed by PLACEHOLDER data — there is no relationship
// model in the schema yet. Showing fabricated family data to a signed-in user on
// a privacy/trust product is misleading, so they are hidden by default and only
// shown when explicitly opted in. Set NEXT_PUBLIC_SHOW_SCAFFOLD_UI=true to render
// them in design/demo contexts. Remove this gate once they are wired to real data.
const SHOW_SCAFFOLD_UI = process.env.NEXT_PUBLIC_SHOW_SCAFFOLD_UI === "true";

export function CosmicCommandCenter({
  events,
  ownerName,
  ownerAvatar,
  nowISO,
}: {
  events: EventVM[];
  ownerName: string;
  ownerAvatar: string;
  nowISO: string;
}) {
  const t = useTranslations("cosmic");
  const tc = useTranslations("circle");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  // The event whose popup is open (set by clicking a node or its hover preview);
  // null = no popup. Replaces the old left-side "selected event" panel.
  const [openId, setOpenId] = useState<string | null>(null);

  // Local copy of the events so a quick-add saved from the rail renders right
  // away (the server list seeds it; new events prepend). Falls back to the prop
  // on a full navigation/refresh.
  const [localEvents, setLocalEvents] = useState<EventVM[]>(events);
  // The instant + anchor the user clicked on the rail; non-null opens the popup.
  const [quickAdd, setQuickAdd] = useState<{ atISO: string; anchor: { xPct: number; up: boolean } } | null>(null);
  // Transient success toast shown after a quick-add save (parity with the
  // full-form `?saved=1` confirmation; clears itself after a few seconds).
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => applyFilters(localEvents, filters), [localEvents, filters]);
  const located = useMemo(() => filtered.filter((e) => e.lat != null && e.lng != null), [filtered]);
  // The event backing the open popup, resolved against the filtered set so a
  // filter change that hides it also closes the popup.
  const openEvent = openId ? (filtered.find((e) => e.id === openId) ?? null) : null;

  function toggleCircle(c: PrivacyCircle) {
    setFilters((f) => {
      const next = new Set(f.circles);
      next.has(c) ? next.delete(c) : next.add(c);
      return { ...f, circles: next };
    });
  }

  const allActive = filters.circles.size === 0;

  // Re-seed local events when the server prop changes (e.g. after router.refresh
  // following a full-form save) so the rail never drifts from the source of truth.
  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  function onQuickAddSaved(saved: EventVM) {
    setLocalEvents((prev) => [saved, ...prev]);
    setQuickAdd(null);
    // Explicit success confirmation (parity with the full-form save), then show
    // the freshly-saved event in its popup so the user sees it land.
    setToast(t("saveAnnounce"));
    setOpenId(saved.id);
  }

  // Auto-dismiss the success toast a few seconds after it appears.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="flex min-h-0 flex-1 flex-col" dir="rtl">
      {/* Transient success toast after a quick-add save (aria-live for SR users). */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="quick-add-toast"
          className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-cosmic-teal/95 px-4 py-2 text-center text-[13px] font-bold text-cosmic-bg shadow-glow-teal"
        >
          ✓ {toast}
        </div>
      )}
      {/* Content row fills the space between the page header and the toolbar; on
          large screens it never scrolls the page — columns scroll internally. */}
      <div
        className={`mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 gap-3 overflow-y-auto px-3 py-3 lg:overflow-hidden ${
          SHOW_SCAFFOLD_UI ? "lg:grid-cols-[17rem_minmax(0,1fr)_10rem]" : "lg:grid-cols-[17rem_minmax(0,1fr)]"
        }`}
      >
        {/* ── Left column: profile + life circles ── */}
        <aside className="order-2 flex min-h-0 flex-col gap-3 lg:order-1 lg:overflow-y-auto">
          {/* profile */}
          <div className="cosmic-panel flex flex-col items-center p-4 text-center">
            <div className="relative h-20 w-20">
              <span className="pulse-ring" />
              <span className="pulse-ring [animation-delay:1.2s]" />
              {/* eslint-disable-next-line @next/next/no-img-element -- local static SVG; next/image not configured */}
              <img
                src={ownerAvatar}
                alt=""
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-cosmic-teal/60"
              />
            </div>
            <p className="mt-2 text-xs font-bold text-cosmic-teal">{t("meNow")}</p>
            <p className="text-base font-extrabold text-cosmic-ink">{ownerName}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-cosmic-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-cosmic-teal shadow-glow-teal" />
              {t("livePulse")} ┄┉┄
            </span>
          </div>

          {SHOW_SCAFFOLD_UI && <LifeCircles />}
        </aside>

        {/* ── Center column: timeline + map (map flexes to fill) ── */}
        <main className="order-1 flex min-h-0 flex-col gap-3 lg:order-2">
          {localEvents.length === 0 ? (
            <div className="cosmic-panel relative">
              <div className="p-12 text-center text-cosmic-muted">
                لا توجد ذكريات بعد. اضغط على الخط الزمني لإضافة أول حدث.
              </div>
            </div>
          ) : (
            <div className="relative">
              <CosmicTimeline
                events={filtered}
                nowISO={nowISO}
                onOpen={setOpenId}
                onAddAt={(atISO, anchor) => setQuickAdd({ atISO, anchor })}
              />
              {quickAdd && (
                <QuickAddPopup
                  atISO={quickAdd.atISO}
                  anchor={quickAdd.anchor}
                  onClose={() => setQuickAdd(null)}
                  onSaved={onQuickAddSaved}
                />
              )}
            </div>
          )}

          {/* Life Map — flexes to consume the remaining center height */}
          <div className="cosmic-panel flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <div className="mb-2 flex items-baseline gap-2">
              <h3 className="text-base font-extrabold text-cosmic-ink">{t("lifeMap")}</h3>
              <span className="text-[11px] text-cosmic-muted">{t("lifeMapSub")}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-xl">
              <EventMap events={located} theme="light" height="100%" />
            </div>
          </div>
        </main>

        {/* ── Right column: interest galaxies (scaffold, opt-in only) ── */}
        {SHOW_SCAFFOLD_UI && (
          <aside className="order-3 min-h-0 lg:order-3 lg:overflow-y-auto">
            <div className="cosmic-panel p-3 text-center">
              <h3 className="mb-3 text-xs font-bold text-cosmic-ink">{t("interestGalaxies")}</h3>
              <div className="flex flex-row justify-center gap-3 lg:flex-col lg:items-center">
                {INTERESTS.map((it) => (
                  <div key={it.label} className="flex flex-col items-center gap-1">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cosmic-surface2 text-xl shadow-glow-purple ring-1 ring-cosmic-purple/50">
                      {it.icon}
                    </span>
                    <span className="text-[10px] text-cosmic-muted">{it.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[9px] italic text-cosmic-muted/70">{t("scaffoldNote")}</p>
            </div>
          </aside>
        )}
      </div>

      {/* ── Bottom toolbar (in-flow, fixed height) ── */}
      <div className="shrink-0 border-t border-cosmic-border bg-cosmic-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-2.5" dir="rtl">
          {/* circle filters — multi-select: each circle toggles independently;
              "All" clears the selection. Grouped + labelled so assistive tech
              announces it as a multi-select filter rather than peer toggles. */}
          <div
            role="group"
            aria-label={t("circleFilterLabel")}
            className="flex items-center gap-1.5"
          >
            <span className="text-[11px] text-cosmic-muted" aria-hidden>
              {t("circleAll")}:
            </span>
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, circles: new Set() }))}
              aria-pressed={allActive}
              aria-label={t("circleAllHint")}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                allActive ? "bg-cosmic-amber/20 text-cosmic-amber ring-1 ring-cosmic-amber/60" : "text-cosmic-muted hover:text-cosmic-ink"
              }`}
            >
              {t("circleAll")}
            </button>
            {CIRCLES.map((c) => {
              const active = filters.circles.has(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCircle(c.key)}
                  aria-pressed={active}
                  style={{ ["--glow" as string]: c.glow }}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                    active
                      ? "bg-[rgba(var(--glow),0.18)] text-[rgb(var(--glow))] ring-1 ring-[rgba(var(--glow),0.6)]"
                      : "text-cosmic-muted hover:text-cosmic-ink"
                  }`}
                >
                  {tc(c.labelKey)}
                </button>
              );
            })}
          </div>

          {/* actions */}
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-cosmic-border px-3 py-2 text-[11px] font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2"
            >
              🔒 {t("maxPrivacy")}
            </button>
            <button
              type="button"
              className="rounded-xl border border-cosmic-border px-3 py-2 text-[11px] font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2"
            >
              💬 {t("askAdvice")}
            </button>
            <Link
              href="/events/import"
              data-testid="bulk-import"
              className="rounded-xl border border-cosmic-border px-3 py-2 text-[11px] font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2"
            >
              🖼️ {t("bulkImport")}
            </Link>
            <Link
              href="/events/new"
              data-testid="add-event"
              className="rounded-xl bg-gradient-to-l from-cosmic-blue to-cosmic-purple px-4 py-2 text-[11px] font-bold text-white shadow-glow-blue transition-transform hover:-translate-y-0.5"
            >
              {t("addEvent")}
            </Link>
          </div>
        </div>
      </div>

      {/* Event popup — opened by clicking a timeline node or its hover preview. */}
      {openEvent && (
        <EventModal event={openEvent} ownerName={ownerName} editable={openEvent.isOwn ?? false} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}
