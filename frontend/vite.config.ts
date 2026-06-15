import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev server proxies /api to the FastAPI backend so the client talks to it
// same-origin (no CORS surprises, no hard-coded localhost port in the client).
export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: {
      resolveDependencies(_, deps) {
        return deps.filter((dep) => !dep.includes("charts-"));
      },
    },
    rollupOptions: {
      output: {
        // Split stable libraries into their own long-cacheable chunks so an
        // app-code change does not bust the vendor cache.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("@tanstack")) return "query";
          if (
            id.includes("react-router") ||
            id.includes("react-dom") ||
            id.includes("/react/") ||
            id.includes("scheduler")
          ) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
});
