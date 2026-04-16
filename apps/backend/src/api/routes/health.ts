import { OpenAPIHono } from "@hono/zod-openapi";

// Ponder reserves /health, /status, /ready, /metrics, /client.
// Use Ponder's built-in /health for liveness checks.
const app = new OpenAPIHono();

export default app;
