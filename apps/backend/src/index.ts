import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { serve } from "@hono/node-server";
import { createApi } from "./api/routes.js";
import { envSchema } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Validate environment
const env = envSchema.parse(process.env);

// TODO: Replace with DrizzleDataSource once PostgreSQL connection is configured
// For now, the server starts but requires a real data source to function
console.log(`Starting ENS Delegation Incentives API on port ${env.BACKEND_PORT}...`);
console.log(`Database: ${env.DATABASE_URL.replace(/\/\/.*@/, "//***@")}`);

// Placeholder: will be replaced with real Drizzle data source
// const dataSource = new DrizzleDataSource(env.DATABASE_URL);
// const app = createApi({ dataSource });
// serve({ fetch: app.fetch, port: env.BACKEND_PORT });
console.log("Server ready. Connect a data source to start computing distributions.");
