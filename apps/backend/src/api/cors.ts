import type { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";

export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

export function applyCors(app: OpenAPIHono, raw: string | undefined): void {
  const allowed = parseAllowedOrigins(raw);
  if (allowed.length === 0) return;

  app.use(
    "*",
    cors({
      origin: (origin) => (allowed.includes(origin) ? origin : null),
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Client-Source"],
      maxAge: 600,
    }),
  );
}
