import { createVisionPyApp, type VisionPyAppHandle } from "@visionpy/runtime-pyodide";
import "./styles.css";

const statusElement = requiredElement("status");
const metricsElement = requiredElement("metrics");
const firstMount = requiredElement("app-one");
const secondMount = requiredElement("app-two");
const scratchMount = requiredElement("scratch");
const assetsBaseUrl = new URL(import.meta.env.BASE_URL, location.origin).href;

let first = mountCounter(firstMount);
const second = mountCounter(secondMount);

async function ready(): Promise<void> {
  try {
    await Promise.all([first.ready, second.ready]);
    statusElement.textContent = "Two Python applications are ready.";
    renderMetrics();
  } catch (error) {
    statusElement.textContent = error instanceof Error ? error.message : "VisionPy failed to start.";
    throw error;
  }
}

function mountCounter(mount: HTMLElement): VisionPyAppHandle {
  const app = createVisionPyApp({
    mount,
    python: { kind: "url", url: new URL("app.py", assetsBaseUrl).href },
    assetsBaseUrl,
    startupTimeoutMs: 60_000,
    shutdownGraceMs: 1_000,
  });
  app.onError((error) => {
    statusElement.textContent = `${error.code}: ${error.message}`;
  });
  return app;
}

function mountSource(source: string): VisionPyAppHandle {
  const mount = document.createElement("div");
  scratchMount.append(mount);
  return createVisionPyApp({
    mount,
    python: { kind: "source", source },
    assetsBaseUrl,
    startupTimeoutMs: 60_000,
    shutdownGraceMs: 1_000,
  });
}

async function remountFirst(): Promise<void> {
  await first.dispose();
  first = mountCounter(firstMount);
  await first.ready;
  statusElement.textContent = "Instance one was disposed and remounted.";
  renderMetrics();
}

function renderMetrics(): void {
  metricsElement.textContent = JSON.stringify({ first: first.metrics, second: second.metrics }, null, 2);
}

requiredElement("remount").addEventListener("click", () => void remountFirst());

function requiredElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing #${id}`);
  return element;
}

declare global {
  interface Window {
    visionpyDemo: {
      ready: Promise<void>;
      getFirst(): VisionPyAppHandle;
      second: VisionPyAppHandle;
      remountFirst(): Promise<void>;
      mountSource(source: string): VisionPyAppHandle;
    };
  }
}

const readyPromise = ready();
window.visionpyDemo = { ready: readyPromise, getFirst: () => first, second, remountFirst, mountSource };
