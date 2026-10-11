import { parseEnvelope, PROTOCOL_MAJOR, type ErrorMessage, type ProtocolMessage, type UserEvent } from "@vnpykit/protocol";
import { createRenderer, type Renderer } from "@vnpykit/renderer";

export type VNPyKitStatus = "created" | "loading" | "ready" | "running" | "stopping" | "disposed" | "failed";

export type VNPyKitErrorEvent = ErrorMessage["payload"];

export interface VNPyKitMetrics {
  createdAt: number;
  runtimeReadyMs?: number;
  firstRenderMs?: number;
  lastCallbackLatencyMs?: number;
}

export interface VNPyKitAppHandle {
  readonly ready: Promise<void>;
  readonly status: VNPyKitStatus;
  readonly appId: string;
  readonly generation: string;
  readonly metrics: Readonly<VNPyKitMetrics>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  recreate(): Promise<VNPyKitAppHandle>;
  focus(nodeId: string): boolean;
  onError(listener: (error: VNPyKitErrorEvent) => void): () => void;
}

export interface CreateVNPyKitOptions {
  mount: HTMLElement;
  python: { kind: "url"; url: string } | { kind: "source"; source: string };
  assetsBaseUrl: string;
  theme?: "system" | "light" | "dark";
  startupTimeoutMs?: number;
  shutdownGraceMs?: number;
  workerUrl?: URL;
  wheelFileName?: string;
}

interface WorkerInit {
  kind: "VNPYKIT_INIT";
  appId: string;
  generation: string;
  python: CreateVNPyKitOptions["python"];
  pyodideModuleUrl: string;
  pyodideIndexUrl: string;
  wheelUrl: string;
  port: MessagePort;
}

export function createVNPyKitApp(options: CreateVNPyKitOptions): VNPyKitAppHandle {
  const createdAt = performance.now();
  const metrics: VNPyKitMetrics = { createdAt };
  const appId = `app_${crypto.randomUUID().replaceAll("-", "")}`;
  const generation = `worker_${crypto.randomUUID().replaceAll("-", "")}`;
  const base = normalizedBase(options.assetsBaseUrl);
  const python = normalizePython(options.python);
  const startupTimeoutMs = options.startupTimeoutMs ?? 30_000;
  const shutdownGraceMs = options.shutdownGraceMs ?? 1_000;
  if (startupTimeoutMs <= 0 || shutdownGraceMs < 0) throw new RangeError("runtime timeouts must be positive");

  let status: VNPyKitStatus = "created";
  let worker: Worker | undefined;
  let renderer: Renderer | undefined;
  let port: MessagePort | undefined;
  let workerSeq = -1;
  let hostSeq = 0;
  let settledReady = false;
  let disposed = false;
  let disposePromise: Promise<void> | undefined;
  let stopResolver: (() => void) | undefined;
  let disposeAckResolver: (() => void) | undefined;
  let lastEventAt: number | undefined;
  const errorListeners = new Set<(error: VNPyKitErrorEvent) => void>();
  const trace = (stage: string, detail: Record<string, unknown> = {}): void => {
    console.debug("VNPYKIT_LIFECYCLE", { appId, generation, stage, elapsedMs: performance.now() - createdAt, ...detail });
  };

  let resolveReady: () => void = () => undefined;
  let rejectReady: (reason: unknown) => void = () => undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const fail = (error: VNPyKitErrorEvent): void => {
    status = "failed";
    renderer?.showFailure(`${error.code}: ${error.message}`);
    for (const listener of errorListeners) listener(error);
    if (!settledReady) {
      settledReady = true;
      rejectReady(new VNPyKitHostError(error));
    }
  };

  const send = (type: ProtocolMessage["type"], payload: Record<string, unknown>): void => {
    if (port === undefined || disposed) return;
    const message = parseEnvelope({ protocol: PROTOCOL_MAJOR, appId, generation, seq: hostSeq, type, payload });
    hostSeq += 1;
    port.postMessage(message);
  };

  try {
    status = "loading";
    trace("host-loading");
    renderer = createRenderer({ mount: options.mount, appId, generation, ...(options.theme === undefined ? {} : { theme: options.theme }) });
    const channel = new MessageChannel();
    port = channel.port1;
    // Keep this URL dynamic so library bundlers do not inline executable worker
    // source as a data: URL. The embed package ships worker.js beside its entry.
    const workerUrl = options.workerUrl ?? new URL([".", "worker.js"].join("/"), import.meta.url);
    worker = new Worker(workerUrl, { type: "module", name: `VNPyKit ${appId}` });
    trace("worker-created", { workerUrl: workerUrl.href });

    renderer.onUserEvent((payload: UserEvent["payload"]) => {
      if (status !== "running") return;
      lastEventAt = performance.now();
      send("USER_EVENT", { ...payload });
    });

    port.addEventListener("message", (event: MessageEvent<unknown>) => {
      let message: ProtocolMessage;
      try {
        message = parseEnvelope(event.data);
        if (message.appId !== appId || message.generation !== generation) throw new Error("stale worker generation");
        if (message.seq !== workerSeq + 1) throw new Error(`expected worker sequence ${workerSeq + 1}`);
        workerSeq = message.seq;
      } catch (error) {
        fail({ code: "INVALID_MESSAGE", message: safeMessage(error), phase: "protocol", fatal: true });
        void handle.dispose();
        return;
      }

      if (message.type === "RUNTIME_READY") {
        metrics.runtimeReadyMs = performance.now() - createdAt;
        status = "ready";
        trace("runtime-ready");
      } else if (message.type === "UI_SNAPSHOT") {
        try {
          renderer?.mount(message);
          metrics.firstRenderMs = performance.now() - createdAt;
          status = "running";
          trace("first-render", { snapshotSeq: message.seq });
          send("RENDER_ACK", { ackSeq: message.seq });
          if (!settledReady) {
            settledReady = true;
            resolveReady();
          }
        } catch (error) {
          fail({ code: "RENDER_ERROR", message: safeMessage(error), phase: "render", fatal: true });
        }
      } else if (message.type === "PATCH_BATCH") {
        try {
          renderer?.patch(message);
          if (lastEventAt !== undefined) metrics.lastCallbackLatencyMs = performance.now() - lastEventAt;
        } catch (error) {
          fail({ code: "RENDER_ERROR", message: safeMessage(error), phase: "render", fatal: true });
        }
      } else if (message.type === "ERROR") {
        for (const listener of errorListeners) listener(message.payload);
        if (message.payload.fatal) fail(message.payload);
      } else if (message.type === "STOP_ACK") {
        stopResolver?.();
        stopResolver = undefined;
      } else if (message.type === "DISPOSE_ACK") {
        disposeAckResolver?.();
        disposeAckResolver = undefined;
      }
    });
    port.start();

    worker.addEventListener("error", (event) => {
      trace("worker-error", { message: event.message || "Worker failed" });
      fail({ code: "BOOT_FAILED", message: event.message || "Worker failed", phase: "bootstrap", fatal: true });
    });

    const init: WorkerInit = {
      kind: "VNPYKIT_INIT",
      appId,
      generation,
      python,
      pyodideModuleUrl: new URL("pyodide/pyodide.mjs", base).href,
      pyodideIndexUrl: new URL("pyodide/", base).href,
      wheelUrl: new URL(`wheels/${options.wheelFileName ?? "vnpykit-0.1.0a1-py3-none-any.whl"}`, base).href,
      port: channel.port2,
    };
    worker.postMessage(init, [channel.port2]);
    trace("worker-init-posted");
  } catch (error) {
    fail({ code: "BOOT_FAILED", message: safeMessage(error), phase: "bootstrap", fatal: true });
  }

  const startupTimer = globalThis.setTimeout(() => {
    if (!settledReady && !disposed) {
      fail({ code: "TIMEOUT", message: `startup exceeded ${startupTimeoutMs}ms`, phase: "bootstrap", fatal: true });
      void handle.dispose();
    }
  }, startupTimeoutMs);

  const handle: VNPyKitAppHandle = {
    ready,
    get status(): VNPyKitStatus { return status; },
    appId,
    generation,
    get metrics(): Readonly<VNPyKitMetrics> { return metrics; },
    async stop(): Promise<void> {
      if (disposed || status === "disposed") return;
      status = "stopping";
      const acknowledged = new Promise<void>((resolve) => { stopResolver = resolve; });
      send("STOP_REQUEST", {});
      const stopped = await Promise.race([acknowledged.then(() => true), delay(shutdownGraceMs).then(() => false)]);
      if (!stopped) {
        worker?.terminate();
        status = "disposed";
        disposed = true;
        renderer?.dispose();
        port?.close();
      }
    },
    dispose(): Promise<void> {
      if (disposePromise !== undefined) return disposePromise;
      disposePromise = (async () => {
        const statusAtDispose = status;
        disposed = true;
        globalThis.clearTimeout(startupTimer);
        if (!settledReady) {
          settledReady = true;
          rejectReady(new VNPyKitHostError({ code: "DISPOSED", message: "disposed before ready", phase: "bootstrap", fatal: true }));
        }
        status = "stopping";
        trace("dispose-start", { statusAtDispose });

        // A booting Worker cannot observe its MessagePort until Pyodide and the
        // SDK wheel have loaded. Terminate it synchronously so a React
        // StrictMode cleanup cannot leave a superseded Pyodide instance alive.
        if (statusAtDispose === "created" || statusAtDispose === "loading" || statusAtDispose === "failed") {
          worker?.terminate();
          port?.close();
          renderer?.dispose();
          status = "disposed";
          trace("dispose-complete", { mode: "pre-ready-terminate" });
          return;
        }

        const acknowledged = new Promise<void>((resolve) => { disposeAckResolver = resolve; });
        if (port !== undefined) {
          const wasDisposed = disposed;
          disposed = false;
          send("DISPOSE_REQUEST", {});
          disposed = wasDisposed;
          await Promise.race([acknowledged, delay(shutdownGraceMs)]);
        }
        worker?.terminate();
        port?.close();
        renderer?.dispose();
        status = "disposed";
        trace("dispose-complete", { mode: "graceful-or-timeout" });
      })();
      return disposePromise;
    },
    async recreate(): Promise<VNPyKitAppHandle> {
      await handle.dispose();
      return createVNPyKitApp(options);
    },
    focus(nodeId: string): boolean {
      return renderer?.focus(nodeId) ?? false;
    },
    onError(listener: (error: VNPyKitErrorEvent) => void): () => void {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
  };
  return handle;
}

export class VNPyKitHostError extends Error {
  public readonly detail: VNPyKitErrorEvent;
  public constructor(detail: VNPyKitErrorEvent) {
    super(`${detail.code}: ${detail.message}`);
    this.name = "VNPyKitHostError";
    this.detail = detail;
  }
}

function normalizedBase(value: string): URL {
  const url = new URL(value.endsWith("/") ? value : `${value}/`, document.baseURI);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("assetsBaseUrl must use HTTP(S)");
  return url;
}

function normalizePython(python: CreateVNPyKitOptions["python"]): CreateVNPyKitOptions["python"] {
  if (python.kind === "source") return python;
  const url = new URL(python.url, document.baseURI);
  if (url.origin !== location.origin) throw new TypeError("Python URL must be same-origin");
  return { kind: "url", url: url.href };
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 20_000) : "Unknown runtime error";
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}
