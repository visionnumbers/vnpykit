# VisionPy v0.1 — Implementation Blueprint

**Document ID:** VP-BP-0001  
**Status:** Implementation-ready proposal, pending ADR approval  
**Date:** 2026-10-10  
**Based on:** VisionPy RFC-0001, draft 1.0 (2026-10-10)  
**Audience:** Python, TypeScript, browser-runtime, test, tooling, security and documentation contributors  
**Project scope:** General-purpose open-source product; VisionNumbers CodeLab is one optional downstream consumer  
**Release:** `0.1.0-alpha.1` -> `0.1.0` after release gates. All package names remain provisional until registry and trademark checks.

> **Normative keywords:** MUST / MUST NOT / SHOULD / MAY. The examples in this blueprint are contracts or design sketches, not claims that VisionPy is already implemented. Do not release code based solely on a green demo; satisfy the tests and security constraints.

## 0. Executive build contract

Build a browser-first Python GUI SDK with a TypeScript DOM renderer and Pyodide Worker execution. A plain HTML page must mount two independent VisionPy counter/form applications, update text after button/input interaction, safely report Python errors, dispose each application without leaks, and build as a documented static distributable without requiring React, Vue, a Python backend or CodeLab.

**v0.1 non-goals:** native desktop windows, import-compatible tkinter/pygame, full graphics or game engine, unrestricted CSS or HTML injection, arbitrary remote package installation, service-worker offline guarantee, hardened execution of adversarial untrusted Python on the same origin.

**Decisions inherited from RFC-0001:** Worker-first; one Worker per app; pure-Python UI model; TypeScript DOM renderer; versioned typed messages; per-app IDs; scoped mount roots; strict wire and asset compatibility; SDK separate from CodeLab.

**Deliberate refinements of RFC-0001:**
1. `App.run()` is **nonblocking** and freezes initial mount tree but keeps event handlers and state active; `createVisionPyApp()` owns the Worker. No hidden Python main loop.
2. v0.1 uses a **full-tree snapshot on mount**, and **bounded batched property patches** for updates. Structural mutations after `run()` are explicitly unsupported until a later version, simplifying correctness and API stability.
3. `State` dependency tracking is performed with a Python context variable (per execution context), explicit observer registration and synchronous reevaluation; an event batch flush emits at most one update batch per event turn.
4. Communication is a **dedicated MessagePort**, with strict `appId` and `generation` matching and monotonically increasing outgoing `seq`. Lifecycle timeouts use Worker termination, not promises of universal Python interruption.
5. Host trust is explicit: VisionPy v0.1 can run developer-controlled Python in a trusted origin. A hostile-code playground needs a **separately originated sandboxed iframe** or equivalent stronger application boundary, additional containment, and separate threat modeling.
6. For packaging, the SDK is the `visionpy` distribution; provisional npm packages are `@visionpy/protocol`, `@visionpy/renderer`, `@visionpy/runtime-pyodide`, `@visionpy/cli`.

## 1. Definition of Done (DoD)

- `python -m pip install dist/visionpy-*.whl` works on supported CPython for pure-Python tests, with no implicit Pyodide import.
- Pyodide installs **the same wheel** as the host release artifact from a pinned trusted URL, and its `__version__` is compatible with JS packages.
- Two independent apps embed on the same HTML page; modifying one never affects the other.
- Counter increments and displays its value; form input event updates Python state and echoes back.
- `dispose()` resolves when listeners, mount subtree, callback tables, Python proxy references and Worker are released; repeated disposal is safe.
- Start errors, callback errors, out-of-order protocol messages and invalid props are handled and shown to the host as typed errors without executing HTML.
- Continuous integration covers Python, TS, protocol fuzz/bounds, Playwright on Chromium/Firefox/WebKit, packaging and accessibility smoke tests.
- Static build executes on a local HTTP server and a representative nested path; no CodeLab-specific imports, URLs or globals.

## 2. Package ownership and boundaries

| Module | Source | Responsibility | Prohibited |
|---|---|---|---|
| `visionpy` | `packages/python-sdk/` | App, components, state, Python serializer, callback registry | `document`, direct browser DOM, required JS at Python import time |
| `@visionpy/protocol` | `packages/protocol/` | Discriminated schemas, TS validators, constants, protocol tests | Rendering or executing Python |
| `@visionpy/renderer` | `packages/renderer/` | DOM ownership, type allowlist, input event normalization, teardown | Calling Python directly, `innerHTML`, eval |
| `@visionpy/runtime-pyodide` | `packages/runtime-pyodide/` | Worker lifecycle, asset loading, port wiring, host API, failure recovery | Framework-specific UI business logic |
| `@visionpy/cli` | `packages/cli/` | dev/build, artifact manifests, static website packaging | User-code execution on server in v0.1 |
| `examples/` | `examples/` | External plain HTML consumer / Python programs | CodeLab dependency |

**Dependency direction:** Python SDK -> wire model only; protocol -> no runtime; renderer -> protocol; runtime -> renderer and protocol; cli -> build metadata and runtime assets. Python SDK must not depend on TS packages to import under CPython.

## 3. Repository tree (target)

```text
visionpy/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
├── pyproject.toml                 # Python workspace tooling only (optional)
├── package.json                   # pnpm workspace root
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── .github/workflows/
│   ├── ci.yml
│   ├── security.yml
│   └── release.yml
├── packages/
│   ├── python-sdk/
│   │   ├── pyproject.toml
│   │   ├── src/visionpy/
│   │   │   ├── __init__.py
│   │   │   ├── app.py
│   │   │   ├── component.py
│   │   │   ├── ui.py
│   │   │   ├── state.py
│   │   │   ├── events.py
│   │   │   ├── exceptions.py
│   │   │   ├── _context.py
│   │   │   ├── _binding.py
│   │   │   ├── _serialize.py
│   │   │   ├── _scheduler.py
│   │   │   ├── _bridge.py
│   │   │   └── py.typed
│   │   └── tests/
│   ├── protocol/
│   │   ├── src/index.ts
│   │   ├── src/messages.ts
│   │   ├── src/validators.ts
│   │   └── test/
│   ├── renderer/
│   │   ├── src/index.ts
│   │   ├── src/renderer.ts
│   │   ├── src/dom-widgets.ts
│   │   ├── src/event-normalizer.ts
│   │   ├── src/styles.css
│   │   └── test/
│   ├── runtime-pyodide/
│   │   ├── src/index.ts
│   │   ├── src/host.ts
│   │   ├── src/worker.ts
│   │   ├── src/assets.ts
│   │   └── test/
│   └── cli/
│       ├── src/index.ts
│       ├── src/commands/dev.ts
│       ├── src/commands/build.ts
│       └── test/
├── examples/
│   ├── counter/
│   │   ├── app.py
│   │   └── index.html
│   ├── form/
│   └── multi-app/
├── e2e/
│   ├── counter.spec.ts
│   ├── form.spec.ts
│   ├── lifecycle.spec.ts
│   ├── security.spec.ts
│   └── playwright.config.ts
├── docs/
│   ├── getting-started.md
│   ├── embedding.md
│   ├── api.md
│   ├── security.md
│   └── protocol-v1.md
└── rfcs/
    ├── 0001-architecture.md
    └── 0002-v01-blueprint.md
```

Use `pnpm` as the JS workspace tool and `uv` or ordinary pip for Python development; do not require either to be installed by consumers. Generate locked artifacts in CI. Source package version values come from a single release manifest or a verified release script, not uncoordinated manual edits.

## 4. Python SDK contracts

### 4.1 Public symbols

```python
# packages/python-sdk/src/visionpy/__init__.py
from .app import App
from .exceptions import (
    VisionPyError, LifecycleError, InvalidPropertyError,
    ProtocolMismatchError, VisionPyRuntimeError,
)
__all__ = ["App", "VisionPyError", "LifecycleError",
           "InvalidPropertyError", "ProtocolMismatchError", "VisionPyRuntimeError"]

# visionpy.ui exports
# Column, Row, Container, Text, Button, TextInput, Checkbox
# visionpy.state exports
# State
```

### 4.2 Typed interfaces (normative signatures)

```python
from __future__ import annotations
from typing import Callable, Generic, Literal, TypeVar, Any
from contextlib import AbstractContextManager

T = TypeVar("T")

class State(Generic[T]):
    def __init__(self, initial: T) -> None: ...
    @property
    def value(self) -> T: ...
    def set(self, value: T) -> None: ...
    def subscribe(self, observer: Callable[[T], None]) -> Callable[[], None]: ...

class App:
    def __init__(self, *, title: str = "VisionPy App", theme: Literal["system", "light", "dark"] = "system") -> None: ...
    def layout(self) -> AbstractContextManager[None]: ...
    def run(self) -> None: ...  # nonblocking, only once
    def request_stop(self) -> None: ...
    def dispose(self) -> None: ...
    @property
    def status(self) -> str: ...

class Text:
    def __init__(self, text: str, *, level: Literal["body", "h1", "h2"] = "body", tone: Literal["default", "muted"] = "default") -> None: ...
    @classmethod
    def bind(cls, getter: Callable[[], str], *, level: Literal["body", "h1", "h2"] = "body") -> Text: ...

class Button:
    def __init__(self, text: str, *, on_click: Callable[[], None] | None = None, disabled: bool = False) -> None: ...

class TextInput:
    def __init__(self, *, label: str, value: str = "", placeholder: str = "", on_input: Callable[[str], None] | None = None, disabled: bool = False) -> None: ...

class Checkbox:
    def __init__(self, *, label: str, checked: bool = False, on_change: Callable[[bool], None] | None = None, disabled: bool = False) -> None: ...

class Column:
    def __init__(self, *, gap: int = 8, align: Literal["start", "center", "end", "stretch"] = "stretch") -> None: ...
    def __enter__(self) -> Column: ...
    def __exit__(self, exc_type: object, exc: object, tb: object) -> None: ...

class Row(Column): ...
class Container(Column): ...  # own layout defaults, padding/width allowlist
```

`Component` implementation SHOULD be an internal base class at v0.1; do not expose arbitrary subclassing until renderer compatibility and tree updates are specified. Widget construction is valid only inside `App.layout()` and a valid parent context; outside it raises `LifecycleError`. Every widget receives a per-app monotonic component ID, unique within its app; never reuse IDs in the same generation.

### 4.3 Canonical example: counter

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

### 4.4 Canonical example: form

```python
from visionpy import App
from visionpy.ui import Column, Text, TextInput, Checkbox
from visionpy.state import State

app = App(title="Form")
name = State("")
accepted = State(False)

with app.layout():
    with Column(gap=8):
        TextInput(label="Name", on_input=name.set)
        Checkbox(label="I agree", on_change=accepted.set)
        Text.bind(lambda: f"Hello, {name.value or 'guest'}")
        Text.bind(lambda: "Accepted" if accepted.value else "Not accepted")

app.run()
```

### 4.5 App lifecycle

**Python:** `CREATED -> BUILDING -> READY -> RUNNING -> STOPPING -> DISPOSED`; error path to `FAILED`. `layout()` only permitted from `CREATED` (moves to `BUILDING` and ends as `READY`), `run()` only from `READY`, can be called once. `dispose()` idempotent in any non-disposed state. If a bound getter or handler fails, default error policy reports `CALLBACK_ERROR`, leaves last known good DOM intact, and continues processing subsequent events unless the exception invalidated the whole app. Host Worker is authority for ending its lifecycle.

**Host:** `CREATED -> LOADING -> READY -> RUNNING -> STOPPING -> DISPOSED`, also `FAILED`. `ready` Promise resolves **after snapshot applied and renderer ACK**, not after only Pyodide loading. Host `dispose()` is idempotent; pending `ready` rejects with a typed disposed error if disposal occurs first.

### 4.6 Reactive dependency algorithm

1. `Text.bind(getter)` creates a binding attached to a component + prop.
2. Push binding into a context variable while evaluating getter; `State.value` registers read state to active binding.
3. Replace previous state dependency subscription set atomically after getter succeeds.
4. On `State.set`, use value equality for JSON primitives (str, bool, int, finite float, None) and identity for other values until a value model RFC exists. Unsupported values are rejected if serialized.
5. Invalidate dependent bindings and queue them for rerun; deduplicate by binding ID.
6. Flush invalidated bindings after event completion as one `PATCH_BATCH` message; stable callback/order within one app.
7. Max 100 binding reevaluations per flush; detect recursion and report `REACTIVITY_LOOP` (the budget is a **v0.1 default** to be configurable later).
8. Detach dependencies on disposal; `subscribe()` returns unsubscribe function and observers are released on app teardown.

For v0.1 do not invent async reactivity or awaitable component getters. Async handlers, computed state objects and dynamic child lists are explicitly deferred.

### 4.7 Python bridge and errors

```python
# Internal protocol shape; not public import in v0.1
class BridgeSink:
    def send(self, message: dict[str, object]) -> None: ...

class VisionPyError(Exception):
    code: str
class InvalidPropertyError(VisionPyError): ...
class LifecycleError(VisionPyError): ...
class ProtocolMismatchError(VisionPyError): ...
class VisionPyRuntimeError(VisionPyError): ...
```

Python->JS emission occurs via a worker-injected callback/proxy that is owned by the runtime and released on Worker shutdown. **Destroy PyProxy/JsProxy instances when created;** do not persist JS browser objects in the Python public SDK. JavaScript `postMessage` can serialize plain data only; no Python callables or proxies go over the wire.

## 5. Wire protocol v1: implementable specification

### 5.1 Envelope types

```typescript
export const PROTOCOL_MAJOR = 1 as const;
export type AppId = string;             // 1-64 chars, [A-Za-z0-9_-]+
export type Generation = string;        // random per Worker lifetime
export type NodeId = string;            // positive decimal string from SDK
export type HandlerId = string;         // positive decimal string from SDK

export interface Envelope<T extends string, P> {
  protocol: 1;
  appId: AppId;
  generation: Generation;
  seq: number;                          // safe nonnegative integer
  type: T;
  payload: P;
}
export type WidgetKind =
  | "column" | "row" | "container" | "text"
  | "button" | "textInput" | "checkbox";
export interface VNode {
  id: NodeId;
  kind: WidgetKind;
  props: Record<string, string | number | boolean | null>;
  events?: Partial<Record<"click" | "input" | "change", HandlerId>>;
  children: VNode[];
}
export type UiSnapshot = Envelope<"UI_SNAPSHOT", { root: VNode; title: string }>;
export type PropPatch = { id: NodeId; props: Record<string, string | number | boolean | null> };
export type PatchBatch = Envelope<"PATCH_BATCH", { changes: PropPatch[] }>;
export type UserEvent = Envelope<"USER_EVENT", {
  handlerId: HandlerId;
  nodeId: NodeId;
  event: "click" | "input" | "change";
  value?: string | boolean;
}>;
export type Ready = Envelope<"RUNTIME_READY", {sdkVersion:string; protocolMajor:1}>;
export type Mounted = Envelope<"RENDER_ACK", {ackSeq:number}>;
export type ErrorMsg = Envelope<"ERROR", {
  code: string; message: string; phase:"bootstrap"|"build"|"callback"|"render"|"protocol";
  fatal: boolean;
}>;
export type StopRequest = Envelope<"STOP_REQUEST", {}>;
export type StopAck = Envelope<"STOP_ACK", {}>;
export type DisposeRequest = Envelope<"DISPOSE_REQUEST", {}>;
export type DisposeAck = Envelope<"DISPOSE_ACK", {}>;
```

**Handshake:** host creates worker with `appId`, `generation`, `MessageChannel` and worker init payload; worker returns `RUNTIME_READY` after Pyodide+matching Python wheel have loaded. It then executes Python code and sends `UI_SNAPSHOT`; renderer applies it, returns `RENDER_ACK`, and host resolves `ready`. Reactivity updates are not considered mounted until snapshot ACK. **Sequence:** each sender's `seq` is monotonic *per direction*, not one shared global sequence. Track `lastSeq` separately for host->worker and worker->host. Start from 0. Ignore duplicate and stale messages, report a protocol error for increasing-but-missing mandatory lifecycle steps. `generation` invalidates messages from terminated previous workers.

**Host->worker events:** renderer sends only known handler ID and node ID from the mounted snapshot; Python callback registry validates the pair and allowed event kind. Button click event has no `value`; input has string `value`; checkbox change has boolean `value`. No DOM event object crosses boundary. Once `dispose()` begins, events are discarded.

**Patch rules:** v0.1 patch can update only preexisting node properties; cannot create/remove/reparent nodes; structural mutations throw `UnsupportedFeatureError`. Renderer applies each batch atomically as feasible (validate entire batch before mutating). Widgets map to `textContent`, native attributes and limited style properties only. `innerHTML`/arbitrary attributes forbidden.

### 5.2 Validator and size limits (initial defaults)

```typescript
export const LIMITS = {
  maxMessageBytes: 256 * 1024,
  maxNodesPerSnapshot: 2000,
  maxTreeDepth: 32,
  maxPropsPerNode: 24,
  maxPatchesPerBatch: 1000,
  maxTextLength: 20_000,
  maxEventsPerSecondPerApp: 100,
  maxPendingEvents: 200,
} as const;

export function parseEnvelope(input: unknown): Envelope<string, unknown>;
export function validateSnapshot(input: unknown): UiSnapshot;
export function validatePatchBatch(input: unknown): PatchBatch;
export function validateUserEvent(input: unknown): UserEvent;
```

Use a schema validator (e.g. Zod or hand-coded validators) **inside `@visionpy/protocol` only**; prefer no additional runtime dependencies if adequate. Limit measured serialized size before expensive deep validation; reject cyclic/non-cloneable objects. The byte limit is a v0.1 application-level guard, **not** a hard cap on every browser `postMessage` payload's actual memory use. `structuredClone` compatibility is checked before posting. Reject prototype-polluting keys such as `__proto__`, `prototype`, `constructor` for dynamic property dictionaries.

### 5.3 Allowed widget props

| kind | Props (allowed only) | DOM mapping |
|---|---|---|
| text | `text:string`, `level:body\|h1\|h2`, `tone:default\|muted` | `p/h1/h2`, `textContent`, CSS class |
| button | `text:string`, `disabled:boolean` | `<button type="button">` |
| textInput | `label:string`, `value:string`, `placeholder:string`, `disabled:boolean` | `<label>` + `<input type="text">` with generated `id` |
| checkbox | `label:string`, `checked:boolean`, `disabled:boolean` | `<label>` + `<input type="checkbox">` |
| column/row | `gap:number`, `align:start\|center\|end\|stretch` | scoped layout CSS |
| container | `padding:number`, `width:number\|null` | scoped block style with clamps |

Values: `gap` and `padding` are integer px in `[0, 64]`; `width` is integer px in `[0, 4096]` or null; title `<= 200` chars. Attribute values are never interpreted as HTML. Host-facing CSS uses prefixed `vp-` classes and a scoped root; avoid leaking theme rules to the document. v0.1 CSS should support light/dark via host configuration; no arbitrary user-provided CSS by default.

## 6. TypeScript renderer contract

```typescript
export interface Renderer {
  mount(snapshot: UiSnapshot): void;
  patch(batch: PatchBatch): void;
  onUserEvent(listener: (event: UserEvent["payload"]) => void): () => void;
  dispose(): void;
}

export function createRenderer(options: {
  mount: HTMLElement;
  appId: string;
  generation: string;
  theme?: "system" | "light" | "dark";
}): Renderer;
```

- Create one nested mount root per app (prefer a `ShadowRoot` on a generated element to isolate CSS). **Do not** attach ShadowRoot to the consumer's mount element directly unless explicitly documented.
- Build all nodes using `document.createElement` and `node.textContent`; map valid `VNode` types using an exhaustive switch; never use `innerHTML`, `eval`, `new Function` or externally supplied `on*` attributes.
- Event listeners should use a single delegated listener per event kind on the owned root when possible; read handler IDs from internal maps, not untrusted DOM attributes.
- Input handling must preserve caret/selection during unrelated rerenders. For controlled value changes, write DOM input value only when changed.
- Respect labels, focus, tab order and native browser keyboard events. `Button` fires for keyboard activation as native `<button>` behavior; avoid double-firing.
- `dispose()` removes listeners, clears lookup maps and removes only its owned root. It must not remove any host siblings or modify the document outside mount.

**Host custom styling extension:** not part of v0.1 API contract beyond documented CSS custom properties applied to VisionPy's owned root. This is safer than permitting arbitrary HTML or CSS strings across the bridge.

## 7. Host runtime contract

```typescript
export type VisionPyStatus =
  | "created" | "loading" | "ready" | "running"
  | "stopping" | "disposed" | "failed";

export type VisionPyErrorEvent = {
  code: string;
  message: string;
  fatal: boolean;
  phase: "bootstrap" | "build" | "callback" | "render" | "protocol";
};

export interface VisionPyAppHandle {
  readonly ready: Promise<void>;
  readonly status: VisionPyStatus;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  onError(listener: (error: VisionPyErrorEvent) => void): () => void;
}

export interface CreateVisionPyOptions {
  mount: HTMLElement;
  python: { kind: "url"; url: string } | { kind: "source"; source: string };
  assetsBaseUrl: string;
  theme?: "system" | "light" | "dark";
  startupTimeoutMs?: number;
  shutdownGraceMs?: number;
}

export function createVisionPyApp(options: CreateVisionPyOptions): VisionPyAppHandle;
```

**Clarification from RFC-0001:** `createVisionPyApp` returns a **handle synchronously** with a `ready` Promise, avoiding confusing `await createVisionPyApp` and `await handle.ready` double-await examples. (Choose and lock one style; this blueprint standardizes the synchronous handle style.) Typical usage:

```typescript
import { createVisionPyApp } from "@visionpy/runtime-pyodide";

const app = createVisionPyApp({
  mount: document.querySelector("#visionpy")!,
  python: {kind:"url", url:"/apps/counter/app.py"},
  assetsBaseUrl: "/assets/visionpy/",
});
await app.ready;
// ... when route unmounts:
await app.dispose();
```

**Default timeouts (subject to tests):** startup 30,000ms; graceful stop 1,000ms; always `Worker.terminate()` on disposal after grace. Slow networks require configurable startup timeout; zero=disabled timeout is forbidden in production mode. `stop()` is idempotent and asks Python to stop; `dispose()` also stops/terminates worker and releases DOM. After `FAILED`, `dispose()` still succeeds. `restart()` is postponed to v0.2; consumers can create a fresh handle after disposal.

**Asset loading:** same-origin Pyodide distribution pinned to a recorded compatible version (e.g. a verified 0.28.x package when release begins), and a pinned SDK wheel. Resolve URLs relative to **assetsBaseUrl**, never relative to `window.location.pathname` without explicit base. Use `new URL(path, normalizedBaseURL)` and prevent navigation/path traversal in asset identifiers. For v0.1 `python.kind='url'` is same-origin by default; source string mode is explicitly opted in by the host.

**Worker boot sketch (non-executable pseudocode):**

```typescript
// runtime worker pseudocode; actual Pyodide import mode depends on pinned release
onInit(async ({appId, generation, port, assets}) => {
  const pyodide = await loadPinnedPyodide(assets.pyodideBase);
  await pyodide.loadPackage("micropip");
  await installExactWheel(pyodide, assets.pythonWheelUrl);
  const bridge = registerBridgeWithPython(pyodide, port, appId, generation);
  send("RUNTIME_READY", versions);
  await executePythonApp(pyodide, assets.userPython);
  // App.run() calls framework serializer; bridge emits UI_SNAPSHOT.
});
```

Python exceptions must be caught and sanitized into `ERROR`; no unhandled promise may silently keep a pending `ready` unresolved. Ensure JS-to-Python PyProxy lifecycle cleanup (e.g. explicit `.destroy()` on retained proxies). Pyodide's normal package loader handles installed packages differently from `micropip`; use `micropip` for pure-Python wheels and `loadPackage` for Pyodide-distributed packages. Do not assume arbitrary native CPython wheels work.

## 8. CLI/build contracts

**v0.1 minimum commands:**

```bash
visionpy dev path/to/app.py --port 4173
visionpy build path/to/app.py --out-dir dist-site
visionpy --version
```

`dev`: serves a local HTTP origin, reloads on Python-file changes by safely remounting a new Worker, and prints the localhost URL. `build`: copies pinned Pyodide assets, bundle JS/CSS, hashed SDK wheel, user Python and a manifest; outputs fully static site with a plain index.html. The CLI must be an npm-bundled executable unless/until a Python CLI packaging strategy is separately ratified; **do not assume** `pip install visionpy` exposes `visionpy` shell command in v0.1. Documentation should show `pnpm dlx @visionpy/cli ...` or `npx @visionpy/cli ...` subject to registry availability. For built sites, test deployment at `/` and `/nested/demo/`.

**Manifest example (schema draft):**

```json
{
  "format": 1,
  "visionpySdk": "0.1.0",
  "renderer": "0.1.0",
  "runtime": "0.1.0",
  "protocolMajor": 1,
  "pythonEntry": "app.py",
  "pyodideBase": "./pyodide/",
  "pythonWheel": "./wheels/visionpy-0.1.0-py3-none-any.whl",
  "assetHashes": {"app.py": "sha256:<64-hex-chars>"}
}
```

Hashes must be calculated; the placeholder above is not a valid manifest. Browser fetching uses ordinary HTTP(S), not `file://`. Dev and static output should allow local pinned assets (CDN is optional). Ensure correct server MIME types for WASM and JS, and all Pyodide assets needed by the selected distribution.

## 9. Security requirements and threat boundaries

### 9.1 Trust modes

- **Trusted developer-authored apps:** intended v0.1 product; developer controls deployed Python and host origin.
- **Untrusted submitted Python:** NOT secured solely by Worker isolation; a hostile-code playground must run inside a properly isolated separate origin and sandboxed iframe, with restrictive CSP and network controls, then use VisionPy **inside** that environment. A same-origin Worker can make network requests with that origin's privileges, subject to applicable browser policies. Never claim it can protect application credentials or session data from adversarial Python.

### 9.2 Prohibitions

- No `innerHTML`/`insertAdjacentHTML`, no `eval`/`Function` from protocol data, no generated JS event handler strings.
- No arbitrary URL loading, remote package installation or open network proxy in public library defaults.
- No passing host `window` or DOM elements to Python Worker.
- No host secrets/API keys in app bootstrap payloads.
- All app IDs, node IDs, handler IDs, protocol versions, generation and sequences validated.
- No unbounded messages, unbounded logs or unbounded pending events.

### 9.3 Resource controls

Define soft caps on node count, message size and queues as above; test them. CPU hard timeout cannot be guaranteed by soft asyncio cancellation; forcibly terminate a stuck Worker. Since OS/process memory caps are not broadly available from browser JS, do not claim hard per-app memory limits. For large numbers of simultaneous apps, document Worker memory overhead and measure representative startup performance.

### 9.4 Error output

Stable error codes: `BOOT_FAILED`, `PYTHON_EXCEPTION`, `CALLBACK_ERROR`, `INVALID_MESSAGE`, `PROTOCOL_MISMATCH`, `UNKNOWN_HANDLER`, `RENDER_ERROR`, `REACTIVITY_LOOP`, `TIMEOUT`, `DISPOSED`. Development mode can show sanitized Python tracebacks; production mode should not reveal host configuration or credential-bearing URLs.

## 10. Quality and performance targets

Targets are goals to measure, **not benchmark claims**:

| Metric | Initial target / acceptance rule |
|---|---|
| Independent apps | 2+ apps in one page without cross-events or ID collision |
| Callback cycle | Click->Python->visible update completes within 150ms p95 **after readiness** on test hardware |
| Initial application readiness | Record cold and warm p50/p95; don't mandate hard threshold until representative browsers/hardware measured |
| Update batching | Multiple state changes in one event produce one `PATCH_BATCH` |
| Teardown | No owned DOM/listeners remain; Worker is terminated; `dispose()` idempotent |
| Package compatibility | Wheel installs on pinned Pyodide and supported CPython testing environments |
| Accessibility | Native semantic controls and labels; keyboard operation; no serious axe-core findings on examples |
| Browser tests | Chromium, Firefox, WebKit in CI; document engine version |
| Security | Renderer rejects all invalid widget kinds/props and malicious payload cases |

Measure memory qualitatively where APIs are limited. The CI performance job should be non-flaky and report metrics; blocking budgets should be set only after baseline measurement on dedicated runner hardware.

## 11. Testing matrix: specific tests

### 11.1 Python unit tests (`pytest`)

- `test_app_layout_single_use()` rejects invalid reentry and duplicate run.
- `test_widget_requires_layout_context()`.
- `test_component_ids_unique_and_scoped()`.
- `test_text_binding_tracks_reads()` and `test_dependency_change_replaces_subscription()`.
- `test_equal_state_does_not_emit_patch()`.
- `test_multiple_state_changes_emit_one_batch()`.
- `test_reactivity_loop_reports_typed_error()`.
- `test_dispose_detaches_every_observer()`.
- `test_dispose_is_idempotent()`.
- `test_serializer_rejects_non_finite_float_and_callable()`.
- `test_props_reject_unexpected_keys_and_long_strings()`.

### 11.2 Protocol unit tests (Vitest)

- Reject wrong protocol major and unrecognized discriminators.
- Reject wrong app ID/generation/duplicate sequence/out-of-order lifecycle.
- Reject unknown nodes or callbacks.
- Reject excessive tree depth, node count, props, text, patches.
- Reject malformed prototype-polluting property objects.
- Verify event variants require typed values and only known event kinds.
- Verify byte and queue back-pressure defaults.

### 11.3 Renderer unit tests

- Text escaped using `textContent`: `'<img src=x onerror=alert(1)>'` appears literally, no `<img>` node appears.
- Button event delegated exactly once for pointer and keyboard activation.
- `input` value/caret remain stable during unrelated patches.
- Checkbox changes are booleans.
- Styling does not override host page global headings/buttons.
- Disposing one app leaves a sibling app untouched.
- Invalid patch causes no partial mutation.

### 11.4 Browser E2E tests (Playwright)

1. Counter increments with mouse and keyboard.
2. Typing in TextInput echoes into a bound Text component.
3. Two counters embedded side by side maintain separate state.
4. Worker startup error rejects ready and fires typed error callback.
5. Handler throwing exception reports error, app can receive next event.
6. Infinite-loop sample is handled by host timeout/terminate; page UI remains responsive.
7. Navigation/unmount disposes Worker and listener state; repeat mount/unmount 30 times.
8. Static build serves from nested route, not just root.
9. Offline after cache is **not** a release requirement; local assets load with network while building/testing.
10. Production asset mismatch rejects before user app executes.
11. Mobile viewport form usable and no horizontal overflow.
12. Accessibility smoke tests and tab-order checks.

## 12. Delivery milestones and dependencies

### M0 — Repo and public contracts (no browser app yet)

**Tasks:** repository scaffolding; licenses and governance files; npm workspaces; Python wheel; protocol enums/types/schema validators; example fixtures; CI for TS+Python; working exact-version mapping.

**Exit:** clean clone runs `pnpm install`, `pnpm test`, `python -m pip install -e packages/python-sdk`, `pytest`; invalid protocol fixtures rejected.

### M1 — End-to-end vertical slice

**Tasks:** Worker boot loads pinned Pyodide and wheel; App/Column/Text/Button; snapshot; DOM renderer; event callback; patch updates; ready ACK; `dispose()`.

**Exit:** plain HTML counter page works; page can mount two counters independently; no CodeLab dependencies; E2E on Chromium.

### M2 — Forms, state and resilience

**Tasks:** TextInput, Checkbox, Row/Container; reactive dependency tracking; batched patches; event validation; error forwarding; stale generation handling; restart-by-recreation; security bounds; browser accessibility.

**Exit:** counter and form pass Playwright on Chromium/Firefox/WebKit; hung Worker cleanup; input focus maintained; callback errors surfaced.

### M3 — Distribution + embedding

**Tasks:** published-shaped wheel + JS assets; `dev` and `build` CLI; nested asset path support; docs; GitHub Actions artifacts; exact manifest and SHA-256 verification; sample integration with plain HTML, optional thin React example outside core.

**Exit:** new sample consumer installs or locally links artifacts; static output deployed under nested path; protocol mismatch detected.

### M4 — Release gate

**Tasks:** security audit; accessibility smoke; performance report; documentation review; npm/PyPI package name and license availability checks; release notes; signed/pinned release artifacts according to project policy.

**Exit:** all blocking tests green; release docs honest about non-goals; publish alpha to staging or reserved package if cleared, then tagged v0.1.

## 13. Developer task board (copy to GitHub issues)

| ID | Owner role | Issue | Depends on | Exit criteria |
|---|---|---|---|---|
| VP-001 | Maintainer | Initialize monorepo/CI/governance | - | clean clone CI green |
| VP-002 | Protocol | Define envelope schemas and validators | VP-001 | test fixtures pass |
| VP-003 | Python | App/layout/component tree | VP-001 | deterministic snapshot |
| VP-004 | Python | State/binding/scheduler | VP-003 | reactive unit tests pass |
| VP-005 | Runtime | Pyodide Worker boot and wheel install | VP-001, VP-002 | RUNTIME_READY event |
| VP-006 | Renderer | Widgets and DOM mount/snapshot | VP-002 | safely renders sample snapshot |
| VP-007 | Integration | Callback registry and event round-trip | VP-003, VP-005, VP-006 | click updates count |
| VP-008 | Lifecycle | Dispose/stop/timeouts/generation | VP-007 | repeated mount/unmount passes |
| VP-009 | Python/UI | TextInput/Checkbox/Row/Container | VP-007 | form tests pass |
| VP-010 | Security | Limits, malicious-payload tests, docs | VP-002, VP-006 | security fixtures pass |
| VP-011 | CLI | Dev + static build, manifests | VP-005, VP-007 | nested deployment passes |
| VP-012 | QA | Cross-browser/axe suite | VP-009, VP-011 | CI tests green |
| VP-013 | Docs | API docs and external examples | VP-007, VP-011 | stranger can run sample |
| VP-014 | Release | Brand, licensing, registry, tag | VP-012, VP-013 | release checklist signed off |

**Critical path:** 001 -> 002/003 -> 005/006 -> 007 -> 008/009 -> 011/012 -> 014. Implement protocol tests before adding GUI functionality.

## 14. Explicit deferred scope

- `visionpy.graphics` Canvas API, turtle emulation, animation abstraction.
- `visionpy.game` Pygame-like sprite/game loops.
- Desktop/React Native/runtime neutrality claims.
- tkinter/pygame import-compatibility shims.
- Async event handlers, dynamic tree reconciliation, virtual lists.
- Routing, persisted state, network client, raw HTML or arbitrary CSS.
- Shared Worker pool and advanced memory quotas.
- Untrusted-code hosting as a built-in secure sandbox.
- Service-worker cache manager and guaranteed offline use.

These require separate RFCs and API stability analysis.

## 15. Coding-agent instructions (`AGENTS.md` excerpt)

```text
Project: VisionPy, independent open-source framework. Never import anything
from VisionNumbers CodeLab, and never add hardcoded visionnumbers.in URLs.

Read RFC-0001 and VisionPy v0.1 Blueprint before changing public contracts.
Work only on one issue VP-NNN at a time. Declare changed files and tests.

Architecture invariants:
- No DOM calls in Python SDK or Pyodide Worker.
- No Python execution or eval in DOM renderer.
- Do not transmit functions/DOM nodes/proxies over IPC.
- All wire messages have protocol major, appId, generation, seq, type, payload.
- Validate ALL incoming messages against bounded schemas.
- One app, one Worker, one scoped DOM root; disposal removes all resources.
- No dynamic tree mutation after App.run() in v0.1.
- Do not claim a Worker is a secure sandbox for adversarial code.
- Zero use of raw innerHTML for user-controlled content.
- Pin and verify wheel/runtime versions; don't auto-upgrade dependency major.

Before claiming completion:
- Run Python tests, TypeScript tests and relevant Playwright tests.
- Verify a standalone non-CodeLab HTML consumer still works.
- Add or update tests for every bug fix.
- Update CHANGELOG, docs and public types for observable API changes.
- Report failed/skipped tests clearly; never fabricate passing results.
```

## 16. First pull request / first sprint: exact recommended order

**PR 1:** add repo skeleton and CI. Should contain no experimental runtime code; docs links to RFC and blueprint.  
**PR 2:** protocol package + fixture validator tests.  
**PR 3:** Python core with CPython snapshot serialization and state tests.  
**PR 4:** renderer with DOM safety tests, using fixture snapshots (no Pyodide).  
**PR 5:** runtime Worker loads pinned Pyodide, installs wheel, and emits snapshot.  
**PR 6:** event -> Python callback -> patch -> DOM; counter demo.  
**PR 7:** app teardown, timeout, errors, two-app isolation.  
**PR 8:** form widgets, CLI and cross-browser E2E.

For each PR: focused review; no blanket TODO stubs declared complete; reproducible commands and screenshots or E2E recordings for behavioral changes.

## 17. Release checklist (blocking)

- [ ] Brand `VisionPy` / PyPI `visionpy` / npm scopes verified and cleared (if unavailable, rename all artifacts consistently).
- [ ] Open-source license and all transitive dependency obligations reviewed.
- [ ] Python wheel builds reproducibly and installation under CPython/Pyodide is tested.
- [ ] Version manifest enforces exact compatible protocol major and asset versions.
- [ ] Untrusted-code threat boundary plainly documented.
- [ ] Sanitization and schema-validation tests green; no raw HTML path.
- [ ] `ready`, errors, stop and dispose work for success/failure/hung Worker.
- [ ] Two independent embedded apps pass cross-browser tests.
- [ ] Form keyboard operation and accessibility smoke tests pass.
- [ ] Dev server and static build work on a nested path.
- [ ] Public API, installation, architecture and embedding docs are written.
- [ ] JS/Python test matrix, security scans and packaging CI are green.
- [ ] Known limitations and non-goals documented in README.

## 18. Recommended next RFCs

- **RFC-0002:** Reactive and dynamic component tree semantics for v0.2.
- **RFC-0003:** `visionpy.graphics` retained-mode Canvas/shape primitives.
- **RFC-0004:** `visionpy.game` input, frame timing, sprites and collision model.
- **RFC-0005:** Optional isolated playground embedding contract for third-party untrusted programs.

## 19. References

- RFC-0001 — VisionPy Technical Architecture, 2026-10-10, local predecessor document.
- Pyodide v0.28 loading packages: https://pyodide.org/en/0.28.0/usage/loading-packages.html
- Pyodide latest API: https://pyodide.org/en/stable/usage/api/js-api.html
- Pyodide FFI proxy lifetime: https://pyodide.org/en/stable/usage/api/python-api/ffi.html
- MDN Using Web Workers / structured clone: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- MDN CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- Web Content Accessibility Guidelines: https://www.w3.org/TR/WCAG22/

**Approval recommendation:** Adopt as a provisional implementation contract. Start with VP-001 and VP-002; do not publish v0.1 or claim hard sandbox/security properties without passing the release checklist.
