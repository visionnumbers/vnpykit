import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EventBudget,
  LifecycleSequenceGuard,
  LIMITS,
  PROTOCOL_MAJOR,
  ProtocolSessionValidator,
  ProtocolValidationError,
  parseEnvelope,
  validatePatchBatch,
  validateSnapshot,
  validateUserEvent,
  type UiSnapshot,
} from "../src/index.js";

const envelope = (type: string, payload: unknown, seq = 0): Record<string, unknown> => ({
  protocol: PROTOCOL_MAJOR,
  appId: "app_1",
  generation: "generation_1",
  seq,
  type,
  payload,
});

const snapshot = (seq = 0): UiSnapshot => ({
  protocol: PROTOCOL_MAJOR,
  appId: "app_1",
  generation: "generation_1",
  seq,
  type: "UI_SNAPSHOT",
  payload: {
    title: "Fixture",
    root: {
      id: "1",
      kind: "column",
      props: { gap: 8, align: "stretch" },
      children: [{ id: "2", kind: "button", props: { text: "Run", disabled: false }, events: { click: "1" }, children: [] }],
    },
  },
});

describe("protocol envelope", () => {
  it("accepts and rejects the checked-in contract fixtures", () => {
    const validPath = fileURLToPath(new URL("../fixtures/valid/ui-snapshot.json", import.meta.url));
    const invalidPath = fileURLToPath(new URL("../fixtures/invalid/protocol-mismatch.json", import.meta.url));
    expect(validateSnapshot(JSON.parse(readFileSync(validPath, "utf8"))).type).toBe("UI_SNAPSHOT");
    expect(() => parseEnvelope(JSON.parse(readFileSync(invalidPath, "utf8")))).toThrow(/unsupported protocol/u);
  });

  it("accepts every lifecycle and error contract", () => {
    expect(parseEnvelope(envelope("RUNTIME_READY", { sdkVersion: "0.1.0a1", protocolMajor: 1 })).type).toBe("RUNTIME_READY");
    expect(parseEnvelope(envelope("RENDER_ACK", { ackSeq: 2 })).type).toBe("RENDER_ACK");
    expect(parseEnvelope(envelope("ERROR", { code: "BOOT_FAILED", message: "failed", phase: "bootstrap", fatal: true })).type).toBe("ERROR");
    for (const type of ["STOP_REQUEST", "STOP_ACK", "DISPOSE_REQUEST", "DISPOSE_ACK"]) expect(parseEnvelope(envelope(type, {})).type).toBe(type);
  });

  it("rejects protocol mismatches, unknown discriminators, and extra keys", () => {
    expect(() => parseEnvelope({ ...envelope("STOP_REQUEST", {}), protocol: "visionpy/1" })).toThrowError(ProtocolValidationError);
    expect(() => parseEnvelope(envelope("ui.snapshot", {}))).toThrow(/unknown message type/u);
    expect(() => parseEnvelope({ ...envelope("STOP_REQUEST", {}), requestId: "old-shape" })).toThrow(/unexpected key/u);
  });

  it("rejects oversized and cyclic messages", () => {
    expect(() => parseEnvelope(envelope("ERROR", { code: "INVALID_MESSAGE", message: "x".repeat(LIMITS.maxMessageBytes), phase: "protocol", fatal: false }))).toThrow(/byte limit/u);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => parseEnvelope(cyclic)).toThrow(/cyclic/u);
  });
});

describe("snapshots", () => {
  it("accepts a bounded allowlisted component tree", () => {
    expect(validateSnapshot(snapshot()).payload.root.children[0]?.kind).toBe("button");
  });

  it("rejects unknown props, duplicate ids, and excessive depth", () => {
    const badProp = snapshot();
    badProp.payload.root.props = { gap: 8, align: "stretch", html: "<b>bad</b>" };
    expect(() => validateSnapshot(badProp)).toThrow(/not allowed/u);

    const duplicate = snapshot();
    const duplicateChild = duplicate.payload.root.children[0];
    if (duplicateChild === undefined) throw new Error("fixture child is missing");
    duplicateChild.id = "1";
    expect(() => validateSnapshot(duplicate)).toThrow(/duplicate node/u);

    let root: Record<string, unknown> = { id: "99", kind: "text", props: { text: "deep", level: "body", tone: "default" }, children: [] };
    for (let depth = 0; depth < LIMITS.maxTreeDepth; depth += 1) root = { id: String(98 - depth), kind: "column", props: { gap: 0, align: "stretch" }, children: [root] };
    expect(() => validateSnapshot(envelope("UI_SNAPSHOT", { title: "deep", root }))).toThrow(/depth limit/u);
  });

  it("enforces node and text limits", () => {
    const children = Array.from({ length: LIMITS.maxNodesPerSnapshot }, (_, index) => ({
      id: String(index + 2),
      kind: "text",
      props: { text: "x", level: "body", tone: "default" },
      children: [],
    }));
    const tooManyNodes = envelope("UI_SNAPSHOT", {
      title: "large",
      root: { id: "1", kind: "column", props: { gap: 0, align: "stretch" }, children },
    });
    expect(() => validateSnapshot(tooManyNodes)).toThrow(/node count/u);

    const tooMuchText = snapshot();
    const child = tooMuchText.payload.root.children[0];
    if (child === undefined) throw new Error("fixture child is missing");
    child.props.text = "x".repeat(LIMITS.maxTextLength + 1);
    expect(() => validateSnapshot(tooMuchText)).toThrow(/string exceeds/u);
  });

  it("rejects prototype-polluting keys", () => {
    const polluted = snapshot() as unknown as Record<string, unknown>;
    const payload = polluted.payload as Record<string, unknown>;
    const root = payload.root as Record<string, unknown>;
    root.props = JSON.parse('{"gap":8,"align":"stretch","__proto__":"bad"}') as unknown;
    expect(() => validateSnapshot(polluted)).toThrow(/forbidden key/u);
  });
});

describe("patches and events", () => {
  it("validates typed event variants", () => {
    expect(validateUserEvent(envelope("USER_EVENT", { handlerId: "1", nodeId: "2", event: "click" })).payload.event).toBe("click");
    expect(() => validateUserEvent(envelope("USER_EVENT", { handlerId: "1", nodeId: "2", event: "input", value: true }))).toThrow(/string value/u);
    expect(() => validateUserEvent(envelope("USER_EVENT", { handlerId: "1", nodeId: "2", event: "click", value: "x" }))).toThrow(/must not carry/u);
  });

  it("enforces patch count", () => {
    const changes = Array.from({ length: LIMITS.maxPatchesPerBatch + 1 }, (_, index) => ({ id: String(index + 1), props: {} }));
    expect(() => validatePatchBatch(envelope("PATCH_BATCH", { changes }))).toThrow(/patch count/u);
  });

  it("checks session, sequence, node, and callback ownership", () => {
    const session = new ProtocolSessionValidator({ appId: "app_1", generation: "generation_1" });
    session.accept(snapshot(0));
    session.accept(envelope("USER_EVENT", { handlerId: "1", nodeId: "2", event: "click" }, 1));
    session.accept(envelope("PATCH_BATCH", { changes: [{ id: "2", props: { text: "Done" } }] }, 2));
    expect(() => session.accept(envelope("PATCH_BATCH", { changes: [] }, 2))).toThrow(/expected sequence/u);

    const wrongOwner = new ProtocolSessionValidator({ appId: "app_1", generation: "generation_1" });
    wrongOwner.accept(snapshot(0));
    expect(() => wrongOwner.accept(envelope("USER_EVENT", { handlerId: "9", nodeId: "2", event: "click" }, 1))).toThrow(/not owned/u);

    const wrongSession = new ProtocolSessionValidator({ appId: "app_1", generation: "generation_1" });
    expect(() => wrongSession.accept({ ...snapshot(0), appId: "app_2" })).toThrow(/another app/u);
  });

  it("rejects out-of-order lifecycle messages", () => {
    const lifecycle = new LifecycleSequenceGuard();
    expect(() => lifecycle.observe(parseEnvelope(envelope("RENDER_ACK", { ackSeq: 1 })))).toThrow(/invalid while lifecycle/u);
    expect(lifecycle.observe(parseEnvelope(envelope("RUNTIME_READY", { sdkVersion: "0.1.0a1", protocolMajor: 1 })))).toBe("awaiting-snapshot");
    expect(lifecycle.observe(snapshot(1))).toBe("awaiting-ack");
    expect(() => lifecycle.observe(parseEnvelope(envelope("RENDER_ACK", { ackSeq: 99 }, 0)))).toThrow(/invalid while lifecycle/u);
    expect(lifecycle.observe(parseEnvelope(envelope("RENDER_ACK", { ackSeq: 1 }, 0)))).toBe("running");
  });

  it("allows disposal before readiness and after fatal failure", () => {
    const beforeReady = new LifecycleSequenceGuard();
    expect(beforeReady.observe(parseEnvelope(envelope("DISPOSE_REQUEST", {})))).toBe("stopping");

    const failed = new LifecycleSequenceGuard();
    failed.observe(parseEnvelope(envelope("ERROR", { code: "BOOT_FAILED", message: "failed", phase: "bootstrap", fatal: true })));
    expect(failed.observe(parseEnvelope(envelope("DISPOSE_REQUEST", {}, 1)))).toBe("stopping");
  });

  it("enforces event rate and pending budgets", () => {
    const budget = new EventBudget();
    for (let index = 0; index < LIMITS.maxEventsPerSecondPerApp; index += 1) expect(budget.tryEnqueue(100)).toBe(true);
    expect(budget.tryEnqueue(100)).toBe(false);
    for (let index = 0; index < LIMITS.maxEventsPerSecondPerApp; index += 1) budget.complete();
    expect(budget.tryEnqueue(1_101)).toBe(true);

    const pendingBudget = new EventBudget();
    for (let index = 0; index < LIMITS.maxEventsPerSecondPerApp; index += 1) expect(pendingBudget.tryEnqueue(0)).toBe(true);
    for (let index = 0; index < LIMITS.maxEventsPerSecondPerApp; index += 1) expect(pendingBudget.tryEnqueue(1_001)).toBe(true);
    expect(pendingBudget.pending).toBe(LIMITS.maxPendingEvents);
    expect(pendingBudget.tryEnqueue(2_002)).toBe(false);
  });
});
