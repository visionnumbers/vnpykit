# VisionPy — RFC-0001: Technical Architecture & Public API Specification

**Status:** Proposed (not implemented)  
**Version:** RFC draft 1.0  
**Date:** 2026-10-10  
**Audience:** Python SDK contributors, TypeScript runtime contributors, maintainers, integration developers  
**Scope:** Global open-source project. VisionNumbers CodeLab is an optional downstream consumer, never a required dependency.  
**License (proposed):** Apache-2.0, subject to name, dependency-license, and ownership review.

---

## 0. Decision summary

**Recommendation:** Build VisionPy as a browser-native Python application framework, *not* as a drop-in port of Tkinter or Pygame. Separate the pure-Python authoring API, browser rendering engine, Pyodide execution runtime and packaging CLI, with a strictly versioned, serializable bridge protocol.

**v0.1 deliverable:** An externally embeddable, browser-executed counter/form application that mounts, updates, handles events, reports errors and disposes cleanly. It must run on a plain HTML page with no CodeLab dependencies.

**Do not claim:** tkinter/pygame source compatibility, desktop-native GUI, arbitrary Python-package compatibility, complete offline operation, hard security sandboxing, or guaranteed deterministic interruption of all malicious/unresponsive code.

**Unresolved before public naming:** `visionpy` PyPI/npm/domain availability and trademark clearance. The working name in this RFC is not a verified or reserved package name.

## 1. Motivation and problem definition

Python code can execute in a browser using Pyodide, but turning that into robust, embedded user interfaces requires developers to handle DOM rendering, worker messaging, lifecycle, resource cleanup and deployment manually. VisionPy standardizes these concerns with a Python-first interface.

### 1.1 Target users

- Python teachers and students creating interactive examples.
- Product engineers embedding small Python-powered tools in ordinary websites.
- Scientific and data-tool developers building browser-local interactive utilities.
- Developers building drawing and, later, simple game experiences with Python.
- Browser-based IDE authors, including—but not limited to—CodeLab.

### 1.2 Goals

G1. Browser-executed Python app authoring with no JavaScript required in the Python application source.  
G2. Host-side embedding for plain JS/TS pages; compatibility paths for React/Vue without requiring either framework.  
G3. Embeddable modules: a Python SDK, a browser renderer and a runtime/loader.  
G4. A documented, versioned wire protocol instead of arbitrary code execution in the renderer.  
G5. Stable lifecycle: initialize, mount, update, event dispatch, stop and dispose.  
G6. Default runtime inside a dedicated Web Worker.  
G7. Wheel-distributed pure-Python SDK usable with Pyodide micropip.  
G8. Automated tests and reproducible artifact builds.  
G9. Build a defensible foundation for future Canvas graphics and game APIs.

### 1.3 Non-goals for v0.1

NG1. Drop-in `import tkinter` or `import pygame` support.  
NG2. Full desktop window manager, direct OS file paths, native graphics acceleration.  
NG3. Full general-purpose Python web framework / server framework.  
NG4. Application server, accounts, persistence, synchronization or collaboration.  
NG5. Third-party Python packages with unsupported native extensions.  
NG6. Full game engine, physical simulation or 3D rendering.  
NG7. A guarantee of secure multi-tenant execution of hostile arbitrary programs solely from a Worker.  
NG8. A fully synchronous Python event model when hosted in a Worker.

## 2. Core architectural decisions

**ADR-001: Worker-first.** Pyodide executes in a dedicated Worker per active VisionPy application in v0.1. This provides separation of execution state and prevents ordinary Python CPU work from blocking the document's main thread; it is not a complete security isolation boundary. Shared/interpreter pooling is deferred.

**ADR-002: TypeScript DOM renderer.** Initial widgets render on the browser's main thread using real DOM elements, with standard browser focus and accessibility semantics. Avoid Canvas for ordinary text inputs/buttons.

**ADR-003: Pure-Python SDK.** Python SDK representation and state management depend only on the standard library where practical, with runtime bridge behind an interface. It can be unit-tested under CPython, while browser operations require Pyodide.

**ADR-004: Explicit wire protocol.** Send JSON-compatible, structured-clone-safe messages. Never transmit executable JS strings or arbitrary DOM HTML from application code. The renderer owns permitted element types and attributes.

**ADR-005: Instance-scoped ownership.** Every App, component, callback, subscription, scheduled task and runtime process belongs to one instance ID. Terminating one instance cannot affect another instance's resources.

**ADR-006: UI first.** Stabilize UI, event, lifecycle, distribution and embed APIs before adding drawing and game APIs.

**ADR-007: No implicit platform promise.** Pyodide is the only supported runtime initially. Future adapters are an architectural extension point, not a supported feature.

**ADR-008: Strict compatibility.** Python SDK and JS renderer declare a supported protocol major version and validate compatibility before app creation.

## 3. System boundaries and data flow

```text
  Developer Python source
            |
            v
    visionpy Python SDK
      components / state / callbacks
            |
            v
    Pyodide Runtime Worker  <-------- host runtime manager
            |
      serialized commands
            v
      MessageChannel / postMessage
            |
            v
      Protocol validator
            |
            v
       TypeScript Renderer
       DOM / CSS / Canvas (later)
            |
            v
      Scoped mount container

  Browser input event --> renderer --> sanitized event --> Worker --> Python callback
```

### 3.1 Responsibilities

| Package | Owns | Must not own |
|---|---|---|
| `visionpy` Python | Python app API, UI tree, reactive state, callback table, serialization | Browser DOM, executable JavaScript snippets |
| `@visionpy/renderer` | DOM elements, CSS, event capture, structural patch application | Python execution, Python package installation |
| `@visionpy/runtime-pyodide` | Worker boot, package loading, IPC, interruption/termination, error forwarding | Application-specific UI components |
| `@visionpy/core` (TS) | Wire types, protocol validation, session routing | Browser-specific components except agreed abstractions |
| `@visionpy/cli` | Dev server, asset packaging, example scaffolding, static build | Required app runtime state |

> The package names above are provisional and must be checked before publishing.

### 3.2 Runtime model

- Browser host calls `createVisionPyApp({ mount, python, assetsBaseUrl?, ... })`.
- Runtime manager allocates a unique instance and bootstraps a Worker.
- Worker loads pinned Pyodide artifacts, installs or loads a matching VisionPy pure-Python wheel, imports an app module, then emits its UI description.
- The renderer validates and mounts within the supplied container; then acknowledges readiness.
- User actions become typed event messages; Python executes bound callbacks; resulting patches render to DOM.
- `stop()` asks the Python app to exit gracefully; `dispose()` tears down DOM listeners, subscriptions, proxies and Worker. A hung Worker is terminated and replaced when required.

### 3.3 Multiple applications

Each app gets a separate worker, renderer root, lifecycle token, component namespace, callback namespace and message sequence. v0.1 intentionally accepts higher memory use in exchange for simpler isolation. Performance and optional pooling can be evaluated after release.

## 4. Proposed Python public API

### 4.1 Canonical modules

```python
from visionpy import App
from visionpy.ui import Column, Row, Text, Button, TextInput, Checkbox
from visionpy.state import State
```

Future namespaces (not in the initial commitment): `visionpy.graphics`, `visionpy.game`, `visionpy.audio`, `visionpy.compat`.

### 4.2 Hello World (normative intended semantics)

```python
from visionpy import App
from visionpy.ui import Column, Text, Button
from visionpy.state import State

app = App(title="Counter")
count = State(0)

with app.layout():
    with Column(gap=12):
        Text.bind(lambda: f"Count: {count.value}")
        Button("Increment", on_click=lambda: count.set(count.value + 1))

app.run()
```

**Important:** This is a target API specification, not implemented code. `.bind` reevaluates only when dependencies read during its evaluation change; the engine tracks dependencies per binding and unregisters them on component/app disposal. Python callbacks execute in the Worker. `app.run()` starts the browser-owned lifecycle; it must **not** block the worker's event loop. An explicit `await app.serve()` API may be added later for async usage.

### 4.3 App

Proposed constructor: `App(*, title: str = "VisionPy App", theme: str = "system")`. The app owns the root container and retains references to all dependent resources.

Methods: `layout()` context manager, `run()`, `request_stop()`, `dispose()`; app lifecycle states: `CREATED → INITIALIZING → MOUNTED → RUNNING → STOPPING → DISPOSED`, plus `FAILED`. Illegal transitions raise a defined `LifecycleError`.

### 4.4 Widgets in v0.1

| Widget | Core props | Events | Accessibility |
|---|---|---|---|
| Text | text, level, tone | none | semantic text/heading |
| Button | text, disabled | click | native button |
| TextInput | value, placeholder, disabled | input, change | native input + label |
| Checkbox | checked, disabled, label | change | native checkbox |
| Column | gap, align | none | layout |
| Row | gap, align | none | layout |
| Container | padding, width | none | layout |

All widget props must pass a bounded schema; no unrestricted style object, event-handler JavaScript, or raw HTML injection in v0.1. IDs are generated per app and remain stable for an instance's lifetime.

### 4.5 Reactive State

`State[T]` exposes `.value`, `.set(value)`, `.subscribe(callback)` (optional public convenience), and controlled dependency tracking through `Text.bind(...)` or `Binding(...)`. State mutation batches into a single patch per scheduling cycle; event ordering remains deterministic within one instance. Reading state does not mutate it; setting an equal primitive value should not produce unnecessary patches.

### 4.6 Events

Python handlers receive an optional typed data object (`ClickEvent`, `InputEvent`, `ChangeEvent`) containing a restricted set of fields. Event objects cannot expose browser DOM references. For `TextInput`, changed `value` is always the source of truth. Avoid pretending that worker callbacks can synchronously cancel native browser default actions: renderer performs specified browser-side behavior and reports asynchronously.

### 4.7 Exceptions

Public errors include `VisionPyError`, `InvalidPropertyError`, `LifecycleError`, `ProtocolMismatchError`, `RuntimeError` (use a framework-specific derived name in implementation to avoid builtin confusion), and `UnsupportedFeatureError`. Errors include stable codes plus human-readable descriptions; details visible to end users must not include host secrets.

### 4.8 Compatibility roadmap

Tkinter-inspired helpers or a `visionpy.compat.tk` module may appear after explicit API review, but should not be advertised as full tkinter compatibility. Game examples may use familiar sprite/update concepts without claiming pygame API compatibility.

## 5. Browser host embedding API

Proposed JS usage:

```typescript
import { createVisionPyApp } from "@visionpy/runtime-pyodide";

const app = await createVisionPyApp({
  mount: document.getElementById("python-app")!,
  python: "/examples/counter.py",
  assetsBaseUrl: "/visionpy-assets/",
});

await app.ready;
// later
await app.dispose();
```

The `python` field accepts a same-origin file URL or configured source text through an explicitly named option, not an arbitrary remote URL by default. No execution of remote developer content without caller intent. Host exposes `ready`, `status`, `onError`, `stop()`, `dispose()` and possibly `restart()`.

### 5.1 Framework independence

No React, Vue, Svelte or CodeLab dependency in the core runtime. The host supplies a mount HTMLElement and receives a disposable app handle. Framework-specific wrappers may be separately published later.

### 5.2 Styling ownership

Renderer maintains namespaced CSS class names. Default styles should be scoped to the mount root (using Shadow DOM if compatibility testing supports it), with explicit tokens for fonts, colors and spacing. Respect reduced-motion preference; native focus rings and semantic form labels must be preserved.

## 6. Wire protocol v1

### 6.1 Envelope

All messages include:

```json
{
  "protocol": "visionpy/1",
  "instance_id": "session-opaque-id",
  "request_id": "req-42",
  "sequence": 17,
  "type": "ui.patch",
  "payload": { "operations": [] }
}
```

`instance_id` is issued by the browser runtime. `sequence` is monotonically increasing per sender and instance. The receiver rejects malformed payloads, unknown operations, unsupported protocol major versions, cross-instance messages and invalid component ownership. Acknowledge operations when ordering or error recovery requires it.

### 6.2 Messages

| Type | Direction | Meaning |
|---|---|---|
| `runtime.hello` | worker → host | runtime and protocol capability negotiation |
| `runtime.ready` | worker → host | Python booted and app import completed |
| `ui.snapshot` | worker → renderer | validated full component tree |
| `ui.patch` | worker → renderer | ordered create/update/move/remove changes |
| `ui.event` | renderer → worker | normalized click/input/change data |
| `ui.ack` | renderer → worker | operation acceptance, optional paint ack |
| `runtime.error` | either | structured recoverable/fatal error |
| `runtime.stop` | host → worker | cooperative stop request |
| `runtime.disposed` | worker → host | graceful teardown finished |
| `runtime.log` | worker → host | bounded sanitized diagnostics |

### 6.3 Snapshot example

```json
{
  "protocol": "visionpy/1",
  "instance_id": "app-a",
  "request_id": "snapshot-1",
  "sequence": 1,
  "type": "ui.snapshot",
  "payload": {
    "root": {
      "id": "root-1",
      "type": "column",
      "props": {"gap": 12},
      "children": [
        {"id": "text-1", "type": "text", "props": {"text": "Count: 0"}, "children": []},
        {"id": "btn-1", "type": "button", "props": {"text": "Increment"}, "events": {"click": "cb-1"}, "children": []}
      ]
    }
  }
}
```

### 6.4 Renderer rules

- Allowlisted widget type → native DOM component factory.
- Text always assigned through `textContent` (not `innerHTML`).
- Widget props validated against the widget schema.
- URLs, if supported later, restricted by scheme and caller policy; never treat scripts as normal assets.
- `ui.patch` updates an existing, instance-owned tree; attempts to modify unknown IDs fail atomically.
- Renderer caps message size, nesting depth, component count and queued events; numeric budgets must be benchmarked and finalized before beta.
- Patch delivery batches to avoid unnecessary layout/reflow; input handling must remain responsive.
- On renderer error, emit structured `runtime.error` without silently leaving partially mutated DOM.

### 6.5 Event handling

Renderer emits `ui.event` with target component ID, registered callback ID, type, sanitized payload and a unique event sequence. Worker validates callback ownership before dispatch. UI changes triggered by an event are transmitted back as patches. Debounce high-frequency input and pointer events at the renderer layer; event delivery is ordered but not guaranteed real-time or synchronously cancelable.

## 7. Security, resource limits and threat model

### 7.1 Threat model

Distinct deployments have distinct trust levels. VisionPy can host developer-authored, trusted app code in a website, or user-supplied untrusted code in an educational playground. A Worker is a performance/isolation boundary but not a hardened isolation mechanism for attacker-controlled source code on the same origin. **Do not execute untrusted source on a sensitive production origin without a separate origin/sandbox security design.**

### 7.2 Minimum safeguards

- Separate origin or sandboxed iframe for truly untrusted app source, with the narrowest feasible CSP and permissions policy.
- Validate every incoming message, ID, event type and attribute; never use `eval` on protocol payloads in the renderer.
- Avoid granting access to privileged host DOM, cookies or authentication state.
- No arbitrary `innerHTML`, scripts, `javascript:` URLs or unrestricted HTML attributes.
- Worker startup, runtime execution and app disposal have host-enforced timeouts and limits; timeout values must be tuned by benchmark.
- Support Worker termination and recreation. Cooperative interrupts are an optimization, not the only stop mechanism.
- Cleanup timer handles, callback registrations, subscriptions, object URLs, event listeners and proxy references.
- Document that browser-memory limits are environment-specific; v0.1 does not promise a hard memory quota from inside the Worker.
- No network access permissions beyond browser origin and embedding policy; app source must not automatically receive credentials from the host.
- Track dependencies and publish advisories for vulnerabilities.

### 7.3 Pyodide interruption

Pyodide's documented interrupt-buffer mechanism uses SharedArrayBuffer in a Worker and requires compatible isolation/security headers. Those headers may conflict with third-party embeds and asset hosts. `stop()` must therefore always have a terminating-worker fallback; hard interruption must not be required for v0.1 operation. An additional cross-origin isolated optimization can be enabled only when supported.

### 7.4 Lifecycle teardown contract

`dispose()` is idempotent. On invocation it must stop new callbacks, prevent further host patches, close message channels, remove renderer-owned DOM/listeners, release object URLs, dispose registered Python subscriptions/proxies where possible, and terminate the Worker. Events received after disposal are ignored and logged only in development mode. Repeated create/dispose loops should not show unbounded growth after GC stabilization.

## 8. Performance and accessibility

### 8.1 Provisional benchmarks (targets, not measured facts)

| Metric | Initial target | Validation |
|---|---|---|
| Event → visible update | p95 under 100 ms for simple callbacks on reference desktop after warm start | Playwright timing |
| First post-initialization mount | p95 under 500 ms after runtime ready on reference desktop | perf marks |
| Repeated mount/dispose | No monotonic retained-app growth over 100 cycles beyond tolerance | heap instrumentation |
| Input usability | No dropped ordinary typing events in standard form under test load | browser E2E |
| Two apps concurrently | Independent state and callbacks, no cross-instance updates | isolation E2E |

These thresholds may be revised by published baseline measurements across devices; Pyodide cold-start/asset download is separately reported and not hidden inside warm-start figures.

### 8.2 Accessibility baseline

Native buttons and form controls; proper associated labels; keyboard operation; visible focus; screen-reader names; semantic headings; error announcements where meaningful; reduced-motion support; sufficient contrast in the default theme. Canvas and advanced graphics require alternative descriptions in later versions.

## 9. Build, packaging and distribution

### 9.1 Artifact contracts

1. **PyPI wheel:** pure-Python `visionpy` package; tagged as generic (`py3-none-any`) if dependencies remain pure Python.
2. **npm runtime:** host API, Worker loader, type declarations, renderer and protocol validators.
3. **CLI:** developer experience for local running and producing deployable static assets (can initially be an npm CLI; do not misrepresent a Python CLI before implemented).
4. **Static assets:** pinned Pyodide build, SDK wheel, versioned runtime chunks and app source.
5. **Documentation:** publicly hosted API reference, minimal cookbook, embedding samples and compatibility table.

The Python `pyproject.toml` specifies build backend and metadata. Native extension dependencies require separate WebAssembly-compatible builds or should be excluded initially. Pyodide's micropip supports pure-Python wheels and selected compatible WebAssembly wheels.

### 9.2 Versioning policy

Use semantic versioning on public packages with a compatibility matrix. Protocol major version `visionpy/1` is distinct from package semver. v0.x APIs may change with explicit release notes. CI enforces matching SDK/renderer protocol acceptance tests. Lock Pyodide version per tested runtime release; upgrade only after browser regression tests.

### 9.3 Offline policy

Support self-hosting all runtime artifacts and caching assets after first load. Do not promise first-visit offline execution. PWA/service-worker support is an optional later integration rather than a v0.1 hard requirement.

### 9.4 Proposed monorepo layout

```text
visionpy/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── RFC/
│   └── 0001-architecture.md
├── packages/
│   ├── python-sdk/
│   │   ├── pyproject.toml
│   │   ├── src/visionpy/
│   │   │   ├── __init__.py
│   │   │   ├── app.py
│   │   │   ├── state.py
│   │   │   ├── events.py
│   │   │   ├── components.py
│   │   │   ├── bridge.py
│   │   │   ├── errors.py
│   │   │   └── ui/
│   │   └── tests/
│   ├── protocol/
│   │   ├── schemas/
│   │   └── src/
│   ├── renderer/
│   │   ├── src/
│   │   └── tests/
│   ├── runtime-pyodide/
│   │   ├── src/worker/
│   │   ├── src/host/
│   │   └── tests/
│   └── cli/
├── examples/
│   ├── counter/
│   ├── form/
│   ├── two-apps/
│   └── embedding-plain-html/
├── integration-tests/
├── docs/
├── tools/
└── .github/workflows/
```

## 10. Testing strategy

**Python unit tests:** API surface, state/binding dependency tracking, callback ownership, serialization, illegal lifecycle transitions and resource teardown under CPython.  
**TypeScript unit tests:** protocol schema validation, renderer node diffing, allowlisted attributes, event serialization and isolation boundaries.  
**Browser integration:** Pyodide Worker boot, wheel installation, counter interactions, repeated input, two app mounts, Worker crash, stop/restart/dispose and malformed message rejection.  
**Compatibility:** Current supported Chromium/Firefox/WebKit versions via Playwright; mobile smoke checks where realistic.  
**Packaging tests:** `python -m build`, wheel metadata audit, clean install, npm build/typecheck, static deploy smoke test and self-hosted artifact loading.  
**Security checks:** untrusted text HTML injection attempts, callback ID forgery, invalid message nesting, disallowed URLs, disposed-session event replay, app-to-app access attempts.

### 10.1 Required CI checks on pull requests

- Format and lint (Python + TypeScript).
- Static type checks for TS and publicly typed Python APIs.
- Python unit tests.
- JS/TS unit tests.
- Protocol contract tests.
- Browser E2E tests.
- Build wheel and npm artifacts.
- Example build smoke test.
- Dependency vulnerability and license review.

## 11. v0.1 acceptance criteria (release blockers)

- [ ] Public monorepo, license, contribution rules and versioned RFC approved.
- [ ] Pure Python wheel can install under tested Pyodide release and standard CPython for SDK-level tests.
- [ ] Plain HTML embedding can mount an app from Python source without CodeLab.
- [ ] `App`, `State`, `Column`, `Row`, `Text`, `Button`, `TextInput`, `Checkbox` work with documented semantics.
- [ ] Python event handlers update UI consistently with protocol-valid patches.
- [ ] Distinct apps maintain independent state, event callbacks and DOM roots.
- [ ] Protocol major mismatch is rejected with an actionable error.
- [ ] Renderer ignores/rejects unsupported components, properties and malicious inputs.
- [ ] `stop()` and `dispose()` work with cooperative and forced Worker termination paths.
- [ ] 100 repeated mounts/disposals pass stability test without unbounded retained resources.
- [ ] Pyodide cold-start and interaction latency baselines are published; target thresholds reviewed.
- [ ] Accessibility basics pass keyboard, label and focus tests.
- [ ] Chrome, Firefox, WebKit tests pass on supported CI environments.
- [ ] Example Counter, Form and Two-apps projects work in static hosting.
- [ ] Python API documentation, JS embedding reference and troubleshooting guide are published.
- [ ] Versioned release artifacts have reproducible checks and dependency manifest.

## 12. Implementation sequence

### M0 — Foundations

Finalize naming, repository, license, RFC approval, support matrix, protocol schema and release automation skeleton. Deliver a no-op browser Worker handshake and hello/ready negotiation.

### M1 — Minimal vertical slice

Implement Python `App`, `Text`, `Button`, callback registry, Worker bridge, renderer mount and event round trip. Deliver counter app in a plain HTML host. This vertical slice is the first measurable value milestone.

### M2 — State, forms and lifecycle

Add reactive state, dynamic text, Row/Column, input and checkbox; implement cleanup, stop, restart, idempotent dispose, error formatting and multi-instance integration tests.

### M3 — Developer packaging

Build wheel/npm assets; local dev loader; standalone static build prototype; source maps; docs; release candidates; cross-browser validation.

### M4 — v0.1 release

Satisfy release blockers, publish sample gallery, verify compatibility docs, release notes and migration policy. Defer features not meeting quality bar rather than expanding scope.

### M5 — Subsequent RFCs

New RFCs independently define Canvas graphics/shape pipeline, sprite/game loop scheduling, media/audio policies, advanced styling, package/plugin ecosystem, persistence, accessibility enhancements and optional runtime adapters.

## 13. Decisions intentionally deferred

D1. Final package name and domain: verify global naming and collisions before publish.  
D2. Exact Python minimum version: align with pinned Pyodide interpreter and tests.  
D3. Shadow DOM vs scoped regular DOM: choose using focus, styling and accessibility proof tests.  
D4. Reactive API syntax: confirm whether `Text.bind` and `State[T]` yield clean typed signatures, especially dynamic lists.  
D5. Fine-grained patch vs snapshot-after-event: implement the smallest reliable protocol first, then benchmark.  
D6. Package CLI language and build packaging: optimize for reproducible output, not premature tool count.  
D7. Cross-origin iframe hosting security profile: design a separately reviewed recipe for untrusted user code.  
D8. Browser storage or network API exposure: explicit capability policy in future RFC.  
D9. Event backpressure and cancellation: exact numeric thresholds validated under stress tests.  
D10. Logo/name/website: marketing only after package availability and initial API validation.

## 14. Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Pyodide download/startup weight | High | self-hosting, caching, warm-start measurements, realistic docs |
| Worker/DOM async impedance mismatch | High | async event protocol; no fake synchronous browser API |
| Untrusted Python on privileged origin | Critical | dedicated origin/iframe, CSP, explicit threat-model docs |
| Memory leaks across Python↔JS boundary | High | deterministic app ownership, disposal tests, proxy cleanup |
| Scope explosion into full Pygame/Tkinter clone | High | UI-first v0.1 gates, separate future RFCs |
| Browser support inconsistencies | Medium | Playwright matrix, feature detection, progressive enhancement |
| Protocol-version drift | High | shared schema/contract CI, handshake validation |
| Naming/package collision | Medium | verify registry + trademark before public branding |
| Asset licenses/supply chain | High | pinned versions, bill of materials, license scanning |
| Low adoption vs established solutions | High | focus on reusable embeddability, simple API, honest comparison |

## 15. Why this design instead of alternatives?

**Direct JS calls from every widget:** Easy prototype, but locks Python APIs to browser main-thread semantics and makes Worker execution, testing, and cleanup harder. Rejected as the default architecture.

**Canvas-only GUI:** Easier single draw surface but would require rebuilding accessibility, text fields, focus and form behavior. Rejected for general UI. Canvas remains suitable for graphics.

**Full Tkinter/Pygame compatibility:** Broad initial feature surface, platform-semantic mismatch and compatibility maintenance burden. Rejected until explicit evidence of demand and feasibility.

**Server-based Python UI:** Useful for other frameworks, but violates VisionPy's key design goal of browser-local, serverless execution. Not the initial architecture.

**Monolithic CodeLab integration:** Reduces near-term wiring effort but blocks independent reuse. Explicitly rejected. CodeLab integration is an adapter/use-case after stand-alone acceptance tests.

## 16. External references (verified for design rationale)

- Pyodide overview and Python–JavaScript interoperability: https://github.com/pyodide/pyodide/blob/main/docs/index.rst
- Pyodide Web Worker use: https://pyodide.org/en/0.27.0/usage/webworker.html
- Pyodide interrupt mechanism: https://pyodide.org/en/0.27.7/usage/keyboard-interrupts.html
- Pyodide FFI API: https://pyodide.org/en/stable/usage/api/python-api/ffi.html
- micropip wheel support: https://micropip.pyodide.org/en/latest/project/usage.html
- Python `pyproject.toml`: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
- Python package release flow: https://packaging.python.org/en/latest/flow/

## 17. Final approval recommendation

**Approve direction, not implementation completeness.** Authorize a focused M0/M1 prototype only after accepting the non-goals, security constraints and API review. The first proof must run outside CodeLab on a minimal standalone HTML page. If that proof does not reliably support mount → event → update → dispose, pause scope expansion before graphics or games.

**Success criterion:** A third-party developer can install the SDK/runtime, embed a Python-powered form in an unrelated website, and understand its compatibility and security limitations from the documentation alone.
