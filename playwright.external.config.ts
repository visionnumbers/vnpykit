import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-external",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4175", trace: "retain-on-failure" },
  webServer: { command: "node scripts/static-server.mjs", url: "http://127.0.0.1:4175", reuseExistingServer: false },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
