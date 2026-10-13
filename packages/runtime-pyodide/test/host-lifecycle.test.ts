// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { createVNPyKitApp } from "../src/host.js";

describe("runtime startup lifecycle", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("terminates a pre-ready Worker synchronously on dispose", async () => {
    const workers: FakeWorker[] = [];
    const channels: FakeMessageChannel[] = [];
    vi.stubGlobal("Worker", class extends FakeWorker {
      public constructor() {
        super();
        workers.push(this);
      }
    });
    vi.stubGlobal("MessageChannel", class extends FakeMessageChannel {
      public constructor() {
        super();
        channels.push(this);
      }
    });

    const handle = createVNPyKitApp({
      mount: document.createElement("div"),
      python: { kind: "source", source: "pass" },
      assetsBaseUrl: "https://example.test/assets/",
    });
    const errors: unknown[] = [];
    handle.onError((error) => errors.push(error));
    const readyResult = handle.ready.catch((error: unknown) => error);

    const disposing = handle.dispose();
    expect(workers).toHaveLength(1);
    expect(workers[0]?.terminated).toBe(true);
    expect(channels[0]?.port1.closed).toBe(true);
    expect(handle.status).toBe("disposed");

    workers[0]?.emitError("late worker error");
    expect(errors).toHaveLength(0);
    expect(handle.status).toBe("disposed");

    await disposing;
    await expect(readyResult).resolves.toMatchObject({ detail: { code: "DISPOSED" } });
  });
});

class FakeWorker {
  public terminated = false;
  private readonly errorListeners: Array<(event: { message: string }) => void> = [];
  public postMessage(): void {}
  public addEventListener(type: string, listener: (event: { message: string }) => void): void {
    if (type === "error") this.errorListeners.push(listener);
  }
  public removeEventListener(type: string, listener: (event: { message: string }) => void): void {
    if (type !== "error") return;
    const index = this.errorListeners.indexOf(listener);
    if (index >= 0) this.errorListeners.splice(index, 1);
  }
  public terminate(): void { this.terminated = true; }
  public emitError(message: string): void {
    for (const listener of this.errorListeners) listener({ message });
  }
}

class FakeMessagePort {
  public closed = false;
  public postMessage(): void {}
  public addEventListener(): void {}
  public removeEventListener(): void {}
  public start(): void {}
  public close(): void { this.closed = true; }
}

class FakeMessageChannel {
  public readonly port1 = new FakeMessagePort();
  public readonly port2 = new FakeMessagePort();
}
