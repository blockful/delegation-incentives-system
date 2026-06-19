import { describe, it, expect } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { applyCors } from "../../../src/api/cors.js";

function makeApp(allowed: string | undefined) {
  const app = new OpenAPIHono();
  applyCors(app, allowed);
  app.get("/ping", (c) => c.json({ ok: true }));
  app.post("/echo", async (c) => c.json({ body: await c.req.json() }));
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

  it("allows POST preflight with x-client-source for the relayer proxy", async () => {
    const app = makeApp("https://foo.example");
    const res = await app.request("/echo", {
      method: "OPTIONS",
      headers: {
        Origin: "https://foo.example",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type, x-client-source",
      },
    });
    expect(res.status).toBe(204);
    const allowMethods = res.headers.get("access-control-allow-methods") ?? "";
    expect(allowMethods.toUpperCase()).toContain("POST");
    const allowHeaders =
      res.headers.get("access-control-allow-headers")?.toLowerCase() ?? "";
    expect(allowHeaders).toContain("content-type");
    expect(allowHeaders).toContain("x-client-source");
  });

  it("allows PUT preflight for the selections write route", async () => {
    const app = makeApp("https://foo.example");
    const res = await app.request("/ping", {
      method: "OPTIONS",
      headers: {
        Origin: "https://foo.example",
        "Access-Control-Request-Method": "PUT",
      },
    });
    expect(res.status).toBe(204);
    const allowMethods = res.headers.get("access-control-allow-methods") ?? "";
    expect(allowMethods.toUpperCase()).toContain("PUT");
  });
});
