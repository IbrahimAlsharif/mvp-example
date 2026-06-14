import { useTranslations } from "next-intl";
import Link from "next/link";

export default function Home() {
  const t = useTranslations("app");
  const tn = useTranslations("nav");
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">{t("name")}</h1>
      <p className="text-lg text-neutral-600">{t("tagline")}</p>
      <div className="flex gap-3">
        <Link
          href="/signin"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-white"
        >
          {tn("timeline")}
        </Link>
      </div>
    </main>
  );
}
