import { expect, test } from "@playwright/test";

test("real Python controlled forms are accessible and isolated", async ({ page, browserName }) => {
  await page.goto("/");
  await expect(page.locator("#app-one").getByRole("status")).toContainText("Loading");
  await page.evaluate(() => window.vnpykitDemo.ready);

  const first = page.locator("#app-one");
  const second = page.locator("#app-two");
  const name = first.getByLabel("Name");
  const accepted = first.getByLabel("Accept demo terms");
  await expect(name).toHaveAttribute("required", "");
  await expect(accepted).toHaveAttribute("type", "checkbox");

  await name.pressSequentially("A", { delay: 2 });
  await expect(first.getByRole("alert")).toHaveText("Use at least 2 characters");
  await name.pressSequentially("da", { delay: 2 });
  await expect(first.getByText("Draft: Ada / accepted: False")).toBeVisible();
  await accepted.check();
  await expect(first.getByText("Draft: Ada / accepted: True")).toBeVisible();
  await accepted.uncheck();
  await expect(first.getByText("Draft: Ada / accepted: False")).toBeVisible();
  await accepted.check();

  await name.focus();
  await page.keyboard.press("Tab");
  await expect(accepted).toBeFocused();
  await name.focus();
  await page.keyboard.press("Enter");
  await expect(first.getByText("Submitted for Ada.")).toBeVisible();

  await name.fill("Grace Hopper");
  await expect(first.getByText("Draft: Grace Hopper / accepted: True")).toBeVisible();
  const rapid = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  await name.fill("");
  await name.pressSequentially(rapid);
  await expect(first.getByText(`Draft: ${rapid} / accepted: True`)).toBeVisible();
  await expect(second.getByText("Draft: (empty) / accepted: False")).toBeVisible();
  await expect(second.getByLabel("Name")).toHaveValue("");

  const semantics = await name.evaluate((element) => ({
    tag: element.tagName,
    label: (element as HTMLInputElement).labels?.[0]?.textContent,
    invalid: element.getAttribute("aria-invalid"),
  }));
  expect(semantics).toEqual({ tag: "INPUT", label: "Name", invalid: "false" });

  const metrics = await page.evaluate(() => ({
    cold: window.vnpykitDemo.getFirst().metrics,
    warm: window.vnpykitDemo.getSecond().metrics,
  }));
  console.log(`M2_BENCHMARK ${browserName} ${JSON.stringify(metrics)}`);
  expect(metrics.cold.firstRenderMs).toBeGreaterThan(0);
  expect(metrics.warm.firstRenderMs).toBeGreaterThan(0);
  expect(metrics.cold.lastCallbackLatencyMs).toBeDefined();
  expect(Number.isFinite(metrics.cold.lastCallbackLatencyMs)).toBe(true);
  expect(metrics.cold.lastCallbackLatencyMs).toBeGreaterThanOrEqual(0);
});

test("fatal Python startup errors produce an instance-scoped alert", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Fatal-state smoke runs once on Chromium.");
  await page.goto("/");
  await page.evaluate(() => window.vnpykitDemo.ready);
  await page.evaluate(() => {
    const failed = window.vnpykitDemo.mountSource('raise RuntimeError("expected startup failure")');
    void failed.ready.catch(() => undefined);
    window.failedApp = failed;
  });
  await expect(page.locator("#scratch").getByRole("alert")).toContainText(
    "PYTHON_EXCEPTION",
    { timeout: 60_000 },
  );
  await page.evaluate(() => window.failedApp.dispose());
});

test("30-cycle disposal and recreation keeps generations isolated", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Long lifecycle coverage runs once on Chromium.");
  test.setTimeout(600_000);
  await page.goto("/");
  await page.evaluate(() => window.vnpykitDemo.ready);
  let generation = await page.evaluate(() => window.vnpykitDemo.getFirst().generation);
  for (let cycle = 0; cycle < 30; cycle += 1) {
    await page.evaluate(() => window.vnpykitDemo.remountFirst());
    const next = await page.evaluate(() => window.vnpykitDemo.getFirst().generation);
    expect(next).not.toBe(generation);
    generation = next;
  }
  await expect(page.locator("#app-one").getByText("Count: 0")).toBeVisible();
  await expect(page.locator("#app-two").getByText("Count: 0")).toBeVisible();
});

test("100-cycle release stress", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Release stress runs once on Chromium.");
  test.skip(process.env.RUN_RELEASE_STRESS !== "1", "Set RUN_RELEASE_STRESS=1 for the explicit release stress gate.");
  test.setTimeout(1_800_000);
  await page.goto("/");
  await page.evaluate(() => window.vnpykitDemo.ready);
  const memory: Array<{ cycle: number; heapBytes?: number; owners: number }> = [];
  for (let cycle = 0; cycle < 100; cycle += 1) {
    await page.evaluate(() => window.vnpykitDemo.remountFirst());
    if ((cycle + 1) % 10 === 0) {
      await page.requestGC();
      memory.push(await page.evaluate((completed) => ({
        cycle: completed,
        heapBytes: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize,
        owners: document.querySelectorAll("[data-vnpykit-root]").length,
      }), cycle + 1));
    }
  }
  await expect(page.locator("#app-one").getByText("Count: 0")).toBeVisible();
  console.log(`M3_STRESS_MEMORY ${JSON.stringify(memory)}`);
  expect(memory.every((sample) => sample.owners === 2)).toBe(true);
});

declare global {
  interface Window {
    failedApp: { dispose(): Promise<void> };
    vnpykitDemo: {
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
