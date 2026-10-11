# ADR-0005: Node CLI and self-contained static output

- Status: Accepted
- Date: 2026-10-11

## Context

The implementation blueprint assigns development serving and static assembly to an
npm-bundled executable. A Python CLI would duplicate the JavaScript asset graph and
would require a separately ratified distribution design.

## Decision

`@visionpy/cli` owns `visionpy create`, `visionpy run`, and `visionpy build`.
Node.js 24 or newer is therefore an explicit end-user prerequisite for the M3 CLI.
It is not installed by pip and does not execute application Python on the server.

The builder copies exact local artifacts: Pyodide 314.0.7, the matching VisionPy
wheel, the bundled host, and a separate module Worker. ADR-0006 supersedes the
original micropip loading detail because the SDK wheel has no dependencies and
Pyodide's direct wheel loader avoids measured WebKit resolver overhead. Generated
pages use relative URLs, a restrictive CSP, a versioned JSON manifest, SHA-256 file
checksums, and `SOURCE_DATE_EPOCH` metadata. The output has no development-server
dependency and supports a normalized deployment base.

`@visionpy/embed` is a framework-independent ESM bundle with self-contained type
declarations. Callers own the mount element and lifecycle. React and Vue consume the
same API without wrappers. Bundler hosts copy `dist/worker.js` to a public location
and pass `workerUrl` explicitly.

## Consequences

CLI consumers need Node 24+, while deployed applications need only a static HTTP
host. The package graph remains private until ADR-0004 is resolved. A CDN, shared
Worker, service Worker cache, or server-side Python runner requires separate review.
