export {};

declare global {
  interface Window {
    failedApp: { dispose(): Promise<void> };
    recoveryApp: { dispose(): Promise<void> };
    vnpykitDemo: {
      ready: Promise<void>;
      getFirst(): {
        generation: string;
        status: string;
        metrics: {
          runtimeReadyMs?: number;
          firstRenderMs?: number;
          lastCallbackLatencyMs?: number;
        };
        stop(): Promise<void>;
        dispose(): Promise<void>;
      };
      getSecond(): {
        metrics: {
          runtimeReadyMs?: number;
          firstRenderMs?: number;
        };
      };
      remountFirst(): Promise<void>;
      mountSource(source: string): {
        ready: Promise<void>;
        dispose(): Promise<void>;
      };
    };
  }
}
