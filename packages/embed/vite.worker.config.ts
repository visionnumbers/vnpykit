import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL("../runtime-pyodide/src/worker.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "worker.js",
    },
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
  },
});
