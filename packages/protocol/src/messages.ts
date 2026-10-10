export const PROTOCOL_MAJOR = 1 as const;

export const LIMITS = {
  maxMessageBytes: 256 * 1024,
  maxNodesPerSnapshot: 2_000,
  maxTreeDepth: 32,
  maxPropsPerNode: 24,
  maxPatchesPerBatch: 1_000,
  maxTextLength: 20_000,
  maxEventsPerSecondPerApp: 100,
  maxPendingEvents: 200,
} as const;

export const MESSAGE_TYPES = [
  "RUNTIME_READY",
  "UI_SNAPSHOT",
  "PATCH_BATCH",
  "USER_EVENT",
  "RENDER_ACK",
  "ERROR",
  "STOP_REQUEST",
  "STOP_ACK",
  "DISPOSE_REQUEST",
  "DISPOSE_ACK",
] as const;

export const ERROR_CODES = [
  "BOOT_FAILED",
  "PYTHON_EXCEPTION",
  "CALLBACK_ERROR",
  "INVALID_MESSAGE",
  "PROTOCOL_MISMATCH",
  "UNKNOWN_HANDLER",
  "RENDER_ERROR",
  "REACTIVITY_LOOP",
  "TIMEOUT",
  "DISPOSED",
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];
export type ErrorCode = (typeof ERROR_CODES)[number];
export type ErrorPhase = "bootstrap" | "build" | "callback" | "render" | "protocol";
export type AppId = string;
export type Generation = string;
export type NodeId = string;
export type HandlerId = string;
export type Scalar = string | number | boolean | null;
export type WidgetKind = "column" | "row" | "container" | "text" | "button" | "textInput" | "checkbox";
export type EventKind = "click" | "input" | "change";

export interface Envelope<T extends MessageType, P> {
  protocol: typeof PROTOCOL_MAJOR;
  appId: AppId;
  generation: Generation;
  seq: number;
  type: T;
  payload: P;
}

export interface VNode {
  id: NodeId;
  kind: WidgetKind;
  props: Record<string, Scalar>;
  events?: Partial<Record<EventKind, HandlerId>>;
  children: VNode[];
}

export interface PropPatch {
  id: NodeId;
  props: Record<string, Scalar>;
}

export type RuntimeReady = Envelope<"RUNTIME_READY", { sdkVersion: string; protocolMajor: 1 }>;
export type UiSnapshot = Envelope<"UI_SNAPSHOT", { root: VNode; title: string }>;
export type PatchBatch = Envelope<"PATCH_BATCH", { changes: PropPatch[] }>;
export type UserEvent = Envelope<"USER_EVENT", {
  handlerId: HandlerId;
  nodeId: NodeId;
  event: EventKind;
  value?: string | boolean;
}>;
export type RenderAck = Envelope<"RENDER_ACK", { ackSeq: number }>;
export type ErrorMessage = Envelope<"ERROR", {
  code: ErrorCode;
  message: string;
  phase: ErrorPhase;
  fatal: boolean;
}>;
export type StopRequest = Envelope<"STOP_REQUEST", Record<string, never>>;
export type StopAck = Envelope<"STOP_ACK", Record<string, never>>;
export type DisposeRequest = Envelope<"DISPOSE_REQUEST", Record<string, never>>;
export type DisposeAck = Envelope<"DISPOSE_ACK", Record<string, never>>;

export type ProtocolMessage =
  | RuntimeReady
  | UiSnapshot
  | PatchBatch
  | UserEvent
  | RenderAck
  | ErrorMessage
  | StopRequest
  | StopAck
  | DisposeRequest
  | DisposeAck;

