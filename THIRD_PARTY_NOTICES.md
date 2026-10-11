# Third-party notices

VisionPy's source dependencies are recorded at exact versions in `pnpm-lock.yaml`,
`packages/python-sdk/pyproject.toml`, and `versions.json`. Their licenses remain the
licenses of their respective authors.

## Vendored runtime artifact

`vendor/pyodide/micropip-0.11.1-py3-none-any.whl` is an unmodified micropip 0.11.1
wheel distributed by the Pyodide project under MPL-2.0. Its SHA-256 is
`e2d52886594fd4cd0d0847110a1c34ae0134d3a970eb4496d3b5eb31ee2d8af6`.
The wheel contains `micropip-0.11.1.dist-info/licenses/LICENSE` and the licenses
for its vendored `packaging` code. Corresponding source is available from the
[micropip 0.11.1 tag](https://github.com/pyodide/micropip/tree/0.11.1).

The wheel is retained for reproducibility of the historical M1 verification. The
current M3 CLI and Worker do not copy or load it; ADR-0006 uses Pyodide's direct
loader for the dependency-free SDK wheel.

## M3 static runtime

`@visionpy/cli` depends exactly on the npm package `pyodide@314.0.7` and copies its
runtime files, package lock, and upstream license into generated static output. The
CLI also includes the locally built Apache-2.0 VisionPy wheel. Generated copies and
local npm tarballs are ignored and
are not source-controlled or published.

React 19.3.0, React DOM 19.3.0, Vue 3.5.43, and Vite 8.3.4 are pinned only in the
temporary external acceptance project. They are test hosts and are not bundled in
the VisionPy CLI or embed package.
