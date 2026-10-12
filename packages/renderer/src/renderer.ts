import {
  ProtocolValidationError,
  validatePatchBatch,
  validatePropsForKind,
  validateSnapshot,
  type PatchBatch,
  type Scalar,
  type UiSnapshot,
  type UserEvent,
  type VNode,
  type WidgetKind,
} from "@vnpykit/protocol";

export interface Renderer {
  mount(snapshot: UiSnapshot): void;
  patch(batch: PatchBatch): void;
  onUserEvent(listener: (event: UserEvent["payload"]) => void): () => void;
  dispose(): void;
}

export interface RendererOptions {
  mount: HTMLElement;
  appId: string;
  generation: string;
  theme?: "system" | "light" | "dark";
}

interface RenderedNode {
  kind: WidgetKind;
  element: HTMLElement;
}

interface EventBinding {
  handlerId: string;
  nodeId: string;
  event: "click";
}

const STYLES = `
:host { color-scheme: light dark; font-family: system-ui, sans-serif; }
.vp-root { box-sizing: border-box; color: CanvasText; background: Canvas; }
.vp-column { display: flex; flex-direction: column; }
.vp-container { box-sizing: border-box; }
.vp-text { margin: 0; }
.vp-text--muted { color: CanvasText; color: color-mix(in srgb, CanvasText 72%, Canvas); }
.vp-button { font: inherit; padding: .5rem .8rem; cursor: pointer; }
.vp-button:disabled { cursor: default; opacity: .6; }
`;

export function createRenderer(options: RendererOptions): Renderer {
  let disposed = false;
  let mounted = false;
  let lastWorkerSeq = -1;
  const nodes = new Map<string, RenderedNode>();
  const eventBindings = new WeakMap<EventTarget, EventBinding>();
  const listeners = new Set<(event: UserEvent["payload"]) => void>();
  const owner = document.createElement("div");
  owner.className = "vp-owner";
  owner.setAttribute("data-vnpykit-root", "");
  const shadow = owner.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = STYLES;
  const root = document.createElement("div");
  root.className = "vp-root";
  root.setAttribute("data-theme", options.theme ?? "system");
  shadow.append(style, root);
  options.mount.append(owner);

  const clickListener = (browserEvent: Event): void => {
    if (disposed) return;
    for (const target of browserEvent.composedPath()) {
      const binding = eventBindings.get(target);
      if (binding !== undefined) {
        const payload: UserEvent["payload"] = {
          handlerId: binding.handlerId,
          nodeId: binding.nodeId,
          event: binding.event,
        };
        for (const listener of listeners) listener(payload);
        return;
      }
    }
  };
  shadow.addEventListener("click", clickListener);

  const assertOwner = (message: UiSnapshot | PatchBatch): void => {
    if (message.appId !== options.appId || message.generation !== options.generation) {
      throw new ProtocolValidationError("SESSION_MISMATCH", "renderer message has stale ownership");
    }
    if (message.seq <= lastWorkerSeq) {
      throw new ProtocolValidationError("SEQUENCE_ERROR", "renderer message sequence is stale", "$.seq");
    }
  };

  const buildNode = (node: VNode): HTMLElement => {
    let element: HTMLElement;
    switch (node.kind) {
      case "text":
        element = document.createElement(node.props.level === "h1" ? "h1" : node.props.level === "h2" ? "h2" : "p");
        break;
      case "button":
        element = document.createElement("button");
        (element as HTMLButtonElement).type = "button";
        break;
      case "column":
        element = document.createElement("div");
        break;
      case "container":
        element = document.createElement("section");
        break;
      default:
        throw new ProtocolValidationError("INVALID_MESSAGE", `widget ${node.kind} is not implemented in M1`);
    }
    applyProps(element, node.kind, node.props);
    nodes.set(node.id, { kind: node.kind, element });
    const clickHandler = node.events?.click;
    if (clickHandler !== undefined) eventBindings.set(element, { handlerId: clickHandler, nodeId: node.id, event: "click" });
    for (const child of node.children) element.append(buildNode(child));
    return element;
  };

  return {
    mount(input: UiSnapshot): void {
      if (disposed) throw new Error("renderer is disposed");
      if (mounted) throw new Error("renderer is already mounted");
      const snapshot = validateSnapshot(input);
      assertOwner(snapshot);
      const fragment = document.createDocumentFragment();
      fragment.append(buildNode(snapshot.payload.root));
      root.append(fragment);
      lastWorkerSeq = snapshot.seq;
      mounted = true;
    },

    patch(input: PatchBatch): void {
      if (disposed || !mounted) throw new Error("renderer is not mounted");
      const batch = validatePatchBatch(input);
      assertOwner(batch);
      const validated = batch.payload.changes.map((change) => {
        const rendered = nodes.get(change.id);
        if (rendered === undefined) {
          throw new ProtocolValidationError("OWNERSHIP_ERROR", `patch targets unknown node ${change.id}`);
        }
        return { rendered, props: validatePropsForKind(rendered.kind, change.props, { partial: true }) };
      });
      for (const { rendered, props } of validated) applyProps(rendered.element, rendered.kind, props);
      lastWorkerSeq = batch.seq;
    },

    onUserEvent(listener: (event: UserEvent["payload"]) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      shadow.removeEventListener("click", clickListener);
      listeners.clear();
      nodes.clear();
      owner.remove();
    },
  };
}

function applyProps(element: HTMLElement, kind: WidgetKind, props: Record<string, Scalar>): void {
  if (kind === "text") {
    element.className = props.tone === "muted" ? "vp-text vp-text--muted" : "vp-text";
    if (typeof props.text === "string") element.textContent = props.text;
  } else if (kind === "button") {
    element.className = "vp-button";
    if (typeof props.text === "string") element.textContent = props.text;
    if (typeof props.disabled === "boolean") (element as HTMLButtonElement).disabled = props.disabled;
  } else if (kind === "column") {
    element.className = "vp-column";
    if (typeof props.gap === "number") element.style.gap = `${props.gap}px`;
    if (typeof props.align === "string") element.style.alignItems = props.align === "start" || props.align === "end" ? `flex-${props.align}` : props.align;
  } else if (kind === "container") {
    element.className = "vp-container";
    if (typeof props.padding === "number") element.style.padding = `${props.padding}px`;
    if (props.width === null) element.style.removeProperty("width");
    else if (typeof props.width === "number") element.style.width = `${props.width}px`;
  }
}
