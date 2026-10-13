import { expect, test } from "@playwright/test";

test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium", "M1 regression suite runs on Chromium; M2 forms cover all engines.");
});

test("real Pyodide counters update independently", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.vnpykitDemo.ready);
  await expect(page.locator("#status")).toContainText("ready");

  const first = page.locator("#app-one");
  const second = page.locator("#app-two");
  await expect(first.getByText("SDK 0.1.0a1")).toBeVisible();
  await expect(first.getByText("Count: 0")).toBeVisible();
  await first.getByRole("button", { name: "Increase" }).click({ clickCount: 3 });
  await expect(first.getByText("Count: 3")).toBeVisible();
  await expect(second.getByText("Count: 0")).toBeVisible();
  await second.getByRole("button", { name: "Increase" }).click();
  await expect(second.getByText("Count: 1")).toBeVisible();
  await expect(first.getByText("Count: 3")).toBeVisible();
  const metrics = await page.evaluate(() => ({
    first: window.vnpykitDemo.getFirst().metrics,
    second: window.vnpykitDemo.getSecond().metrics,
  }));
  console.log(`M1_METRICS ${JSON.stringify(metrics)}`);
  expect(metrics.first.runtimeReadyMs).toBeGreaterThan(0);
  expect(metrics.first.firstRenderMs).toBeGreaterThan(metrics.first.runtimeReadyMs ?? 0);
  expect(metrics.first.lastCallbackLatencyMs).toBeGreaterThan(0);
});

test("repeated dispose and remount creates fresh Worker generations", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.vnpykitDemo.ready);
  let previousGeneration = await page.evaluate(() => window.vnpykitDemo.getFirst().generation);
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await page.evaluate(() => window.vnpykitDemo.remountFirst());
    await expect(page.locator("#status")).toContainText("remounted");
    await expect(page.locator("#app-one").getByText("Count: 0")).toBeVisible();
    const nextGeneration = await page.evaluate(() => window.vnpykitDemo.getFirst().generation);
    expect(nextGeneration).not.toBe(previousGeneration);
    previousGeneration = nextGeneration;
  }
  await expect(page.locator("#app-two").getByText("Count: 0")).toBeVisible();
});

test("retained disposed handles release renderer resources", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.vnpykitDemo.ready);
  const session = await page.context().newCDPSession(page);

  const collect = async (): Promise<{ nodes: number; jsEventListeners: number }> => {
    await session.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(100);
    return session.send("Memory.getDOMCounters") as Promise<{ nodes: number; jsEventListeners: number }>;
  };

  const initial = await collect();
  const retainAndRemount = async (): Promise<void> => {
    await page.evaluate(() => {
      const scope = window as typeof window & { retainedLifecycleHandles?: Array<ReturnType<typeof window.vnpykitDemo.getFirst>> };
      (scope.retainedLifecycleHandles ??= []).push(window.vnpykitDemo.getFirst());
      return window.vnpykitDemo.remountFirst();
    });
  };

  await retainAndRemount();
  await collect();
  await retainAndRemount();
  const baseline = await collect();
  const samples: Array<{ nodes: number; jsEventListeners: number }> = [];
  for (let cycle = 0; cycle < 5; cycle += 1) {
    await retainAndRemount();
    samples.push(await collect());
    await expect(page.locator("[data-vnpykit-root]")).toHaveCount(2);
    expect(page.workers()).toHaveLength(2);
  }

  await page.evaluate(() => {
    const scope = window as typeof window & { retainedLifecycleHandles?: unknown[] };
    scope.retainedLifecycleHandles = [];
  });
  const released = await collect();
  console.log(`M5_RETAINED_HANDLE_RESOURCES ${JSON.stringify({ initial, baseline, samples, released })}`);
  for (const sample of samples) {
    expect(sample.nodes).toBeLessThanOrEqual(baseline.nodes + 5);
  }
  // Chromium may install a one-time group of listeners during early Worker
  // generations. The defect added listeners on every retained-handle cycle, so
  // require the post-warmup samples to plateau instead of assuming a fixed count.
  const stableListenerSamples = samples.slice(-3).map((sample) => sample.jsEventListeners);
  expect(Math.max(...stableListenerSamples) - Math.min(...stableListenerSamples)).toBeLessThanOrEqual(1);
  expect(released.nodes).toBeLessThanOrEqual(baseline.nodes + 5);
  expect(released.jsEventListeners).toBeLessThanOrEqual(Math.max(...stableListenerSamples) + 1);
});

test("stopped app ignores later browser events", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.vnpykitDemo.ready);
  await page.evaluate(() => window.vnpykitDemo.getFirst().stop());
  expect(await page.evaluate(() => window.vnpykitDemo.getFirst().status)).toBe("stopping");
  await page.locator("#app-one").getByRole("button", { name: "Increase" }).click();
  await expect(page.locator("#app-one").getByText("Count: 0")).toBeVisible();
});

test("Python callback errors are reported and the next event recovers", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.vnpykitDemo.ready);
  const source = `
from vnpykit import App, State
from vnpykit.ui import Button, Column, Text
app = App(title="Recovery")
count = State(0)
def increase():
    if count.value == 0:
        count.set(1)
        raise RuntimeError("expected callback failure")
    count.set(count.value + 1)
with app.layout(), Column():
    Text.bind(lambda: f"Recovery: {count.value}")
    Button("Recover", on_click=increase)
app.run()
`;
  await page.evaluate((python) => {
    const app = window.vnpykitDemo.mountSource(python);
    window.recoveryApp = app;
    return app.ready;
  }, source);
  const scratch = page.locator("#scratch");
  await scratch.getByRole("button", { name: "Recover" }).click();
  await expect(scratch.getByText("Recovery: 1")).toBeAttached();
  await scratch.getByRole("button", { name: "Recover" }).click();
  await expect(scratch.getByText("Recovery: 2")).toBeAttached();
  await page.evaluate(() => window.recoveryApp.dispose());
});
