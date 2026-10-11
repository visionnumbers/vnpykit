import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildStaticApp, resolveInside, validateStaticOutput } from "../src/builder.js";
import { createProject } from "../src/project.js";
import { runDevServer } from "../src/server.js";

let root: string;

beforeAll(async () => { root = await mkdtemp(resolve(tmpdir(), "vnpykit-cli-")); });
afterAll(async () => { await rm(root, { recursive: true, force: true }); });

describe("VNPyKit CLI", () => {
  it("creates and reproducibly builds a nested static application", async () => {
    const project = await createProject(resolve(root, "hello-app"));
    const first = await buildStaticApp({ entry: resolve(project, "app.py"), outDir: resolve(root, "first"), basePath: "/nested/demo/" });
    const second = await buildStaticApp({ entry: resolve(project, "app.py"), outDir: resolve(root, "second"), basePath: "/nested/demo/" });
    expect(first.files).toEqual(second.files);
    expect(first.files.some((file) => file.path.endsWith(".wasm"))).toBe(true);
    expect(first.files.some((file) => file.path.endsWith(".whl"))).toBe(true);
    await validateStaticOutput(resolve(root, "first"));
    const html = await readFile(resolve(root, "first/index.html"), "utf8");
    expect(html).toContain('src="./app.js"');
    expect(html).not.toMatch(/src="\//u);
  }, 60_000);

  it("serves a loopback development build and rejects unsafe paths and hosts", async () => {
    const project = resolve(root, "hello-app");
    const server = await runDevServer({ entry: "app.py", workingDirectory: project, port: 0, basePath: "/dev/" });
    try {
      expect((await fetch(server.url)).status).toBe(200);
      expect((await fetch(new URL("app.py", server.url))).status).toBe(200);
    } finally {
      await server.close();
    }
    expect(() => resolveInside(root, "../outside")).toThrow(/traversal/u);
    await expect(runDevServer({ entry: "app.py", workingDirectory: project, host: "0.0.0.0", port: 0 })).rejects.toThrow(/allow-public/u);
  }, 60_000);
});
