# VNPyKit

VNPyKit is a browser-native Python application framework. Python code runs in a
dedicated Pyodide Worker, sends validated protocol v1 snapshots and property
patches, and renders an allowlisted accessible DOM tree on the main thread.

VNPyKit `0.1.0a1` is available as an experimental public alpha. It is suitable
for evaluation and early feedback; its API and packaging may change before a
stable release. Python 3.12 or newer and Node.js 24 or newer are required.

```shell
python -m pip install vnpykit==0.1.0a1
npm install @vnpykit/cli@alpha
npx vnpykit --help
```

Release links: [PyPI](https://pypi.org/project/vnpykit/0.1.0a1/),
[npm](https://www.npmjs.com/package/@vnpykit/cli/v/0.1.0-alpha.1), and
[GitHub prerelease](https://github.com/visionnumbers/vnpykit/releases/tag/v0.1.0a1).
Report security issues through the process in [SECURITY.md](SECURITY.md).

The M2 widget slice is `App`, `State`, `Container`, `Column`, `Row`, `Text`,
`Button`, `TextInput`, and `Checkbox`. Forms use typed Worker events and controlled
Python state. Dynamic tree mutation, graphics, games, and arbitrary package
installation remain deferred.

M3 adds a Node.js CLI, reproducible static-site assembly, and a
framework-independent TypeScript embedding API. The owner selected VNPyKit as the
public engineering identity in M3.2. M4 produced and published the reproducible
public-alpha artifacts.

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

The experimental CLI is distributed as an npm executable and requires Node.js
24 or newer. After installing `@vnpykit/cli@alpha` in a Node project:

```shell
npx vnpykit create hello-app
npx vnpykit run hello-app/app.py
npx vnpykit build hello-app/app.py --out-dir hello-app/dist --base /demo/
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

See [getting started](docs/getting-started.md), [Python API](docs/python-api.md),
[CLI reference](docs/cli-reference.md), [compatibility](docs/compatibility.md),
[known limitations](docs/known-limitations.md), [embedding](docs/embedding.md),
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

## Public-alpha status

The published packages are experimental alpha software. Dynamic tree mutation,
graphics and games, arbitrary Python package installation, server rendering, and
hostile-code isolation remain outside the supported scope. VoiceOver with Safari
was **NOT RUN** for this alpha; the owner approved an alpha-specific testing
waiver. See [known limitations](docs/known-limitations.md) and
[compatibility](docs/compatibility.md) before adoption.

Preliminary trademark searches do not establish formal or worldwide clearance.
The owner accepted the residual trademark and brand-confusion risk for this
alpha. The evidence and its limitations are recorded in the
[final sign-off](docs/releases/v0.1.0-alpha.1-final-signoff.md).

Independent public-registry consumer testing passed Python and npm installation,
CLI create/build, a Playwright Chromium Worker/Pyodide runtime smoke test, and
registry/GitHub artifact integrity verification. The current release record is in
the [public release checklist](docs/public-release-checklist.md) and
[M4 acceptance report](docs/releases/v0.1.0-alpha.1-acceptance.md).

## License

Apache-2.0. ADR-0008 records the migration from the historical VisionPy development
codename. Third-party components retain their respective licenses and notices as
recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
