import { test, expect } from "@playwright/test";
import { createInvite, cleanupEmail, disconnect, uniqueEmail } from "./helpers";

// US-0.1 + US-3.1: invite → signup → confirm → land on the RTL timeline with the
// Me-Only default, then sign out and confirm the session is server-side revoked.
test.afterAll(async () => {
  await disconnect();
});

test("invite-gated signup, confirmation, Me-Only default, sign-out revocation", async ({
  page,
}) => {
  const email = uniqueEmail("happy");
  const invite = await createInvite();

  try {
    // document is Arabic-first / RTL (G6)
    await page.goto(`/signup?invite=${invite}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");

    await page.getByLabel(/البريد/).fill(email);
    await page.locator('input[type="password"]').fill("password123");

    // Capture the signup response so we get the dev confirm URL deterministically
    // (no DB-timing race) and assert the server actually created the account.
    const [signupRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/auth/signup")),
      page.getByRole("button", { name: /متابعة/ }).click(),
    ]);
    expect(signupRes.ok()).toBeTruthy();
    const body = await signupRes.json();
    expect(body.ok).toBe(true);
    expect(body.devConfirmUrl).toBeTruthy();

    // confirm via the real confirm route → lands on the protected timeline
    await page.goto(body.devConfirmUrl);
    await expect(page).toHaveURL(/\/timeline/);

    // Me-Only default (G1)
    await expect(page.getByTestId("default-circle")).toHaveAttribute(
      "data-circle",
      "ME_ONLY",
    );

    // sign out → session revoked server-side; protected route bounces to sign-in
    await page.getByRole("button", { name: /تسجيل الخروج/ }).click();
    await expect(page).toHaveURL(/\/signin/);
    await page.goto("/timeline");
    await expect(page).toHaveURL(/\/signin/);
  } finally {
    await cleanupEmail(email);
  }
});
