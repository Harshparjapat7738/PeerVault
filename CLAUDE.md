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

**Not independently verified this pass:** no Docker daemon was reachable in this sandbox, so the
config-server image fix is verified by static analysis + parity with the already-working
`backend/Dockerfile`, not by an actual `docker build`/`docker run`. No live Render deploy or
end-to-end Eureka registration was run (no Render account/external Mongo-Kafka-Redis instances in
this sandbox). See `RENDER_DEPLOYMENT.md`'s "Verification status" for the exact commands to run
before trusting this in production, and its "Known limitations" for pre-existing gaps this pass
didn't touch (per-user WebSocket broadcast isolation, `sharingPermissions` enforcement).
