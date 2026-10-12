import { expect, test } from "@playwright/test";

test("standalone app boots below a nested deployment base", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Nested deployment smoke runs once on Chromium.");
  await page.goto("/nested/demo/");
  await page.evaluate(() => window.vnpykitDemo.ready);
  await expect(page.locator("#app-one").getByText("SDK 0.1.0a1")).toBeVisible();
  await page.locator("#app-one").getByRole("button", { name: "Increase" }).click();
  await expect(page.locator("#app-one").getByText("Count: 1")).toBeVisible();
});
