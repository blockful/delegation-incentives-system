# Staging Deploy — Railway (backend) + Vercel (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the ENS Delegation Incentives backend (Ponder + Hono) to Railway and the frontend (Vite + React) to Vercel, in a staging configuration that the team can demo against.

**Architecture:** The backend is a single long-lived Node process that indexes Ethereum mainnet and serves a REST API from the same process (Ponder + Hono). It needs Postgres and an Ethereum RPC. The frontend is a static SPA built by Vite, served from Vercel's CDN. Frontend talks to backend over HTTPS, so the backend needs CORS allow-listing the Vercel origin, and the Reown (WalletConnect) project needs the Vercel origin allow-listed too.

**Tech Stack:** Ponder 0.16, Hono, Drizzle, Postgres, pnpm 9.15 workspaces, Node 20, Vite 6, React 19, wagmi/Reown, Railway, Vercel.

---

## Repo Facts Worth Knowing (read before starting)

- Monorepo with two apps: `apps/backend` (Ponder) and `apps/frontend` (Vite).
- Shared package: `packages/domain` (pure TS). Frontend and backend both depend on it via `workspace:*` — Vercel install must run from repo root so the workspace resolves.
- Backend has **no `/api` prefix** on routes. All routes (e.g. `/voters/active`, `/eligibility/:address`) live at the root. The `/api` you may see in `.env.example` is a frontend-side base path used only by the dev proxy.
- Ponder **reserves** `/health`, `/status`, `/ready`, `/metrics`, `/client`. Use `/health` for Railway's healthcheck (the empty `src/api/routes/health.ts` is just a placeholder; Ponder serves the real one).
- Backend `dev` and `start` scripts source `../../.env` at the repo root. On Railway there is no `.env` file — env vars come from Railway's UI, and the `set -a; . ../../.env 2>/dev/null` in the start script silently no-ops when the file doesn't exist (good — don't change it).
- The same scripts contain a `PORT=${BACKEND_PORT:-${PORT:-42069}}` expansion. This is load-bearing for Railway: it lets the platform-injected `PORT` flow through to Ponder when `BACKEND_PORT` is unset. The original version `${BACKEND_PORT:-42069}` overrode Railway's `PORT` and caused all healthchecks to fail — do not regress this.
- The root `package.json` `prepare` script ends with `2>/dev/null || true`. This is required because Railway/Docker builds don't have a `.git` dir, and `pnpm install` runs `prepare` after install — if `prepare` fails, the whole install aborts.
- Indexer start blocks go back to Oct 2021 (`ENSToken: startBlock: 13533418`). First backfill will take hours and many RPC requests. Plan accordingly.
- Existing Vercel project URL (staging): `https://delegation-incentives-system-fronte.vercel.app/`.
- Reown project ID (staging): `f20e5aaee61b5e6c0c2489d292cb670b`.

## File Structure

Files this plan creates or modifies:

**Create:**
- `apps/backend/src/api/cors.ts` — CORS middleware factory that reads `ALLOWED_ORIGINS` (comma-separated) and applies Hono's CORS middleware to the API app.
- `apps/backend/test/unit/api/cors.test.ts` — unit tests for the middleware factory (origin allow/deny, OPTIONS preflight).
- `nixpacks.toml` (repo root) — pins Node 20 + pnpm 9.15 and tells Railway's nixpacks builder how to install and start the backend.
- `railway.json` (repo root) — declarative Railway service config: build/start commands, healthcheck path, restart policy.
- `vercel.json` (repo root) — declarative Vercel project config: install/build commands from monorepo root, output dir, SPA rewrite for client-side routing.
- `DEPLOY.md` (repo root) — short operator doc with staging URLs, env var matrix, and rollback steps.

**Modify:**
- `apps/backend/src/api/index.ts` — wire the CORS middleware before route mounting.
- `apps/backend/package.json` — add `@hono/cors` style dep (Hono ships CORS in `hono/cors`, no new dep needed; check first).
- `README.md` — fix the wrong `/api/health` reference (mention `/health` is Ponder's built-in).

**No changes:**
- `apps/frontend/vite.config.ts` — already supports an absolute `VITE_API_BASE_URL` for prod builds. The dev proxy branch is skipped automatically.
- `apps/backend/ponder.config.ts` — RPC URL and contracts are env-driven already.

---

## Phase 0 — Repo prep

### Task 1: Add CORS middleware factory

**Files:**
- Create: `apps/backend/src/api/cors.ts`
- Test: `apps/backend/test/unit/api/cors.test.ts`

- [ ] **Step 1: Confirm Hono ships CORS without a new dep**

Run: `cd apps/backend && node -e "console.log(require.resolve('hono/cors'))"`
Expected: prints a path to the `cors` submodule. `hono` is already a direct dep, so this should succeed without installing anything new.

- [ ] **Step 2: Write the failing test**

Create `apps/backend/test/unit/api/cors.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @ens-dis/backend test -- cors`
Expected: FAIL — `Cannot find module '../../../src/api/cors.js'`.

- [ ] **Step 4: Implement the middleware factory**

Create `apps/backend/src/api/cors.ts`:

```ts
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
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      maxAge: 600,
    }),
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @ens-dis/backend test -- cors`
Expected: PASS — 4/4 tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/api/cors.ts apps/backend/test/unit/api/cors.test.ts
git commit -m "feat(backend): add CORS middleware factory driven by ALLOWED_ORIGINS"
```

---

### Task 2: Wire CORS into the API app

**Files:**
- Modify: `apps/backend/src/api/index.ts`

- [ ] **Step 1: Add the import and call `applyCors` before route mounting**

In `apps/backend/src/api/index.ts`, after the existing imports add:

```ts
import { applyCors } from "./cors.js";
```

Then immediately after `const app = new OpenAPIHono();` add:

```ts
applyCors(app, process.env.ALLOWED_ORIGINS);
```

- [ ] **Step 2: Run the full backend test suite**

Run: `pnpm --filter @ens-dis/backend test`
Expected: PASS — everything green.

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @ens-dis/backend typecheck`
Expected: no errors.

- [ ] **Step 4: Manual local smoke test**

```bash
ALLOWED_ORIGINS=https://delegation-incentives-system-fronte.vercel.app \
  pnpm --filter @ens-dis/backend dev &
# wait ~5s for Ponder to bind the port
curl -i -H "Origin: https://delegation-incentives-system-fronte.vercel.app" \
  http://localhost:42069/voters/active | head -20
```

Expected: `access-control-allow-origin: https://delegation-incentives-system-fronte.vercel.app` header in the response.

Kill the dev server (`kill %1`) when done.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/index.ts
git commit -m "feat(backend): apply CORS middleware before mounting routes"
```

---

### Task 3: Add Railway config (`nixpacks.toml` + `railway.json`)

**Files:**
- Create: `nixpacks.toml`
- Create: `railway.json`

- [ ] **Step 1: Write `nixpacks.toml`**

Create at repo root:

```toml
# Railway uses nixpacks to build the service. Pin Node 20 + pnpm 9.15 so
# the build matches local dev. Install with --frozen-lockfile.
[phases.setup]
nixPkgs = ["nodejs_20", "pnpm-9_x"]

[phases.install]
cmds = ["pnpm install --frozen-lockfile"]

[phases.build]
# Ponder has no build step; the start command runs ponder directly.
cmds = ["echo 'no build step'"]

[start]
cmd = "pnpm --filter @ens-dis/backend start"
```

- [ ] **Step 2: Write `railway.json`**

Create at repo root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "pnpm --filter @ens-dis/backend start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

Note: `/health` is Ponder's built-in liveness endpoint. The 300s timeout gives the indexer headroom to bind the port on cold start; `/health` itself returns immediately, but Railway's first healthcheck may fire before Ponder has finished initializing.

- [ ] **Step 3: Commit**

```bash
git add nixpacks.toml railway.json
git commit -m "chore: add Railway nixpacks + service config for backend deploy"
```

---

### Task 4: Add Vercel config (`vercel.json`)

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Write `vercel.json`**

Create at repo root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm --filter @ens-dis/frontend build",
  "outputDirectory": "apps/frontend/dist",
  "framework": null,
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```

Notes:
- `framework: null` — we tell Vercel everything explicitly; the auto-detect tries to be helpful and gets confused by the monorepo layout.
- Install command runs from repo root so `workspace:*` resolution works.
- The rewrite gives React Router clean URLs (any non-asset path serves `index.html`).

- [ ] **Step 2: Verify a local production build works**

Run: `pnpm install --frozen-lockfile && pnpm --filter @ens-dis/frontend build`
Expected: build succeeds, `apps/frontend/dist/index.html` exists.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel project config for monorepo frontend build"
```

---

### Task 5: Fix the misleading `/api/health` reference

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the API table and the OpenAPI path**

In `README.md`:
- Change the `/api/health` row to `/health`.
- Change the `GET /doc` reference (line ~46) to `GET /openapi.json` — that's the path the code actually mounts.
- Add a one-liner that the rest of the API is served at the root (no `/api` prefix on the backend itself — frontends configure that base via `VITE_API_BASE_URL`).

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: correct health endpoint path and clarify API base"
```

---

### Task 6: Push branch and open PR

- [ ] **Step 1: Push**

```bash
git push -u origin <current-branch>
```

- [ ] **Step 2: Open PR**

Use `gh pr create` with the title `chore: prepare for Railway + Vercel staging deploy` and a body listing each commit.

- [ ] **Step 3: Wait for the user to merge to `main`**

Pause here. Railway and Vercel will deploy off `main`, so do not proceed until the PR is merged.

---

## Phase 1 — Backend on Railway (staging)

These tasks are dashboard work in Railway, not code edits. Each step is something the human operator (you) performs in the UI with the model guiding you. Treat the "verify" commands as the equivalent of "run tests."

### Task 7: Create the Railway project and Postgres plugin

- [ ] **Step 1: Create a new Railway project**

In the Railway dashboard, **New Project → Empty Project**. Name it `delegation-incentives-staging`.

- [ ] **Step 2: Add the Postgres plugin**

Inside the project, **+ New → Database → Add PostgreSQL**. Wait until status is "Active."

- [ ] **Step 3: Capture the `DATABASE_URL`**

Open the Postgres service → **Variables** tab → copy the value of `DATABASE_URL`. Keep it for the next task. (You don't need to paste it manually; Railway can link it as a reference — Step 4 of Task 8.)

---

### Task 8: Create and configure the backend service

- [ ] **Step 1: Add a service from GitHub**

In the project, **+ New → GitHub Repo → blockful/delegation-incentives-system**. Pick `main` as the deploy branch.

- [ ] **Step 2: Set the service name**

Rename the service to `backend`.

- [ ] **Step 3: Set environment variables**

On the `backend` service → **Variables**, add:

| Name | Value | Notes |
|---|---|---|
| `RPC_URL` | (your mainnet RPC) | The one you already have |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Use the Railway reference syntax |
| `ALLOWED_ORIGINS` | `https://delegation-incentives-system-fronte.vercel.app` | No trailing slash. Vercel preview deployments get unique subdomains and will NOT be CORS-allowed until you add them too (defer to a later task). |
| `NODE_ENV` | `production` | |

Do NOT set `BACKEND_PORT`. Railway injects `PORT`, and the start script already honors it.

- [ ] **Step 4: Trigger the first deploy**

Railway auto-deploys on creation. If it didn't, click **Deploy**.

- [ ] **Step 5: Watch logs for indexer startup**

In the **Deployments** tab, open the live log. Expected sequence:
1. nixpacks install phase succeeds.
2. `ponder start` boots.
3. Logs show "Started historical sync" or similar.
4. The HTTP server logs "Server listening on port $PORT".

If the deploy crashes, paste the log here and we debug before continuing.

- [ ] **Step 6: Expose the service publicly**

On the `backend` service → **Settings → Networking → Generate Domain**. Capture the public URL (e.g. `backend-production-xxxx.up.railway.app`). Save this — it becomes `VITE_API_BASE_URL` in Phase 2.

- [ ] **Step 7: Verify healthcheck**

```bash
RAILWAY_URL=https://<the-domain-you-captured>
curl -i $RAILWAY_URL/health
```

Expected: `200 OK` body within ~1 second.

- [ ] **Step 8: Verify the API responds (even if indexing isn't done)**

```bash
curl -s $RAILWAY_URL/voters/active | head -50
curl -s $RAILWAY_URL/docs | grep -i "scalar\|swagger" | head -3
```

Expected: `/voters/active` returns a JSON array (possibly empty while indexer catches up). `/docs` returns the Scalar API reference HTML.

- [ ] **Step 9: Verify CORS works against the (still-unbuilt) frontend domain**

```bash
curl -i -H "Origin: https://delegation-incentives-system-fronte.vercel.app" \
  $RAILWAY_URL/voters/active | grep -i access-control
```

Expected: `access-control-allow-origin: https://delegation-incentives-system-fronte.vercel.app`.

- [ ] **Step 10: Wait for indexer to catch up**

This will take hours on first deploy. Periodically check:

```bash
curl -s $RAILWAY_URL/voters/active | jq 'length'
```

When the count looks plausible (dozens to low hundreds for ENS), proceed.

---

## Phase 2 — Frontend on Vercel (staging)

### Task 9: Configure the Vercel project

The Vercel project at `delegation-incentives-system-fronte.vercel.app` already exists. We're updating its settings, not creating a new one.

- [ ] **Step 1: Open the Vercel project settings**

vercel.com → project → **Settings**.

- [ ] **Step 2: Set the Git branch**

**Settings → Git → Production Branch = `main`**.

- [ ] **Step 3: Verify Build & Development Settings**

`vercel.json` (committed in Task 4) drives this. Confirm the UI shows:
- Framework Preset: **Other** (because `framework: null`)
- Root Directory: empty / repo root (do not set this to `apps/frontend` — the install needs to run from root for workspace deps)
- Build Command: from `vercel.json`
- Output Directory: from `vercel.json`

If anything is hardcoded in the UI, clear it so `vercel.json` wins.

- [ ] **Step 4: Set environment variables (Production scope)**

**Settings → Environment Variables** → add three vars, all scoped to "Production" (and "Preview" too — same values for staging):

| Name | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<railway-domain-from-task-8-step-6>` |
| `VITE_USE_MOCK_API` | `false` |
| `VITE_REOWN_PROJECT_ID` | `f20e5aaee61b5e6c0c2489d292cb670b` |

Note: no trailing slash on `VITE_API_BASE_URL`. The frontend code already strips them, but be explicit.

- [ ] **Step 5: Trigger a redeploy**

**Deployments → latest → ⋯ → Redeploy** (with "Use existing Build Cache" OFF the first time, so it picks up the new env).

- [ ] **Step 6: Watch the build log**

Expected stages:
1. `pnpm install --frozen-lockfile` succeeds — note that workspace packages resolve.
2. `pnpm --filter @ens-dis/frontend build` runs `tsc -b && vite build`.
3. `apps/frontend/dist` is uploaded.

If install fails on `workspace:*`, the install command isn't running from repo root — re-check Task 4 and Task 9 Step 3.

---

### Task 10: Allow-list the Vercel domain in Reown

- [ ] **Step 1: Sign into Reown Cloud**

Go to `https://cloud.reown.com` and open the project with ID `f20e5aaee61b5e6c0c2489d292cb670b`.

- [ ] **Step 2: Add the staging origin**

Under **Project → Settings → Allowed Domains** (UI naming may vary), add:

```
https://delegation-incentives-system-fronte.vercel.app
```

Save.

---

### Task 11: End-to-end smoke test

- [ ] **Step 1: Open the staging site**

Visit `https://delegation-incentives-system-fronte.vercel.app/` in a browser with DevTools open.

- [ ] **Step 2: Verify API calls succeed**

In the Network tab:
- All `XHR` calls to the Railway domain return 200.
- No CORS errors in the Console.
- Response headers include `access-control-allow-origin`.

- [ ] **Step 3: Verify wallet connect**

Click any wallet-connect entry point. The Reown modal should open. Connect with a test wallet (e.g., a fresh MetaMask). Connection should succeed without "domain not allowed" errors.

- [ ] **Step 4: Click through the main flows**

Visit at least:
- Home / leaderboard page (voters list loads).
- A delegate profile page (eligibility, APR, tiers all return data).
- The "distributions" page if it exists.

Note any 4xx/5xx in the Network tab. If the indexer is still catching up, some endpoints may return empty arrays — that's OK, but errors are not.

---

## Phase 3 — Hardening + handoff

### Task 12: Document the staging deploy

**Files:**
- Create: `DEPLOY.md`

- [ ] **Step 1: Write `DEPLOY.md`**

Create at repo root. Cover: staging URLs (Railway backend, Vercel frontend), full env var table for both services, where to find logs, rollback steps (Railway = redeploy previous build; Vercel = "Promote to Production" on an older deployment), and "what changes when we add prod" (TBD section).

- [ ] **Step 2: Commit and push**

```bash
git add DEPLOY.md
git commit -m "docs: add staging deploy reference"
git push
```

---

### Task 13: Confirm Railway healthcheck and restart policy are active

- [ ] **Step 1: Check the service settings**

Railway → `backend` → **Settings → Deploy**:
- Healthcheck Path = `/health`
- Restart Policy = On Failure, max retries 3

If `railway.json` is being honored these will already be set. If not, set them manually.

- [ ] **Step 2: Simulate a crash**

Railway → `backend` → **Settings → Restart Service**. Watch logs — service should come back automatically.

---

### Task 14: Decide on `ROUND_MONTHS` for staging

- [ ] **Step 1: Decide with the user**

Default (left unset): any month is computable on demand. For staging this is what we want — easier to poke around.

If you change your mind later, add `ROUND_MONTHS=2026-03,2026-04,2026-05` to the Railway backend service variables and redeploy.

---

## Manual Verification Checklist (run after every phase)

- After Phase 0: `pnpm install && pnpm test && pnpm typecheck` all green locally.
- After Phase 1: `curl $RAILWAY_URL/health` and `curl $RAILWAY_URL/voters/active` both work, CORS header present for the Vercel origin.
- After Phase 2: site loads in browser, no CORS errors in console, wallet connect modal opens.
- After Phase 3: `DEPLOY.md` exists and is accurate.

## Things This Plan Deliberately Does NOT Do

- **Production environment.** This is staging-only. Production gets its own Railway project + Vercel branch + DB + Reown project later.
- **CI/CD setup.** No GitHub Actions, no automated tests-on-PR. Manual `pnpm test` is fine for staging.
- **Custom domains.** We're on `*.up.railway.app` and `*.vercel.app`. Custom domains can come after the product works.
- **Log aggregation / metrics.** Railway and Vercel built-in logs are sufficient for staging.
- **Uptime monitoring.** Same — defer until prod.
- **Database backups beyond Railway's defaults.** Defer until prod.
