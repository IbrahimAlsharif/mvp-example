import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentAccount } from "@/lib/auth/session";
import { listOwnEvents } from "@/lib/events/create";
import { CosmicCommandCenter } from "@/components/timeline/cosmic/CosmicCommandCenter";
import { SignOutButton } from "./SignOutButton";
import type { EventVM } from "@/lib/events/view";

/**
 * Home timeline (J1 landing) — the dark "cosmic command center" view. Protected.
 * Lists the user's own events (reads hit Postgres, so a just-saved event is
 * fresh on any session — AC-15) and offers the "+ Add event" entry (AC-1).
 * The cosmic theme is scoped to this page via `.timeline-cosmic`.
 */
export default async function TimelinePage() {
  const account = await getCurrentAccount();
  if (!account || account.status !== "ACTIVE") redirect("/signin");

  const t = await getTranslations("cosmic");
  const tn = await getTranslations("nav");
  const events = await listOwnEvents(account.id);
  const ownerName = account.email.split("@")[0];

  const vm: EventVM[] = events.map((e) => ({
    id: e.id,
    note: e.note,
    occurredOn: e.occurredOn.toISOString(),
    circle: e.circle,
    media: e.media.map((m) => ({ publicId: m.publicId })),
    lat: e.locationLat,
    lng: e.locationLng,
  }));

  // "Now" is computed on the server so the past/future split is deterministic
  // across the RSC boundary (no client clock divergence).
  const nowISO = new Date().toISOString();

  return (
    <div className="timeline-cosmic flex h-screen flex-col overflow-hidden">
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
            <SignOutButton label={tn("signOut")} />
          </div>
        </div>
      </header>

      <CosmicCommandCenter events={vm} ownerName={ownerName} nowISO={nowISO} />
    </div>
  );
}
