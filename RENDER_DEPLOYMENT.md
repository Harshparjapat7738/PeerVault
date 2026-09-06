# Render Deployment — Full Backend Mesh

Authoritative deployment reference for all 10 independently-deployable PeerVault backend services
on Render. The machine-readable form of everything in this document is [`render.yaml`](render.yaml)
(a Render Blueprint) — apply it via Render's "New → Blueprint" flow pointed at this repo, or use
this document to configure each service by hand in the dashboard instead. Either path produces the
same 10 services, each independently buildable, deployable, and restartable.

`RENDER_DEPLOYMENT_FIX.md` (repo root) is the historical record of the original api-gateway
build-context bug and its fix; this document supersedes it as the deployment reference — that file
is kept for the root-cause narrative, not as the current setup guide.

## Architecture

```
                                    FRONTEND (Vite/React, deployed separately)
                                              |
                                              v
                                        API GATEWAY  (type: web — the one public service)
                                              |
                        +--------+--------+---+---+--------+--------+--------+
                        |        |        |       |        |        |        |
                        v        v        v       v        v        v        v
                     AUTH    DEVICE     FILE   TRANSFER  SECURITY  NOTIF.   SHARE
                   SERVICE   SERVICE  SERVICE  SERVICE   SERVICE  SERVICE  SERVICE   (type: pserv — private)
                        |        |        |       |        |        |        |
                        +--------+--------+---+---+--------+--------+--------+
                                              |
                                        EUREKA SERVER  (type: pserv — service discovery)
                                              |
                                        CONFIG SERVER  (type: pserv — centralized config)
                                              |
                        +-------------------- +--------------------+
                        |                     |                    |
                     MongoDB Atlas      Aiven Kafka          Render Key Value
                     (external)         (external)           (external Redis)
```

All 9 non-gateway services are Render **private services** (`pserv`) — not reachable from the
public internet, only from other services on the same private network, matching
`docker-compose.yml`'s existing loopback-only binding for the same reason (every service trusts the
`X-User-Id`/`X-User-Email` headers api-gateway's JWT filter forwards; none re-verify the token
themselves, so none may be exposed directly). `api-gateway` is the sole `type: web` service.

## External dependencies (provisioned outside this Blueprint)

| Dependency | Why not inline in `render.yaml` | Where to get it |
|---|---|---|
| **MongoDB** | Already external by design (Atlas) — one cluster, each service picks its own logical database via `spring.data.mongodb.database` in its own `config-repo/{service}.yml`. | MongoDB Atlas free tier |
| **Kafka** | No Render-managed Kafka offering. | Aiven for Apache Kafka (free tier; real SASL_SSL Kafka) |
| **Redis** | Render's managed "Key Value" service works, but its Blueprint resource syntax wasn't verified against Render's current schema — create by hand instead. | Render dashboard → New → Key Value (free plan; no persistence needed, used for rate limiting only) |
| **Vault** | Dropped for Render entirely — see "Secrets: Vault dropped for Render" below. | N/A |

## Secrets: Vault dropped for Render

Locally (`docker-compose.yml`), `config-server` reads secrets (`jwt.secret`) from a dev-mode Vault
container. Render has no equivalent managed Vault, and standing up a real init/unseal Vault flow for
a personal single-user project isn't worth the operational cost. Instead, `config-server`'s
[`application-render.yml`](backend/config-server/src/main/resources/application-render.yml) profile
drops the Vault composite-backend entry entirely (native file-backed config only). Consequence: the
two services that read `jwt.secret` directly — **api-gateway** and **auth-service** (confirmed via
`grep -rn "jwt.secret"` — no other service touches it, they all trust the gateway's forwarded
headers instead) — must get it from a plain `JWT_SECRET` env var instead of Config Server. Spring
Boot's relaxed binding maps `JWT_SECRET` → `jwt.secret` automatically and a real OS env var always
outranks anything Config Server would otherwise supply, so this requires no code changes. Activate
the profile with `SPRING_PROFILES_ACTIVE=composite,render` on config-server (already set in
`render.yaml`).

## Service reference

For every service: **Root Directory** = `backend`, **Build/Start Command** = blank (Docker
environment builds and runs via the Dockerfile's own multi-stage build and `ENTRYPOINT`).
**Dockerfile Path** in the Render *dashboard* UI is relative to Root Directory (`<service>/Dockerfile`,
per `RENDER_DEPLOYMENT_FIX.md`'s root-cause finding); in `render.yaml` **Blueprint** syntax,
`dockerfilePath`/`dockerContext` are relative to the **repo root** instead (`backend/<service>/Dockerfile`,
`backend`) — the two are not interchangeable, and `render.yaml` already uses the correct form for
itself (verified against Render's Blueprint spec).

### eureka-server

```
Type:                Private service (pserv)
Dockerfile:          backend/eureka-server/Dockerfile
Port:                8761 (Render $PORT, injected automatically)
Health endpoint:     /actuator/health (internal only — pserv has no Render healthCheckPath)
Required env vars:   none (self-contained)
Depends on:          nothing
Deploy first.
```

### config-server

```
Type:                Private service (pserv)
Dockerfile:          backend/config-server/Dockerfile
Port:                8888
Health endpoint:     /actuator/health
Required env vars:   SPRING_PROFILES_ACTIVE=composite,render
                      EUREKA_HOST / EUREKA_PORT   (fromService: eureka-server)
Depends on:           eureka-server (for its own self-registration only — not required to be
                      reachable before config-server starts serving config)
Config source:        native, baked into the image (backend/config-server/Dockerfile now COPYs
                      config-repo/ into the image at /config-repo — see "Fixes applied" below).
Deploy second.
```

### api-gateway (the one public service)

```
Type:                Web service (type: web)
Dockerfile:          backend/api-gateway/Dockerfile
Port:                $PORT (Render-assigned; Dockerfile passes --server.port=${PORT:-8080})
Health check path:   /actuator/health   (Render dashboard field — web services only)
Required env vars:   CONFIG_SERVER_HOST / CONFIG_SERVER_PORT   (fromService: config-server)
                      EUREKA_HOST / EUREKA_PORT                (fromService: eureka-server)
                      MONGODB_URI      (Atlas connection string — gateway reads user/session data)
                      JWT_SECRET       (see "Secrets" above)
                      FRONTEND_ORIGIN  (deployed frontend's exact origin; CORS)
                      REDIS_URL        (rate limiting)
Depends on:          config-server, eureka-server, MongoDB, Redis; routes (lb://<service>, resolved
                      via Eureka) to every business service below — those don't need to be up for
                      api-gateway itself to start, only for requests to actually succeed.
Deploy after config-server/eureka-server; before or after the business services (routing is dynamic).
Public URL:          https://<service-name>.onrender.com
```

### Business services (auth, device, file, transfer, security, notification, share)

All seven follow the same shape — same Root Directory, same env-var wiring pattern, differing only
in which of Kafka/Redis/FRONTEND_ORIGIN they actually use:

| Service | Port | Kafka | Redis | Frontend-origin | Notes |
|---|---|---|---|---|---|
| auth-service | 8081 | yes | yes | — | Also needs `JWT_SECRET` (signs/verifies tokens) |
| device-service | 8082 | yes | no | — | |
| file-service | 8083 | yes | no | — | |
| transfer-service | 8084 | yes | no | — | Real P2P signaling relay + GridFS-backed relay transfer |
| security-service | 8085 | yes | yes | — | Audit ledger + ransomware shield (Redis-backed rate/anomaly tracking) |
| notification-service | 8086 | yes | no | yes | WebSocket (`/ws`) origin check needs `FRONTEND_ORIGIN` independently of the gateway's own CORS |
| share-service | 8087 | yes | yes | — | Redis-backed request rate limiting |

```
Type:                Private service (pserv), one per row above
Dockerfile:          backend/<service>/Dockerfile
Health endpoint:     /actuator/health (internal only)
Required env vars (every one of the 7):
                      CONFIG_SERVER_HOST / CONFIG_SERVER_PORT   (fromService: config-server)
                      EUREKA_HOST / EUREKA_PORT                 (fromService: eureka-server)
                      MONGODB_URI
                      KAFKA_BOOTSTRAP, KAFKA_SECURITY_PROTOCOL=SASL_SSL, KAFKA_SASL_MECHANISM,
                        KAFKA_SASL_JAAS_CONFIG, KAFKA_SSL_TRUSTSTORE_TYPE=PEM, KAFKA_SSL_CA_CERT
                      + REDIS_URL only for auth-service / security-service / share-service
                      + FRONTEND_ORIGIN only for notification-service
                      + JWT_SECRET only for auth-service
Depends on:          config-server, eureka-server, MongoDB, Kafka (all 7); Redis (3 of them, see
                      table); other business services only indirectly, via Eureka-resolved calls at
                      request time (e.g. share-service → device-service/auth-service/file-service),
                      not at boot.
Deploy in any order relative to each other, after config-server/eureka-server.
```

## Recommended deployment order

```
1. eureka-server
2. config-server
3. auth-service, device-service, file-service, transfer-service,
   security-service, notification-service, share-service   (any order among themselves)
4. api-gateway
5. frontend (Vite/React — deployed separately; point VITE_API_BASE_URL at api-gateway's public URL)
```

Steps 1–2 are hard prerequisites (every other service fail-fasts on an unreachable config-server,
which itself needs to exist before anything can register). Step 3's seven services have no ordering
dependency on each other. Step 4 (api-gateway) can technically deploy anytime after step 2, since
Eureka-based routing is resolved per-request, but real end-to-end traffic only works once the
service it's routing to is also up.

## Fixes applied in this pass

1. **`backend/config-server/Dockerfile`** — added `COPY config-repo /config-repo` (+ explicit
   `ENV CONFIG_REPO_LOCATION=file:/config-repo`). Previously the standalone per-service Dockerfile
   (the one `render.yaml` actually builds) never copied `config-repo/` into the final image at all —
   only the separate root-level all-in-one `backend/Dockerfile` did. Deploying `config-server` alone
   via `render.yaml` would have booted with an empty native config source and served nothing to any
   client, taking down the entire mesh via every other service's `fail-fast: true` config import.
   Local `docker-compose` is unaffected: it already explicitly sets
   `CONFIG_REPO_LOCATION=file:/config-repo` and bind-mounts the live `./config-repo` over that same
   path read-only, which continues to take precedence over the newly-baked-in copy.
2. **`render.yaml`** — removed `KAFKA_*` env vars from `api-gateway` (it has no `spring-kafka`
   dependency — confirmed via its `pom.xml` — and never talks to Kafka) and `REDIS_URL` from
   `device-service` / `file-service` / `transfer-service` / `notification-service` (none has a
   `spring-data-redis` dependency). Both were harmless (unused env vars, not missing ones) but would
   have asked whoever runs the Blueprint to fill in credentials four services never read.

Everything else audited — Dockerfiles' `$PORT` handling, `config-repo/application.yml`'s
env-configurable Eureka/Kafka/Redis/MongoDB URLs, `api-gateway.yml`'s `lb://<service>` routes and
env-configurable CORS, per-service `CONFIG_SERVER_HOST`/`EUREKA_HOST` bootstrap fallbacks, actuator
health endpoints on all 10 modules — was already correct going into this pass (see `git log` for
`a48c4a3` and `96f74f0`, which did this work).

## Verification status

- **Build**: `mvn -q -pl config-server -am -DskipTests compile` — PASS (sanity check after the
  Dockerfile edit; the edit itself touches no Java/config source, only Docker image assembly).
- **Docker**: **not independently verified this pass** — no Docker daemon was reachable in this
  environment (`docker info` fails, consistent with prior sessions' notes in `backend/CLAUDE.md`).
  The fix was verified by static analysis (`.dockerignore` doesn't exclude `config-repo/`; the
  relative default `file:../config-repo` resolves to `/config-repo` from the image's `WORKDIR /app`,
  matching where the new `COPY` places it) and by cross-referencing the already-working root-level
  `backend/Dockerfile`, which does the identical `COPY config-repo /config-repo` +
  `ENV CONFIG_REPO_LOCATION=file:/config-repo` pair. Recommended before trusting this in production:
  `docker build -f backend/config-server/Dockerfile -t peervault-config-server-test backend && docker run --rm peervault-config-server-test` and confirm it serves `GET /auth-service/default` (or any
  other service's config) with real values instead of 404/empty.
- **Render dashboard apply / live Eureka registration / end-to-end gateway routing**: not run — this
  requires an actual Render account and the external Mongo/Kafka/Redis instances provisioned, none
  of which exist in this sandbox. `render.yaml`'s own YAML syntax was validated
  (`yaml.safe_load` — parses clean).

## Known limitations (unchanged by this pass)

- No per-user isolation on Eureka/WebSocket broadcast topics (`backend/CLAUDE.md`'s existing audit
  notes — e.g. the `/topic/share/*` cross-user broadcast gap).
- `sharingPermissions` on a paired device is stored but not enforced by `share-service`.
- Render's private-service (`pserv`) plan has no free tier — running all 9 non-gateway services
  costs roughly $63/mo at the smallest paid plan; `api-gateway` alone can stay on `free` at the cost
  of cold-start spin-down.
