import { describe, it, expect } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { applyCors } from "../../../src/api/cors.js";

function makeApp(allowed: string | undefined) {
  const app = new OpenAPIHono();
  applyCors(app, allowed);
  app.get("/ping", (c) => c.json({ ok: true }));
  return app;
}

describe("applyCors", () => {
  it("echoes an allow-listed origin", async () => {
    const app = makeApp("https://foo.example,https://bar.example");
    const res = await app.request("/ping", {
      headers: { Origin: "https://foo.example" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://foo.example");
  });

  it("omits the allow header for a disallowed origin", async () => {
    const app = makeApp("https://foo.example");
    const res = await app.request("/ping", {
      headers: { Origin: "https://evil.example" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("handles OPTIONS preflight for an allow-listed origin", async () => {
    const app = makeApp("https://foo.example");
    const res = await app.request("/ping", {
      method: "OPTIONS",
      headers: {
        Origin: "https://foo.example",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://foo.example");
  });

  it("is a no-op when ALLOWED_ORIGINS is unset", async () => {
    const app = makeApp(undefined);
    const res = await app.request("/ping", {
      headers: { Origin: "https://anything.example" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
