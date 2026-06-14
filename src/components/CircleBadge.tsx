import type { PrivacyCircle } from "@prisma/client";

// Small colored pill that signals an event's privacy circle at a glance.
// ME_ONLY = neutral, FAMILY = brand blue, PUBLIC_UNLISTED = accent orange.
const STYLES: Record<PrivacyCircle, { cls: string; icon: string; label: string }> = {
  ME_ONLY: { cls: "bg-neutral-100 text-neutral-600", icon: "🔒", label: "أنا فقط" },
  FAMILY: { cls: "bg-brand-50 text-brand-700", icon: "👪", label: "العائلة" },
  PUBLIC_UNLISTED: { cls: "bg-accent-50 text-accent-700", icon: "🔗", label: "رابط خاص" },
};

export function CircleBadge({ circle }: { circle: PrivacyCircle }) {
  const s = STYLES[circle];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}
