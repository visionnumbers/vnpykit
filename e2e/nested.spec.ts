import { expect, test } from "@playwright/test";

test("standalone app boots below a nested deployment base", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Nested deployment smoke runs once on Chromium.");
  await page.goto("/nested/demo/");
  await page.evaluate(() => window.visionpyDemo.ready);
  await expect(page.locator("#app-one").getByText("SDK 0.1.0a1")).toBeVisible();
  await page.locator("#app-one").getByRole("button", { name: "Increase" }).click();
  await expect(page.locator("#app-one").getByText("Count: 1")).toBeVisible();
});

declare global {
  interface Window {
    visionpyDemo: {
      ready: Promise<void>;
      getFirst(): {
        generation: string;
        status: string;
        metrics: { runtimeReadyMs?: number; firstRenderMs?: number; lastCallbackLatencyMs?: number };
        stop(): Promise<void>;
      };
      getSecond(): { metrics: { runtimeReadyMs?: number; firstRenderMs?: number } };
      remountFirst(): Promise<void>;
      mountSource(source: string): { ready: Promise<void>; dispose(): Promise<void> };
    };
  }
}
