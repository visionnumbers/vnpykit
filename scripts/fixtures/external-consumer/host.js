import { mountVisionPy } from "@visionpy/embed";

export function mount(container) {
  return mountVisionPy({
    mount: container,
    python: { kind: "url", url: new URL("./app.py", location.href).href },
    assetsBaseUrl: new URL("./assets/", location.href).href,
    workerUrl: new URL("./assets/runtime/worker.js", location.href),
    wheelFileName: "visionpy-0.1.0a1-py3-none-any.whl",
    startupTimeoutMs: 120_000,
  });
}
