import { Hono } from "hono";
import health from "./routes/health.js";
import delegates from "./routes/delegates.js";
import eligibility from "./routes/eligibility.js";
import rewards from "./routes/rewards.js";
import apy from "./routes/apy.js";
import rounds from "./routes/rounds.js";
import tiers from "./routes/tiers.js";
import distributions from "./routes/distributions.js";

const app = new Hono();

app.route("/", health);
app.route("/", delegates);
app.route("/", eligibility);
app.route("/", rewards);
app.route("/", apy);
app.route("/", rounds);
app.route("/", tiers);
app.route("/", distributions);

export default app;
