import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

const trueforge = process.env.TRUEFORGE_URL ?? "http://localhost:8790";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3001,
    strictPort: true,
    proxy: {
      "/api": {
        target: trueforge,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3001,
    strictPort: true,
    proxy: {
      "/api": {
        target: trueforge,
        changeOrigin: true,
      },
    },
  },
});
