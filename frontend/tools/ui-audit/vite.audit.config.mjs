// Vite config for the UI audit only: serves the real frontend, proxies /api to
// the mock API and seeds a fake session token so protected pages render.
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

const lang = process.env.AUDIT_LANG || "vi";

export default {
  root: fileURLToPath(new URL("../..", import.meta.url)),
  plugins: [
    react(),
    {
      name: "audit-session",
      transformIndexHtml(html) {
        return html.replace(
          "<head>",
          `<head><script>if(location.search.includes("notoken")){localStorage.removeItem("vispend_token")}else{localStorage.setItem("vispend_token","mock-token")}localStorage.setItem("vispend_lang","${lang}");</script>`,
        );
      },
    },
  ],
  server: {
    port: Number(process.env.AUDIT_PORT || 5179),
    strictPort: true,
    proxy: { "/api": { target: `http://127.0.0.1:${process.env.MOCK_PORT || 5181}`, changeOrigin: true } },
  },
};
