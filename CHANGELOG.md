# Changelog

## 0.1.0-alpha.1 - Unreleased

- Adopt VNPyKit as the owner-approved engineering identity: Python distribution
  and import `vnpykit`, CLI executable `vnpykit`, and private npm packages under
  `@vnpykit/*`. Preserve protocol major 1 and runtime behavior.

- Scaffold the M0 Python and TypeScript workspaces.
- Define and validate the bounded protocol v1 envelope and message contracts.
- Add packaging, lint, typecheck, test, and CI foundations.
- Implement the M1 Python component/state/callback model, Pyodide Worker runtime, safe DOM renderer, standalone counter, and Chromium integration tests.
- Add M2 controlled TextInput and Checkbox widgets, Row layout, typed events,
  native form submission, safe validation text, accessible loading/errors/focus,
  bounded reactive cycles, and disposal/recreation APIs.
- Validate real Python forms in Chromium, Firefox, and WebKit and add 30-cycle and
  opt-in 100-cycle lifecycle tests.
- Add the provisional `vnpykit create`, `run`, and `build` Node CLI with loopback
  serving, safe reload, traversal checks, nested deployment, reproducible manifests,
  checksums, and pinned local runtime assets.
- Add the self-contained `@vnpykit/embed` ESM bundle, TypeScript declarations, and
  separate CSP-compatible Worker artifact.
- Add isolated local-tarball acceptance for plain JavaScript, React, Vue, dual
  instances, production static hosting, form submission, and three browser engines.
- Record the occupied PyPI name and defer public package identity and publication.
- Instrument host, Worker, and React startup; terminate abandoned pre-ready Workers
  synchronously; serialize the external browser matrix; and load the dependency-free
  SDK wheel directly to remove micropip startup overhead.
- Record the VNForge software/domain conflict and block the requested migration
  without selecting a fallback identity.
- Record the later owner decision in ADR-0008 and complete the local migration;
  external namespace ownership and trademark review remain publication gates.
