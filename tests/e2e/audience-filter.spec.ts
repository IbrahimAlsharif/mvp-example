import { test, expect } from "@playwright/test";
import { createInvite, cleanupEmail, disconnect, uniqueEmail } from "./helpers";

// FEAT-BVK: the الكل / لي / مَن تحب audience filter. A fresh account has only its
// OWN events, so "الكل" and "لي" show them while "مَن تحب" (others') shows none —
// the rail (which needs ≥1 visible event) disappears under "مَن تحب".
test.afterAll(async () => {
  await disconnect();
});

test("audience filter scopes the timeline by ownership", async ({ page }) => {
  const email = uniqueEmail("aud");
  const invite = await createInvite();

  try {
    await page.goto(`/signup?invite=${invite}`);
    await page.getByLabel(/البريد/).fill(email);
    await page.locator('input[type="password"]').fill("password123");
    const [signupRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/auth/signup")),
      page.getByRole("button", { name: /متابعة/ }).click(),
    ]);
    await page.goto((await signupRes.json()).devConfirmUrl);
    await expect(page).toHaveURL(/\/timeline/);

    await page.getByTestId("add-event").click();
    await page.getByTestId("note-input").fill("ذكرى خاصة بي");
    await page.getByTestId("save-event").click();
    await expect(page).toHaveURL(/\/timeline/);

    // The audience filter is visible; الكل is the default and the rail shows.
    await expect(page.getByTestId("audience-filter")).toBeVisible();
    await expect(page.getByTestId("audience-all")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("timeline-rail")).toBeVisible();

    // "لي" (mine) still shows the own event.
    await page.getByTestId("audience-mine").click();
    await expect(page.getByTestId("timeline-rail")).toBeVisible();
    await expect(page.getByRole("button", { name: "فتح الحدث" }).first()).toBeVisible();

    // "مَن تحب" (others') hides the own event → no event nodes remain on the rail
    // (the rail stays mounted since the account still owns events; the filter just
    // empties the visible set).
    await page.getByTestId("audience-others").click();
    await expect(page.getByRole("button", { name: "فتح الحدث" })).toHaveCount(0);

    // Back to الكل restores the own event node.
    await page.getByTestId("audience-all").click();
    await expect(page.getByRole("button", { name: "فتح الحدث" }).first()).toBeVisible();
  } finally {
    await cleanupEmail(email);
  }
});
