import { useTranslations } from "next-intl";
import Link from "next/link";

export default function Home() {
  const t = useTranslations("app");
  const tn = useTranslations("nav");
  const ta = useTranslations("auth");
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* floating brand mark */}
      <div className="mb-8 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-brand-gradient text-4xl text-white shadow-brand">
        ⏳
      </div>

      <h1 className="animate-fade-in-up bg-brand-gradient bg-clip-text text-5xl font-extrabold leading-tight text-transparent sm:text-6xl">
        {t("name")}
      </h1>
      <p className="mt-5 max-w-xl animate-fade-in-up text-lg leading-relaxed text-neutral-600 [animation-delay:80ms]">
        {t("tagline")}
      </p>

      <div className="mt-9 flex animate-fade-in-up gap-3 [animation-delay:160ms]">
        <Link
          href="/signin"
          className="rounded-xl bg-accent-gradient px-7 py-3 font-bold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/40 active:translate-y-0"
        >
          {tn("timeline")}
        </Link>
        <Link
          href="/signup"
          className="rounded-xl border border-neutral-300 bg-white px-7 py-3 font-semibold text-neutral-800 transition-all duration-200 hover:border-brand hover:bg-brand-50 hover:text-brand-700"
        >
          {ta("signupTitle")}
        </Link>
      </div>
    </main>
  );
}
