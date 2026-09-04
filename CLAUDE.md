# PeerVault — Repository Guide

Monorepo: `backend/` (11-module Maven/Spring Boot microservice mesh — see `backend/CLAUDE.md` for
full build history and `backend/README.md` for architecture) and `frontend/` (Vite/React).

## Deployment status

**API Gateway Docker build on Render: FIXED — 2026-09-04.** Full root-cause analysis, verification
evidence, and the exact Render dashboard configuration are in `RENDER_DEPLOYMENT_FIX.md` (repo
root). Short version: the Maven parent POM lives at `backend/pom.xml`, so any service's Docker
build needs `backend/` as its build context — Render's Root Directory must be `backend`, and each
service's Dockerfile Path must be relative to that (`api-gateway/Dockerfile`, not
`backend/api-gateway/Dockerfile`). Only `api-gateway/Dockerfile` was changed (to respect Render's
`$PORT`); no other service's Dockerfile needed touching.

**Still open:** deploying only `api-gateway` to Render builds and starts the container, but the
app won't fully come up in isolation — it requires a reachable `config-server` (fail-fast on
`spring.config.import`) and, for real routing, `eureka-server` plus the downstream business
services. See `RENDER_DEPLOYMENT_FIX.md`'s "Remaining deployment risks" before treating this as a
complete production deployment.
