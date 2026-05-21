import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import {
  parseFrontendBuildEnv,
  parseFrontendDevServerEnv,
} from "./src/config/env.schema";

const rootDir = path.resolve(__dirname, "../..");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default defineConfig(({ mode, command }) => {
  const rawEnv = loadEnv(mode, rootDir, "");
  const env = parseFrontendBuildEnv(rawEnv);
  const devEnv = parseFrontendDevServerEnv(rawEnv);

  const shouldProxyApi =
    command === "serve" &&
    !env.useMockApi &&
    env.apiBaseUrl.startsWith("/");

  if (shouldProxyApi && !devEnv.devApiProxyTarget) {
    throw new Error(
      "Frontend dev server environment validation failed:\n" +
        "- VITE_DEV_API_PROXY_TARGET is required when VITE_API_BASE_URL is a relative path and VITE_USE_MOCK_API=false. " +
        "Set it to the local backend origin, for example http://localhost:42069. This variable is not used for production builds.",
    );
  }

  const apiBasePattern = new RegExp(`^${escapeRegExp(env.apiBaseUrl)}`);

  return {
    envDir: rootDir,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: devEnv.frontendPort ?? 5173,
      proxy: shouldProxyApi && devEnv.devApiProxyTarget
        ? {
            "/api/gateful": {
              target: devEnv.devApiProxyTarget,
              changeOrigin: true,
            },
            [env.apiBaseUrl]: {
              target: devEnv.devApiProxyTarget,
              changeOrigin: true,
              rewrite: (p) => p.replace(apiBasePattern, "") || "/",
            },
          }
        : undefined,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
    },
  };
});
