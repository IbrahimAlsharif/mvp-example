"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PrivacyCircle } from "@prisma/client";
import { CircleBadge } from "./CircleBadge";
import { absoluteDate, daysAgo } from "@/lib/events/date";

type Media = { publicId: string };
type EventVM = {
  id: string;
  note: string | null;
  occurredOn: string | Date;
  circle: PrivacyCircle;
  media: Media[];
};

// A modern, social-network-style event card: owner header (avatar + name +
// relative date + privacy badge), body note, full-width media grid, and an
// interactive action bar (like/comment/share). RTL-safe (logical spacing).
export function EventCard({
  event,
  ownerName,
  index = 0,
}: {
  event: EventVM;
  ownerName: string;
  index?: number;
}) {
  const t = useTranslations("event");
  const [liked, setLiked] = useState(false);

  const initial = ownerName.trim().charAt(0).toUpperCase() || "؟";
  const photos = event.media;
  const hint = relativeHint(event.occurredOn);

  // Short relative hint shown alongside the absolute date (null once it's old
  // enough that the absolute date carries on its own).
  function relativeHint(value: string | Date): string | null {
    const days = daysAgo(value);
    if (days <= 0) return t("today");
    if (days === 1) return t("yesterday");
    if (days < 7) return t("daysAgo", { n: days });
    return null;
  }

  return (
    <article
      data-testid="timeline-event"
      data-circle={event.circle}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className="group animate-fade-in-up overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* header */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-brand">
          {initial}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold text-neutral-900">{ownerName}</span>
          <time
            dateTime={new Date(event.occurredOn).toISOString()}
            className="text-xs text-neutral-400"
          >
            {absoluteDate(event.occurredOn)}
            {hint && <span className="text-neutral-300"> · {hint}</span>}
          </time>
        </div>
        <CircleBadge circle={event.circle} />
      </header>

      {/* note */}
      {event.note && (
        <p className="whitespace-pre-wrap px-4 pt-3 leading-relaxed text-neutral-800">
          {event.note}
        </p>
      )}

      {/* media */}
      {photos.length > 0 && (
        <div
          className={`mt-3 grid gap-1 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {photos.map((m) => (
            <img
              key={m.publicId}
              src={`/api/media/${m.publicId}`}
              alt=""
              data-testid="event-media"
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
                photos.length === 1 ? "max-h-[28rem]" : "aspect-square"
              }`}
            />
          ))}
        </div>
      )}

      {/* action bar */}
      <footer className="mt-1 flex items-center gap-1 border-t border-neutral-100 px-2 py-1.5">
        <ActionButton
          active={liked}
          activeClass="text-accent-600"
          onClick={() => setLiked((v) => !v)}
          icon={liked ? "❤️" : "🤍"}
          label={t("like")}
        />
        <ActionButton icon="💬" label={t("comment")} />
        <ActionButton icon="↗️" label={t("share")} />
      </footer>
    </article>
  );
}

function ActionButton({
  icon,
  label,
  active,
  activeClass,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  activeClass?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-500 transition-all duration-150 hover:bg-neutral-50 active:scale-95 ${
        active ? activeClass : ""
      }`}
    >
      <span className="text-base leading-none" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
