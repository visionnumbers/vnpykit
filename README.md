# VNPyKit

VNPyKit is a browser-native Python application framework. Its M1 runtime executes the real Python SDK in a dedicated Pyodide Worker, sends validated protocol v1 snapshots and property patches, and renders an allowlisted accessible DOM tree on the main thread.

The M2 widget slice is `App`, `State`, `Container`, `Column`, `Row`, `Text`,
`Button`, `TextInput`, and `Checkbox`. Forms use typed Worker events and controlled
Python state. Dynamic tree mutation, graphics, games, and arbitrary package
installation remain deferred.

M3 adds a Node.js CLI, reproducible static-site assembly, and a
framework-independent TypeScript embedding API. The owner selected VNPyKit as the
public engineering identity in M3.2. All artifacts remain local and private until
external namespace, legal, and publication gates are complete.

```python
from vnpykit import App, State
from vnpykit.ui import Button, Checkbox, Column, Text, TextInput

app = App(title="Form")
name = State("")
accepted = State(False)

with app.layout(), Column(on_submit=lambda: print(name.value, accepted.value)):
    TextInput("Name", value=name, required=True)
    Checkbox("Accept", checked=accepted, required=True)
    Text.bind(lambda: f"Hello {name.value or 'friend'}")
    Button("Submit", submit=True)

app.run()
```

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

## CLI and static builds

The provisional CLI is distributed as an npm executable and requires Node.js 24+.
After building and locally packing the repository packages:

```shell
vnpykit create hello-app
vnpykit run hello-app/app.py
vnpykit build hello-app/app.py --out-dir dist --base /demo/
```

The build contains pinned Pyodide and Python assets and runs from an ordinary static
HTTP server. It makes no runtime CDN request.

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

Open `http://127.0.0.1:4173`. The page starts two independent Python counter/form
applications. Runtime files and the VNPyKit wheel are served locally;
the demo does not depend on CodeLab or a CDN at runtime.

See [getting started](docs/getting-started.md), [embedding](docs/embedding.md),
[deployment](docs/deployment.md), [M3 distribution](docs/m3-distribution.md),
[M2 forms](docs/m2-forms.md), [M1 runtime](docs/m1-runtime.md),
[implementation status](docs/implementation-status.md), [protocol v1](docs/protocol-v1.md),
and [ADR-0003](docs/adr/ADR-0003-m2-decisions.md).

## Troubleshooting

- `Missing ... vnpykit-0.1.0a1-py3-none-any.whl`: run the Python build command before starting Vite.
- `Failed to fetch` during boot: confirm `assetsBaseUrl` points to a directory containing `pyodide/` and `wheels/`, and serve through HTTP rather than `file://`.
- `PROTOCOL_MISMATCH` or `stale worker generation`: rebuild all packages and reload the page without preserving an old Worker.
- Startup timeout: Pyodide cold start is device-dependent. Increase `startupTimeoutMs` for development and inspect the typed `onError` event.

## Security boundary

A Web Worker is an execution and responsiveness boundary, not a hardened sandbox for adversarial Python. Untrusted programs require a separately originated, sandboxed deployment design.

## License

Apache-2.0. ADR-0008 records the migration from the historical VisionPy development
codename. No artifact has been published.
