import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentAccount } from "@/lib/auth/session";
import { listOwnEvents } from "@/lib/events/create";
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

  return (
    <main className="mx-auto max-w-2xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("timeline")}</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/events/new"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
            data-testid="add-event"
          >
            {t("addEvent")}
          </Link>
          <SignOutButton label={t("signOut")} />
        </div>
      </header>

      <p
        data-testid="default-circle"
        data-circle={account.defaultCircle}
        className="mb-6 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-700"
      >
        الخصوصية الافتراضية: أنا فقط
      </p>

      {events.length === 0 ? (
        <p className="text-neutral-500" data-testid="timeline-empty">
          لا توجد ذكريات بعد. ابدأ بإضافة أول حدث.
        </p>
      ) : (
        <ul className="flex flex-col gap-4" data-testid="timeline-list">
          {events.map((e) => (
            <li
              key={e.id}
              data-testid="timeline-event"
              data-circle={e.circle}
              className="rounded-xl border border-neutral-200 p-4"
            >
              <div className="mb-1 text-sm text-neutral-500">
                {new Date(e.occurredOn).toLocaleDateString("ar")}
              </div>
              {e.note && <p className="mb-2 whitespace-pre-wrap">{e.note}</p>}
              {e.media.map((m) => (
                <img
                  key={m.publicId}
                  src={`/api/media/${m.publicId}`}
                  alt=""
                  className="max-h-64 rounded-lg"
                  data-testid="event-media"
                />
              ))}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
