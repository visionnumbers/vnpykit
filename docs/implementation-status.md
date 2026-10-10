# Implementation status

## M0 — VP-001 and VP-002

Status: implemented locally; release and publication are not authorized.

- Repository governance, workspaces, exact tool pins, CI, lint, tests, types, and package builds are configured.
- `visionpy` is a minimal pure-Python, typed, import-safe SDK package.
- `@visionpy/protocol` defines every M0 wire message, strict validators, bounded snapshot/patch/event checks, stable protocol errors, session sequencing, ownership checks, and event backpressure helpers.
- `@visionpy/renderer` and `@visionpy/runtime-pyodide` are buildable boundary packages only.
- RFC source files are unchanged.

Preserved RFC SHA-256 values recorded at implementation time:

- `VisionPy_RFC_0001_Architecture.md`: `3CAAB54823CBF7B07D99D3852E345B7CA3BCD626D88B2734429BB1B26A9D4C34`
- `VisionPy_v0.1_Implementation_Blueprint.md`: `68FD18253499260518BCC0E97DFC3B503BEE968DB76789193428C63E89AEBC5E`

Deferred to M1 and later: Python `App`/widgets/state, Worker boot, DOM renderer, callback round trips, browser examples, Playwright, CLI, Pyodide pin, graphics, and game APIs.

## M1 — VP-003 through VP-007

Status: implemented and verified locally on 2026-10-10.

- VP-003: `App`, public `Component`, Container/Column/Text/Button, stable node IDs, bounded props, ordered snapshots, explicit lifecycle, and idempotent disposal.
- VP-004: `State`, dependency-tracked `Text.bind`, stable callback IDs, event ownership validation, batched property patches, callback error recovery, and teardown cleanup.
- VP-005: one real Pyodide 314.0.7 Worker per app, local wheel installation with micropip 0.11.1, ready/error/stop/dispose flows, timeout handling, generation isolation, and forced termination fallback.
- VP-006: ShadowRoot-scoped safe DOM renderer, Text/Button/Column/Container, delegated click normalization, atomic property patch validation, and instance-scoped teardown.
- VP-007: standalone two-counter example, actual wheel import in Pyodide, Chromium interaction/isolation/dispose-remount/stop/error-recovery tests.

Verified compatibility: VisionPy `0.1.0a1` on Pyodide `314.0.7`, Python `3.14.2`, micropip `0.11.1`, Playwright `1.64.0`, Chromium `156.0.8078.4`.

Built wheel SHA-256 for this M1 verification: `3CDEE56272A73826500F9893DA68FB02E402B0660D0A63872AAFEB7BB967DB73`.

Deferred to M2: TextInput, Checkbox, Row, broader browser matrix, deeper leak instrumentation, reactivity loop budgets, forms/accessibility expansion, and restart-by-recreation convenience APIs. CLI and static packaging automation remain M3.
