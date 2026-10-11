# Getting started

VNPyKit's provisional M3 CLI requires Node.js 24 or newer. The local repository
build also requires Python 3.12 and Corepack. No package has been published; use the
locally packed artifact during development.

```shell
vnpykit create hello-app
cd hello-app
vnpykit run app.py
```

Open the loopback URL printed by the command. Edit `app.py`; the development page
reloads from local assets. Create a deployable site with:

```shell
vnpykit build app.py --out-dir dist --base /my/site/
```

Serve `dist` through HTTP. Browsers cannot boot the module Worker and WebAssembly
runtime reliably from `file://`.

The Python application uses only the SDK API. It has no DOM access and does not
need a system Python installation in the deployed browser.
