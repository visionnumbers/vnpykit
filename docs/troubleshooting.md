# Troubleshooting

- **Missing wheel during CLI build:** build `packages/python-sdk` before packing the
  CLI. The CLI deliberately refuses ambiguous or missing wheel sets.
- **`BOOT_FAILED` or dynamic module fetch failed for `pyodide.mjs`:** inspect the
  response `Content-Type`. An observed Windows `python -m http.server` setup
  returned `text/plain`; serve `.mjs` as `text/javascript` (or another supported
  JavaScript MIME type). Confirm `assetsBaseUrl` ends at the directory containing
  `pyodide/` and `wheels/`. See the
  [Windows Python server example](deployment.md#windows-python-http-server).
- **Python source request returned 404:** copy `app.py` into the deployed site and
  resolve its URL relative to the page.
- **Worker rejected by CSP:** deploy the package's separate `worker.js` and allow
  same-origin workers. Do not enable executable data URLs.
- **Nested deployment fails:** pass the real prefix with `--base /prefix/` and avoid
  host rewrites that turn asset 404s into HTML.
- **Public host binding rejected:** development serving defaults to loopback. Use
  `--allow-public` only on a trusted network with trusted source.
- **Startup timeout:** cold WebAssembly startup is hardware dependent. Increase the
  startup timeout and inspect the typed error callback and browser network panel.
- **Protocol or generation error:** rebuild all matching artifacts and remove stale
  cached files; protocol 1 packages are version locked for this alpha.
