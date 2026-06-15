import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { LOCALE } from "@/i18n/request";
import "./globals.css";

// Arabic-first display/body font (self-hosted by next/font; no runtime request).
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "حكاية",
  description: "احفظ حكايتك، ورّثها لمن تحب.",
  icons: { icon: "/icon.svg" },
};

// Arabic-first, full RTL at the document root (guardrail G6).
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <html lang={LOCALE} dir="rtl" className={cairo.variable}>
      <body className="font-sans">
        <NextIntlClientProvider locale={LOCALE} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
