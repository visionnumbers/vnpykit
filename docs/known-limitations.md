# Known limitations

- VNPyKit `0.1.0a1` is experimental public-alpha software with a deliberately small widget
  set. Dynamic tree mutation, graphics, game APIs, and arbitrary package
  installation are deferred. API compatibility is not yet guaranteed for a
  future stable release.
- Startup downloads and initializes the pinned local Pyodide runtime. Cold-start
  time and memory use depend on the device and browser.
- Each app owns a Worker. This isolates lifecycle and responsiveness but does not
  safely contain hostile Python.
- The static build requires HTTP(S), correct nested-path configuration, and a CSP
  that permits its same-origin Worker and WebAssembly runtime. Static hosts must
  serve `.mjs` with a JavaScript MIME type; an observed Windows Python HTTP server
  defaulted to `text/plain` and caused `BOOT_FAILED`.
- Application state is in-memory; the framework does not provide persistence.
- Playwright WebKit passed the documented M5 Task Manager flows, but manual macOS
  Safari/VoiceOver testing remains **NOT RUN** under the disclosed alpha waiver.
- The M5 100-record stress simulation covered Python data records, not 100
  rendered interactive widgets or dynamic tree mutation.
- Preliminary trademark searches and the owner's accepted residual brand risk do
  not constitute formal legal clearance.
- This alpha is not represented as production ready.
