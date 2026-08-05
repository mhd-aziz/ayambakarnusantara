import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Env konsisten dengan backend: mode 'dev' membaca .env.dev, mode 'prod' membaca .env.prod
// (script npm: dev -> vite --mode dev, build -> vite build --mode prod)
export default defineConfig({
  plugins: [react()],
  // Source asli CRA memakai ekstensi .js untuk file JSX —
  // esbuild perlu tahu agar .js diperlakukan sebagai JSX.
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.js$/,
    exclude: [],
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  build: {
    outDir: "build",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    css: false,
  },
});
