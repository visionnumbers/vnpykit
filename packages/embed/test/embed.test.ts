import { describe, expect, it } from "vitest";
import { createVisionPyApp, mountVisionPy } from "../src/index.js";

describe("embedding entry point", () => {
  it("exposes one framework-independent mount implementation", () => {
    expect(mountVisionPy).toBe(createVisionPyApp);
  });
});
