import { test, expect } from "@playwright/test";
import { createInvite, cleanupEmail, disconnect, uniqueEmail } from "./helpers";

// FEAT-PPU: the redesigned timeline view — toolbar (الآن recenter + zoom + المدى
// label), the hints line, and drag-to-pan with الآن recentering. The rail only
// renders with ≥1 event, so we seed one first.
test.afterAll(async () => {
  await disconnect();
});

async function signupWithEvent(page: import("@playwright/test").Page, email: string, invite: string) {
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
  await page.getByTestId("note-input").fill("ذكرى");
  await page.getByTestId("save-event").click();
  await expect(page).toHaveURL(/\/timeline/);
}

test("toolbar shows الآن, range label, and the hints line", async ({ page }) => {
  const email = uniqueEmail("tview");
  const invite = await createInvite();
  try {
    await signupWithEvent(page, email, invite);
    await expect(page.getByTestId("recenter-now")).toBeVisible();
    await expect(page.getByTestId("range-label")).toContainText("المدى");
    await expect(page.getByTestId("rail-hints")).toContainText("اسحب للتنقّل");
  } finally {
    await cleanupEmail(email);
  }
});

test("drag-to-pan moves the axis; الآن recenters back to NOW", async ({ page }) => {
  const email = uniqueEmail("tpan");
  const invite = await createInvite();
  try {
    await signupWithEvent(page, email, invite);

    const rail = page.getByTestId("timeline-rail");
    const box = (await rail.boundingBox())!;
    const cy = box.y + box.height / 2;
    const railCenterX = box.x + box.width / 2;

    // Position the NOW divider line before the drag (relative, not absolute).
    const xOf = async () => (await rail.locator("[data-now]").boundingBox())!.x;
    const before = await xOf();

    // Drag the rail horizontally → the axis pans → the NOW divider moves.
    await page.mouse.move(railCenterX, cy);
    await page.mouse.down();
    await page.mouse.move(railCenterX + 220, cy, { steps: 10 });
    await page.mouse.move(railCenterX + 260, cy, { steps: 4 });
    await page.mouse.up();

    const after = await xOf();
    expect(Math.abs(after - before)).toBeGreaterThan(40); // the divider moved

    // الآن recenters: the NOW divider returns to (about) its starting position.
    await page.getByTestId("recenter-now").click();
    const reset = await xOf();
    expect(Math.abs(reset - before)).toBeLessThan(8);
  } finally {
    await cleanupEmail(email);
  }
});
