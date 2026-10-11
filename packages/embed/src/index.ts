import { createVNPyKitApp as createRuntimeApp } from "@vnpykit/runtime-pyodide";

export type VNPyKitStatus = "created" | "loading" | "ready" | "running" | "stopping" | "disposed" | "failed";

export interface VNPyKitErrorEvent {
  code: string;
  message: string;
  phase: string;
  fatal: boolean;
}

export interface VNPyKitMetrics {
  createdAt: number;
  runtimeReadyMs?: number;
  firstRenderMs?: number;
  lastCallbackLatencyMs?: number;
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

/** Mount a VNPyKit application into a caller-owned element. */
export function createVNPyKitApp(options: CreateVNPyKitOptions): VNPyKitAppHandle {
  return createRuntimeApp(options) as VNPyKitAppHandle;
}

/** Stable framework-independent alias used by browser hosts. */
export const mountVNPyKit: typeof createVNPyKitApp = createVNPyKitApp;
