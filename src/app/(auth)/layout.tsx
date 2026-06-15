import { useTranslations } from "next-intl";

// Shared shell for all auth screens: a centered card on the app canvas (the
// soft blue/orange gradient comes from <body>), with the product brand above
// it. RTL inherited from the root <html>.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Brand />
        {children}
      </div>
    </main>
  );
}

function Brand() {
  const t = useTranslations("app");
  return (
    <div className="mb-7 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 animate-float items-center justify-center rounded-2xl bg-brand-gradient text-2xl text-white shadow-brand">
        📖
      </div>
      <h2 className="bg-brand-gradient bg-clip-text text-lg font-extrabold text-transparent">
        {t("name")}
      </h2>
      <p className="mt-1 text-xs text-neutral-500">{t("tagline")}</p>
    </div>
  );
}
