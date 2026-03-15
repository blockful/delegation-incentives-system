import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const rootDir = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const frontendPort = parseInt(env.FRONTEND_PORT) || 5173;
  const backendPort = parseInt(env.BACKEND_PORT) || 3000;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: frontendPort,
      proxy: {
        "/api": {
          target: `http://localhost:${backendPort}`,
          rewrite: (p) => p.replace(/^\/api/, ""),
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
    },
  };
});
