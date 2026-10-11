import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { mount } from "./host.js";

globalThis.reactReady = undefined;

function Host() {
  const container = useRef(null);
  useEffect(() => {
    const app = mount(container.current);
    globalThis.reactApp = app;
    globalThis.reactReady = app.ready;
    return () => { void app.dispose(); };
  }, []);
  return React.createElement("div", { id: "react-app", ref: container });
}

globalThis.reactRoot = createRoot(document.querySelector("#react-root"));
globalThis.reactRoot.render(React.createElement(Host));
