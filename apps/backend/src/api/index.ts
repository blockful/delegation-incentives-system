import { OpenAPIHono } from "@hono/zod-openapi"
import { swaggerUI } from "@hono/swagger-ui"
import { healthRouter } from "./routes/health.js"
import { delegatesRouter } from "./routes/delegates.js"
import { eligibilityRouter } from "./routes/eligibility.js"
import { distributionsRouter } from "./routes/distributions.js"
import { tiersRouter } from "./routes/tiers.js"
import { apyRouter } from "./routes/apy.js"

const app = new OpenAPIHono()

app.route("/", healthRouter)
app.route("/", delegatesRouter)
app.route("/", eligibilityRouter)
app.route("/", distributionsRouter)
app.route("/", tiersRouter)
app.route("/", apyRouter)

app.doc("/docs/json", {
  openapi: "3.1.0",
  info: {
    title: "ENS Delegation Incentives API",
    version: "1.0.0",
    description:
      "API for computing and querying ENS delegation incentive distributions. " +
      "Handles active delegate identification, pool sizing, reward calculation with " +
      "cap redistribution, and lottery allocation.",
  },
  tags: [
    { name: "System", description: "Health and status endpoints" },
    { name: "Distributions", description: "Distribution computation and retrieval" },
    { name: "Delegates", description: "Delegate information" },
    { name: "Eligibility", description: "Reward eligibility checking" },
    { name: "Tiers", description: "Pool tier progression and VP requirements" },
    { name: "APY", description: "Estimated APY for addresses" },
  ],
})

app.get("/docs", swaggerUI({ url: "/docs/json" }))

export default app
