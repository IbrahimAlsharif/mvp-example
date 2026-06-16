import { test, expect } from "@playwright/test";
import { createInvite, cleanupEmail, disconnect, uniqueEmail } from "./helpers";

// FEAT-QVT: an always-visible "+" FAB on the timeline NOW divider opens the
// quick-add popup anchored to the current moment — no rail aiming, no navigating
// away to the full form. The rail only renders once ≥1 event exists, so we first
// create a seed event (via the full form), then assert the FAB is present on the
// rail, opens the popup pre-dated to TODAY, and saves a new "now" event inline.
test.afterAll(async () => {
  await disconnect();
});

test("add-now FAB on the timeline rail opens quick-add at NOW and saves inline", async ({ page }) => {
  const email = uniqueEmail("addnow");
  const invite = await createInvite();

  try {
    // --- sign up + confirm → land on the timeline ---
    await page.goto(`/signup?invite=${invite}`);
    await page.getByLabel(/البريد/).fill(email);
    await page.locator('input[type="password"]').fill("password123");
    const [signupRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/auth/signup")),
      page.getByRole("button", { name: /متابعة/ }).click(),
    ]);
    const signupBody = await signupRes.json();
    await page.goto(signupBody.devConfirmUrl);
    await expect(page).toHaveURL(/\/timeline/);

    // --- seed one event so the interactive rail (and thus the FAB) renders ---
    await page.getByTestId("add-event").click();
    await expect(page).toHaveURL(/\/events\/new/);
    await page.getByTestId("note-input").fill("ذكرى أولى");
    await page.getByTestId("save-event").click();
    await expect(page).toHaveURL(/\/timeline/);

    // --- the add-now FAB is visible on the rail ---
    const fab = page.getByTestId("add-now-fab");
    await expect(fab).toBeVisible();

    // --- clicking it opens the quick-add popup, pre-dated to today ---
    await fab.click();
    const popup = page.getByTestId("quick-add-popup");
    await expect(popup).toBeVisible();
    // The popup's date label is today's day; assert today's day-of-month shows.
    const today = new Date();
    await expect(popup).toContainText(String(today.getUTCDate()));

    // --- type a note and save inline; success toast confirms the durable write ---
    await page.getByTestId("quick-add-note").fill("لحظة الآن");
    await page.getByTestId("quick-add-save").click();
    await expect(page.getByTestId("quick-add-toast")).toBeVisible({ timeout: 20_000 });
  } finally {
    await cleanupEmail(email);
  }
});
