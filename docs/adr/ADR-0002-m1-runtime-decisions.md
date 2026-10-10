# ADR-0002: M1 runtime decisions

- Status: Accepted for M1
- Date: 2026-10-10
- Scope: VP-003 through VP-007

## Decision

VisionPy M1 uses `pyodide@314.0.7` (Python 3.14.2) with `micropip==0.11.1`. The SDK wheel is pure Python and was installed and executed in an actual Chromium Worker. Pyodide core assets, the exact lockfile-selected micropip wheel, the SDK wheel, and application source are served from a caller-configurable local base URL.

Each app owns one module Worker, one `MessageChannel`, one random app ID, one generation, one renderer root, and one Python `App`. The browser sends source or a same-origin source URL explicitly. No arbitrary package list or implicit remote package installer is exposed.

Python serializes bridge messages to JSON before calling the JavaScript sink. This prevents Python objects and callables from crossing `postMessage`. The Worker validates Python output before forwarding it and destroys retained Python call proxies during teardown. Host disposal always terminates the Worker after the grace period, even when cooperative disposal succeeds.

The renderer uses an app-owned element with an open ShadowRoot, DOM construction APIs, `textContent`, internal event ownership maps, and a complete validation pass before applying property patches. M1 supports only Container, Column, Text, and Button. Structural updates remain unsupported because protocol v1 has no structural patch operation.

## Consequences

- Basic operation does not require SharedArrayBuffer or cross-origin isolation.
- A Worker remains a responsiveness boundary rather than a hostile-code sandbox.
- `stop()` prevents new UI events but preserves the last rendered tree; `dispose()` is the resource-release operation.
- Restart means disposing and creating a fresh handle with a new generation.
- The shipped example copies verified runtime assets during its prepare step; it performs no runtime CDN fetch.

