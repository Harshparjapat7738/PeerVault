# Render Deployment Fix — API Gateway

Status: **FIXED** (Dockerfile verified building and running locally; remaining action is a
Render dashboard config change — see "Render configuration" below).

## Root cause

**Render's Docker build context was the repository root, not `backend/`.** The Maven parent
POM (`peervault-backend`) lives at `backend/pom.xml`, with `api-gateway` and 10 sibling modules
declared under it. `backend/api-gateway/Dockerfile` (unchanged in this fix, aside from the PORT
change below) has always assumed it is built with `backend/` as the Docker context — every other
service Dockerfile in this repo makes the same assumption, and `eureka-server/Dockerfile` even
documents it in a comment: `# Build context is backend/ (see docker-compose.yml) so the Maven
reactor can see every module's pom.xml.` `docker-compose.yml` builds it correctly today
(`context: .` from inside `backend/`, `dockerfile: api-gateway/Dockerfile`).

When Render's **Root Directory** is blank (repository root) while **Dockerfile Path** is
`backend/api-gateway/Dockerfile`, the build context handed to Docker is the repo root. `COPY . .`
then copies the whole repository (frontend included) into `/workspace`, and
`RUN mvn -q -pl api-gateway -am -DskipTests package` runs from `/workspace` — which has no
`pom.xml` at all (the parent POM is one level down, at `backend/pom.xml`). Maven has no reactor to
select `api-gateway` from, hence:

```
[ERROR] Could not find the selected project in the reactor: api-gateway
```

This was **reproduced verbatim, locally**, by running the exact same Maven command from the
repository root (no `pom.xml` present at that level):

```
$ cd personal-storage-mesh   # repo root, no pom.xml here
$ mvn -q -pl api-gateway -am -DskipTests package
[ERROR] [ERROR] Could not find the selected project in the reactor: api-gateway @
[ERROR] Could not find the selected project in the reactor: api-gateway -> [Help 1]
```

Character-for-character identical to Render's log. The reported Docker build-context size also
matches: the full repository's git-tracked content is ~1.05 MB, which lines up with Render's
reported "1.14 MB" context (the discrepancy is filesystem/line-ending overhead on Render's
checkout) — not the ~10 KB `backend/api-gateway` alone would be, nor the full `backend/` tree's
~500 KB tracked / ~344 KB post-`.dockerignore` size. This independently confirms the context was
the repo root, not a narrower directory.

**The earlier error** (`lstat /opt/render/project/src/backend/backend: no such file or
directory`) is the classic Render gotcha in the other direction: when **Root Directory** is set to
`backend`, **Dockerfile Path** becomes relative to that root directory, not the repo root — so a
Dockerfile Path of `backend/api-gateway/Dockerfile` resolves to `backend/backend/api-gateway/
Dockerfile`, which doesn't exist. That earlier attempt had the right Root Directory but the wrong
(doubled) Dockerfile Path; the current attempt has the right Dockerfile Path but the wrong (blank)
Root Directory. Neither previous configuration was internally consistent — see "Render
configuration" below for the one combination that is.

## Repository structure (as verified, not assumed)

```
personal-storage-mesh/
├── backend/
│   ├── pom.xml                  ← Maven parent/aggregator (packaging=pom, artifactId=peervault-backend)
│   ├── .dockerignore             (target/, .idea, .iml, .mvn/wrapper, .git, *.md — correct, unchanged)
│   ├── docker-compose.yml        (builds every service with context=backend/ — the working reference)
│   ├── common/                   ← shared library module (no Dockerfile, not deployed standalone)
│   ├── api-gateway/
│   │   ├── pom.xml               (parent = peervault-backend, artifactId = api-gateway)
│   │   └── Dockerfile
│   ├── auth-service/ … share-service/   ← 8 more sibling modules, each with its own Dockerfile
│   └── config-repo/              ← Spring Cloud Config Server's file-backed property source
└── frontend/                     ← separate Vite/React app, irrelevant to this build
```

`backend/pom.xml`'s `<modules>` block: `common, eureka-server, config-server, api-gateway,
auth-service, device-service, file-service, transfer-service, security-service,
notification-service, share-service`. `api-gateway` is present and correctly declared — nothing
needed to change there.

## Maven parent

`backend/pom.xml` — confirmed via `mvn -pl api-gateway help:evaluate
-Dexpression=project.parent.artifactId -DforceStdout` → `peervault-backend`.

## API Gateway module

- Path: `backend/api-gateway/`
- artifactId: `api-gateway`
- Depends on the local `common` module (`com.peervault:common`) — requires `-am` (also-make) so
  Maven builds `common` first. `-am` was preserved, not removed.

## Correct Render Root Directory

```
backend
```

## Correct Render Dockerfile Path

```
api-gateway/Dockerfile
```
(relative to Root Directory `backend` — do **not** prefix it with `backend/` again, that's what
produced the earlier `backend/backend` error.)

## Dockerfile changes

`backend/api-gateway/Dockerfile` — **one change**, unrelated to the build-context bug (the
Dockerfile's build stage was already correct):

```diff
 FROM eclipse-temurin:21-jre
 WORKDIR /app
 COPY --from=build /workspace/api-gateway/target/api-gateway.jar app.jar
 EXPOSE 8080
-ENTRYPOINT ["java", "-jar", "/app/app.jar"]
+ENTRYPOINT ["sh", "-c", "java -jar /app/app.jar --server.port=${PORT:-8080}"]
```

Why: `config-repo/api-gateway.yml` pins `server.port: 8080` via Spring Cloud Config — fine for
`docker-compose`/local, but Render assigns a dynamic `$PORT` and only routes traffic to that port.
A `--server.port=` command-line argument outranks both the remote Config Server value and any OS
environment variable in Spring Boot's property-source precedence, so this reliably wins no matter
what Config Server later returns. Falls back to `8080` when `$PORT` is unset, so local
`docker run`/`docker-compose` behavior (which never sets `PORT`) is unchanged — verified by
rebuilding and running the image locally (below).

No other Dockerfile in the repo was touched — all 9 other services already build correctly with
`context=backend/`, none of them are the public-facing Render web service, and `-pl <module> -am`
was preserved everywhere it already existed.

## `.dockerignore` changes

None. `backend/.dockerignore` (`**/target`, `**/.idea`, `**/*.iml`, `**/.mvn/wrapper`, `.git`,
`*.md`) was already correct — it excludes build output and IDE cruft, never the parent POM or any
sibling module's source. It simply wasn't in effect while Render's context was the repo root,
because Docker only applies a `.dockerignore` found at the build-context root, and there is (and
should be) no `.dockerignore` at the repository root. Fixing the Root Directory makes
`backend/.dockerignore` apply again automatically — no edit needed.

## Local Maven verification: **PASS**

```
$ cd backend
$ mvn -q -pl api-gateway -am -DskipTests package     # exact Render command, correct root → PASS
$ mvn -q test-compile                                 # all 11 modules                  → PASS
$ mvn -q -DskipTests package                          # all 11 modules, repackage step   → PASS
```

Also reproduced both failure modes on purpose, to confirm the diagnosis rather than assume it:
- From the repo root (no `pom.xml`): `mvn -q -pl api-gateway -am -DskipTests package` → the exact
  `Could not find the selected project in the reactor: api-gateway` error, matching Render's log
  verbatim.
- From inside `backend/api-gateway/` alone: same error — confirms a context narrowed to just that
  module fails identically (this was the leading hypothesis before the context-size math pointed
  at the repo root instead; recorded here so it isn't re-guessed).

## Docker verification: **PASS**

Docker Desktop was available in this environment. Built and ran the image exactly as Render will:

```
$ docker build -f backend/api-gateway/Dockerfile -t peervault-api-gateway-test backend
...
#10 [build 4/4] RUN mvn -q -pl api-gateway -am -DskipTests package
#10 DONE 264.0s
...
=> naming to docker.io/library/peervault-api-gateway-test:latest
```

Build context transferred: 343.99 kB (all 11 modules' source, post-`.dockerignore` — consistent
with the root-cause size analysis above). Image builds clean, multi-stage (Maven build stage
discarded, final image is JRE + jar only, no source/Maven left behind). Rebuilt a second time after
adding the `$PORT` Dockerfile change (below) — one rebuild hit a transient Maven Central
`DependencyResolutionException` mid-download (955s in, no code involved), a clean retry with the
identical Dockerfile/context succeeded in 214s, confirming it was a one-off network flake, not a
regression from the change.

**`$PORT` behavior verified directly**, not just by inspection — overrode the entrypoint to print
the shell-expanded command:

```
$ docker run --rm -e PORT=10000 --entrypoint sh peervault-api-gateway-test -c \
    'echo "java -jar /app/app.jar --server.port=${PORT:-8080}"'
java -jar /app/app.jar --server.port=10000

$ docker run --rm --entrypoint sh peervault-api-gateway-test -c \
    'echo "java -jar /app/app.jar --server.port=${PORT:-8080}"'
java -jar /app/app.jar --server.port=8080      # PORT unset → local/docker-compose default unchanged
```

Also ran the real image with `PORT=10000` and no other config: it fails fast with
`ConfigClientFailFastException: Could not locate PropertySource` — expected in isolation (no
`config-server` reachable), confirms nothing else is silently broken, and is the exact gap recorded
under "Remaining deployment risks" below. Spring's config-import happens before web-server
startup, so this isolated run can't reach a "listening on port X" log line — the entrypoint-echo
test above is the actual proof the port argument resolves correctly. Test image and containers
removed after verification.

## Render configuration

```
Service Type:       Web Service
Environment:        Docker
Root Directory:      backend
Dockerfile Path:     api-gateway/Dockerfile
Build Command:       (leave blank — Docker environment builds via the Dockerfile, not a Build Command)
Start Command:       (leave blank — the Dockerfile's ENTRYPOINT is used)
Health Check Path:   /actuator/health
```

Also set these environment variables in the Render service (required for the app to boot at all —
see "Remaining deployment risks"):

```
CONFIG_SERVER_URI   = <public URL of your deployed config-server>
VAULT_TOKEN          = <same token config-server's Vault backend expects>
MONGODB_URI          = <Atlas connection string>
REDIS_HOST / REDIS_PORT   = <reachable Redis instance>
FRONTEND_ORIGIN      = <your deployed frontend origin, comma-separated if more than one>
```

`PORT` is injected automatically by Render — do not set it manually.

## Remaining deployment risks

1. **API Gateway cannot start standalone.** `application.yml` sets
   `spring.config.import: configserver:${CONFIG_SERVER_URI:...}` with `fail-fast: true`, and the
   gateway's routes (`config-repo/api-gateway.yml`) all point at `lb://<service>` — resolved via
   Eureka. Deploying only `api-gateway` to Render fixes the **build**, but the container will not
   boot without a reachable `config-server` (and won't successfully route requests without
   `eureka-server` and the downstream business services also reachable). This fix is scoped to the
   build failure exactly as asked; making the full mesh Render-deployable is a separate, larger
   task the user should decide on deliberately, not something folded in here silently.
2. **Same repo-root-vs-`backend`-root Root Directory issue will hit every other service** if/when
   they're each configured as separate Render services — worth setting all of them up with
   `Root Directory: backend` / `Dockerfile Path: <service>/Dockerfile` from the start, per the
   pattern this fix establishes.
3. **The WebSocket cross-user broadcast gap and other pre-existing risks** documented in
   `backend/CLAUDE.md`'s "Pre-deployment audit & hardening pass" section are unrelated to this fix
   and remain open.
4. `EXPOSE 8080` in the Dockerfile is now purely documentation/local-default — Render ignores it
   and routes to `$PORT` regardless; left as-is since `docker-compose.yml`'s port mapping
   (`8080:8080`) and local `docker run -p 8080:8080` still depend on the app actually listening on
   8080 by default when `PORT` is unset, which the fallback (`${PORT:-8080}`) preserves.
