# Getting started

VNPyKit `0.1.0a1` is publicly available as experimental alpha software. Use
Python 3.12 or newer for the SDK and Node.js 24 or newer for the CLI.

Install the Python SDK directly from
[PyPI](https://pypi.org/project/vnpykit/0.1.0a1/):

```shell
python -m pip install vnpykit==0.1.0a1
```

In a Node project, install the CLI from
[npm](https://www.npmjs.com/package/@vnpykit/cli/v/0.1.0-alpha.1):

```shell
npm install @vnpykit/cli@alpha
```

Both the npm `alpha` and `latest` dist-tags currently resolve to
`0.1.0-alpha.1`. There is no stable release yet.

Create and run a starter application with the published CLI:

```shell
npx vnpykit create hello-app
npx vnpykit run hello-app/app.py
```

Open the loopback URL printed by the command. Edit `app.py`; the development page
reloads from local assets. Create a deployable site with:

```shell
npx vnpykit build hello-app/app.py --out-dir hello-app/dist --base /my/site/
```

Serve `hello-app/dist` through HTTP. Browsers cannot boot the module Worker and
WebAssembly runtime reliably from `file://`.

The Python application uses only the SDK API. It has no DOM access and does not
need a system Python installation in the deployed browser.

The alpha supports the documented forms/widget slice, Worker-based Pyodide
runtime, static builds, and embedding API. Dynamic tree mutation, graphics and
games, arbitrary Python package installation, server rendering, and hardened
execution of hostile Python are not supported.

VoiceOver with Safari was **NOT RUN** for this release. The owner approved an
alpha-specific testing waiver; completed automated and Windows checks do not
constitute VoiceOver/Safari verification. Preliminary trademark searches are
evidence only and do not establish formal or worldwide clearance. See the
[release sign-off](releases/v0.1.0-alpha.1-final-signoff.md) for the recorded
limitations.

Independent post-release testing passed public Python and npm installation, CLI
create/build, a Playwright Chromium browser runtime smoke test, and registry
artifact integrity verification.

See the [GitHub prerelease](https://github.com/visionnumbers/vnpykit/releases/tag/v0.1.0a1),
[known limitations](known-limitations.md), and [security policy](../SECURITY.md).
