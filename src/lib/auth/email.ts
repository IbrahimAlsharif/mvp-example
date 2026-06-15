import { env } from "@/lib/env";

/**
 * Transactional email. In dev (no RESEND_API_KEY) we log the link to the
 * console so confirmation/reset flows are testable without a mail provider.
 * Confirmation dispatch target is < 30s (US-0.1 NFR) — trivially met by the
 * synchronous dev sink; a real provider call would be fire-and-non-blocking.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.info(`\n[email:dev] to=${opts.to}\n  subject: ${opts.subject}\n  ${opts.text}\n`);
    return;
  }
  // Real provider integration (Resend) would go here. Kept out of MVP dev path.
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    }),
  });
  if (!res.ok) throw new Error(`email send failed: ${res.status}`);
}

export function confirmEmailBody(link: string): { subject: string; text: string } {
  return {
    subject: "تأكيد حسابك في حكاية",
    text: `مرحبًا،\nاضغط على الرابط لتأكيد حسابك:\n${link}\nالرابط صالح لمدة محدودة ويُستخدم مرة واحدة.`,
  };
}

export function resetEmailBody(link: string): { subject: string; text: string } {
  return {
    subject: "إعادة تعيين كلمة المرور",
    text: `لإعادة تعيين كلمة المرور، اضغط على الرابط:\n${link}\nالرابط صالح لمدة محدودة ويُستخدم مرة واحدة. إن لم تطلب ذلك، تجاهل هذه الرسالة.`,
  };
}
