import { parseEnvelope, PROTOCOL_MAJOR, type ErrorMessage, type ProtocolMessage, type UserEvent } from "@visionpy/protocol";
import { createRenderer, type Renderer } from "@visionpy/renderer";

export type VisionPyStatus = "created" | "loading" | "ready" | "running" | "stopping" | "disposed" | "failed";

export type VisionPyErrorEvent = ErrorMessage["payload"];

export interface VisionPyMetrics {
  createdAt: number;
  runtimeReadyMs?: number;
  firstRenderMs?: number;
  lastCallbackLatencyMs?: number;
}

export interface VisionPyAppHandle {
  readonly ready: Promise<void>;
  readonly status: VisionPyStatus;
  readonly appId: string;
  readonly generation: string;
  readonly metrics: Readonly<VisionPyMetrics>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  onError(listener: (error: VisionPyErrorEvent) => void): () => void;
}

export interface CreateVisionPyOptions {
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
  kind: "VISIONPY_INIT";
  appId: string;
  generation: string;
  python: CreateVisionPyOptions["python"];
  pyodideModuleUrl: string;
  pyodideIndexUrl: string;
  wheelUrl: string;
  port: MessagePort;
}

export function createVisionPyApp(options: CreateVisionPyOptions): VisionPyAppHandle {
  const createdAt = performance.now();
  const metrics: VisionPyMetrics = { createdAt };
  const appId = `app_${crypto.randomUUID().replaceAll("-", "")}`;
  const generation = `worker_${crypto.randomUUID().replaceAll("-", "")}`;
  const base = normalizedBase(options.assetsBaseUrl);
  const python = normalizePython(options.python);
  const startupTimeoutMs = options.startupTimeoutMs ?? 30_000;
  const shutdownGraceMs = options.shutdownGraceMs ?? 1_000;
  if (startupTimeoutMs <= 0 || shutdownGraceMs < 0) throw new RangeError("runtime timeouts must be positive");

  let status: VisionPyStatus = "created";
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
  const errorListeners = new Set<(error: VisionPyErrorEvent) => void>();

  let resolveReady: () => void = () => undefined;
  let rejectReady: (reason: unknown) => void = () => undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const fail = (error: VisionPyErrorEvent): void => {
    status = "failed";
    for (const listener of errorListeners) listener(error);
    if (!settledReady) {
      settledReady = true;
      rejectReady(new VisionPyHostError(error));
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
    renderer = createRenderer({ mount: options.mount, appId, generation, ...(options.theme === undefined ? {} : { theme: options.theme }) });
    const channel = new MessageChannel();
    port = channel.port1;
    const workerUrl = options.workerUrl ?? new URL("./worker.js", import.meta.url);
    worker = new Worker(workerUrl, { type: "module", name: `VisionPy ${appId}` });

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
      } else if (message.type === "UI_SNAPSHOT") {
        try {
          renderer?.mount(message);
          metrics.firstRenderMs = performance.now() - createdAt;
          status = "running";
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
      fail({ code: "BOOT_FAILED", message: event.message || "Worker failed", phase: "bootstrap", fatal: true });
    });

    const init: WorkerInit = {
      kind: "VISIONPY_INIT",
      appId,
      generation,
      python,
      pyodideModuleUrl: new URL("pyodide/pyodide.mjs", base).href,
      pyodideIndexUrl: new URL("pyodide/", base).href,
      wheelUrl: new URL(`wheels/${options.wheelFileName ?? "visionpy-0.1.0a1-py3-none-any.whl"}`, base).href,
      port: channel.port2,
    };
    worker.postMessage(init, [channel.port2]);
  } catch (error) {
    fail({ code: "BOOT_FAILED", message: safeMessage(error), phase: "bootstrap", fatal: true });
  }

  const startupTimer = globalThis.setTimeout(() => {
    if (!settledReady && !disposed) {
      fail({ code: "TIMEOUT", message: `startup exceeded ${startupTimeoutMs}ms`, phase: "bootstrap", fatal: true });
      void handle.dispose();
    }
  }, startupTimeoutMs);

  const handle: VisionPyAppHandle = {
    ready,
    get status(): VisionPyStatus { return status; },
    appId,
    generation,
    get metrics(): Readonly<VisionPyMetrics> { return metrics; },
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
        disposed = true;
        globalThis.clearTimeout(startupTimer);
        if (!settledReady) {
          settledReady = true;
          rejectReady(new VisionPyHostError({ code: "DISPOSED", message: "disposed before ready", phase: "bootstrap", fatal: true }));
        }
        status = "stopping";
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
      })();
      return disposePromise;
    },
    onError(listener: (error: VisionPyErrorEvent) => void): () => void {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
  };
  return handle;
}

export class VisionPyHostError extends Error {
  public readonly detail: VisionPyErrorEvent;
  public constructor(detail: VisionPyErrorEvent) {
    super(`${detail.code}: ${detail.message}`);
    this.name = "VisionPyHostError";
    this.detail = detail;
  }
}

function normalizedBase(value: string): URL {
  const url = new URL(value.endsWith("/") ? value : `${value}/`, document.baseURI);
  if (!url.protocol.startsWith("http")) throw new TypeError("assetsBaseUrl must use HTTP(S)");
  return url;
}

function normalizePython(python: CreateVisionPyOptions["python"]): CreateVisionPyOptions["python"] {
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
