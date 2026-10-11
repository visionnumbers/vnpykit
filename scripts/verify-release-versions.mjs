import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const versions = JSON.parse(await readFile(join(root, "versions.json"), "utf8"));
const expectedTag = process.env.RELEASE_TAG ?? "v0.1.0a1";
const expectedPython = expectedTag.slice(1);
const expectedNpm = versions.release;

if (expectedTag !== "v0.1.0a1") fail(`unsupported release tag ${expectedTag}`);
if (versions.packages.vnpykit !== expectedPython) fail("Python version does not match the tag");

const pyproject = await readFile(join(root, "packages", "python-sdk", "pyproject.toml"), "utf8");
if (!pyproject.includes(`version = "${expectedPython}"`)) fail("pyproject version mismatch");
if (!pyproject.includes('name = "vnpykit"')) fail("pyproject distribution mismatch");

for (const directory of ["protocol", "renderer", "runtime-pyodide", "embed", "cli"]) {
  const manifest = JSON.parse(await readFile(join(root, "packages", directory, "package.json"), "utf8"));
  const expectedName = `@vnpykit/${directory}`;
  if (manifest.name !== expectedName) fail(`${directory} package name mismatch`);
  if (manifest.version !== expectedNpm) fail(`${manifest.name} version mismatch`);
  if (manifest.private === true) fail(`${manifest.name} remains private`);
  if (manifest.publishConfig?.access !== "public") fail(`${manifest.name} is not configured for public access`);
  if (manifest.repository?.url !== "git+https://github.com/visionnumbers/vnpykit.git") {
    fail(`${manifest.name} repository URL mismatch`);
  }
}

console.log(`Verified ${expectedTag}: vnpykit ${expectedPython}; npm ${expectedNpm}; protocol ${versions.protocolMajor}`);

function fail(message) {
  throw new Error(message);
}
