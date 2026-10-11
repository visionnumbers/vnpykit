import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const CLI_VERSION = "0.1.0-alpha.1";
export const PYODIDE_VERSION = "314.0.7";
export const PROTOCOL_MAJOR = 1;

export interface StaticBuildOptions {
  entry: string;
  outDir?: string;
  basePath?: string;
  assetsPath?: string;
  title?: string;
  liveReload?: boolean;
}

export interface BuildManifest {
  schema: 1;
  cliVersion: string;
  protocol: 1;
  pyodideVersion: string;
  deploymentBase: string;
  assetsPath: string;
  sourceDateEpoch: number;
  files: Array<{ path: string; bytes: number; sha256: string }>;
}

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function buildStaticApp(options: StaticBuildOptions): Promise<BuildManifest> {
  const entry = resolve(options.entry);
  await assertPythonEntry(entry);
  const outDir = resolve(options.outDir ?? "dist");
  assertSeparatePaths(entry, outDir);
  const basePath = normalizeBasePath(options.basePath ?? "/");
  const assetsPath = normalizeAssetPath(options.assetsPath ?? "assets");
  const title = boundedTitle(options.title ?? "VNPyKit application");

  const embedEntry = require.resolve("@vnpykit/embed");
  const embedRoot = dirname(embedEntry);
  const pyodideRoot = dirname(require.resolve("pyodide/package.json"));
  const wheel = await findSingleFile(resolve(packageRoot, "assets/wheels"), /^vnpykit-.*-py3-none-any\.whl$/u, "VNPyKit wheel");

  await rm(outDir, { recursive: true, force: true });
  await mkdir(resolve(outDir, assetsPath, "runtime"), { recursive: true });
  await mkdir(resolve(outDir, assetsPath, "wheels"), { recursive: true });
  await cp(embedRoot, resolve(outDir, assetsPath, "runtime"), { recursive: true, force: true });
  await cp(pyodideRoot, resolve(outDir, assetsPath, "pyodide"), { recursive: true, force: true });
  await copyFile(wheel, resolve(outDir, assetsPath, "wheels", basename(wheel)));
  await copyFile(entry, resolve(outDir, "app.py"));
  await writeFile(resolve(outDir, "index.html"), html(title), "utf8");
  await writeFile(resolve(outDir, "app.js"), browserEntry(assetsPath, basename(wheel), options.liveReload === true), "utf8");

  const files = await checksumTree(outDir, new Set(["vnpykit-manifest.json"]));
  const sourceDateEpoch = parseSourceDateEpoch(process.env.SOURCE_DATE_EPOCH);
  const manifest: BuildManifest = {
    schema: 1,
    cliVersion: CLI_VERSION,
    protocol: PROTOCOL_MAJOR,
    pyodideVersion: PYODIDE_VERSION,
    deploymentBase: basePath,
    assetsPath,
    sourceDateEpoch,
    files,
  };
  await writeFile(resolve(outDir, "vnpykit-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await validateStaticOutput(outDir, manifest);
  return manifest;
}

export async function validateStaticOutput(outDirInput: string, manifest?: BuildManifest): Promise<void> {
  const outDir = resolve(outDirInput);
  const checked = manifest ?? JSON.parse(await readFile(resolve(outDir, "vnpykit-manifest.json"), "utf8")) as BuildManifest;
  if (checked.schema !== 1 || checked.protocol !== PROTOCOL_MAJOR) throw new Error("Static manifest is incompatible with this CLI.");
  for (const file of checked.files) {
    const path = resolveInside(outDir, file.path);
    const data = await readFile(path);
    if (data.byteLength !== file.bytes || sha256(data) !== file.sha256) throw new Error(`Static asset checksum mismatch: ${file.path}`);
  }
  const index = await readFile(resolve(outDir, "index.html"), "utf8");
  if (!index.includes('src="./app.js"') || /(?:src|href)="\/(?!\/)/u.test(index)) throw new Error("Generated HTML contains an invalid root-relative resource path.");
}

export function normalizeBasePath(value: string): string {
  if (!value.startsWith("/") || value.includes("\\") || value.includes("..") || /[?#\0]/u.test(value)) {
    throw new Error("base path must start with '/', contain no traversal, backslash, query, fragment, or NUL");
  }
  return value.endsWith("/") ? value : `${value}/`;
}

export function resolveInside(rootInput: string, requested: string): string {
  if (requested.includes("\0")) throw new Error("NUL is not allowed in paths");
  const root = resolve(rootInput);
  const candidate = resolve(root, requested);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) throw new Error("path traversal is not allowed");
  return candidate;
}

async function assertPythonEntry(entry: string): Promise<void> {
  if (extname(entry).toLowerCase() !== ".py") throw new Error(`Python entry point must end in .py: ${entry}`);
  await assertFile(entry, "Python entry point");
}

async function assertFile(path: string, label: string): Promise<void> {
  try { if (!(await stat(path)).isFile()) throw new Error(); }
  catch { throw new Error(`Missing ${label}: ${path}`); }
}

function assertSeparatePaths(entry: string, outDir: string): void {
  if (entry === outDir || entry.startsWith(`${outDir}${sep}`)) throw new Error("Output directory cannot contain the Python entry point.");
}

function normalizeAssetPath(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(value)) throw new Error("assets path must be a single safe URL segment");
  return value;
}

function boundedTitle(value: string): string {
  if (value.length === 0 || value.length > 200) throw new Error("title must contain 1-200 characters");
  return value;
}

async function findSingleFile(root: string, pattern: RegExp, label: string): Promise<string> {
  let names: string[];
  try { names = (await readdir(root)).filter((name) => pattern.test(name)).sort(); }
  catch { throw new Error(`Missing packaged ${label} directory: ${root}`); }
  if (names.length !== 1) throw new Error(`Expected one packaged ${label}; found ${names.length}. Rebuild @vnpykit/cli.`);
  return resolve(root, names[0] as string);
}

async function checksumTree(root: string, excluded: Set<string>): Promise<BuildManifest["files"]> {
  const result: BuildManifest["files"] = [];
  async function visit(directory: string): Promise<void> {
    for (const item of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
      const path = resolve(directory, item.name);
      if (item.isDirectory()) await visit(path);
      else if (item.isFile()) {
        const name = relative(root, path).split(sep).join("/");
        if (excluded.has(name)) continue;
        const data = await readFile(path);
        result.push({ path: name, bytes: data.byteLength, sha256: sha256(data) });
      }
    }
  }
  await visit(root);
  return result;
}

function sha256(value: Uint8Array): string { return createHash("sha256").update(value).digest("hex"); }

function parseSourceDateEpoch(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("SOURCE_DATE_EPOCH must be a nonnegative safe integer");
  return parsed;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function html(title: string): string {
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'">\n<title>${escapeHtml(title)}</title>\n</head>\n<body>\n<main><div id="vnpykit-status" role="status">Loading Python application…</div><div id="vnpykit-app"></div></main>\n<script type="module" src="./app.js"></script>\n</body>\n</html>\n`;
}

function browserEntry(assetsPath: string, wheelName: string, liveReload: boolean): string {
  const reload = liveReload ? `\nconst reload = new EventSource(new URL("__vnpykit_reload", document.baseURI));\nreload.onmessage = () => location.reload();\n` : "";
  return `import { mountVNPyKit } from "./${assetsPath}/runtime/vnpykit.js";\nconst mount = document.querySelector("#vnpykit-app");\nconst status = document.querySelector("#vnpykit-status");\nif (!(mount instanceof HTMLElement) || !(status instanceof HTMLElement)) throw new Error("VNPyKit host elements are missing");\nconst app = mountVNPyKit({\n  mount,\n  python: { kind: "url", url: new URL("./app.py", location.href).href },\n  assetsBaseUrl: new URL("./${assetsPath}/", location.href).href,\n  wheelFileName: ${JSON.stringify(wheelName)},\n  startupTimeoutMs: 120000,\n});\napp.onError((error) => { status.textContent = error.code + ": " + error.message; });\ntry { await app.ready; status.textContent = "VNPyKit application ready."; }\ncatch (error) { status.textContent = error instanceof Error ? error.message : "VNPyKit failed to start."; }\nwindow.addEventListener("pagehide", () => { void app.dispose(); }, { once: true });${reload}`;
}
