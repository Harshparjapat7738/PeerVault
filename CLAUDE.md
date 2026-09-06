# PeerVault — Repository Guide

Monorepo: `backend/` (11-module Maven/Spring Boot microservice mesh — see `backend/CLAUDE.md` for
full build history and `backend/README.md` for architecture) and `frontend/` (Vite/React).

## Deployment status

**Full 10-service backend mesh is independently deployable on Render — 2026-09-06.** Every
Maven-buildable module under `backend/pom.xml` (all except the `common` library) has its own
Dockerfile, builds/starts/restarts independently, and is wired together via env-var-configurable
Eureka/Config Server URLs — no service hardcodes another's location. Full per-service reference
(ports, required env vars, health endpoints, dependency graph, deployment order) is in
`RENDER_DEPLOYMENT.md` (repo root); the machine-readable form is `render.yaml` (a Render Blueprint
covering all 10 services). `RENDER_DEPLOYMENT_FIX.md` is kept as the historical record of the
original api-gateway build-context bug (root cause: Render's Docker build context must be
`backend/`, since the Maven parent POM lives there) — superseded as the setup guide by
`RENDER_DEPLOYMENT.md`.

**Architecture, unchanged by the Render work:** `eureka-server` (discovery) → `config-server`
(centralized config, Vault dropped for Render — see below) → `api-gateway` (the one public-facing
service, JWT auth + CORS + routing) → 7 business services (`auth`, `device`, `file`, `transfer`,
`security`, `notification`, `share`), each registering with Eureka and resolved via the gateway's
`lb://<service>` routes. External deps: MongoDB Atlas, Aiven Kafka (SASL_SSL), Render Key Value
(Redis) — none bundled into this repo's Docker images.

**Secrets on Render: Vault dropped, not replaced 1:1.** Locally, `config-server` reads `jwt.secret`
from a dev-mode Vault container (`docker-compose.yml`). On Render, `config-server`'s
`application-render.yml` profile (`SPRING_PROFILES_ACTIVE=composite,render`) drops the Vault
composite-backend entry instead of standing up a real init/unseal Vault — the two services that read
`jwt.secret` directly (`api-gateway`, `auth-service`; every other service trusts the gateway's
forwarded `X-User-Id`/`X-User-Email` headers instead) get a plain `JWT_SECRET` env var, which Spring
Boot's relaxed binding maps to `jwt.secret` automatically and which always outranks Config Server.

**Fixed this pass:** `backend/config-server/Dockerfile` didn't copy `config-repo/` into its own
image — only the separate all-in-one `backend/Dockerfile` did. Deploying `config-server` standalone
(as `render.yaml` does) would have booted with an empty config source and, via every downstream
service's `fail-fast: true` config import, taken down the whole mesh. Now
`COPY config-repo /config-repo` + `ENV CONFIG_REPO_LOCATION=file:/config-repo`; local
`docker-compose` is unaffected (it already explicitly overrides that env var to the same path and
bind-mounts the live directory over it). Also trimmed `render.yaml`: removed Kafka env vars from
`api-gateway` (no `spring-kafka` dependency) and Redis env vars from the 4 services with no
`spring-data-redis` dependency (`device`/`file`/`transfer`/`notification`-service) — both were
unused-but-harmless, not missing, but would have asked for credentials four services never read.

**Not independently verified in that pass:** no Docker daemon was reachable in this sandbox, so the
config-server image fix was verified by static analysis + parity with the already-working
`backend/Dockerfile`, not by an actual `docker build`/`docker run`. No live Render deploy or
end-to-end Eureka registration was run (no Render account/external Mongo-Kafka-Redis instances in
this sandbox). See `RENDER_DEPLOYMENT.md`'s "Verification status" for the exact commands to run
before trusting this in production, and its "Known limitations" for pre-existing gaps that pass
didn't touch (per-user WebSocket broadcast isolation, `sharingPermissions` enforcement).

## Production incident — 2026-09-06 (Eureka 0 instances + frontend "Page Not Found")

Full diagnosis is in `RENDER_DEPLOYMENT.md`'s "Incident" section at the bottom — this is the summary.

**Frontend "Page Not Found": ROOT CAUSE FOUND AND FIXED, code-level.** Not a backend issue.
`frontend/src/components/landing/{Footer,Navbar,FinalCTA}.tsx` link to `/login` with plain
`<a href="/login">` tags — real full-page browser navigations, confirmed via
`grep -rn "'/login'" frontend/src`. `frontend/vercel.json` had no SPA-fallback rewrite, so the
static host 404'd on `/login` before the app's own client-side router (`App.tsx`, which reads
`window.location.pathname`) ever got a chance to run. **Fixed:** added the standard Vercel SPA
rewrite to `vercel.json` (`{"source": "/(.*)", "destination": "/index.html"}`). If the frontend is
instead/also served from a Render Static Site, the equivalent fix (not yet applied — unconfirmed
which host is live) is that service's Redirects/Rewrites dashboard tab: Source `/*` → Destination
`/index.html`, Action `Rewrite`.

**Eureka 0 instances: MOST LIKELY ROOT CAUSE IDENTIFIED, NOT LIVE-CONFIRMED.** All repo-side
Eureka/Config Server wiring was re-verified correct this pass (every `render.yaml` `fromService`
reference matches a real declared service; `config-repo/application.yml`'s fallback chain is sound;
`eureka-server` has no Spring Security on its classpath to silently 401 registrations). Leading
hypothesis: **the `render.yaml` Blueprint may never have actually been applied** on the live Render
account — the 10 services may still be the ones created individually via the dashboard (per
`RENDER_DEPLOYMENT_FIX.md`'s original, pre-`render.yaml` instructions), which never received
`fromService`-derived env vars (a Blueprint-only mechanism). Every client then falls back to
`config-repo/application.yml`'s literal defaults — `EUREKA_HOST` defaults to the docker-compose
service name `eureka-server`, unresolvable on Render's private network (real hostnames are
`<name>-<random-suffix>`) — and every business service's `CONFIG_SERVER_HOST` likewise falls back
to `localhost:8888`, which with `fail-fast: true` would crash-loop every business service and
api-gateway before they ever reach Eureka-registration code. This also explains API calls failing
even after the frontend fix, and is consistent with Render still showing "Deployed" (private
services have no `healthCheckPath`-based liveness gate). **3-step manual check and the exact fix**
(apply the Blueprint via Render's "New → Blueprint" — it adopts the existing same-named services,
per Render's own docs, rather than duplicating them) are in `RENDER_DEPLOYMENT.md`'s incident
section. No code or `render.yaml` change was made for this: the repo-side config is already correct,
and the fix (if this hypothesis holds) is a one-time dashboard action, not a code change.

**Files modified this pass:** `frontend/vercel.json` only. **Files NOT modified:** `render.yaml`,
every backend Dockerfile/config file, every Eureka/Gateway route — all re-verified correct, no
defect found in any of them.

**BLOCKED — INFRASTRUCTURE UNAVAILABLE:** confirming which Eureka scenario is live, and confirming
the frontend fix actually resolves `/login` in production, both require Render/Vercel dashboard
access not available in this sandbox. See `RENDER_DEPLOYMENT.md` for the exact manual steps to run.
