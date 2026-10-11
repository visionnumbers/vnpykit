import { parseEnvelope, PROTOCOL_MAJOR, type ProtocolMessage } from "@visionpy/protocol";

interface WorkerInit {
  kind: "VISIONPY_INIT";
  appId: string;
  generation: string;
  python: { kind: "url"; url: string } | { kind: "source"; source: string };
  pyodideModuleUrl: string;
  pyodideIndexUrl: string;
  wheelUrl: string;
  port: MessagePort;
}

interface PyProxyFunction {
  (...args: unknown[]): unknown;
  destroy(): void;
}

interface PyodideLike {
  loadPackage(name: string): Promise<void>;
  runPython(code: string): unknown;
  runPythonAsync(code: string): Promise<unknown>;
  globals: { set(name: string, value: unknown): void; delete(name: string): boolean };
}

interface PyodideModule {
  loadPyodide(options: { indexURL: string }): Promise<PyodideLike>;
}

const scope = globalThis as unknown as {
  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
  close(): void;
};

scope.addEventListener("message", (event) => {
  if (!isInit(event.data)) return;
  void boot(event.data);
});

async function boot(init: WorkerInit): Promise<void> {
  const { port, appId, generation } = init;
  let workerSeq = 0;
  let hostSeq = -1;
  let pyodide: PyodideLike | undefined;
  let dispatch: PyProxyFunction | undefined;
  let snapshotSent = false;
  const startedAt = performance.now();
  const trace = (stage: string): void => {
    console.debug("VISIONPY_WORKER_LIFECYCLE", { appId, generation, stage, elapsedMs: performance.now() - startedAt });
  };

  const post = (type: ProtocolMessage["type"], payload: Record<string, unknown>): void => {
    const message = parseEnvelope({ protocol: PROTOCOL_MAJOR, appId, generation, seq: workerSeq, type, payload });
    workerSeq += 1;
    port.postMessage(message);
  };
  const postError = (code: "BOOT_FAILED" | "PYTHON_EXCEPTION" | "INVALID_MESSAGE", error: unknown, phase: "bootstrap" | "build" | "callback" | "protocol", fatal: boolean): void => {
    post("ERROR", { code, message: safeMessage(error), phase, fatal });
  };
  const cleanup = (): void => {
    dispatch?.destroy();
    dispatch = undefined;
    if (pyodide !== undefined) {
      try { pyodide.runPython("import visionpy._bridge as _vp_bridge; _vp_bridge.dispose_transport()"); } catch { /* worker termination is the final cleanup boundary */ }
      for (const name of ["_visionpy_send", "_visionpy_app_id", "_visionpy_generation"]) pyodide.globals.delete(name);
    }
    port.close();
  };

  try {
    trace("worker-module-bootstrap");
    const module = await import(/* @vite-ignore */ init.pyodideModuleUrl) as PyodideModule;
    trace("pyodide-module-imported");
    pyodide = await module.loadPyodide({ indexURL: init.pyodideIndexUrl });
    trace("pyodide-initialized");
    // The SDK wheel has no dependencies. Pyodide's URL-aware package loader
    // installs a PEP 427 pure-Python wheel directly and avoids importing the
    // full micropip resolver during every Worker startup.
    await pyodide.loadPackage(init.wheelUrl);
    trace("wheel-installed");
    pyodide.globals.set("_visionpy_app_id", appId);
    pyodide.globals.set("_visionpy_generation", generation);
    pyodide.globals.set("_visionpy_send", (serialized: string) => {
      const message = parseEnvelope(JSON.parse(serialized) as unknown);
      if (message.appId !== appId || message.generation !== generation || message.seq !== workerSeq) throw new Error("Python emitted an invalid session envelope");
      if (message.type === "UI_SNAPSHOT") snapshotSent = true;
      workerSeq += 1;
      port.postMessage(message);
    });
    await pyodide.runPythonAsync("import visionpy._bridge as _vp_bridge\n_vp_bridge.install(_visionpy_send, _visionpy_app_id, _visionpy_generation)");
    const result = pyodide.runPython("_vp_bridge.dispatch_json");
    if (!isPyProxyFunction(result)) throw new Error("Python bridge dispatch is unavailable");
    dispatch = result;
    post("RUNTIME_READY", { sdkVersion: "0.1.0a1", protocolMajor: PROTOCOL_MAJOR });
    trace("runtime-ready-posted");

    port.addEventListener("message", (messageEvent: MessageEvent<unknown>) => {
      try {
        const message = parseEnvelope(messageEvent.data);
        if (message.appId !== appId || message.generation !== generation) throw new Error("stale app generation");
        if (message.seq !== hostSeq + 1) throw new Error(`expected host sequence ${hostSeq + 1}`);
        hostSeq = message.seq;
        dispatch?.(JSON.stringify(message));
        if (message.type === "DISPOSE_REQUEST") {
          cleanup();
          scope.close();
        }
      } catch (error) {
        postError("INVALID_MESSAGE", error, "protocol", false);
      }
    });
    port.start();

    const source = init.python.kind === "source" ? init.python.source : await fetchPython(init.python.url);
    trace("python-source-loaded");
    await pyodide.runPythonAsync(source);
    trace("python-source-executed");
    if (!snapshotSent) throw new Error("Python source completed without calling App.run()");
    trace("ui-snapshot-posted");
  } catch (error) {
    trace("worker-boot-failed");
    postError(pyodide === undefined ? "BOOT_FAILED" : "PYTHON_EXCEPTION", error, pyodide === undefined ? "bootstrap" : "build", true);
  }
}

function isInit(value: unknown): value is WorkerInit {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<WorkerInit>;
  return record.kind === "VISIONPY_INIT"
    && typeof record.appId === "string"
    && typeof record.generation === "string"
    && typeof record.pyodideModuleUrl === "string"
    && typeof record.pyodideIndexUrl === "string"
    && typeof record.wheelUrl === "string"
    && record.port instanceof MessagePort
    && typeof record.python === "object"
    && record.python !== null;
}

function isPyProxyFunction(value: unknown): value is PyProxyFunction {
  return typeof value === "function" && "destroy" in value;
}

async function fetchPython(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Python source request failed: ${response.status}`);
  return response.text();
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 20_000) : "Unknown worker failure";
}
