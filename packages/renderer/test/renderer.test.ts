// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createRenderer } from "../src/index.js";
import type { PatchBatch, UiSnapshot } from "@visionpy/protocol";

function snapshot(appId = "app_1", generation = "generation_1"): UiSnapshot {
  return {
    protocol: 1,
    appId,
    generation,
    seq: 1,
    type: "UI_SNAPSHOT",
    payload: {
      title: "Counter",
      root: {
        id: "1",
        kind: "column",
        props: { gap: 8, align: "stretch" },
        children: [
          { id: "2", kind: "text", props: { text: "Count: 0", level: "body", tone: "default" }, children: [] },
          { id: "3", kind: "button", props: { text: "Increase", disabled: false }, events: { click: "1" }, children: [] },
        ],
      },
    },
  };
}

function patch(changes: PatchBatch["payload"]["changes"], seq = 2): PatchBatch {
  return { protocol: 1, appId: "app_1", generation: "generation_1", seq, type: "PATCH_BATCH", payload: { changes } };
}

describe("renderer", () => {
  it("renders text literally and normalizes a single click", () => {
    const mount = document.createElement("div");
    const renderer = createRenderer({ mount, appId: "app_1", generation: "generation_1" });
    const events: unknown[] = [];
    renderer.onUserEvent((event) => events.push(event));
    renderer.mount(snapshot());
    const shadow = mount.querySelector(".vp-owner")?.shadowRoot;
    expect(shadow?.textContent).toContain("Count: 0");
    shadow?.querySelector("button")?.click();
    expect(events).toEqual([{ handlerId: "1", nodeId: "3", event: "click" }]);
    renderer.patch(patch([{ id: "2", props: { text: '<img src=x onerror="bad">' } }]));
    expect(shadow?.querySelector("img")).toBeNull();
    expect(shadow?.querySelector("p")?.textContent).toBe('<img src=x onerror="bad">');
  });

  it("validates a whole patch before changing DOM", () => {
    const mount = document.createElement("div");
    const renderer = createRenderer({ mount, appId: "app_1", generation: "generation_1" });
    renderer.mount(snapshot());
    expect(() => renderer.patch(patch([{ id: "2", props: { text: "changed" } }, { id: "999", props: {} }]))).toThrow(/unknown node/u);
    expect(mount.querySelector(".vp-owner")?.shadowRoot?.querySelector("p")?.textContent).toBe("Count: 0");
  });

  it("rejects stale ownership and leaves sibling roots intact on disposal", () => {
    const host = document.createElement("div");
    const firstMount = document.createElement("div");
    const secondMount = document.createElement("div");
    host.append(firstMount, secondMount);
    const first = createRenderer({ mount: firstMount, appId: "app_1", generation: "generation_1" });
    const second = createRenderer({ mount: secondMount, appId: "app_2", generation: "generation_2" });
    first.mount(snapshot());
    second.mount(snapshot("app_2", "generation_2"));
    expect(() => first.patch({ ...patch([], 2), generation: "old" })).toThrow(/stale ownership/u);
    first.dispose();
    first.dispose();
    expect(firstMount.children).toHaveLength(0);
    expect(secondMount.children).toHaveLength(1);
    second.dispose();
  });

  it("renders accessible controlled forms and emits typed values", () => {
    const mount = document.createElement("div");
    document.body.append(mount);
    const renderer = createRenderer({ mount, appId: "app_1", generation: "generation_1" });
    const events: unknown[] = [];
    renderer.onUserEvent((event) => events.push(event));
    const form = snapshot();
    form.payload.root.events = { submit: "4" };
    form.payload.root.children = [
      { id: "2", kind: "textInput", props: { label: "Name", value: "", placeholder: "Your name", disabled: false, required: true, error: null }, events: { input: "2" }, children: [] },
      { id: "3", kind: "checkbox", props: { label: "Accept", checked: false, disabled: false, required: false, error: null }, events: { change: "3" }, children: [] },
      { id: "4", kind: "button", props: { text: "Submit", disabled: false, submit: true }, children: [] },
    ];
    renderer.mount(form);
    const shadow = mount.querySelector(".vp-owner")?.shadowRoot;
    const text = shadow?.querySelector<HTMLInputElement>('input[type="text"]');
    const check = shadow?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(text?.labels?.[0]?.textContent).toBe("Name");
    expect(check?.labels?.[0]?.textContent).toBe("Accept");
    if (text === null || text === undefined || check === null || check === undefined) throw new Error("form controls missing");
    text.value = "Ada";
    text.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    check.checked = true;
    check.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    shadow?.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, composed: true, cancelable: true }));
    expect(events).toEqual([
      { handlerId: "2", nodeId: "2", event: "input", value: "Ada" },
      { handlerId: "3", nodeId: "3", event: "change", value: true },
      { handlerId: "4", nodeId: "1", event: "submit" },
    ]);
    expect(renderer.focus("2")).toBe(true);
    renderer.patch(patch([{ id: "2", props: { value: "Grace", error: "Required" } }]));
    expect(text.value).toBe("Ada");
    expect(text.getAttribute("aria-invalid")).toBe("true");
    expect(shadow?.getElementById(text.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Required");
    text.blur();
    expect(text.value).toBe("Grace");
  });

  it("shows loading and fatal failure states", () => {
    const mount = document.createElement("div");
    const renderer = createRenderer({ mount, appId: "app_1", generation: "generation_1" });
    const shadow = mount.querySelector(".vp-owner")?.shadowRoot;
    expect(shadow?.querySelector('[role="status"]')?.textContent).toContain("Loading");
    renderer.showFailure("BOOT_FAILED: unavailable");
    expect(shadow?.querySelector('[role="alert"]')?.textContent).toContain("unavailable");
  });
});
