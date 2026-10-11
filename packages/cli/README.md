# `@vnpykit/cli`

Provisional Node.js 24+ CLI for creating, running, and building VNPyKit apps.

```text
vnpykit create hello-app
vnpykit run hello-app/app.py
vnpykit build hello-app/app.py --out-dir hello-app/dist --base /nested/demo/
```

The package includes the exact dependency-free VNPyKit wheel used by the static
builder. Pyodide 314.0.7 is an exact dependency. Builds perform no network fetch.
The default development host is loopback; non-loopback binding requires the explicit
`--allow-public` flag and is only suitable for trusted source.
