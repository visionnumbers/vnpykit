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

The wheel is kept because the slim npm Pyodide distribution references micropip
in its lock file but does not include that wheel. The standalone examples copy it
into generated runtime assets; those generated copies are ignored by Git.
