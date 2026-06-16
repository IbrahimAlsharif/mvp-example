import { test, expect } from "@playwright/test";
import { createInvite, cleanupEmail, disconnect, uniqueEmail } from "./helpers";

// FEAT-MRV: edit an existing moment via the popup in edit mode. Create an event,
// open it from the rail, click Edit, change the note, save, and confirm the edit
// is reflected (success toast + the new note on reopen).
test.afterAll(async () => {
  await disconnect();
});

test("edit an existing moment from the timeline", async ({ page }) => {
  const email = uniqueEmail("edit");
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

    // create an event to edit
    await page.getByTestId("add-event").click();
    await page.getByTestId("note-input").fill("النص الأصلي");
    await page.getByTestId("save-event").click();
    await expect(page).toHaveURL(/\/timeline/);

    // open the event node, then click Edit
    await page.getByRole("button", { name: "فتح الحدث" }).first().click();
    await expect(page.getByTestId("event-modal")).toBeVisible();
    await page.getByTestId("event-modal-edit").click();

    // popup opens in edit mode, prefilled, titled تعديل اللحظة
    const popup = page.getByTestId("quick-add-popup");
    await expect(popup).toBeVisible();
    await expect(popup).toContainText("تعديل اللحظة");
    const noteField = page.getByTestId("quick-add-note");
    await expect(noteField).toHaveValue("النص الأصلي");

    // change the note and save
    await noteField.fill("النص بعد التعديل");
    await page.getByTestId("quick-add-save").click();
    await expect(page.getByTestId("quick-add-toast")).toBeVisible({ timeout: 20_000 });

    // reopen the node — the edited note is shown
    await page.getByRole("button", { name: "فتح الحدث" }).first().click();
    await expect(page.getByTestId("event-modal")).toContainText("النص بعد التعديل");
  } finally {
    await cleanupEmail(email);
  }
});
