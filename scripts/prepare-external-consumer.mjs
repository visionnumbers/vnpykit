import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const consumer = resolve(tmpdir(), "visionpy-m3-external-consumer");
if (!consumer.startsWith(resolve(tmpdir()))) throw new Error("consumer path escaped the system temp directory");
await rm(consumer, { recursive: true, force: true });
await mkdir(consumer, { recursive: true });

const node = process.execPath;
const npmCli = process.env.npm_execpath ?? join(dirname(node), "node_modules", "npm", "bin", "npm-cli.js");
const packRoot = join(root, ".visionpy", "packs");
const embedPack = join(packRoot, "visionpy-embed-0.1.0-alpha.1.tgz");
const cliPack = join(packRoot, "visionpy-cli-0.1.0-alpha.1.tgz");
await npmCommand(["init", "-y"], consumer);
await npmCommand(["install", "--save-exact", embedPack, cliPack, "react@19.3.0", "react-dom@19.3.0", "vue@3.5.43", "vite@8.3.4"], consumer);

const cli = join(consumer, "node_modules", "@visionpy", "cli", "dist", "bin.js");
await command(node, [cli, "create", "hello-app"], consumer);
await command(node, [cli, "build", "hello-app/app.py", "--out-dir", "static", "--base", "/nested/app/"], consumer);

const site = join(consumer, "site");
await cp(join(root, "scripts", "fixtures", "external-consumer"), site, { recursive: true });
await mkdir(join(site, "public"), { recursive: true });
await cp(join(consumer, "hello-app", "app.py"), join(site, "public", "app.py"));
await mkdir(join(site, "public", "nested"), { recursive: true });
await cp(join(consumer, "static"), join(site, "public", "nested", "app"), { recursive: true });
await cp(join(consumer, "static", "assets"), join(site, "public", "assets"), { recursive: true });

const packageJson = JSON.parse(await readFile(join(consumer, "package.json"), "utf8"));
packageJson.type = "module";
await writeFile(join(consumer, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
await npmCommand(["exec", "vite", "--", "build", site, "--config", join(site, "vite.config.js")], consumer);

const runServer = spawn(node, [cli, "run", "hello-app/app.py", "--port", "4191"], { cwd: consumer, stdio: ["ignore", "pipe", "pipe"] });
try {
  await waitFor("http://127.0.0.1:4191/", 60_000);
} finally {
  runServer.kill("SIGTERM");
}

console.log(JSON.stringify({ consumer, staticOutput: join(consumer, "static"), embeddingOutput: join(site, "dist") }));

async function command(executable, args, cwd) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { cwd, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`${executable} exited ${code}`)));
  });
}

async function npmCommand(args, cwd) {
  await command(node, [npmCli, ...args], cwd);
}

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch { /* server is still starting */ }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`server did not start: ${url}`);
}
