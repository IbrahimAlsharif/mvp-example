import { useTranslations } from "next-intl";

// Shared shell for all auth screens: a centered card on a soft full-height
// canvas, with the product brand above it. RTL inherited from the root <html>.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100 px-4 py-10">
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
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-xl text-white shadow-sm">
        ⏳
      </div>
      <h2 className="text-lg font-semibold text-neutral-900">{t("name")}</h2>
      <p className="mt-1 text-xs text-neutral-500">{t("tagline")}</p>
    </div>
  );
}
