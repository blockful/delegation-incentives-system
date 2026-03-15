import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts",
        "src/api/index.ts",
        "src/api/data-source.ts",
        "src/api/types.ts",
        "src/api/adapters/types.ts",
        "src/__mocks__/**",
      ],
    },
  },
  resolve: {
    alias: {
      "ponder:registry": new URL("./src/__mocks__/ponder-registry.ts", import.meta.url).pathname,
      "ponder:schema": new URL("./src/__mocks__/ponder-schema.ts", import.meta.url).pathname,
      "ponder:api": new URL("./src/__mocks__/ponder-api.ts", import.meta.url).pathname,
    },
  },
})
