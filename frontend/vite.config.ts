import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Durante o desenvolvimento, as chamadas /api vão para o FastAPI (uvicorn na porta 8000)
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
