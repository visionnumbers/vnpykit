# Embedding VNPyKit

Install the locally built `@vnpykit/embed` tarball until package identity is
approved. Copy its `dist/worker.js`, the VNPyKit wheel, and matching Pyodide assets
to your public asset directory.

```ts
import { mountVNPyKit } from "@vnpykit/embed";

const app = mountVNPyKit({
  mount: document.querySelector("#app") as HTMLElement,
  python: { kind: "url", url: new URL("./app.py", location.href).href },
  assetsBaseUrl: new URL("./assets/", location.href).href,
  workerUrl: new URL("./assets/runtime/worker.js", location.href),
  wheelFileName: "vnpykit-0.1.0a1-py3-none-any.whl",
});

app.onError((error) => console.error(error.code, error.message));
await app.ready;
await app.dispose();
```

React should call `mountVNPyKit` in an effect and dispose it in the effect cleanup.
Vue should mount in `onMounted` and dispose in `onBeforeUnmount`. No adapter package
is needed. Each call owns one Worker, MessageChannel, ShadowRoot tree, callback set,
and generation. Multiple calls are independent.

`stop()` requests graceful Python shutdown. `dispose()` is idempotent and removes
the Worker, channel, renderer DOM, subscriptions, and Python proxies. `recreate()`
returns a new handle with a fresh generation.
