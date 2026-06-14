import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentAccount } from "@/lib/auth/session";
import { listVisibleEvents } from "@/lib/events/create";
import { safeEmit } from "@/lib/telemetry";
import { CosmicCommandCenter } from "@/components/timeline/cosmic/CosmicCommandCenter";
import { SignOutButton } from "./SignOutButton";
import type { EventVM } from "@/lib/events/view";

/**
 * Home timeline (J1 landing) — the dark "cosmic command center" view. Protected.
 * Lists every event the viewer may see (their own + graph-permitted events of
 * their accepted FAMILY/GENERAL connections — J3/J9), enforced server-side via
 * listVisibleEvents. Reads hit Postgres, so a just-saved event is fresh on any
 * session (AC-15). Offers the "+ Add event" entry (AC-1). The cosmic theme is
 * scoped to this page via `.timeline-cosmic`.
 */
export default async function TimelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string }>;
}) {
  const account = await getCurrentAccount();
  if (!account || account.status !== "ACTIVE") redirect("/signin");

  const sp = (await searchParams) ?? {};
  const justSaved = sp.saved === "1";

  const t = await getTranslations("cosmic");
  const tn = await getTranslations("nav");
  const events = await listVisibleEvents(account.id);
  const ownerName = account.email.split("@")[0];

  const vm: EventVM[] = events.map((e) => ({
    id: e.id,
    note: e.note,
    occurredOn: e.occurredOn.toISOString(),
    circle: e.circle,
    media: e.media.map((m) => ({ publicId: m.publicId })),
    lat: e.locationLat,
    lng: e.locationLng,
    isOwn: e.accountId === account.id,
  }));

  // Content-blind browse signal (US-0.3 taxonomy). A revisit to a populated
  // timeline (>1 distinct day) is the "come back" half of the bet; the
  // first_revisit funnel stage is attained once a populated timeline is browsed.
  const distinctDays = new Set(vm.map((e) => e.occurredOn.slice(0, 10))).size;
  const isPopulated = distinctDays >= 2;
  safeEmit("timeline_view_opened", { granularity: "day" });
  if (isPopulated) safeEmit("funnel_stage_attained", { stage: "first_revisit" });

  // "Now" is computed on the server so the past/future split is deterministic
  // across the RSC boundary (no client clock divergence).
  const nowISO = new Date().toISOString();

  return (
    <div className="timeline-cosmic flex h-screen flex-col overflow-hidden">
      {/* Announce a just-completed durable save to assistive tech only AFTER the
          server-confirmed write + redirect landed here (US-0.4 AC-10). */}
      {justSaved && (
        <p role="status" aria-live="polite" className="sr-only">
          {t("saveAnnounce")}
        </p>
      )}
      <header className="shrink-0 border-b border-cosmic-border bg-cosmic-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-5 py-3" dir="rtl">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cosmic-blue to-cosmic-purple text-lg shadow-glow-blue">
              ⏳
            </span>
            <h1 className="text-lg font-extrabold text-cosmic-ink">{tn("timeline")}</h1>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <input
              type="search"
              placeholder={t("search")}
              aria-label={t("search")}
              className="hidden w-56 rounded-xl border border-cosmic-border bg-cosmic-surface/60 px-3 py-2 text-sm text-cosmic-ink placeholder:text-cosmic-muted focus:outline-none focus:ring-1 focus:ring-cosmic-blue/60 sm:block"
            />
            <button
              type="button"
              className="rounded-xl border border-cosmic-border px-3 py-2 text-xs font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2"
            >
              📅 {t("fullFamilyHistory")}
            </button>
            <a
              href="/api/export"
              download
              className="rounded-xl border border-cosmic-border px-3 py-2 text-xs font-bold text-cosmic-ink transition-colors hover:bg-cosmic-surface2"
            >
              ⬇️ {t("export")}
            </a>
            <SignOutButton label={tn("signOut")} />
          </div>
        </div>
      </header>

      <CosmicCommandCenter events={vm} ownerName={ownerName} nowISO={nowISO} />
    </div>
  );
}
