import { test, expect } from "@playwright/test";
import {
  createInvite,
  cleanupEmail,
  disconnect,
  uniqueEmail,
  registerAndConfirm,
} from "./helpers";

// The keystone end-to-end slice (US-0.1 + US-1.2 + US-1.1 + US-3.1 + US-3.3):
// invite → signup → confirm → upload a photo → create a Me-Only event → see it
// on the timeline → a SECOND account and an anonymous client cannot reach the
// media bytes (404). This single test proves the trust boundary holds on the
// bytes, not just in the UI.
test.afterAll(async () => {
  await disconnect();
});

test("create a private photo event; a second account cannot reach its media", async ({
  page,
  browser,
}) => {
  const email = uniqueEmail("journey");
  const invite = await createInvite();
  const secondEmail = uniqueEmail("intruder");

  try {
    // --- owner signs up + confirms ---
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

    // --- create an event with an uploaded photo (single-page glass form) ---
    await page.getByTestId("add-event").click();
    await expect(page).toHaveURL(/\/events\/new/);
    await page.getByTestId("note-input").fill("ذكرى عائلية خاصة");

    // upload a (fake) JPEG; bytes are arbitrary — checksum just has to round-trip.
    // Media type is auto-detected from the file (no manual kind picker).
    await page.getByTestId("file-input").setInputFiles({
      name: "photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("FAKE-JPEG-BYTES-" + Date.now()),
    });
    // success is shown only after verified persistence (US-1.2 contract)
    await expect(page.getByTestId("media-item-persisted")).toBeVisible({ timeout: 20_000 });

    // Me-Only is the default (G1); save
    await page.getByTestId("save-event").click();
    await expect(page).toHaveURL(/\/timeline/);

    // event appears on the timeline, fresh after navigation (AC-4/AC-15)
    const eventCard = page.getByTestId("timeline-event").first();
    await expect(eventCard).toBeVisible();
    await expect(eventCard).toHaveAttribute("data-circle", "ME_ONLY");

    // owner can load the media bytes (302 → image)
    const mediaSrc = await page.getByTestId("event-media").first().getAttribute("src");
    expect(mediaSrc).toMatch(/^\/api\/media\//);
    const ownerFetch = await page.request.get(mediaSrc!);
    expect(ownerFetch.status()).toBe(200);

    // --- second account: cannot reach the media (404, no bytes) ---
    const ctx2 = await browser.newContext();
    await registerAndConfirm(ctx2.request, secondEmail);
    const intruderFetch = await ctx2.request.get(mediaSrc!, { maxRedirects: 0 });
    expect(intruderFetch.status()).toBe(404);
    await ctx2.close();

    // --- anonymous: also 404 ---
    const anon = await browser.newContext();
    const anonFetch = await anon.request.get(mediaSrc!, { maxRedirects: 0 });
    expect(anonFetch.status()).toBe(404);
    await anon.close();
  } finally {
    await cleanupEmail(email);
    await cleanupEmail(secondEmail);
  }
});
