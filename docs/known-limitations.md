# Known limitations

- VNPyKit `0.1.0a1` is a public-alpha candidate with a deliberately small widget
  set. Dynamic tree mutation, graphics, game APIs, and arbitrary package
  installation are deferred.
- Startup downloads and initializes the pinned local Pyodide runtime. Cold-start
  time and memory use depend on the device and browser.
- Each app owns a Worker. This isolates lifecycle and responsiveness but does not
  safely contain hostile Python.
- The static build requires HTTP(S), correct nested-path configuration, and a CSP
  that permits its same-origin Worker and WebAssembly runtime.
- Manual NVDA, VoiceOver, Windows High Contrast, 200%/400% zoom, reduced-motion,
  and multi-instance assistive-technology audits remain required for release.
- Registry namespace control, private vulnerability reporting, and trademark
  review are external release gates and are not established by a successful
  local build.

