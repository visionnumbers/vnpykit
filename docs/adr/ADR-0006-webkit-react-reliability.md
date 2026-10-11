# ADR-0006: WebKit and React startup reliability

- Status: Accepted; browser regression verified
- Date: 2026-10-11

## Context

The M3 release candidate passed 11 of 12 external-consumer cases. WebKit with the
React production fixture exceeded the configured 120-second startup budget. The
test uses packed `@visionpy/embed` and `@visionpy/cli` tarballs in an independent
npm project and never imports monorepo source.

Structured host, Worker, and React lifecycle logging was added for diagnosis. The
production fixture now renders under `React.StrictMode`, and the matrix is
serialized with one Playwright worker so three Pyodide browser processes do not
compete during acceptance.

## Evidence

In the first isolated WebKit trace, all network requests returned successfully.
Worker bootstrap reached these stages:

| Stage | Worker elapsed time |
| --- | ---: |
| Pyodide module imported | 0.261 s |
| Pyodide initialized, including WASM and stdlib | 39.967 s |
| micropip loaded | 95.360 s |
| Host startup timeout | 120.065 s |

The micropip package load consumed about 55.4 seconds. No Worker exception,
generation rejection, missing resource, protocol error, or deadlock signal was
present. The Worker was making progress when the host enforced its existing
budget.

The SDK wheel declares no dependencies. Pyodide 314.0.7 documents
`loadPackage(wheelUrl)` for PEP 427 pure-Python wheels and describes it as a
lower-overhead path without dependency resolution. After switching to that path,
the second isolated trace reached Pyodide initialization at 35.568 seconds and
completed direct SDK wheel installation at 53.905 seconds. It then remained in
Python bridge import until the 120.083-second timeout.

At the second run the Windows host had 703.4 MiB free of 8,041.2 MiB physical
memory. This is direct evidence that the run was memory constrained, but it does
not prove that memory pressure is the sole cause. A previous WebKit artifact run
on the same project completed React startup in 12.6 seconds.

The production React build invoked one effect mount and no StrictMode development
double-mount. Development StrictMode can still abandon a Worker while it boots.
Previously that Worker could not observe its MessagePort disposal request until
after Pyodide and wheel setup.

## Decision

1. Install the dependency-free SDK wheel with Pyodide's direct URL package loader.
   Generated CLI sites no longer copy an unused micropip wheel.
2. Terminate a Worker synchronously when its app is disposed before readiness.
   Close the MessagePort and renderer in the same path. Ready/running apps retain
   graceful protocol disposal followed by forced termination.
3. Keep structured lifecycle diagnostics for host loading, Worker creation,
   Pyodide initialization, wheel installation, bridge readiness, snapshot, first
   render, errors, and disposal.
4. Run external browser acceptance with `workers: 1` and keep the 120-second
   product startup budget. The timeout is not increased to mask the failure.
5. Exercise the production React artifact under `React.StrictMode` and retain a
   unit regression proving pre-ready Worker termination is synchronous.

## Consequences

The optimized path removes a measured 55-second resolver cost in the constrained
WebKit trace and reduces each generated static site by one unused wheel. Protocol
major 1, envelope order, ownership, widget behavior, and SDK imports are unchanged.

After the optimized artifacts were rebuilt, the serialized 12-case matrix passed.
The exact documentation-final tarballs repeated all 12 cases in 2.7 minutes.
WebKit 27.2 completed React first render at 10.858 seconds and clean disposal at
11.021 seconds. The same runtime also passed an isolated repeat with first render
at 11.020 seconds. Chromium and Firefox passed all four cases. This closes the
WebKit browser regression.

The original low-memory failures remain useful evidence: severe host contention
can make WebAssembly and Python initialization exceed a fixed startup budget. It
does not alter the release result because both required final artifact runs passed
without increasing that budget.
