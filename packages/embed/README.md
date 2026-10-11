# `@vnpykit/embed`

Framework-independent browser entry point for VNPyKit. It mounts into a caller-owned
HTMLElement and returns the standard ready/error/stop/dispose/recreate handle.

```js
import { mountVNPyKit } from "@vnpykit/embed";

const app = mountVNPyKit({
  mount: document.querySelector("#app"),
  python: { kind: "url", url: new URL("./app.py", location.href).href },
  assetsBaseUrl: new URL("./assets/", location.href).href,
  workerUrl: new URL("./assets/worker.js", location.href),
});
await app.ready;
```

The worker is also available beside the package entry as `dist/worker.js`; copy it
to a public asset directory and pass that URL when a bundler does not copy package
assets. The package is provisional and private until package identity is resolved.
It does not install global browser names and requires no React or Vue wrapper.
