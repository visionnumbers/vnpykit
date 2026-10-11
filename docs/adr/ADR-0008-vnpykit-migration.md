# ADR-0008: VNPyKit public engineering identity

- Status: Accepted for local engineering migration
- Date: 2026-10-11
- Scope: Python, npm, CLI, runtime assets, generated applications, CI, and current documentation

## Context

VisionPy was the framework's historical development codename. It appears in the
RFC source text, accepted historical ADRs, and Git history. The name could
not be used safely as the public Python distribution because an unrelated PyPI
project already occupies it. Subsequent candidate audits are preserved in ADR-0007
and `docs/m3.2-identity-clearance.md`.

The project owner selected **VNPyKit**, under the VisionNumbers parent brand, and
explicitly authorized the complete local migration. The approval separates the
engineering refactor from later publication controls: it does not claim trademark,
domain, npm-scope, or GitHub-organization ownership.

## Decision

The active framework identity is:

- brand: VNPyKit;
- Python distribution and import: `vnpykit`;
- CLI package and executable: `@vnpykit/cli` and `vnpykit`;
- TypeScript packages: `@vnpykit/protocol`, `@vnpykit/renderer`,
  `@vnpykit/runtime-pyodide`, and `@vnpykit/embed`;
- intended GitHub target: `visionnumbers/vnpykit`.

All npm packages remain private. No compatibility package or `visionpy` import
alias is provided because that name belongs to an unrelated public distribution.
Generated sites install and import the VNPyKit wheel directly.

Protocol major `1` remains unchanged. Envelope fields, uppercase message types,
validation limits, sequencing, ownership, Worker-per-app isolation, direct
Pyodide wheel loading, renderer safety, React StrictMode cleanup, forms, and
lifecycle behavior are preserved.

The RFC source text and ADR-0001 through ADR-0007 retain their historical
development-era decisions. Their active RFC filenames, current code, manifests,
examples, build output, CI, and user documentation use VNPyKit.

## Consequences

The local repository can build and test coherent VNPyKit artifacts without
publishing them. Public release remains blocked until the owner controls the
`@vnpykit` npm scope and `visionnumbers/vnpykit` GitHub target, completes the
required trademark/domain review, configures release security and provenance, and
separately authorizes publication or push.
