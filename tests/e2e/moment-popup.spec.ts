import { test, expect } from "@playwright/test";
import { createInvite, cleanupEmail, disconnect, uniqueEmail } from "./helpers";

// FEAT-JZW: the redesigned centered "لحظة جديدة" moment popup. Verifies the
// mockup structure is present and functional: title, the three media cards each
// with a capture AND an upload control, the privacy pills, and the two footer
// actions (أضف اللحظة + تفاصيل أكثر). The rail only renders with ≥1 event, so we
// seed one first, then open the popup via the NOW FAB.
test.afterAll(async () => {
  await disconnect();
});

test("redesigned moment popup matches the mockup structure and saves", async ({ page }) => {
  const email = uniqueEmail("moment");
  const invite = await createInvite();

  try {
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

    // seed one event so the rail (+ NOW FAB) renders
    await page.getByTestId("add-event").click();
    await expect(page).toHaveURL(/\/events\/new/);
    await page.getByTestId("note-input").fill("ذكرى أولى");
    await page.getByTestId("save-event").click();
    await expect(page).toHaveURL(/\/timeline/);

    // open the moment popup via the NOW FAB
    await page.getByTestId("add-now-fab").click();
    const popup = page.getByTestId("quick-add-popup");
    await expect(popup).toBeVisible();
    await expect(popup).toContainText("لحظة جديدة");

    // three media cards, each with a capture + an upload control
    for (const kind of ["image", "video", "audio"]) {
      await expect(page.getByTestId(`media-card-${kind}`)).toBeVisible();
      await expect(page.getByTestId(`media-card-${kind}-capture`)).toBeVisible();
      await expect(page.getByTestId(`media-card-${kind}-upload`)).toBeVisible();
    }

    // privacy pills (من يراها؟) — أنا فقط is the default selection
    await expect(page.getByTestId("circle-pill-me_only")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("circle-pill-family").click();
    await expect(page.getByTestId("circle-pill-family")).toHaveAttribute("aria-checked", "true");
    // restore to ME_ONLY for the save
    await page.getByTestId("circle-pill-me_only").click();

    // footer actions present
    await expect(page.getByTestId("quick-add-more-details")).toBeVisible();

    // type a note and save → success toast
    await page.getByTestId("quick-add-note").fill("لحظة الآن بالتصميم الجديد");
    await page.getByTestId("quick-add-save").click();
    await expect(page.getByTestId("quick-add-toast")).toBeVisible({ timeout: 20_000 });
  } finally {
    await cleanupEmail(email);
  }
});

test("تفاصيل أكثر hands off to the full form on the chosen day", async ({ page }) => {
  const email = uniqueEmail("moredetails");
  const invite = await createInvite();

  try {
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

    await page.getByTestId("add-event").click();
    await page.getByTestId("note-input").fill("ذكرى أولى");
    await page.getByTestId("save-event").click();
    await expect(page).toHaveURL(/\/timeline/);

    await page.getByTestId("add-now-fab").click();
    await expect(page.getByTestId("quick-add-popup")).toBeVisible();
    await page.getByTestId("quick-add-more-details").click();

    // lands on the full form with the chosen day carried in ?on=, and the date
    // input is prefilled to exactly that day (not reset to today).
    await expect(page).toHaveURL(/\/events\/new\?on=\d{4}-\d{2}-\d{2}/);
    const onParam = new URL(page.url()).searchParams.get("on");
    const dateVal = await page.getByTestId("date-input").inputValue();
    expect(dateVal).toBe(onParam);
  } finally {
    await cleanupEmail(email);
  }
});
