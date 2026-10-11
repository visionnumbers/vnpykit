import { copyFile, cp, mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const exampleRoot = resolve(directory, "..");
const repositoryRoot = resolve(exampleRoot, "../..");
const require = createRequire(import.meta.url);
const pyodideRoot = dirname(require.resolve("pyodide/package.json"));
const wheel = resolve(repositoryRoot, "packages/python-sdk/dist/vnpykit-0.1.0a1-py3-none-any.whl");
const micropipWheel = resolve(repositoryRoot, "vendor/pyodide/micropip-0.11.1-py3-none-any.whl");

try {
  await stat(wheel);
} catch {
  throw new Error(`Missing ${wheel}. Build the Python wheel before launching the example.`);
}

await mkdir(resolve(exampleRoot, "public/pyodide"), { recursive: true });
await mkdir(resolve(exampleRoot, "public/wheels"), { recursive: true });
await cp(pyodideRoot, resolve(exampleRoot, "public/pyodide"), { recursive: true, force: true });
await copyFile(micropipWheel, resolve(exampleRoot, "public/pyodide/micropip-0.11.1-py3-none-any.whl"));
await copyFile(wheel, resolve(exampleRoot, "public/wheels/vnpykit-0.1.0a1-py3-none-any.whl"));

