import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("VNPyKit forms and multiple application roots have no serious axe violations", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "The automated accessibility gate runs once in Chromium.");
  await page.goto("/");
  await page.evaluate(() => window.vnpykitDemo.ready);

  const first = page.locator("#app-one");
  await first.getByLabel("Name").fill("A");
  await expect(first.getByRole("alert")).toHaveText("Use at least 2 characters");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious"
  );
  expect(blocking).toEqual([]);
});
