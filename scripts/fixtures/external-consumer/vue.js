import { createApp, h, onBeforeUnmount, onMounted, ref } from "vue";
import { mount } from "./host.js";

let resolveReady;
globalThis.vueReady = new Promise((resolve) => { resolveReady = resolve; });

const Host = {
  setup() {
    const container = ref(null);
    let app;
    onMounted(() => {
      app = mount(container.value);
      globalThis.vueVNPyKitApp = app;
      void app.ready.then(resolveReady);
    });
    onBeforeUnmount(() => { if (app) void app.dispose(); });
    return () => h("div", { id: "vue-app", ref: container });
  },
};

globalThis.vueRoot = createApp(Host);
globalThis.vueRoot.mount("#vue-root");
