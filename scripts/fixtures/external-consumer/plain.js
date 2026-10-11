import { mount } from "./host.js";

const first = mount(document.querySelector("#plain-one"));
let second;
globalThis.vnpykitAcceptance = {
  ready: first.ready.then(() => {
    second = mount(document.querySelector("#plain-two"));
    return second.ready;
  }),
  first,
  get second() { return second; },
  disposeAll: () => Promise.all([first.dispose(), second?.dispose()]),
};
