import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { parseFrontendBuildEnv } from "./src/config/env.schema";

const rootDir = path.resolve(__dirname, "../..");
parseFrontendBuildEnv(loadEnv(process.env.NODE_ENV ?? "test", rootDir, ""));

export default defineConfig({
  envDir: rootDir,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
