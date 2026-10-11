import { createReadStream } from "node:fs";
import { copyFile, stat, watch } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname, relative, resolve } from "node:path";
import { buildStaticApp, normalizeBasePath, resolveInside } from "./builder.js";

export interface DevServerOptions {
  entry: string;
  host?: string;
  port?: number;
  basePath?: string;
  assetsPath?: string;
  allowPublic?: boolean;
  workingDirectory?: string;
}

export interface DevServerHandle {
  readonly url: string;
  readonly outputDirectory: string;
  close(): Promise<void>;
}

const SAFE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export async function runDevServer(options: DevServerOptions): Promise<DevServerHandle> {
  const host = options.host ?? "127.0.0.1";
  if (!SAFE_HOSTS.has(host) && options.allowPublic !== true) throw new Error("Public host binding requires --allow-public; trusted code only.");
  const port = options.port ?? 4173;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("port must be an integer in [0, 65535]");
  const basePath = normalizeBasePath(options.basePath ?? "/");
  const work = resolve(options.workingDirectory ?? process.cwd());
  const entry = resolve(work, options.entry);
  const outputDirectory = resolve(work, ".vnpykit/dev");
  await buildStaticApp({ entry, outDir: outputDirectory, basePath, ...(options.assetsPath === undefined ? {} : { assetsPath: options.assetsPath }), liveReload: true });

  const clients = new Set<ServerResponse>();
  const server = createServer((request, response) => {
    void serve(request.url ?? "/", response, outputDirectory, basePath, clients);
  });
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolvePromise());
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Development server did not expose a TCP address");
  const displayHost = host === "::1" ? "[::1]" : host;
  const url = `http://${displayHost}:${address.port}${basePath}`;

  let closed = false;
  const watchAbort = new AbortController();
  const watcher = watch(entry, { signal: watchAbort.signal });
  const watchTask = (async () => {
    try {
      for await (const event of watcher) {
        if (closed || event.eventType !== "change") continue;
        try {
          await assertReadable(entry);
          await copyFile(entry, resolve(outputDirectory, "app.py"));
          for (const client of clients) client.write("data: reload\n\n");
        } catch (error) {
          process.stderr.write(`VNPyKit reload failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
        }
      }
    } catch (error) {
      if (!closed && (!(error instanceof Error) || error.name !== "AbortError")) process.stderr.write(`VNPyKit watcher failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
    }
  })();

  return {
    url,
    outputDirectory,
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      watchAbort.abort();
      for (const client of clients) client.end();
      await new Promise<void>((resolvePromise, reject) => server.close((error) => error === undefined ? resolvePromise() : reject(error)));
      await watchTask;
    },
  };
}

async function serve(rawUrl: string, response: ServerResponse, root: string, basePath: string, clients: Set<ServerResponse>): Promise<void> {
  try {
    const url = new URL(rawUrl, "http://localhost");
    if (!url.pathname.startsWith(basePath)) return respond(response, 404, "Not found");
    const relativePath = decodeURIComponent(url.pathname.slice(basePath.length));
    if (relativePath === "__vnpykit_reload") {
      response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
      response.write(": connected\n\n");
      clients.add(response);
      response.once("close", () => clients.delete(response));
      return;
    }
    const requested = relativePath === "" ? "index.html" : relativePath;
    const path = resolveInside(root, requested);
    if (!(await stat(path)).isFile()) return respond(response, 404, "Not found");
    response.writeHead(200, { "Content-Type": mimeType(path), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    createReadStream(path).pipe(response);
  } catch (error) {
    respond(response, error instanceof URIError || (error instanceof Error && error.message.includes("traversal")) ? 400 : 404, "Not found");
  }
}

function respond(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
  response.end(body);
}

function mimeType(path: string): string {
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".py": "text/x-python; charset=utf-8", ".json": "application/json; charset=utf-8", ".wasm": "application/wasm", ".whl": "application/zip", ".map": "application/json; charset=utf-8" } as Record<string, string>)[extname(path)] ?? "application/octet-stream";
}

async function assertReadable(path: string): Promise<void> { if (!(await stat(path)).isFile()) throw new Error(`Source is not a file: ${relative(process.cwd(), path)}`); }
