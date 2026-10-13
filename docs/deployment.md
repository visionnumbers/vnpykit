# Static deployment

Build with the public URL prefix that will contain the application:

```shell
vnpykit build app.py --out-dir dist --base /products/demo/
```

Upload the complete `dist` directory without renaming its internal files. Configure
the host to serve `.mjs` as JavaScript, `.wasm` as `application/wasm`, `.json` as
JSON, and wheels/zip files as binary or ZIP content. Preserve relative paths and do
not rewrite asset requests to HTML.

The generated page supplies a CSP that permits same-origin scripts, workers,
connections, and WebAssembly compilation. It does not permit remote package fetches
or executable `data:` workers. The separate `worker.js` must remain same origin.

The build manifest can be checked for accidental corruption by comparing every
listed size and SHA-256. Set `SOURCE_DATE_EPOCH` to a nonnegative integer when a
release pipeline needs a specific reproducible metadata timestamp.

Treat Python source as trusted same-origin application code. A same-origin Worker
does not isolate hostile code from network access or application credentials.

## Windows Python HTTP server

During M5 Task Manager validation on Windows, this otherwise convenient command
served `pyodide.mjs` as `text/plain`:

```powershell
python -m http.server 8000 --directory dist
```

The browser refused to import the module and VNPyKit reported `BOOT_FAILED`.
This was a static-server MIME configuration issue. Serve `.mjs` as JavaScript;
for example, the following loopback-only development server also maps WebAssembly
explicitly:

```python
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class VNPyKitHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".mjs": "text/javascript",
        ".wasm": "application/wasm",
    }


handler = partial(VNPyKitHandler, directory="dist")
with ThreadingHTTPServer(("127.0.0.1", 8000), handler) as server:
    server.serve_forever()
```

Before opening the app, verify that the `Content-Type` for a generated `.mjs`
asset begins with `text/javascript` (or another browser-supported JavaScript MIME
type). Do not use this small development server as a production deployment.
