# Open-Source Readiness Audit

**Date:** 2026-06-02
**Verdict:** ✅ Safe to make public after the cleanup in this PR.

A three-track audit was run across the full git history (464 commits) and the working tree: secrets/credentials, licensing/internal-information leakage, and security-sensitive code/CI.

## Audit Results

### Clean — no action needed

- **No secrets anywhere.** Working tree and full git history were scanned for API keys, private keys, mnemonics, bearer tokens, database URLs with credentials, and webhook URLs. Only `.env.example` (placeholders) is tracked; `.gitignore` covers `.env` and `.env*.local`. All 64-char hex strings are synthetic test fixtures.
- **No private dependencies.** All packages are public npm; no `.npmrc` auth tokens, no git+ssh dependencies, no private registries.
- **No smart contracts or deploy keys.** The repo only indexes public, verified mainnet contracts (ENS Token, ENS Governor, ERC20MultiDelegate, Hedgey Vesting).
- **No CI workflows.** `.github/workflows` does not exist — nothing exploitable by forks. If workflows are added later, avoid `pull_request_target` (it exposes secrets to forks).
- **No PII or real user data.** Test fixtures are synthetic; no database dumps or user CSVs.
- **SQL injection safe.** Drizzle ORM (parameterized) throughout; `scripts/force-recompute.sh` regex-validates its `$MONTH` argument.
- **Deployment configs** (`railway.json`, `vercel.json`, `nixpacks.toml`) contain no secrets or project-specific URLs.
- **Contributor names/emails in git history** are standard open-source attribution — not rewritten.

### Fixed in this PR

| Item | Fix |
| --- | --- |
| No `LICENSE` file | Added MIT license; `package.json` license fields updated from ISC to MIT across the monorepo |
| `package.json` repository URL pointed to a local dev proxy (`http://local_proxy@127.0.0.1:21340/...`) | Replaced with `https://github.com/blockful/delegation-incentives-system` |
| Stale `test_before.log` tracked at repo root | Removed; `*.log` added to `.gitignore` |

## Security Follow-Ups (track before/around public launch)

These are not blockers for making the *code* public, but they are security-by-obscurity risks that become more visible once it is:

### 1. Unauthenticated Gateful relayer proxy — HIGH priority

`apps/backend/src/api/relayer-proxy.ts` exposes `/api/gateful/:dao/relay/*` endpoints (balance, config, rate-limit, **delegate**) that forward requests upstream with a server-side `Bearer ${BLOCKFUL_API_TOKEN}`. The endpoints themselves are unauthenticated and unthrottled at the backend, so the public backend effectively acts as an open proxy to the relayer.

Recommended:
- Add backend-level rate limiting (per IP and per address) on the proxy routes.
- Confirm with Gateful that the upstream enforces its own rate limits / anti-abuse measures for this token.
- Optionally require a lightweight client check (e.g., wallet-signature challenge) on `POST .../delegate`.

### 2. No rate limiting on public API endpoints — MEDIUM priority

Endpoints like `/voters/active`, `/eligibility/{address}`, and `/distributions/{month}/csv` run database scans / on-the-fly CSV generation with no throttling. A public repo makes targeted load scripts trivial.

Recommended: Hono rate-limit middleware or edge-level limits (Cloudflare / Railway), plus short-TTL caching of expensive queries.

### 3. CORS configuration — LOW priority (documentation)

`ALLOWED_ORIGINS` unset means same-origin only (safe default). Production deployments where the frontend is on a different origin **must** set it. Consider startup validation that errors when `ALLOWED_ORIGINS` is set but parses to an empty list, and document the requirement in `OPERATOR.md`.

### 4. Cosmetic / launch-related

- The internal preview banner (`apps/frontend/src/components/layout/PreviewBanner.tsx`) and the ClickUp feedback form links (also in `Footer.tsx`) are tied to the July 1 launch plan — remove/replace at launch (e.g., link to GitHub Issues).
- Consider adding a `SECURITY.md` with a responsible-disclosure policy once public.
