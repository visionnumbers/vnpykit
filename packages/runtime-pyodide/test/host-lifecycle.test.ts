// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { createVNPyKitApp } from "../src/host.js";

describe("runtime startup lifecycle", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("terminates a pre-ready Worker synchronously on dispose", async () => {
    const workers: FakeWorker[] = [];
    vi.stubGlobal("Worker", class extends FakeWorker {
      public constructor() {
        super();
        workers.push(this);
      }
    });
    vi.stubGlobal("MessageChannel", FakeMessageChannel);

    const handle = createVNPyKitApp({
      mount: document.createElement("div"),
      python: { kind: "source", source: "pass" },
      assetsBaseUrl: "https://example.test/assets/",
    });
    const readyResult = handle.ready.catch((error: unknown) => error);

    const disposing = handle.dispose();
    expect(workers).toHaveLength(1);
    expect(workers[0]?.terminated).toBe(true);
    expect(handle.status).toBe("disposed");

    await disposing;
    await expect(readyResult).resolves.toMatchObject({ detail: { code: "DISPOSED" } });
  });
});

class FakeWorker {
  public terminated = false;
  public postMessage(): void {}
  public addEventListener(): void {}
  public terminate(): void { this.terminated = true; }
}

class FakeMessagePort {
  public postMessage(): void {}
  public addEventListener(): void {}
  public start(): void {}
  public close(): void {}
}

class FakeMessageChannel {
  public readonly port1 = new FakeMessagePort();
  public readonly port2 = new FakeMessagePort();
}
