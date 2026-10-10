# VisionPy

VisionPy is a browser-native Python application framework. Its M1 runtime executes the real Python SDK in a dedicated Pyodide Worker, sends validated protocol v1 snapshots and property patches, and renders an allowlisted accessible DOM tree on the main thread.

The current widget slice is `App`, `State`, `Container`, `Column`, `Text`, and `Button`. Dynamic tree mutation, forms, graphics, games, and arbitrary package installation remain deferred.

## Development

Requirements: Python 3.12, Node.js 24, and Corepack.

```shell
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test

python -m pip install -e "packages/python-sdk[dev]"
python -m ruff check packages/python-sdk
python -m mypy packages/python-sdk/src packages/python-sdk/tests
python -m pytest
python -m build packages/python-sdk

corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
```

## Run the standalone demo on Windows

From PowerShell at the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e "packages/python-sdk[dev]"
corepack pnpm install --frozen-lockfile
.\.venv\Scripts\python.exe -m build packages/python-sdk
corepack pnpm build
corepack pnpm dev:counter
```

Open `http://127.0.0.1:4173`. The page starts two independent Python counters. Runtime files, micropip, and the VisionPy wheel are served locally; the demo does not depend on CodeLab or a CDN at runtime.

See [M1 runtime](docs/m1-runtime.md), [implementation status](docs/implementation-status.md), [protocol v1](docs/protocol-v1.md), and [ADR-0002](docs/adr/ADR-0002-m1-runtime-decisions.md).

## Troubleshooting

- `Missing ... visionpy-0.1.0a1-py3-none-any.whl`: run the Python build command before starting Vite.
- `Failed to fetch` during boot: confirm `assetsBaseUrl` points to a directory containing `pyodide/` and `wheels/`, and serve through HTTP rather than `file://`.
- `PROTOCOL_MISMATCH` or `stale worker generation`: rebuild all packages and reload the page without preserving an old Worker.
- Startup timeout: Pyodide cold start is device-dependent. Increase `startupTimeoutMs` for development and inspect the typed `onError` event.

## Security boundary

A Web Worker is an execution and responsiveness boundary, not a hardened sandbox for adversarial Python. Untrusted programs require a separately originated, sandboxed deployment design.

## License

Apache-2.0. Package names and trademark availability remain unverified and no artifacts are published.
