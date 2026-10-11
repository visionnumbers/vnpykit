import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        plain: resolve(import.meta.dirname, "index.html"),
        react: resolve(import.meta.dirname, "react.html"),
        vue: resolve(import.meta.dirname, "vue.html"),
      },
    },
  },
});
