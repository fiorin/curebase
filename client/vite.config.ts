import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3001";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api": apiTarget,
        "/health": apiTarget,
      },
    },
  };
});
