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
