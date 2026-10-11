# Compatibility

The `0.1.0a1` release candidate is pinned to:

| Surface | Supported baseline |
| --- | --- |
| Authoring Python | CPython 3.12+ |
| Browser Python | Pyodide 314.0.7 / Python 3.14.2 |
| Node.js | 24.x |
| Protocol | major version 1 |
| Browsers | Playwright Chromium, Firefox, and WebKit engines pinned by the lockfile |

Protocol peers must agree on major version 1. Minor implementation changes may be
accepted only where the v1 validators explicitly allow them. The release matrix
tests plain HTML, React StrictMode, Vue, form submission, and two independent
instances against locally packed packages.

Mobile browsers, older browser engines, alternative Python runtimes, server-side
rendering, and Node releases before 24 are not part of this alpha's verified
support matrix.

