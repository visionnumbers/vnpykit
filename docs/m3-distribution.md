# M3 distribution, CLI, and embedding

M3 adds local distribution artifacts without publishing them.

## Implemented surface

- `visionpy create <directory>` writes a minimal form project.
- `visionpy run <app.py>` builds into a temporary directory, binds to loopback by
  default, serves local assets, and reloads after source changes.
- `visionpy build <app.py>` writes a deployable static site and checksum manifest.
- `@visionpy/embed` exposes `mountVisionPy` and `createVisionPyApp` with ready,
  error, stop, dispose, recreate, focus, status, generation, and metrics.

The server rejects non-loopback hosts unless `--allow-public` is explicit. Entry,
base, asset, and served paths are bounded and traversal checked. The Worker remains
an isolation and responsiveness boundary for trusted application source; it is not
a security sandbox for hostile Python.

## Static layout

The generated directory contains `index.html`, `app.js`, `app.py`,
`visionpy-manifest.json`, runtime JavaScript, a separate Worker, Pyodide files,
micropip, and the VisionPy wheel. The manifest records protocol 1, CLI and Pyodide
versions, deployment base, file sizes, SHA-256 hashes, and reproducible epoch.

## Verification conditions

The external acceptance fixture is created under the operating-system temp
directory. It installs only locally packed `@visionpy/embed` and `@visionpy/cli`
tarballs, exact React/Vue/Vite versions, and their registry dependencies. It neither
uses workspace aliases nor imports monorepo source. Its Vite production output and
CLI output are served by `scripts/static-server.mjs`.

Chromium measurements on 2026-10-11 used a local no-store server, Pyodide 314.0.7,
and two sequential app starts. Resource transfer is measured through Playwright
request events; `runtimeReadyMs` includes WebAssembly initialization, stdlib load,
micropip, and wheel installation. `firstRenderMs - runtimeReadyMs` covers source
fetch/execution, snapshot delivery, and first render. These aggregates do not claim
separate CPU attribution for every Pyodide phase.

No shared Worker was introduced. Browser caching remains the safe warm-start
optimization; deployed hosts may add immutable caching for content-addressed or
versioned assets after validating update behavior.

Observed Chromium result on that run:

| Phase/asset | Cold | Sequential warm |
| --- | ---: | ---: |
| Runtime ready | 10,838.9 ms | 5,837.4 ms |
| First render | 10,925.7 ms | 6,002.1 ms |
| Source/snapshot/render after ready | 86.8 ms | 164.7 ms |
| Callback round trip | 7.5 ms | not exercised |
| WebAssembly response | 2,412.6 ms / 9,599,545 B | 567.8 ms / 9,599,545 B |
| Python stdlib response | 183.0 ms / 2,545,992 B | 124.1 ms / 2,545,992 B |
| micropip wheel response | 26.4 ms / 115,508 B | 5.2 ms / 115,508 B |
| VisionPy wheel response | 33.2 ms / 13,897 B | 4.9 ms / 13,897 B |
| Python source response | 10.2 ms / 688 B | 5.8 ms / 688 B |

“Warm” means a second independent Worker started after the first rendered in the
same browser session. The test server intentionally sends `Cache-Control: no-store`,
so improvements include browser/operating-system reuse and should not be treated as
an immutable-cache production forecast.

The opt-in Chromium release stress completed 100 dispose/remount cycles in 8.9
minutes. Forced-GC samples every ten cycles reported two live
`data-visionpy-root` owners throughout. Chromium exposed a coarse
`usedJSHeapSize` value of 10,000,000 bytes at every sample; this detects no growth
in that run but is not a native Worker/Python heap proof. The final instance
rendered and remained interactive.

## Outstanding browser gate

The exact final local tarballs passed 11 of 12 external-consumer cases. Chromium
and Firefox passed all four cases. WebKit passed nested CLI output, the sequential
plain host, and Vue, but its React host exceeded `startupTimeoutMs: 120000` twice,
including an isolated rerun. Trace evidence showed successful delivery of React,
the embed bundle, Worker, Pyodide, stdlib, WebAssembly, and micropip before the
runtime stalled. The machine had 763,072 KiB free of 8,234,192 KiB physical memory
at diagnosis and no stale Playwright process. An earlier WebKit run passed React in
12.6 seconds, so memory pressure is a plausible factor but is not established as
the cause. This unresolved gate makes M3 acceptance FAIL and blocks M4 readiness.
