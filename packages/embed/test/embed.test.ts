import { describe, expect, it } from "vitest";
import { createVNPyKitApp, mountVNPyKit } from "../src/index.js";

describe("embedding entry point", () => {
  it("exposes one framework-independent mount implementation", () => {
    expect(mountVNPyKit).toBe(createVNPyKitApp);
  });
});
