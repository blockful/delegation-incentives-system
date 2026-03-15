import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { serve } from "@hono/node-server";
import { createApi } from "./api/routes.js";
import { envSchema } from "./config.js";
import { InMemoryDataSource } from "./data/in-memory-datasource.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function maskDatabaseUrl(url: string): string {
  return url.replace(/\/\/.*@/, "//***@");
}

async function main() {
  const env = envSchema.parse(process.env);
  const port = env.BACKEND_PORT;
  const baseUrl = `http://localhost:${port}`;

  // TODO: Replace with DrizzleDataSource once PostgreSQL adapter is implemented
  const dataSource = new InMemoryDataSource({});
  const dataSourceLabel = "in-memory (no persistent data)";

  const app = createApi({ dataSource });

  serve({ fetch: app.fetch, port }, (info) => {
    console.log("");
    console.log("  ENS Delegation Incentives API");
    console.log("  ─────────────────────────────────────");
    console.log(`  Status:      RUNNING`);
    console.log(`  URL:         ${baseUrl}`);
    console.log(`  Docs:        ${baseUrl}/docs`);
    console.log(`  Health:      ${baseUrl}/health`);
    console.log(`  Database:    ${maskDatabaseUrl(env.DATABASE_URL)}`);
    console.log(`  Data source: ${dataSourceLabel}`);
    console.log("  ─────────────────────────────────────");
    console.log("");
  });
}

main().catch((err) => {
  console.error("");
  console.error("  ENS Delegation Incentives API");
  console.error("  ─────────────────────────────────────");
  console.error("  Status:      FAILED TO START");
  console.error(`  Error:       ${err instanceof Error ? err.message : String(err)}`);
  console.error("  ─────────────────────────────────────");
  console.error("");
  process.exit(1);
});
