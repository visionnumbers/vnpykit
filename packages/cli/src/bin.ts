#!/usr/bin/env node
import { buildStaticApp, createProject, runDevServer } from "./index.js";

async function main(args: string[]): Promise<void> {
  const [command, subject, ...rest] = args;
  if (command === undefined || command === "help" || command === "--help" || command === "-h") return help();
  if (command === "create") {
    if (subject === undefined) throw new Error("Usage: visionpy create <directory>");
    const path = await createProject(subject);
    console.log(`Created ${path}`);
    return;
  }
  if (command === "build") {
    if (subject === undefined) throw new Error("Usage: visionpy build <app.py> [--out-dir dist] [--base /]");
    const flags = parseFlags(rest);
    const manifest = await buildStaticApp({
      entry: subject,
      outDir: flags.get("out-dir") ?? "dist",
      basePath: flags.get("base") ?? "/",
      assetsPath: flags.get("assets-path") ?? "assets",
      title: flags.get("title") ?? "VisionPy application",
    });
    console.log(`Built ${manifest.files.length} files for ${manifest.deploymentBase}`);
    return;
  }
  if (command === "run") {
    if (subject === undefined) throw new Error("Usage: visionpy run <app.py> [--port 4173] [--host 127.0.0.1]");
    const flags = parseFlags(rest);
    const portText = flags.get("port") ?? "4173";
    if (!/^\d{1,5}$/u.test(portText)) throw new Error("--port must be an integer");
    const server = await runDevServer({
      entry: subject,
      port: Number(portText),
      host: flags.get("host") ?? "127.0.0.1",
      basePath: flags.get("base") ?? "/",
      assetsPath: flags.get("assets-path") ?? "assets",
      allowPublic: flags.has("allow-public"),
    });
    console.log(`VisionPy development server: ${server.url}`);
    const stop = async (): Promise<void> => { await server.close(); process.exitCode = 0; };
    process.once("SIGINT", () => void stop());
    process.once("SIGTERM", () => void stop());
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

function parseFlags(args: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index] as string;
    if (!item.startsWith("--")) throw new Error(`Unexpected argument: ${item}`);
    const key = item.slice(2);
    if (key === "allow-public") { result.set(key, "true"); continue; }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    if (!new Set(["out-dir", "base", "assets-path", "title", "port", "host"]).has(key)) throw new Error(`Unknown option: --${key}`);
    result.set(key, value);
    index += 1;
  }
  return result;
}

function help(): void {
  console.log(`VisionPy CLI\n\n  visionpy create <directory>\n  visionpy run <app.py> [--port 4173] [--host 127.0.0.1] [--base /]\n  visionpy build <app.py> [--out-dir dist] [--base /]\n\nNode.js 24+ is required. Public host binding requires --allow-public.`);
}

void main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`VisionPy: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
