import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(process.env.VNPYKIT_STATIC_DIR ?? join(tmpdir(), "vnpykit-m3-external-consumer", "site", "dist"));
const types = new Map([[".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"], [".css", "text/css; charset=utf-8"], [".py", "text/x-python; charset=utf-8"], [".wasm", "application/wasm"], [".whl", "application/zip"], [".zip", "application/zip"], [".json", "application/json; charset=utf-8"]]);
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const file = resolve(root, `.${normalize(requested)}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error("path traversal");
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": types.get(extname(file)) ?? "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});
server.listen(4175, "127.0.0.1", () => console.log(`Static consumer server: http://127.0.0.1:4175 (${root})`));
