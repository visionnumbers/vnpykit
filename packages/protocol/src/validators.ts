import { ProtocolValidationError } from "./errors.js";
import {
  ERROR_CODES,
  LIMITS,
  MESSAGE_TYPES,
  PROTOCOL_MAJOR,
  type Envelope,
  type ErrorCode,
  type ErrorMessage,
  type ErrorPhase,
  type EventKind,
  type HandlerId,
  type MessageType,
  type PatchBatch,
  type PropPatch,
  type ProtocolMessage,
  type RenderAck,
  type RuntimeReady,
  type Scalar,
  type UiSnapshot,
  type UserEvent,
  type VNode,
  type WidgetKind,
} from "./messages.js";

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/u;
const POSITIVE_DECIMAL = /^[1-9][0-9]*$/u;
const MESSAGE_TYPE_SET = new Set<string>(MESSAGE_TYPES);
const ERROR_CODE_SET = new Set<string>(ERROR_CODES);
const ERROR_PHASES = new Set<string>(["bootstrap", "build", "callback", "render", "protocol"]);
const WIDGET_KINDS = new Set<string>(["column", "row", "container", "text", "button", "textInput", "checkbox"]);
const EVENT_KINDS = new Set<string>(["click", "input", "change", "submit"]);
const EMPTY_MESSAGE_TYPES = new Set<MessageType>(["STOP_REQUEST", "STOP_ACK", "DISPOSE_REQUEST", "DISPOSE_ACK"]);

function fail(message: string, path = "$", code: ConstructorParameters<typeof ProtocolValidationError>[0] = "INVALID_MESSAGE"): never {
  throw new ProtocolValidationError(code, message, path);
}

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail("expected a plain object", path);
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) fail("object must have a plain or null prototype", path);
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_KEYS.has(key)) fail(`forbidden key: ${key}`, `${path}.${key}`);
  }
  return record;
}

function exactKeys(record: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (!allowedSet.has(key)) fail(`unexpected key: ${key}`, `${path}.${key}`);
  }
  for (const key of allowed) {
    if (!(key in record)) fail(`missing key: ${key}`, `${path}.${key}`);
  }
}

function stringAt(value: unknown, path: string, max: number = LIMITS.maxTextLength): string {
  if (typeof value !== "string") fail("expected a string", path);
  if (value.length > max) fail(`string exceeds ${max} characters`, path, "LIMIT_EXCEEDED");
  return value;
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail("expected a boolean", path);
  return value;
}

function safeIntegerAt(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) fail("expected a nonnegative safe integer", path);
  return value;
}

function identifierAt(value: unknown, path: string): string {
  const result = stringAt(value, path, 64);
  if (!IDENTIFIER.test(result)) fail("expected 1-64 ASCII letters, digits, underscore, or hyphen", path);
  return result;
}

function positiveDecimalAt(value: unknown, path: string): string {
  const result = stringAt(value, path, 32);
  if (!POSITIVE_DECIMAL.test(result)) fail("expected a positive decimal identifier", path);
  return result;
}

function scalarAt(value: unknown, path: string): Scalar {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return stringAt(value, path);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fail("expected a JSON scalar with a finite number", path);
}

function boundedInteger(value: unknown, path: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    fail(`expected an integer in [${minimum}, ${maximum}]`, path);
  }
  return value;
}

function propsAt(value: unknown, kind: WidgetKind | undefined, path: string, partial: boolean): Record<string, Scalar> {
  const record = objectAt(value, path);
  if (Object.keys(record).length > LIMITS.maxPropsPerNode) fail("too many properties", path, "LIMIT_EXCEEDED");
  const result: Record<string, Scalar> = Object.create(null) as Record<string, Scalar>;
  const allowed: Record<WidgetKind, readonly string[]> = {
    text: ["text", "level", "tone"],
    button: ["text", "disabled", "submit"],
    textInput: ["label", "value", "placeholder", "disabled", "required", "error"],
    checkbox: ["label", "checked", "disabled", "required", "error"],
    column: ["gap", "align"],
    row: ["gap", "align"],
    container: ["padding", "width"],
  };
  if (kind !== undefined) {
    for (const key of Object.keys(record)) {
      if (!allowed[kind].includes(key)) fail(`property ${key} is not allowed for ${kind}`, `${path}.${key}`);
    }
    if (!partial) {
      const required: Record<WidgetKind, readonly string[]> = {
        text: ["text", "level", "tone"],
        button: ["text", "disabled"],
        textInput: ["label", "value", "placeholder", "disabled"],
        checkbox: ["label", "checked", "disabled"],
        column: ["gap", "align"],
        row: ["gap", "align"],
        container: ["padding", "width"],
      };
      for (const key of required[kind]) {
        if (!(key in record)) fail(`missing property ${key} for ${kind}`, `${path}.${key}`);
      }
    }
  }
  for (const [key, value] of Object.entries(record)) result[key] = scalarAt(value, `${path}.${key}`);
  if (kind === "text") {
    if ("text" in record) result.text = stringAt(record.text, `${path}.text`);
    if ("level" in record && !["body", "h1", "h2"].includes(String(record.level))) fail("invalid text level", `${path}.level`);
    if ("tone" in record && !["default", "muted"].includes(String(record.tone))) fail("invalid text tone", `${path}.tone`);
  } else if (kind === "button") {
    if ("text" in record) result.text = stringAt(record.text, `${path}.text`);
    if ("disabled" in record) result.disabled = booleanAt(record.disabled, `${path}.disabled`);
    if ("submit" in record) result.submit = booleanAt(record.submit, `${path}.submit`);
  } else if (kind === "textInput") {
    for (const key of ["label", "value", "placeholder"] as const) if (key in record) result[key] = stringAt(record[key], `${path}.${key}`);
    if ("disabled" in record) result.disabled = booleanAt(record.disabled, `${path}.disabled`);
    if ("required" in record) result.required = booleanAt(record.required, `${path}.required`);
    if ("error" in record && record.error !== null) result.error = stringAt(record.error, `${path}.error`);
  } else if (kind === "checkbox") {
    if ("label" in record) result.label = stringAt(record.label, `${path}.label`);
    if ("checked" in record) result.checked = booleanAt(record.checked, `${path}.checked`);
    if ("disabled" in record) result.disabled = booleanAt(record.disabled, `${path}.disabled`);
    if ("required" in record) result.required = booleanAt(record.required, `${path}.required`);
    if ("error" in record && record.error !== null) result.error = stringAt(record.error, `${path}.error`);
  } else if (kind === "column" || kind === "row") {
    if ("gap" in record) result.gap = boundedInteger(record.gap, `${path}.gap`, 0, 64);
    if ("align" in record && !["start", "center", "end", "stretch"].includes(String(record.align))) fail("invalid alignment", `${path}.align`);
  } else if (kind === "container") {
    if ("padding" in record) result.padding = boundedInteger(record.padding, `${path}.padding`, 0, 64);
    if ("width" in record && record.width !== null) result.width = boundedInteger(record.width, `${path}.width`, 0, 4096);
  }
  return result;
}

function eventsAt(value: unknown, kind: WidgetKind, path: string): Partial<Record<EventKind, HandlerId>> {
  const record = objectAt(value, path);
  const allowed = kind === "button" ? ["click"] : kind === "column" ? ["submit"] : kind === "textInput" ? ["input", "change"] : kind === "checkbox" ? ["change"] : [];
  const result: Partial<Record<EventKind, HandlerId>> = {};
  for (const [key, handler] of Object.entries(record)) {
    if (!EVENT_KINDS.has(key) || !allowed.includes(key)) fail(`event ${key} is not allowed for ${kind}`, `${path}.${key}`);
    result[key as EventKind] = positiveDecimalAt(handler, `${path}.${key}`);
  }
  return result;
}

function vnodeAt(value: unknown, path: string, depth: number, seenNodes: Set<string>, seenHandlers: Set<string>): VNode {
  if (depth > LIMITS.maxTreeDepth) fail("tree depth limit exceeded", path, "LIMIT_EXCEEDED");
  if (seenNodes.size >= LIMITS.maxNodesPerSnapshot) fail("node count limit exceeded", path, "LIMIT_EXCEEDED");
  const record = objectAt(value, path);
  const required = record.events === undefined ? ["id", "kind", "props", "children"] : ["id", "kind", "props", "events", "children"];
  exactKeys(record, required, path);
  const id = positiveDecimalAt(record.id, `${path}.id`);
  if (seenNodes.has(id)) fail(`duplicate node id: ${id}`, `${path}.id`, "OWNERSHIP_ERROR");
  seenNodes.add(id);
  const kindValue = stringAt(record.kind, `${path}.kind`, 16);
  if (!WIDGET_KINDS.has(kindValue)) fail(`unknown widget kind: ${kindValue}`, `${path}.kind`);
  const kind = kindValue as WidgetKind;
  const props = propsAt(record.props, kind, `${path}.props`, false);
  let events: Partial<Record<EventKind, HandlerId>> | undefined;
  if (record.events !== undefined) {
    events = eventsAt(record.events, kind, `${path}.events`);
    for (const handler of Object.values(events)) {
      if (handler === undefined) continue;
      if (seenHandlers.has(handler)) fail(`duplicate handler id: ${handler}`, `${path}.events`, "OWNERSHIP_ERROR");
      seenHandlers.add(handler);
    }
  }
  if (!Array.isArray(record.children)) fail("expected an array", `${path}.children`);
  const children = record.children.map((child, index) => vnodeAt(child, `${path}.children[${index}]`, depth + 1, seenNodes, seenHandlers));
  return events === undefined ? { id, kind, props, children } : { id, kind, props, events, children };
}

function envelopeAt(input: unknown): { record: Record<string, unknown>; type: MessageType } {
  assertMessageSize(input);
  const record = objectAt(input, "$");
  exactKeys(record, ["protocol", "appId", "generation", "seq", "type", "payload"], "$");
  if (record.protocol !== PROTOCOL_MAJOR) fail(`unsupported protocol major: ${String(record.protocol)}`, "$.protocol", "PROTOCOL_MISMATCH");
  identifierAt(record.appId, "$.appId");
  identifierAt(record.generation, "$.generation");
  safeIntegerAt(record.seq, "$.seq");
  const typeValue = stringAt(record.type, "$.type", 32);
  if (!MESSAGE_TYPE_SET.has(typeValue)) fail(`unknown message type: ${typeValue}`, "$.type");
  return { record, type: typeValue as MessageType };
}

function baseEnvelope<T extends MessageType>(record: Record<string, unknown>, type: T): Omit<Envelope<T, never>, "payload"> {
  return {
    protocol: PROTOCOL_MAJOR,
    appId: identifierAt(record.appId, "$.appId"),
    generation: identifierAt(record.generation, "$.generation"),
    seq: safeIntegerAt(record.seq, "$.seq"),
    type,
  };
}

function emptyPayload(record: Record<string, unknown>, type: MessageType): ProtocolMessage {
  const payload = objectAt(record.payload, "$.payload");
  exactKeys(payload, [], "$.payload");
  return { ...baseEnvelope(record, type), payload } as ProtocolMessage;
}

export function assertMessageSize(input: unknown): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(input);
  } catch {
    fail("message is cyclic or not JSON serializable", "$", "INVALID_MESSAGE");
  }
  if (serialized === undefined) fail("message is not JSON serializable");
  if (new TextEncoder().encode(serialized).byteLength > LIMITS.maxMessageBytes) fail("message byte limit exceeded", "$", "LIMIT_EXCEEDED");
}

export function parseEnvelope(input: unknown): ProtocolMessage {
  const { record, type } = envelopeAt(input);
  if (EMPTY_MESSAGE_TYPES.has(type)) return emptyPayload(record, type);
  if (type === "RUNTIME_READY") return validateRuntimeReadyRecord(record);
  if (type === "UI_SNAPSHOT") return validateSnapshotRecord(record);
  if (type === "PATCH_BATCH") return validatePatchBatchRecord(record);
  if (type === "USER_EVENT") return validateUserEventRecord(record);
  if (type === "RENDER_ACK") return validateRenderAckRecord(record);
  return validateErrorRecord(record);
}

function validateRuntimeReadyRecord(record: Record<string, unknown>): RuntimeReady {
  const payload = objectAt(record.payload, "$.payload");
  exactKeys(payload, ["sdkVersion", "protocolMajor"], "$.payload");
  if (payload.protocolMajor !== PROTOCOL_MAJOR) fail("runtime protocol major mismatch", "$.payload.protocolMajor", "PROTOCOL_MISMATCH");
  return { ...baseEnvelope(record, "RUNTIME_READY"), payload: { sdkVersion: stringAt(payload.sdkVersion, "$.payload.sdkVersion", 64), protocolMajor: PROTOCOL_MAJOR } };
}

function validateSnapshotRecord(record: Record<string, unknown>): UiSnapshot {
  const payload = objectAt(record.payload, "$.payload");
  exactKeys(payload, ["root", "title"], "$.payload");
  return { ...baseEnvelope(record, "UI_SNAPSHOT"), payload: { root: vnodeAt(payload.root, "$.payload.root", 1, new Set(), new Set()), title: stringAt(payload.title, "$.payload.title", 200) } };
}

function propPatchAt(value: unknown, path: string, kind?: WidgetKind): PropPatch {
  const record = objectAt(value, path);
  exactKeys(record, ["id", "props"], path);
  return { id: positiveDecimalAt(record.id, `${path}.id`), props: propsAt(record.props, kind, `${path}.props`, true) };
}

function validatePatchBatchRecord(record: Record<string, unknown>): PatchBatch {
  const payload = objectAt(record.payload, "$.payload");
  exactKeys(payload, ["changes"], "$.payload");
  if (!Array.isArray(payload.changes)) fail("expected an array", "$.payload.changes");
  if (payload.changes.length > LIMITS.maxPatchesPerBatch) fail("patch count limit exceeded", "$.payload.changes", "LIMIT_EXCEEDED");
  return { ...baseEnvelope(record, "PATCH_BATCH"), payload: { changes: payload.changes.map((change, index) => propPatchAt(change, `$.payload.changes[${index}]`)) } };
}

function validateUserEventRecord(record: Record<string, unknown>): UserEvent {
  const payload = objectAt(record.payload, "$.payload");
  const required = payload.value === undefined ? ["handlerId", "nodeId", "event"] : ["handlerId", "nodeId", "event", "value"];
  exactKeys(payload, required, "$.payload");
  const eventValue = stringAt(payload.event, "$.payload.event", 16);
  if (!EVENT_KINDS.has(eventValue)) fail("unknown event kind", "$.payload.event");
  const event = eventValue as EventKind;
  if ((event === "click" || event === "submit") && payload.value !== undefined) fail(`${event} events must not carry a value`, "$.payload.value");
  if (event === "input" && typeof payload.value !== "string") fail("input events require a string value", "$.payload.value");
  if (event === "change" && typeof payload.value !== "string" && typeof payload.value !== "boolean") fail("change events require a string or boolean value", "$.payload.value");
  const basePayload = { handlerId: positiveDecimalAt(payload.handlerId, "$.payload.handlerId"), nodeId: positiveDecimalAt(payload.nodeId, "$.payload.nodeId"), event };
  const typedPayload = payload.value === undefined ? basePayload : { ...basePayload, value: payload.value as string | boolean };
  return { ...baseEnvelope(record, "USER_EVENT"), payload: typedPayload };
}

function validateRenderAckRecord(record: Record<string, unknown>): RenderAck {
  const payload = objectAt(record.payload, "$.payload");
  exactKeys(payload, ["ackSeq"], "$.payload");
  return { ...baseEnvelope(record, "RENDER_ACK"), payload: { ackSeq: safeIntegerAt(payload.ackSeq, "$.payload.ackSeq") } };
}

function validateErrorRecord(record: Record<string, unknown>): ErrorMessage {
  const payload = objectAt(record.payload, "$.payload");
  exactKeys(payload, ["code", "message", "phase", "fatal"], "$.payload");
  const codeValue = stringAt(payload.code, "$.payload.code", 64);
  if (!ERROR_CODE_SET.has(codeValue)) fail("unknown error code", "$.payload.code");
  const phaseValue = stringAt(payload.phase, "$.payload.phase", 16);
  if (!ERROR_PHASES.has(phaseValue)) fail("unknown error phase", "$.payload.phase");
  return { ...baseEnvelope(record, "ERROR"), payload: { code: codeValue as ErrorCode, message: stringAt(payload.message, "$.payload.message"), phase: phaseValue as ErrorPhase, fatal: booleanAt(payload.fatal, "$.payload.fatal") } };
}

export function validateSnapshot(input: unknown): UiSnapshot {
  const message = parseEnvelope(input);
  if (message.type !== "UI_SNAPSHOT") fail("expected UI_SNAPSHOT", "$.type");
  return message;
}

export function validatePatchBatch(input: unknown): PatchBatch {
  const message = parseEnvelope(input);
  if (message.type !== "PATCH_BATCH") fail("expected PATCH_BATCH", "$.type");
  return message;
}

export function validateUserEvent(input: unknown): UserEvent {
  const message = parseEnvelope(input);
  if (message.type !== "USER_EVENT") fail("expected USER_EVENT", "$.type");
  return message;
}

export function validatePropsForKind(
  kind: WidgetKind,
  input: unknown,
  options: { partial?: boolean } = {},
): Record<string, Scalar> {
  return propsAt(input, kind, "$.props", options.partial ?? false);
}

export interface SessionValidatorOptions {
  appId: string;
  generation: string;
  initialSeq?: number;
}

export class ProtocolSessionValidator {
  readonly #appId: string;
  readonly #generation: string;
  #lastSeq: number;
  readonly #nodes = new Map<string, WidgetKind>();
  readonly #handlers = new Map<string, { nodeId: string; event: EventKind }>();

  public constructor(options: SessionValidatorOptions) {
    this.#appId = identifierAt(options.appId, "options.appId");
    this.#generation = identifierAt(options.generation, "options.generation");
    this.#lastSeq = (options.initialSeq ?? 0) - 1;
  }

  public accept(input: unknown): ProtocolMessage {
    const message = parseEnvelope(input);
    if (message.appId !== this.#appId || message.generation !== this.#generation) fail("message belongs to another app or generation", "$", "SESSION_MISMATCH");
    if (message.seq !== this.#lastSeq + 1) fail(`expected sequence ${this.#lastSeq + 1}, received ${message.seq}`, "$.seq", "SEQUENCE_ERROR");
    if (message.type === "UI_SNAPSHOT") this.#indexSnapshot(message);
    if (message.type === "PATCH_BATCH") this.#validateOwnedPatches(message);
    if (message.type === "USER_EVENT") this.#validateOwnedEvent(message);
    this.#lastSeq = message.seq;
    return message;
  }

  #indexSnapshot(message: UiSnapshot): void {
    this.#nodes.clear();
    this.#handlers.clear();
    const visit = (node: VNode): void => {
      this.#nodes.set(node.id, node.kind);
      for (const [event, handlerId] of Object.entries(node.events ?? {})) {
        if (handlerId !== undefined) this.#handlers.set(handlerId, { nodeId: node.id, event: event as EventKind });
      }
      node.children.forEach(visit);
    };
    visit(message.payload.root);
  }

  #validateOwnedPatches(message: PatchBatch): void {
    for (let index = 0; index < message.payload.changes.length; index += 1) {
      const change = message.payload.changes[index];
      if (change === undefined) continue;
      const kind = this.#nodes.get(change.id);
      if (kind === undefined) fail(`patch targets unknown node ${change.id}`, `$.payload.changes[${index}].id`, "OWNERSHIP_ERROR");
      propsAt(change.props, kind, `$.payload.changes[${index}].props`, true);
    }
  }

  #validateOwnedEvent(message: UserEvent): void {
    const binding = this.#handlers.get(message.payload.handlerId);
    if (binding === undefined || binding.nodeId !== message.payload.nodeId || binding.event !== message.payload.event) {
      fail("event handler, node, and event kind are not owned by this session", "$.payload", "OWNERSHIP_ERROR");
    }
    const kind = this.#nodes.get(message.payload.nodeId);
    if (kind === "checkbox" && typeof message.payload.value !== "boolean") {
      fail("checkbox change events require a boolean value", "$.payload.value");
    }
    if (kind === "textInput" && typeof message.payload.value !== "string") {
      fail("text input events require a string value", "$.payload.value");
    }
  }
}

type LifecycleState = "awaiting-ready" | "awaiting-snapshot" | "awaiting-ack" | "running" | "stopping" | "disposed" | "failed";

/** Validates the cross-direction handshake independently of per-direction sequence guards. */
export class LifecycleSequenceGuard {
  #state: LifecycleState = "awaiting-ready";
  #snapshotSeq: number | undefined;

  public observe(message: ProtocolMessage): LifecycleState {
    if (message.type === "ERROR") {
      if (message.payload.fatal) this.#state = "failed";
      return this.#state;
    }
    if (message.type === "DISPOSE_REQUEST" && this.#state !== "disposed" && this.#state !== "stopping") {
      this.#state = "stopping";
    } else if (this.#state === "awaiting-ready" && message.type === "RUNTIME_READY") {
      this.#state = "awaiting-snapshot";
    } else if (this.#state === "awaiting-snapshot" && message.type === "UI_SNAPSHOT") {
      this.#snapshotSeq = message.seq;
      this.#state = "awaiting-ack";
    } else if (this.#state === "awaiting-ack" && message.type === "RENDER_ACK" && message.payload.ackSeq === this.#snapshotSeq) {
      this.#state = "running";
    } else if (this.#state === "running" && message.type === "STOP_REQUEST") {
      this.#state = "stopping";
    } else if (this.#state === "stopping" && (message.type === "STOP_ACK" || message.type === "DISPOSE_ACK")) {
      this.#state = message.type === "DISPOSE_ACK" ? "disposed" : "running";
    } else if (this.#state === "running" && (message.type === "PATCH_BATCH" || message.type === "USER_EVENT")) {
      return this.#state;
    } else {
      fail(`message ${message.type} is invalid while lifecycle is ${this.#state}`, "$.type", "SEQUENCE_ERROR");
    }
    return this.#state;
  }

  public get state(): LifecycleState {
    return this.#state;
  }
}

export class EventBudget {
  readonly #timestamps: number[] = [];
  #pending = 0;

  public tryEnqueue(nowMs: number): boolean {
    while (this.#timestamps.length > 0 && (this.#timestamps[0] ?? nowMs) <= nowMs - 1_000) this.#timestamps.shift();
    if (this.#pending >= LIMITS.maxPendingEvents || this.#timestamps.length >= LIMITS.maxEventsPerSecondPerApp) return false;
    this.#timestamps.push(nowMs);
    this.#pending += 1;
    return true;
  }

  public complete(): void {
    if (this.#pending > 0) this.#pending -= 1;
  }

  public get pending(): number {
    return this.#pending;
  }
}
