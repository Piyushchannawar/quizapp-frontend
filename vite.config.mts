import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Used only when the client uses baseURL "/api" (see VITE_USE_LOCAL_API in api.js).
    proxy: {
      "/api": "http://localhost:5000"
    }
  }
});

