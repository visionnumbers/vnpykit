# CLI reference

The Node.js 24+ executable is `vnpykit`. The public-alpha package name is
`@vnpykit/cli@0.1.0-alpha.1`.

## `vnpykit create <directory>`

Creates a minimal Python starter project. It refuses unsafe destinations and does
not overwrite an existing non-empty project.

## `vnpykit run <entry.py>`

Builds and serves the application for development on a loopback address. The
server validates paths and reloads the Python source. Use explicit host exposure
only on a trusted network.

## `vnpykit build <entry.py> --out-dir <directory> [--base <path>]`

Produces static files with pinned Pyodide assets, the matching VNPyKit wheel, an
external Worker, a version manifest, and SHA-256 checksums. `--base` supports a
nested deployment path such as `/demo/`. The output must be served over HTTP(S),
not opened with `file://`.

The CLI rejects traversal, invalid base paths, unsafe output overlap, unsupported
hosts, and missing or ambiguous wheels. See [deployment](deployment.md) for CSP
and hosting requirements.

