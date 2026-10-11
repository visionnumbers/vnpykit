import { expect, test, type Page } from "@playwright/test";

test("CLI production output works from a nested static path", async ({ page }) => {
  await navigate(page, "/nested/app/");
  await expect(page.locator("#visionpy-status")).toHaveText("VisionPy application ready.", { timeout: 120_000 });
  await page.getByLabel("Name").fill("Ada");
  await page.getByLabel("Accept").check();
  await page.getByRole("button", { name: "Submit form" }).click();
  await expect(page.getByText("Submitted for Ada.")).toBeVisible();
});

test("plain host mounts two isolated apps and disposes them", async ({ page, browserName }) => {
  const resourceSamples: Array<Promise<{ name: string; durationMs: number; transferBytes: number }>> = [];
  page.on("requestfinished", (request) => {
    if (browserName !== "chromium" || !/pyodide|\.wasm|\.whl|app\.py/u.test(request.url())) return;
    resourceSamples.push((async () => {
      const timing = request.timing();
      const sizes = await request.sizes();
      return { name: request.url().split("/").at(-1) ?? request.url(), durationMs: timing.responseEnd, transferBytes: sizes.responseBodySize };
    })());
  });
  await navigate(page, "/");
  await page.evaluate(() => (globalThis as unknown as AcceptanceWindow).visionpyAcceptance.ready);
  await expect(page.locator("#plain-one").getByText("Hello VisionPy")).toBeVisible();
  await expect(page.locator("#plain-two").getByText("Hello VisionPy")).toBeVisible();
  await page.locator("#plain-one").getByLabel("Name").fill("Grace");
  await expect(page.locator("#plain-two").getByLabel("Name")).toHaveValue("");
  const benchmark = await page.evaluate(() => {
    const host = (globalThis as unknown as AcceptanceWindow).visionpyAcceptance;
    return { cold: host.first.metrics, warm: host.second.metrics };
  });
  console.log(`M3_BENCHMARK ${JSON.stringify({ ...benchmark, resources: await Promise.all(resourceSamples) })}`);
  await page.evaluate(() => (globalThis as unknown as AcceptanceWindow).visionpyAcceptance.disposeAll());
  expect(await page.locator("[data-visionpy-root]").count()).toBe(0);
});

test("React StrictMode mounts, cleans up the abandoned Worker, and unmounts", async ({ page, browser }) => {
  const lifecycle: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("VISIONPY_")) lifecycle.push(message.text());
  });
  await navigate(page, "/react.html");
  await page.waitForFunction(() => (globalThis as unknown as AcceptanceWindow).reactReady !== undefined);
  await page.evaluate(() => (globalThis as unknown as AcceptanceWindow).reactReady);
  await expect(page.getByText("Hello VisionPy")).toBeVisible();
  await page.evaluate(() => (globalThis as unknown as AcceptanceWindow).reactRoot.unmount());
  await expect(page.locator("[data-visionpy-root]")).toHaveCount(0);
  console.log(`M3_REACT_LIFECYCLE ${JSON.stringify({ browserVersion: browser.version(), lifecycle })}`);
});

test("Vue mounts and unmounts the framework-independent API", async ({ page }) => {
  await navigate(page, "/vue.html");
  await page.evaluate(() => (globalThis as unknown as AcceptanceWindow).vueReady);
  await expect(page.getByText("Hello VisionPy")).toBeVisible();
  await page.evaluate(() => (globalThis as unknown as AcceptanceWindow).vueRoot.unmount());
  await expect(page.locator("[data-visionpy-root]")).toHaveCount(0);
});

interface AcceptanceWindow {
  visionpyAcceptance: {
    ready: Promise<unknown>;
    first: { metrics: Record<string, number> };
    second: { metrics: Record<string, number> };
    disposeAll(): Promise<unknown>;
  };
  reactReady?: Promise<void>;
  vueReady: Promise<void>;
  reactRoot: { unmount(): void };
  vueRoot: { unmount(): void };
}

async function navigate(page: Page, path: string): Promise<void> {
  const url = new URL(path, "http://127.0.0.1:4175").href;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("is interrupted by another navigation")) throw error;
  }
  await page.waitForURL(url);
}
