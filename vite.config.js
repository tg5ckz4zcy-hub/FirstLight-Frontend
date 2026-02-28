import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Local dev: proxy API calls to backend
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  // In production, VITE_API_URL is injected by Railway
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || ""),
  },
});
