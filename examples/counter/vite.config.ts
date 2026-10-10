import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VISIONPY_BASE_URL ?? "/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    strictPort: true,
  },
});

