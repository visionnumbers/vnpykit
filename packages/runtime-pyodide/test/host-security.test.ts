// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createVNPyKitApp } from "../src/host.js";

describe("runtime URL boundaries", () => {
  it("rejects non-HTTP asset schemes before starting a Worker", () => {
    expect(() => createVNPyKitApp({
      mount: document.createElement("div"),
      python: { kind: "source", source: "pass" },
      assetsBaseUrl: "httpx://example.invalid/assets/",
    })).toThrow(/HTTP\(S\)/u);
  });

  it("rejects cross-origin Python source URLs", () => {
    expect(() => createVNPyKitApp({
      mount: document.createElement("div"),
      python: { kind: "url", url: "https://example.invalid/app.py" },
      assetsBaseUrl: new URL("./assets/", document.baseURI).href,
    })).toThrow(/same-origin/u);
  });
});
