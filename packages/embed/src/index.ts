import { createVisionPyApp as createRuntimeApp } from "@visionpy/runtime-pyodide";

export type VisionPyStatus = "created" | "loading" | "ready" | "running" | "stopping" | "disposed" | "failed";

export interface VisionPyErrorEvent {
  code: string;
  message: string;
  phase: string;
  fatal: boolean;
}

export interface VisionPyMetrics {
  createdAt: number;
  runtimeReadyMs?: number;
  firstRenderMs?: number;
  lastCallbackLatencyMs?: number;
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

export interface VisionPyAppHandle {
  readonly ready: Promise<void>;
  readonly status: VisionPyStatus;
  readonly appId: string;
  readonly generation: string;
  readonly metrics: Readonly<VisionPyMetrics>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  recreate(): Promise<VisionPyAppHandle>;
  focus(nodeId: string): boolean;
  onError(listener: (error: VisionPyErrorEvent) => void): () => void;
}

/** Mount a VisionPy application into a caller-owned element. */
export function createVisionPyApp(options: CreateVisionPyOptions): VisionPyAppHandle {
  return createRuntimeApp(options) as VisionPyAppHandle;
}

/** Stable framework-independent alias used by browser hosts. */
export const mountVisionPy: typeof createVisionPyApp = createVisionPyApp;
