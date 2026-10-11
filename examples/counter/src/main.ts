import { createVNPyKitApp, type VNPyKitAppHandle } from "@vnpykit/runtime-pyodide";
import "./styles.css";

const statusElement = requiredElement("status");
const metricsElement = requiredElement("metrics");
const firstMount = requiredElement("app-one");
const secondMount = requiredElement("app-two");
const scratchMount = requiredElement("scratch");
const assetsBaseUrl = new URL(import.meta.env.BASE_URL, location.origin).href;

let first = mountCounter(firstMount);
let second: VNPyKitAppHandle;

async function ready(): Promise<void> {
  try {
    await first.ready;
    second = mountCounter(secondMount);
    await second.ready;
    statusElement.textContent = "Two Python applications are ready.";
    renderMetrics();
  } catch (error) {
    statusElement.textContent = error instanceof Error ? error.message : "VNPyKit failed to start.";
    throw error;
  }
}

function mountCounter(mount: HTMLElement): VNPyKitAppHandle {
  const app = createVNPyKitApp({
    mount,
    python: { kind: "url", url: new URL("app.py", assetsBaseUrl).href },
    assetsBaseUrl,
    startupTimeoutMs: 60_000,
    shutdownGraceMs: 1_000,
  });
  watchErrors(app);
  return app;
}

function watchErrors(app: VNPyKitAppHandle): void {
  app.onError((error) => {
    statusElement.textContent = `${error.code}: ${error.message}`;
  });
}

function mountSource(source: string): VNPyKitAppHandle {
  const mount = document.createElement("div");
  scratchMount.append(mount);
  return createVNPyKitApp({
    mount,
    python: { kind: "source", source },
    assetsBaseUrl,
    startupTimeoutMs: 60_000,
    shutdownGraceMs: 1_000,
  });
}

async function remountFirst(): Promise<void> {
  first = await first.recreate();
  watchErrors(first);
  await first.ready;
  statusElement.textContent = "Instance one was disposed and remounted.";
  renderMetrics();
}

function renderMetrics(): void {
  metricsElement.textContent = JSON.stringify({ cold: first.metrics, warm: second.metrics }, null, 2);
}

requiredElement("remount").addEventListener("click", () => void remountFirst());

function requiredElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing #${id}`);
  return element;
}

declare global {
  interface Window {
    vnpykitDemo: {
      ready: Promise<void>;
      getFirst(): VNPyKitAppHandle;
      getSecond(): VNPyKitAppHandle;
      remountFirst(): Promise<void>;
      mountSource(source: string): VNPyKitAppHandle;
    };
  }
}

const readyPromise = ready();
window.vnpykitDemo = { ready: readyPromise, getFirst: () => first, getSecond: () => second, remountFirst, mountSource };
