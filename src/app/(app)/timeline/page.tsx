import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentAccount } from "@/lib/auth/session";
import { listOwnEvents } from "@/lib/events/create";
import { EventCard } from "@/components/EventCard";
import { absoluteDate, dayKey, daysAgo } from "@/lib/events/date";
import { SignOutButton } from "./SignOutButton";

/**
 * Home timeline (J1 landing). Protected. Lists the user's own events newest-
 * moment-first (reads hit Postgres, so a just-saved event is fresh on any
 * session — AC-15) and offers the "+ Add event" entry (AC-1).
 */
export default async function TimelinePage() {
  const account = await getCurrentAccount();
  if (!account || account.status !== "ACTIVE") redirect("/signin");

  const t = await getTranslations("nav");
  const te = await getTranslations("event");
  const events = await listOwnEvents(account.id);
  // Owner display name: local-part of the email (no displayName field in schema).
  const ownerName = account.email.split("@")[0];

  // Bucket events (already newest-day-first) into one group per calendar day so
  // the timeline reads as dated sections down a vertical spine, not a flat feed.
  const groups: { key: string; label: string; events: typeof events }[] = [];
  for (const e of events) {
    const key = dayKey(e.occurredOn);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const days = daysAgo(e.occurredOn);
      const label = days <= 0 ? te("today") : days === 1 ? te("yesterday") : absoluteDate(e.occurredOn);
      group = { key, label, events: [] };
      groups.push(group);
    }
    group.events.push(e);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-lg text-white shadow-brand">
              ⏳
            </span>
            <h1 className="bg-brand-gradient bg-clip-text text-xl font-extrabold text-transparent">
              {t("timeline")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/events/new"
              className="rounded-xl bg-accent-gradient px-4 py-2 text-sm font-bold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/40 active:translate-y-0"
              data-testid="add-event"
            >
              {t("addEvent")}
            </Link>
            <SignOutButton label={t("signOut")} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <p
          data-testid="default-circle"
          data-circle={account.defaultCircle}
          className="mb-6 flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800"
        >
          <span aria-hidden>🔒</span>
          الخصوصية الافتراضية: أنا فقط
        </p>

        {events.length === 0 ? (
          <div
            className="animate-fade-in-up rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-12 text-center"
            data-testid="timeline-empty"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-brand-gradient text-3xl text-white shadow-brand">
              ✨
            </div>
            <p className="text-neutral-500">لا توجد ذكريات بعد. ابدأ بإضافة أول حدث.</p>
            <Link
              href="/events/new"
              className="mt-5 inline-block rounded-xl bg-accent-gradient px-6 py-2.5 font-bold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5"
            >
              {t("addEvent")}
            </Link>
          </div>
        ) : (
          // Vertical timeline: a spine runs down the inline-start edge; each dated
          // group hangs a dot + header off it, with its event cards beneath.
          <ol
            className="relative flex flex-col gap-8 border-neutral-200 ps-6 [border-inline-start-width:2px]"
            data-testid="timeline-list"
          >
            {groups.map((g, gi) => (
              <li key={g.key} data-testid="timeline-group" data-day={g.key}>
                {/* dot on the spine + date header */}
                <div className="relative mb-3 flex items-center gap-2">
                  <span className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand-gradient shadow-brand [inset-inline-start:-1.78rem]" />
                  <h2 className="text-sm font-bold text-brand-800">{g.label}</h2>
                </div>
                <div className="flex flex-col gap-5">
                  {g.events.map((e, i) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      ownerName={ownerName}
                      index={gi + i}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
