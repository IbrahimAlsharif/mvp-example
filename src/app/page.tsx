import { useTranslations } from "next-intl";
import Link from "next/link";
import LifelineLogo from "./_components/LifelineLogo";

export default function Home() {
  const t = useTranslations("app");
  const ta = useTranslations("auth");
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* Ambient gradient orbs drifting behind the hero (decorative). */}
      <div className="aurora" aria-hidden />

      {/* Brand mark: animated hourglass on a glowing gradient badge. */}
      <div className="mb-9 animate-fade-in-up">
        <div className="logo-badge group relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-brand-gradient shadow-brand">
          {/* slow-rotating conic halo */}
          <span className="logo-halo" aria-hidden />
          <LifelineLogo className="relative h-14 w-14 drop-shadow-[0_2px_6px_rgba(15,23,42,0.25)]" />
        </div>
      </div>

      <h1 className="animate-fade-in-up bg-brand-gradient bg-[length:200%_auto] bg-clip-text text-5xl font-extrabold leading-tight text-transparent animate-gradient-pan sm:text-6xl">
        {t("name")}
      </h1>
      <p className="mt-5 max-w-xl animate-fade-in-up text-lg leading-relaxed text-neutral-600 [animation-delay:80ms]">
        {t("tagline")}
      </p>

      <div className="mt-10 flex animate-fade-in-up flex-wrap items-center justify-center gap-3 [animation-delay:160ms]">
        <Link
          href="/signin"
          className="rounded-xl bg-accent-gradient px-8 py-3.5 font-bold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/40 active:translate-y-0"
        >
          {ta("signinTitle")}
        </Link>
        <Link
          href="/signup"
          className="rounded-xl border border-neutral-300 bg-white/80 px-8 py-3.5 font-semibold text-neutral-800 backdrop-blur transition-all duration-200 hover:border-brand hover:bg-brand-50 hover:text-brand-700"
        >
          {ta("signupTitle")}
        </Link>
      </div>
    </main>
  );
}
