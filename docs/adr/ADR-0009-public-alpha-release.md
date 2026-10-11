# ADR-0009: Public-alpha release engineering

- Status: Accepted for local preparation; publication not authorized
- Date: 2026-10-11

## Context

M3.2 established VNPyKit as the approved engineering identity and preserved
protocol v1 behavior. A public alpha additionally needs verifiable artifacts,
registry control, provenance, security intake, accessibility evidence, and an
explicit release decision. Registry absence alone does not establish ownership
or trademark clearance.

## Decision

The first candidate is Python `vnpykit==0.1.0a1`, npm
`@vnpykit/{protocol,renderer,runtime-pyodide,embed,cli}@0.1.0-alpha.1`, executable
`vnpykit`, and Git tag `v0.1.0a1`. The local source directory remains named
`VisionPy`; filesystem naming is not part of the package identity.

All five npm workspaces are public packages because consumers and the CLI need a
complete, resolvable dependency graph. Their tarballs must contain exact released
dependency versions, public metadata, licenses, and package documentation, with
no `workspace:` references.

A manually dispatched GitHub Actions workflow verifies source and packed
artifacts first. Publication jobs require an explicit `publish=true` input,
protected environments, least-privilege permissions, and OIDC Trusted Publishing.
The workflow publishes npm packages in dependency order and creates a GitHub
release only after both registries succeed. No long-lived registry token is part
of the design.

Release artifacts are built twice with a fixed `SOURCE_DATE_EPOCH`; matching
SHA-256 values are required. The candidate must pass Python and TypeScript quality
gates, independent installs, the 12-case external browser matrix, the 100-cycle
stress test, secret/dependency scans, and automated accessibility checks.

## Release gates

Publication remains blocked until the owner demonstrates namespace control,
configures the target repository and protected environments, enables a private
vulnerability channel, completes qualified trademark review, records all manual
accessibility checks, and gives explicit publication authorization. These are
release gates, not reasons to weaken the locally verified artifacts.

## Consequences

The repository can produce reviewable release candidates without publishing or
creating remote state. A successful local run is necessary but cannot prove
external ownership, legal clearance, or manual assistive-technology behavior.

