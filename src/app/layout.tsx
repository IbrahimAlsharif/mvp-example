import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { LOCALE } from "@/i18n/request";
import "./globals.css";

export const metadata: Metadata = {
  title: "الخط الزمني للحياة",
  description: "احفظ ذكرياتك، وتنقّل في حياتك، وشاركها بثقة.",
};

// Arabic-first, full RTL at the document root (guardrail G6).
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <html lang={LOCALE} dir="rtl">
      <body>
        <NextIntlClientProvider locale={LOCALE} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
