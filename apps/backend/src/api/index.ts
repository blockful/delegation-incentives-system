import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { applyCors } from "./cors.js";
import health from "./routes/health.js";
import voters from "./routes/voters.js";
import eligibility from "./routes/eligibility.js";
import rewards from "./routes/rewards.js";
import apr from "./routes/apr.js";
import rounds from "./routes/rounds.js";
import tiers from "./routes/tiers.js";
import distributions from "./routes/distributions.js";
import stats from "./routes/stats.js";
import { startAutomaticDistributionScheduler } from "./distribution-scheduler.js";

const app = new OpenAPIHono();

applyCors(app, process.env.ALLOWED_ORIGINS);

app.route("/", health);
app.route("/", voters);
app.route("/", eligibility);
app.route("/", rewards);
app.route("/", apr);
app.route("/", rounds);
app.route("/", tiers);
app.route("/", distributions);
app.route("/", stats);

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "ENS Delegation Incentives API",
    version: "1.0.0",
    description:
      "API for the ENS delegation incentives system — active voters, eligibility, reward estimates, APR, tiers, rounds, and distribution history.",
  },
});

app.get(
  "/docs",
  apiReference({
    url: "/openapi.json",
    theme: "kepler",
  }),
);

app.notFound((c) =>
  c.json(
    { error: "Not found", path: c.req.path },
    404,
  ),
);

startAutomaticDistributionScheduler();

export default app;
