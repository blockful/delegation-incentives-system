import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "vitest";

// The relayer proxy validates these at import time; codegen only needs the
// static OpenAPI spec (relayer routes are plain Hono and not part of it).
process.env.BLOCKFUL_API_TOKEN ||= "codegen-dummy-token";
process.env.GATEFUL_UPSTREAM_URL ||= "https://codegen-dummy.invalid";

const { default: api } = await import("../src/api/index.js");

it("emits OpenAPI spec to apps/frontend/openapi.json", () => {
  const doc = (
    api as unknown as { getOpenAPI31Document(config: object): unknown }
  ).getOpenAPI31Document({
    openapi: "3.0.0",
    info: {
      title: "ENS Delegation Incentives API",
      version: "1.0.0",
      description:
        "API for the ENS delegation incentives system — active voters, eligibility, reward estimates, APR, tiers, rounds, and distribution history.",
    },
  });

  const here = dirname(fileURLToPath(import.meta.url));
  const outputPath = resolve(here, "../../frontend/openapi.json");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(doc, null, 2)}\n`);
});
