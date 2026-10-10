# M1 browser runtime

## Boot and protocol flow

1. `createVisionPyApp` synchronously creates a handle, renderer root, Worker, and dedicated `MessageChannel`.
2. The Worker imports locally served Pyodide 314.0.7, loads local micropip 0.11.1, and installs the exact locally built VisionPy wheel.
3. The Worker installs the JSON bridge and emits `RUNTIME_READY`.
4. Explicit Python source executes. `App.run()` emits one `UI_SNAPSHOT`.
5. The host validates and mounts the snapshot, returns `RENDER_ACK`, and resolves `ready`.
6. Native button clicks become validated `USER_EVENT` messages. Python callbacks mutate `State`; bindings emit bounded `PATCH_BATCH` messages.
7. `dispose()` requests cooperative Python cleanup, closes the channel and renderer, and terminates the Worker as the hard-stop fallback.

Both directions validate protocol major, app ID, generation, type, payload, and monotonically increasing sequence. The Python callback registry also validates the handler/node/event tuple.

## Runtime assets

`assetsBaseUrl` must resolve to a directory containing:

```text
pyodide/pyodide.mjs
pyodide/pyodide.asm.mjs
pyodide/pyodide.asm.wasm
pyodide/python_stdlib.zip
pyodide/pyodide-lock.json
pyodide/micropip-0.11.1-py3-none-any.whl
wheels/visionpy-0.1.0a1-py3-none-any.whl
```

The counter example prepares these files from locked dependencies and the local wheel build.

## Lifecycle and failure behavior

The host transitions through created, loading, ready, running, stopping, disposed, or failed. A fatal boot/protocol/render error rejects `ready`. Callback errors are nonfatal and reach `onError`; later events continue. Stale-generation messages and invalid sequences are rejected. Disposal is idempotent.

## Limitations

- The component tree freezes at `App.run()`; only existing-node properties can change.
- M1 has no TextInput, Checkbox, Row, async Python handler, runtime restart method, CLI, or package marketplace.
- Source mode is an explicit trusted-host capability. Untrusted Python requires a separate-origin sandbox design.
- Browser memory has no hard per-app quota. Forced Worker termination is the reliable hard-stop mechanism.
- Only Chromium is a blocking M1 browser test. Firefox and WebKit remain M2 validation work.

## Recorded M1 measurements

One local Windows 11 / Chromium 156 run on 2026-10-10 measured:

| Observation | First concurrent app | Second concurrent app |
|---|---:|---:|
| Create to `RUNTIME_READY` | 22,214 ms | 22,755 ms |
| Create to first rendered snapshot | 22,289 ms | 22,845 ms |
| Last sampled event-to-patch latency | 8.7 ms | 21.6 ms |

These are diagnostic observations from the final verification run, not thresholds or benchmark claims. The Vite build reported a 17.78 kB host JS chunk, 5.03 kB Worker JS chunk, and 0.54 kB CSS. The locally served Pyodide asset directory was 13,994,768 bytes; the VisionPy wheel was 11,683 bytes. Device, browser cache, concurrent startup, and filesystem speed materially affect the timings.
