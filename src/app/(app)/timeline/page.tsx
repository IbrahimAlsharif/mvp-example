import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentAccount } from "@/lib/auth/session";
import { listOwnEvents } from "@/lib/events/create";
import { TimelineView } from "@/components/timeline/TimelineView";
import type { EventVM } from "@/lib/events/view";
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
  const events = await listOwnEvents(account.id);
  // Owner display name: local-part of the email (no displayName field in schema).
  const ownerName = account.email.split("@")[0];

  // Serializable view-models for the client timeline (Date → ISO across the
  // RSC boundary; surface location coordinates for the map).
  const vm: EventVM[] = events.map((e) => ({
    id: e.id,
    note: e.note,
    occurredOn: e.occurredOn.toISOString(),
    circle: e.circle,
    media: e.media.map((m) => ({ publicId: m.publicId })),
    lat: e.locationLat,
    lng: e.locationLng,
  }));

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
              className="whitespace-nowrap rounded-xl bg-accent-gradient px-4 py-2 text-sm font-bold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/40 active:translate-y-0"
              data-testid="add-event"
            >
              {t("addEvent")}
            </Link>
            <SignOutButton label={t("signOut")} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
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
          <TimelineView events={vm} ownerName={ownerName} />
        )}
      </main>
    </div>
  );
}
