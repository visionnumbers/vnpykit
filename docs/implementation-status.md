# Implementation status

## M4.2 - final public-alpha release gate

Status: audited on 2026-10-12; source candidate remains **NO-GO** for public
publication until the owner-only protection, manual-evidence, and authorization
steps in `docs/releases/v0.1.0-alpha.1-m4.2-release-gate.md` are complete.

- Local and remote `main` matched at
  `395d35cba1635b642a450af859660744fc5ded49` before the M4.2 documentation
  corrections. The only untracked content was the locally generated
  `manual-demo/` test project.
- GitHub reports zero Dependabot alerts, zero configured environments, and no
  enforceable private branch protection/rulesets on the current plan. Secret
  scanning and code scanning are disabled in the private repository. Private
  vulnerability reporting becomes available after the repository is public.
- The owner reports completed available GitHub security setup, passing Windows
  accessibility checks, and no exact VNPyKit match in the registries searched.
  These statements are recorded as owner evidence. VoiceOver/Safari is NOT RUN,
  and no claim of trademark clearance is made.
- A blank-environment PyPI Pending Trusted Publisher is compatible with the
  workflow because PyPI's environment constraint is optional. It is less
  restrictive than an environment-bound publisher; bind it to the protected
  `public-alpha-pypi` environment after public visibility and before upload.
- npm account `visionnumbers` owns organization `vnpykit`; all five exact package
  endpoints still return 404 and therefore require the documented interactive
  first-publication bootstrap.
- Fresh M4.2 verification passed Ruff, strict mypy, 25 pytest tests, frozen pnpm
  install, ESLint, all workspace typechecks/builds, 26 Vitest tests, archive and
  clean-install checks, 12/12 packed external browser cases, and the 100-cycle
  Chromium stress gate. Two fixed-epoch artifact sets remained byte-identical
  with the accepted M4.1 hashes.
- The non-publishing GitHub release dry run
  [`38249050044`](https://github.com/visionnumbers/vnpykit/actions/runs/38249050044)
  passed at source `596cc33afa51201e108067cde21e171c03e88b74`. Only `verify`
  ran; every publishing and GitHub-release job was skipped. Its seven
  distributions passed manifest, archive, dependency, and clean-install checks.
  Five remote hashes match the local candidate; the wheel and CLI differences
  are limited to the wheel's Windows-versus-Linux ZIP platform marker.
- The successful run exposed the Node.js 20 deprecation in pinned
  `actions/upload-artifact` v4.6.2. Reviewed Dependabot PR #3 was merged as
  `acdfc4279de5e73c40b1d3b8b9fdd3fceb9e055f`, updating both workflows to the
  Node.js 24 v7.0.2 immutable SHA. Re-run the non-publishing workflow before
  publication.

See `docs/releases/v0.1.0-alpha.1-m4.2-release-gate.md` for live evidence,
commands, artifact results, and the next release execution steps.

## M4.1 - registry ownership and release infrastructure

Status: local candidate accepted on 2026-10-12; publication remains **NO-GO**.

- The verified M4.1 parent on `main` and `origin/main` is
  `496c98817fa83842dda44961b01166a3ce6f9ea7`. The reviewed M4.1 changes are
  prepared for a normal private-repository commit and push without rewriting
  ancestry.
- GitHub authentication and administrator access to the private
  `visionnumbers/vnpykit` repository are verified. The latest baseline CI run
  succeeded. The repository currently has no environments; private branch
  protection is blocked by the account plan, and private vulnerability
  reporting is unavailable in the current repository state.
- npm authentication, `vnpykit` organization ownership, and `auth-and-writes`
  2FA are verified. The five target packages do not yet exist, so their package
  ownership and Trusted Publishers cannot yet be configured.
- Both exact PyPI `vnpykit` endpoints return 404. Pending-publisher state is
  private account data and still requires owner confirmation; a 404 does not
  reserve the name.
- CI and release workflows now use fixed Ubuntu 24.04 runners and immutable
  current action SHAs. The build-only workflow creates all seven audited
  artifacts. The publication workflow has separate `publish` and `publish_npm`
  gates, an exact typed authorization phrase, and a verification-only npm
  bootstrap path.
- npm package metadata uses the `alpha` dist-tag and does not request provenance
  from the current private repository. Trusted Publishing will generate
  provenance automatically after the source repository is public.
- Fresh fixed-epoch Python and npm artifacts were byte-identical across two
  builds. All Python, TypeScript, archive, consumer, security, dependency,
  accessibility automation, 12-case browser, and 100-cycle stress gates passed.
- The build-only dry run is non-publishing, but private-repository Actions usage
  could not be proven to meet the no-charge constraint. It must remain
  undispatched unless billing safety is confirmed.

See `docs/releases/v0.1.0-alpha.1-acceptance.md` and
`docs/releases/v0.1.0-alpha.1-registry-bootstrap.md` for evidence and the
remaining owner-only actions.

## M4 — public-alpha release engineering

Status: local release candidate accepted with a NO-GO publication verdict on
2026-10-11; publication is not authorized.

- Target versions are Python `0.1.0a1`, npm `0.1.0-alpha.1`, and tag
  `v0.1.0a1`. The local directory intentionally remains `VisionPy`; published
  package, import, executable, and documentation identities are VNPyKit.
- Public npm metadata, Python project metadata, package READMEs, version
  consistency checks, Dependabot, and a protected OIDC release workflow are
  prepared locally.
- ADR-0009 and the release plan separate artifact verification from publication.
- Two fixed-epoch builds produced seven byte-identical artifacts. Python and Node
  quality gates passed; the clean Python and npm consumers passed; Axe passed;
  the final 12-case browser matrix passed across three engines; and the final
  100-cycle lifecycle stress gate passed.
- Namespace control, target remote configuration, private vulnerability intake,
  legal clearance, manual accessibility evidence, and explicit publication
  authorization remain blocking external gates.

## M0 — VP-001 and VP-002

Status: implemented locally; release and publication are not authorized.

- Repository governance, workspaces, exact tool pins, CI, lint, tests, types, and package builds are configured.
- `vnpykit` is a minimal pure-Python, typed, import-safe SDK package.
- `@vnpykit/protocol` defines every M0 wire message, strict validators, bounded snapshot/patch/event checks, stable protocol errors, session sequencing, ownership checks, and event backpressure helpers.
- `@vnpykit/renderer` and `@vnpykit/runtime-pyodide` are buildable boundary packages only.
- RFC source files are unchanged.

Preserved RFC SHA-256 values recorded at implementation time:

- `VNPyKit_RFC_0001_Architecture.md`: `3CAAB54823CBF7B07D99D3852E345B7CA3BCD626D88B2734429BB1B26A9D4C34`
- `VNPyKit_v0.1_Implementation_Blueprint.md`: `68FD18253499260518BCC0E97DFC3B503BEE968DB76789193428C63E89AEBC5E`

Deferred to M1 and later: Python `App`/widgets/state, Worker boot, DOM renderer, callback round trips, browser examples, Playwright, CLI, Pyodide pin, graphics, and game APIs.

## M1 — VP-003 through VP-007

Status: implemented and verified locally on 2026-10-10.

- VP-003: `App`, public `Component`, Container/Column/Text/Button, stable node IDs, bounded props, ordered snapshots, explicit lifecycle, and idempotent disposal.
- VP-004: `State`, dependency-tracked `Text.bind`, stable callback IDs, event ownership validation, batched property patches, callback error recovery, and teardown cleanup.
- VP-005: one real Pyodide 314.0.7 Worker per app, local wheel installation, ready/error/stop/dispose flows, timeout handling, generation isolation, and forced termination fallback. ADR-0006 later replaces micropip startup with Pyodide's direct loader for the dependency-free wheel.
- VP-006: ShadowRoot-scoped safe DOM renderer, Text/Button/Column/Container, delegated click normalization, atomic property patch validation, and instance-scoped teardown.
- VP-007: standalone two-counter example, actual wheel import in Pyodide, Chromium interaction/isolation/dispose-remount/stop/error-recovery tests.

Verified compatibility: VNPyKit `0.1.0a1` on Pyodide `314.0.7`, Python `3.14.2`, micropip `0.11.1`, Playwright `1.64.0`, Chromium `156.0.8078.4`.

Built wheel SHA-256 for this M1 verification: `3CDEE56272A73826500F9893DA68FB02E402B0660D0A63872AAFEB7BB967DB73`.

Deferred to M2: TextInput, Checkbox, Row, broader browser matrix, deeper leak instrumentation, reactivity loop budgets, forms/accessibility expansion, and restart-by-recreation convenience APIs. CLI and static packaging automation remain M3.

## M2 — reactive forms

Status: implemented and verified locally on 2026-10-11; no package was published.

- Python API: `Row`, controlled `TextInput`/`Checkbox`, immutable typed events,
  validation strings, native submit callbacks, and bound value/checked state.
- Renderer: semantic labels and controls, Row/form layouts, input/change/submit
  normalization, accessible validation, visible focus, focus preservation, and
  instance-scoped loading/failure states.
- Runtime: fresh-generation `recreate()`, host focus helper, strict v1 ownership,
  Worker termination, and existing PyProxy cleanup.
- Safety: 100-evaluation reactive-cycle ceiling, existing event budgets, bounded
  input lengths, no raw HTML/eval/remote package API, and cross-instance isolation.
- Browser verification: controlled forms passed in Chromium, Firefox, and WebKit;
  a real 30-cycle Chromium dispose/recreate test passed. The opt-in 100-cycle
  release stress gate remains pending.

See `docs/m2-forms.md` and ADR-0003 for benchmark conditions and decisions. M3 may
start with CLI/static packaging and deeper leak/assistive-technology validation;
dynamic tree patches require a separately reviewed protocol decision.

## M3 — distribution and embedding

Status: implemented locally on 2026-10-11; publication remains blocked.

- CLI: cross-platform Node 24 executable with `create`, loopback-first `run`, and
  reproducible `build`; safe path/base/host validation and source reload.
- Static output: local Pyodide 314.0.7, matching SDK wheel,
  CSP-safe external Worker, protocol/version manifest, SHA-256 checksums, and nested
  deployment support.
- Embed: framework-independent ESM API with self-contained declarations, lifecycle,
  independent instances, and tested plain/React/Vue usage.
- External acceptance: a clean system-temp consumer installed local tarballs
  without workspace aliases. The final serialized matrix passed production form,
  dual-instance, React StrictMode, and Vue cases in Chromium, Firefox, and WebKit.
- Package identity: VNPyKit is the owner-approved engineering identity. All npm
  packages remain private and external namespace/trademark checks remain release
  gates under ADR-0008.
- Performance: measured with a local no-store static server. Detailed current
  results and attribution limits are recorded in `docs/m3-distribution.md`.
- Stress: 100 real Chromium dispose/remount cycles passed in 9.6 minutes; ten
  forced-GC samples retained exactly two live roots and a stable coarse JS heap.
- Remaining release gates: public identity/trademark decision, private security
  contact, manual screen-reader/high-contrast audit, full-history secret scan after
  a remote exists, and explicit publication authorization.

M3 distribution and browser acceptance was PASS before the identity migration:
the documentation-final packed artifacts passed all 12 external cases serially in
2.7 minutes, and WebKit+React passed a subsequent isolated repeat. M3.2 re-runs
the same gates using final locally packed VNPyKit artifacts. Graphics, game APIs,
and hostile-code isolation remain out of scope.

### M3.1A and M3.1B follow-up

- ADR-0006 records exact WebKit lifecycle traces. Direct wheel loading removed a
  measured 55.4-second micropip cost, pre-ready disposal now terminates its Worker
  synchronously, and production React acceptance runs under StrictMode with one
  Playwright worker. Two diagnostic runs exceeded 120 seconds while the host had
  only 703.4 MiB free; the rebuilt final artifacts then passed WebKit+React in the
  complete matrix and in an isolated repeat without increasing the timeout.
- ADR-0007 blocks VNForge migration. An active exact-name Python visual-novel
  compiler and `vnforge.pro` create material confusion risk despite exact PyPI and
  npm endpoints returning 404. No fallback was selected and ADR-0008 was not
  created.

### M3.2 VNPyKit migration

- Local M3 acceptance checkpoint: `3d80149a2572f07935e06a228fe987be0394a1a8`.
- The checkpoint passed Ruff, strict mypy, 25 Python tests, ESLint, TypeScript
  checks/builds, 26 Vitest tests, and the serialized 12-case external browser
  matrix before it was created.
- The owner explicitly approved VNPyKit for the complete local engineering
  migration. The Python distribution/import is `vnpykit`, the executable is
  `vnpykit`, and TypeScript packages use private `@vnpykit/*` identities.
- Protocol major 1, message shapes, lifecycle ownership, Worker isolation, direct
  wheel loading, renderer safety, and form behavior are unchanged.
- ADR-0008 records the decision. npm scope ownership, the target GitHub
  organization/repository, domain choice, trademark review, and publication
  authorization remain external release gates rather than local-refactor gates.
- Final Python validation: Ruff passed, strict mypy passed for 14 source files,
  and all 25 pytest cases passed. The wheel and sdist built as
  `vnpykit-0.1.0a1-py3-none-any.whl` and `vnpykit-0.1.0a1.tar.gz`; a clean venv
  imported `vnpykit` and found no `visionpy` module.
- Final TypeScript validation: frozen pnpm install, ESLint, strict typechecks,
  builds, and all 26 Vitest cases passed. Local tarballs for all five
  `@vnpykit/*` packages installed in an independent 46-package consumer with zero
  reported vulnerabilities.
- Final browser validation: all 12 packed-artifact external cases passed in 3.4
  minutes across Chromium, Firefox, and WebKit 27.2. The deeper browser suite had
  10 applicable passes and 17 intentional skips; its Chromium 30-cycle
  generation test passed. The explicit 100-cycle Chromium stress test passed in
  9.6 minutes with two live roots and a stable coarse heap at every sample.
- Release artifact wheel SHA-256:
  `FB991A48FF50F2E10AC683D340A438B7C3A533B194608909E55B2BAF086FB3CF`.
- Active source, manifests, archive paths, starter output, and deployable output
  contain no obsolete VisionPy package/import/CLI references. Remaining uses are
  limited to historical RFC/ADR content, migration evidence, and attribution.
