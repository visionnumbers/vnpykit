# ADR-0001: M0 contract resolution

- Status: Accepted for M0
- Date: 2026-10-10
- Scope: VP-001 and VP-002

## Context

RFC-0001 describes the architectural direction. The later implementation blueprint says it refines that RFC and supplies implementable protocol details. The two documents contain conflicts and unresolved choices that must be settled before code can share a stable contract.

## Decision

For M0, the implementation blueprint controls wherever it explicitly refines RFC-0001. Protocol major 1 therefore uses `{ protocol: 1, appId, generation, seq, type, payload }`, uppercase discriminators, full-tree `UI_SNAPSHOT`, property-only `PATCH_BATCH`, and per-direction sequences beginning at zero. All inputs are validated using strict, bounded, dependency-free validators in `@visionpy/protocol`.

The Python package is a pure-Python, import-safe SDK shell. Python UI construction and reactivity are VP-003/VP-004 and are not represented as completed. Renderer and Pyodide runtime packages exist as typed, buildable M0 boundaries; DOM rendering and Worker startup are VP-005/VP-006.

## Spec inconsistencies and resolutions

| Topic | RFC-0001 | Blueprint | M0 resolution |
|---|---|---|---|
| Envelope version | String `visionpy/1` | Numeric `1` | Numeric `1`; simpler exact-major validation. |
| Identity fields | `instance_id`, `request_id`, `sequence` | `appId`, `generation`, `seq` | Blueprint fields; generation prevents replay from replaced Workers. Request correlation is deferred until a message requires it. |
| Discriminators | Dotted lowercase names such as `ui.patch` | Uppercase names such as `PATCH_BATCH` | Blueprint uppercase union. |
| Patch model | Structural create/update/move/remove | Existing-node property batches only | Property-only updates; structural mutation is deferred. |
| Runtime creation | Example awaits `createVisionPyApp()` and then `ready` | Synchronous handle with `ready` Promise | Synchronous handle contract for later VP-005. |
| Python lifecycle | `CREATED -> INITIALIZING -> MOUNTED -> RUNNING` | `CREATED -> BUILDING -> READY -> RUNNING` | Blueprint lifecycle for later Python implementation. |
| Host lifecycle | Not separately formalized | Separate host state machine | Blueprint host lifecycle for later runtime implementation. |
| M0 scope | Includes a no-op Worker handshake | M0 task list says no browser app; VP-005 owns Worker boot | This delivery follows issue ownership: no Worker handshake until VP-005. Protocol handshake messages are implemented now. |
| Limits | Numeric budgets deferred to benchmarking | Concrete initial defaults | Adopt blueprint defaults as soft, testable v1 limits; later benchmarks may revise them only through a protocol-compatible decision. |
| Performance target | 100 ms p95 callback cycle | 150 ms p95 | No M0 performance claim; baseline and release threshold remain an M1+ decision. |
| Teardown stress | 100 cycles | 30 cycles in one E2E test, 100 in release goals | Release gate remains 100; not applicable before a runtime exists. |
| Package layout | `components.py`, `errors.py`, `ui/` | `component.py`, `exceptions.py`, `ui.py` | Minimal M0 SDK uses `exceptions.py` and `protocol.py`; UI layout waits for VP-003. |
| CLI | npm or initially unspecified | npm CLI required for v0.1 | CLI is outside VP-001/VP-002 and is not scaffolded as a false implementation. |
| License | Apache-2.0 proposed, pending review | License is an M0/release gate | Include Apache-2.0 for the repository; ownership, trademark, and registry checks remain release blockers. |
| Python support | Exact minimum deferred | Must align with tested Pyodide | M0 tests CPython 3.12; Pyodide support is unclaimed until VP-005 verifies it. |
| Pyodide version | Lock per tested runtime release | Example suggests verified 0.28.x | Leave `pyodide` null in `versions.json` until actual VP-005 compatibility testing. |
| Package names | Provisional | Provisional | Use working names privately; publishing is prohibited until availability and trademark review. |

## Consequences

Protocol consumers get one canonical contract and stable error codes. The deliberate lack of runtime/UI code keeps milestone reporting honest. A future incompatible change to the envelope or discriminators requires a new protocol major or an explicit migration ADR.

