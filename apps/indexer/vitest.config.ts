import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "ponder:registry": new URL("./src/__mocks__/ponder-registry.ts", import.meta.url).pathname,
      "ponder:schema": new URL("./src/__mocks__/ponder-schema.ts", import.meta.url).pathname,
    },
  },
})
