# @vnpykit/runtime-pyodide

Worker-first Pyodide runtime for VNPyKit. Each application owns an independent
Worker, protocol generation, renderer tree, and disposal lifecycle.

```ts
import { createVNPyKitApp } from "@vnpykit/runtime-pyodide";
```

A same-origin Web Worker is a responsiveness boundary, not a hardened sandbox for
hostile Python. Use a separate origin and sandbox design for untrusted programs.
Apache-2.0; public alpha.
