import {
  EventBudget, LIMITS, ProtocolValidationError, validatePatchBatch, validatePropsForKind,
  validateSnapshot, type EventKind, type PatchBatch, type Scalar, type UiSnapshot,
  type UserEvent, type VNode, type WidgetKind,
} from "@vnpykit/protocol";

export interface Renderer {
  mount(snapshot: UiSnapshot): void;
  patch(batch: PatchBatch): void;
  onUserEvent(listener: (event: UserEvent["payload"]) => void): () => void;
  showLoading(message?: string): void;
  showFailure(message: string): void;
  focus(nodeId: string): boolean;
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
  control?: HTMLInputElement;
  label?: HTMLLabelElement;
  error?: HTMLSpanElement;
  serverValue?: string;
}

interface EventBinding { nodeId: string; handlers: Partial<Record<EventKind, string>>; }

const STYLES = `
:host { color-scheme: light dark; font-family: system-ui, sans-serif; }
.vp-root { box-sizing: border-box; color: CanvasText; background: Canvas; }
.vp-column, .vp-row { display: flex; }
.vp-column { flex-direction: column; }
.vp-row { flex-direction: row; flex-wrap: wrap; }
.vp-container { box-sizing: border-box; }
.vp-text { margin: 0; }
.vp-text--muted { color: CanvasText; color: color-mix(in srgb, CanvasText 72%, Canvas); }
.vp-button, .vp-input { font: inherit; }
.vp-button { padding: .5rem .8rem; cursor: pointer; }
.vp-button:disabled { cursor: default; opacity: .6; }
.vp-field { display: grid; gap: .3rem; }
.vp-field-label { font-weight: 600; }
.vp-input { box-sizing: border-box; min-width: 12rem; padding: .5rem .6rem; border: 1px solid GrayText; border-radius: .25rem; }
.vp-check-label { display: inline-flex; align-items: center; gap: .45rem; cursor: pointer; }
.vp-error { color: #b42318; font-size: .875rem; }
.vp-status { padding: .75rem; color: CanvasText; color: color-mix(in srgb, CanvasText 72%, Canvas); }
.vp-failure { padding: .75rem; color: #b42318; border: 1px solid currentColor; border-radius: .25rem; }
.vp-button:focus-visible, .vp-input:focus-visible, .vp-checkbox:focus-visible { outline: 3px solid Highlight; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; } }
`;

export function createRenderer(options: RendererOptions): Renderer {
  let disposed = false;
  let mounted = false;
  let lastWorkerSeq = -1;
  const nodes = new Map<string, RenderedNode>();
  const eventBindings = new WeakMap<EventTarget, EventBinding>();
  const listeners = new Set<(event: UserEvent["payload"]) => void>();
  const eventBudget = new EventBudget();
  const owner = document.createElement("div");
  owner.className = "vp-owner";
  owner.setAttribute("data-vnpykit-root", "");
  const shadow = owner.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = STYLES;
  const status = document.createElement("div");
  status.className = "vp-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const root = document.createElement("div");
  root.className = "vp-root";
  root.setAttribute("data-theme", options.theme ?? "system");
  shadow.append(style, status, root);
  options.mount.append(owner);

  const emit = (browserEvent: Event): void => {
    if (disposed) return;
    const eventKind = browserEvent.type as EventKind;
    for (const target of browserEvent.composedPath()) {
      const binding = eventBindings.get(target);
      const handlerId = binding?.handlers[eventKind];
      if (binding === undefined || handlerId === undefined) continue;
      if (eventKind === "submit") browserEvent.preventDefault();
      if (!eventBudget.tryEnqueue(performance.now())) return;
      const payload: UserEvent["payload"] = {
        handlerId, nodeId: binding.nodeId, event: eventKind, ...eventValue(target, eventKind),
      };
      try { for (const listener of listeners) listener(payload); }
      finally { eventBudget.complete(); }
      return;
    }
  };
  for (const event of ["click", "input", "change", "submit"] as const) shadow.addEventListener(event, emit);

  const assertOwner = (message: UiSnapshot | PatchBatch): void => {
    if (message.appId !== options.appId || message.generation !== options.generation) {
      throw new ProtocolValidationError("SESSION_MISMATCH", "renderer message has stale ownership");
    }
    if (message.seq <= lastWorkerSeq) throw new ProtocolValidationError("SEQUENCE_ERROR", "renderer message sequence is stale", "$.seq");
  };

  const buildNode = (node: VNode): HTMLElement => {
    let rendered: RenderedNode;
    if (node.kind === "text") {
      rendered = { kind: node.kind, element: document.createElement(node.props.level === "h1" ? "h1" : node.props.level === "h2" ? "h2" : "p") };
    } else if (node.kind === "button") {
      rendered = { kind: node.kind, element: document.createElement("button") };
    } else if (node.kind === "column") {
      rendered = { kind: node.kind, element: document.createElement(node.events?.submit === undefined ? "div" : "form") };
    } else if (node.kind === "row" || node.kind === "container") {
      rendered = { kind: node.kind, element: document.createElement(node.kind === "container" ? "section" : "div") };
    } else if (node.kind === "textInput") {
      rendered = buildTextInput(node.id);
    } else {
      rendered = buildCheckbox(node.id);
    }
    applyProps(rendered, node.props);
    nodes.set(node.id, rendered);
    const eventTarget = rendered.control ?? rendered.element;
    if (node.events !== undefined) eventBindings.set(eventTarget, { nodeId: node.id, handlers: { ...node.events } });
    for (const child of node.children) rendered.element.append(buildNode(child));
    return rendered.element;
  };

  const renderer: Renderer = {
    mount(input): void {
      if (disposed) throw new Error("renderer is disposed");
      if (mounted) throw new Error("renderer is already mounted");
      const snapshot = validateSnapshot(input);
      assertOwner(snapshot);
      root.append(buildNode(snapshot.payload.root));
      status.hidden = true;
      lastWorkerSeq = snapshot.seq;
      mounted = true;
    },
    patch(input): void {
      if (disposed || !mounted) throw new Error("renderer is not mounted");
      const batch = validatePatchBatch(input);
      assertOwner(batch);
      const validated = batch.payload.changes.map((change) => {
        const rendered = nodes.get(change.id);
        if (rendered === undefined) throw new ProtocolValidationError("OWNERSHIP_ERROR", `patch targets unknown node ${change.id}`);
        return { rendered, props: validatePropsForKind(rendered.kind, change.props, { partial: true }) };
      });
      for (const item of validated) applyProps(item.rendered, item.props);
      lastWorkerSeq = batch.seq;
    },
    onUserEvent(listener): () => void { listeners.add(listener); return () => listeners.delete(listener); },
    showLoading(message = "Loading Python application…"): void {
      if (disposed || mounted) return;
      status.hidden = false; status.className = "vp-status"; status.setAttribute("role", "status"); status.textContent = message;
    },
    showFailure(message): void {
      if (disposed) return;
      status.hidden = false; status.className = "vp-failure"; status.setAttribute("role", "alert"); status.textContent = message;
    },
    focus(nodeId): boolean {
      const rendered = nodes.get(nodeId);
      const target = rendered?.control ?? rendered?.element;
      if (target === undefined || disposed) return false;
      target.focus();
      return shadow.activeElement === target;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const event of ["click", "input", "change", "submit"] as const) shadow.removeEventListener(event, emit);
      listeners.clear(); nodes.clear(); owner.remove();
    },
  };
  renderer.showLoading();
  return renderer;

  function buildTextInput(nodeId: string): RenderedNode {
    const element = document.createElement("div");
    const label = document.createElement("label");
    const control = document.createElement("input");
    const error = document.createElement("span");
    const controlId = `${options.appId}-field-${nodeId}`;
    control.type = "text"; control.id = controlId; control.maxLength = LIMITS.maxTextLength; label.htmlFor = controlId;
    error.id = `${controlId}-error`; error.className = "vp-error"; error.setAttribute("role", "alert");
    element.append(label, control, error);
    const rendered: RenderedNode = { kind: "textInput", element, control, label, error };
    control.addEventListener("blur", () => {
      if (rendered.serverValue !== undefined && control.value !== rendered.serverValue) {
        control.value = rendered.serverValue;
      }
    });
    return rendered;
  }

  function buildCheckbox(nodeId: string): RenderedNode {
    const element = document.createElement("div");
    const label = document.createElement("label");
    const control = document.createElement("input");
    const labelText = document.createElement("span");
    const error = document.createElement("span");
    const controlId = `${options.appId}-field-${nodeId}`;
    control.type = "checkbox"; control.id = controlId; label.htmlFor = controlId; label.append(control, labelText);
    error.id = `${controlId}-error`; error.className = "vp-error"; error.setAttribute("role", "alert");
    element.append(label, error);
    return { kind: "checkbox", element, control, label, error };
  }
}

function eventValue(target: EventTarget, event: EventKind): { value?: string | boolean } {
  if (event === "click" || event === "submit") return {};
  if (!(target instanceof HTMLInputElement)) throw new ProtocolValidationError("INVALID_MESSAGE", "form event target is not an input");
  return { value: target.type === "checkbox" ? target.checked : target.value };
}

function applyProps(rendered: RenderedNode, props: Record<string, Scalar>): void {
  const { element, kind } = rendered;
  if (kind === "text") {
    element.className = props.tone === "muted" ? "vp-text vp-text--muted" : "vp-text";
    if (typeof props.text === "string") element.textContent = props.text;
  } else if (kind === "button") {
    const button = element as HTMLButtonElement;
    button.className = "vp-button";
    if (typeof props.text === "string") button.textContent = props.text;
    if (typeof props.disabled === "boolean") button.disabled = props.disabled;
    if (typeof props.submit === "boolean") button.type = props.submit ? "submit" : "button";
    else if (button.type === "submit") button.type = "button";
  } else if (kind === "column" || kind === "row") {
    element.className = kind === "column" ? "vp-column" : "vp-row";
    if (typeof props.gap === "number") element.style.gap = `${props.gap}px`;
    if (typeof props.align === "string") element.style.alignItems = props.align === "start" || props.align === "end" ? `flex-${props.align}` : props.align;
  } else if (kind === "container") {
    element.className = "vp-container";
    if (typeof props.padding === "number") element.style.padding = `${props.padding}px`;
    if (props.width === null) element.style.removeProperty("width");
    else if (typeof props.width === "number") element.style.width = `${props.width}px`;
  } else applyFormProps(rendered, props);
}

function applyFormProps(rendered: RenderedNode, props: Record<string, Scalar>): void {
  const { control, error, label } = rendered;
  if (control === undefined || error === undefined || label === undefined) return;
  rendered.element.className = "vp-field";
  if (rendered.kind === "textInput") {
    label.className = "vp-field-label";
    if (typeof props.label === "string") label.textContent = props.label;
    control.className = "vp-input";
    if (typeof props.value === "string") {
      rendered.serverValue = props.value;
      if (!isFocused(control) && control.value !== props.value) control.value = props.value;
    }
    if (typeof props.placeholder === "string") control.placeholder = props.placeholder;
  } else {
    label.className = "vp-check-label"; control.className = "vp-checkbox";
    const text = label.querySelector("span");
    if (text !== null && typeof props.label === "string") text.textContent = props.label;
    if (typeof props.checked === "boolean") control.checked = props.checked;
  }
  if (typeof props.disabled === "boolean") control.disabled = props.disabled;
  if (typeof props.required === "boolean") control.required = props.required;
  const errorText = typeof props.error === "string" ? props.error : "";
  error.textContent = errorText; error.hidden = errorText.length === 0;
  control.setAttribute("aria-invalid", String(errorText.length > 0));
  if (errorText.length > 0) control.setAttribute("aria-describedby", error.id);
  else control.removeAttribute("aria-describedby");
}

function isFocused(control: HTMLInputElement): boolean {
  const root = control.getRootNode();
  return root instanceof ShadowRoot && root.activeElement === control;
}
