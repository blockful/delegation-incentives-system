import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "vitest";
import api from "../src/api/index.js";

it("emits OpenAPI spec to apps/frontend/openapi.json", () => {
  const doc = (
    api as unknown as { getOpenAPI31Document(config: object): unknown }
  ).getOpenAPI31Document({
    openapi: "3.0.0",
    info: {
      title: "ENS Delegation Incentives API",
      version: "1.0.0",
      description:
        "API for the ENS delegation incentives system — active voters, eligibility, reward estimates, APY, tiers, rounds, and distribution history.",
    },
  });

  const here = dirname(fileURLToPath(import.meta.url));
  const outputPath = resolve(here, "../../frontend/openapi.json");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(doc, null, 2)}\n`);
});
