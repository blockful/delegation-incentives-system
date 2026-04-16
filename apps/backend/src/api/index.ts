import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import health from "./routes/health.js";
import delegates from "./routes/delegates.js";
import eligibility from "./routes/eligibility.js";
import rewards from "./routes/rewards.js";
import apy from "./routes/apy.js";
import rounds from "./routes/rounds.js";
import tiers from "./routes/tiers.js";
import distributions from "./routes/distributions.js";

const app = new OpenAPIHono();

app.route("/", health);
app.route("/", delegates);
app.route("/", eligibility);
app.route("/", rewards);
app.route("/", apy);
app.route("/", rounds);
app.route("/", tiers);
app.route("/", distributions);

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "ENS Delegation Incentives API",
    version: "1.0.0",
    description:
      "API for the ENS delegation incentives system — active delegates, eligibility, reward estimates, APY, tiers, rounds, and distribution history.",
  },
});

app.get(
  "/docs",
  apiReference({
    spec: { url: "/openapi.json" },
    theme: "kepler",
  }),
);

app.notFound((c) =>
  c.json(
    { error: "Not found", path: c.req.path },
    404,
  ),
);

export default app;
