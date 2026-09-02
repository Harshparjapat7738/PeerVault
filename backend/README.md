# PeerVault Backend

Java / Spring Boot microservices control plane for **PeerVault**, the zero-trust personal storage mesh whose
frontend lives in the repo root (`../src`). This is the real backend behind that UI's mock data — real
MongoDB Atlas persistence, real Kafka events, real JWT/EC crypto, a real hash-chained audit ledger, and a
real trip-wire that force-freezes a device on a delete flood. See `../src/data/architectureDocs.ts` for the
original design brief this control plane implements (Node.js in that doc → Java/Spring/Kafka here, by
deliberate choice).

**Scope note:** the Rust storage agent / actual P2P file-byte transport described in the architecture doc
runs on the user's own devices and doesn't exist yet — so transfer *byte progress* is legitimately simulated
server-side (a scheduler ticks it, mirroring the frontend's old `setInterval` mock), while everything around
it — auth, device pairing, the event bus, the audit ledger, the ransomware shield — is real. WebAuthn/passkey
auth from the doc is stood in for with plain email+password (BCrypt + JWT); device *pairing* still generates
real EC (P-256) keypairs and a real SHA-256 fingerprint.

## Architecture

```
                                   ┌─────────────────────┐
                                   │   api-gateway (8080) │  ← single entry point, JWT filter, CORS, WS proxy
                                   └──────────┬───────────┘
                     ┌───────────┬────────────┼────────────┬───────────────┬───────────────┐
                     ▼           ▼            ▼            ▼               ▼               ▼
               auth-service device-service file-service transfer-service security-service notification-service
                  (8081)       (8082)        (8083)         (8084)           (8085)            (8086, WS)
                     │            │             │              │                │                  ▲
                     └────────────┴─────────────┴──────┬───────┴────────────────┘                  │
                                                         ▼                                          │
                                                    Kafka topics                                    │
                                          device-events / file-events / transfer-events /            │
                                          transfer-progress / auth-events / security-alerts /         │
                                          audit-log-created / device-freeze-command ──────────────────┘
                                                         │
                                  MongoDB Atlas (cloud, 1 logical DB per service) · Redis (rate limits, revocation)
                                  Eureka (discovery) · Config Server (native + Vault composite, JWT secret only)
```

`device-service` / `file-service` / `transfer-service` / `security-service` publish audit-worthy
`DomainEvent`s to their own Kafka topic. `security-service` consumes all of them, appends each to an
immutable **SHA-256 hash-chained** ledger (`prevHash` of each row feeds into the next row's hash), and
republishes the canonical `AuditEventDto` to `audit-log-created`. `notification-service` fans every topic out
over STOMP/WebSocket (`/topic/devices`, `/files`, `/transfers`, `/transfers/progress`, `/audit`, `/alerts`)
so a connected browser sees everything live. `security-service` also runs the **ransomware mass-deletion
shield**: a Redis-windowed counter per device on `file.trashed` events that, past 20 deletes/60s, publishes a
CRITICAL audit event and a `DeviceFreezeCommand` that `device-service` consumes to forcibly freeze the node —
regardless, deleted files only ever sit in a 30-day soft-trash quarantine, so nothing is ever actually lost.

## Prerequisites

- Java 21+, Maven 3.9+ (only needed for local `mvn` commands outside Docker)
- Docker + Docker Compose v2 (`docker compose ...`)
- A MongoDB Atlas cluster (free tier is fine) — see below

## Run it

1. **Get a MongoDB Atlas connection string.** Atlas dashboard → *Database* → *Connect* → *Drivers* → *Java*,
   with a database user that has `readWrite` and your current IP allowlisted under *Network Access* (or
   `0.0.0.0/0` for local dev).
2. **Configure it:**
   ```bash
   cp .env.example .env
   # edit .env and paste your real MONGODB_URI
   ```
   `docker compose` reads `backend/.env` automatically; every service shares the same `MONGODB_URI` and picks
   its own logical database (`auth_db`, `device_db`, `file_db`, `transfer_db`, `security_db`) via
   `spring.data.mongodb.database` in `config-repo/{service}.yml`. `.env` is gitignored — never commit real
   credentials.
3. **Build and start everything:**
   ```bash
   docker compose up -d --build
   ```
   This starts Redis, Kafka (KRaft single-node), Vault (dev mode, auto-seeded with the JWT signing secret),
   Eureka, Config Server, the Gateway, and all 6 business services, respecting health-check dependency order.
   First build takes a while (9 separate Maven multi-stage builds); subsequent builds are much faster via
   Docker layer caching.
4. **Check it's up:**
   ```bash
   docker compose ps
   curl http://localhost:8761                                    # Eureka dashboard — should list all 6 services + gateway
   curl http://localhost:8888/api-gateway/default                # Config Server resolving api-gateway's config
   curl http://localhost:8080/api/v1/threats -H "Authorization: Bearer <token>"   # see the curl flow below for how to get a token
   ```
5. **Stop everything:** `docker compose down` (add `-v` to also drop the Redis/Kafka/Vault container volumes).

### Running a single service outside Docker (for iterating)

Everything still needs Config Server + Eureka + Kafka + Redis + Vault up (`docker compose up -d redis kafka vault vault-init eureka-server config-server`), then from `backend/`:
```bash
mvn -pl device-service -am spring-boot:run
```
(`MONGODB_URI` must be exported in your shell in this mode, since it isn't coming from docker-compose's env file.)

## Service map

| Service | Port | Database | Purpose |
|---|---|---|---|
| `eureka-server` | 8761 | — | Service discovery |
| `config-server` | 8888 | — | Composite config: `config-repo/` (native) + Vault (JWT secret) |
| `api-gateway` | 8080 | — | Single entry point, JWT auth filter, CORS, WebSocket proxy |
| `auth-service` | 8081 | `auth_db` | Registration/login, JWT access+refresh issuance |
| `device-service` | 8082 | `device_db` | Device registry, EC/P-256 pairing crypto, freeze/revoke |
| `file-service` | 8083 | `file_db` | File metadata, soft-delete trash, sandbox path-traversal check |
| `transfer-service` | 8084 | `transfer_db` | Transfer orchestration + simulated progress ticker |
| `security-service` | 8085 | `security_db` | Hash-chained audit ledger, STRIDE matrix, ransomware shield |
| `notification-service` | 8086 | — | Kafka → STOMP/WebSocket relay (`/ws`) |

All traffic should go through the gateway (`:8080`) in normal use — the direct service ports are exposed
only for local debugging.

## API walkthrough (via the gateway, `:8080`)

```bash
# 1. Register (auto-logs-in)
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"harshparjapat7738@gmail.com","password":"correct-horse-battery-staple"}'
# → { "userId", "email", "accessToken", "refreshToken" }

export TOKEN="<accessToken from above>"

# 2. Pair a device — step 1: get a QR-only pairing session + real EC keypair fingerprint
curl -s -X POST http://localhost:8080/api/v1/devices/pair/init -H "Authorization: Bearer $TOKEN"
# → { "sessionId", "qrPayload", "expiresInSeconds", "deviceFingerprint", "ephemeralECDHKey" }
# qrPayload ("peervault://pair?session=<sessionId>&fp=<fingerprint>") is what actually gets rendered
# as a scannable QR code and read back by the scanning device — sessionId is the pairing secret and
# is never typed in by hand.

# 2b. Confirm pairing with the scanned sessionId, a name/type/os, at least one allowed root, and the
# granular permissions granted in the scanning device's permission dialog
curl -s -X POST http://localhost:8080/api/v1/devices/pair/confirm -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sessionId":"<sessionId from step 2>","name":"MacBook Pro 16\"","type":"laptop","os":"macOS","allowedRoots":[{"path":"/Users/harsh/Projects","label":"Dev","allowDelete":true}],"permissions":{"canShareStorage":true,"canWrite":false,"canDelete":false,"canShareFurther":false}}'
# → the created Device, with the new deviceId

# 3. Register a file on that device
curl -s -X POST http://localhost:8080/api/v1/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"deviceId":"<deviceId>","rootId":"<rootId>","rootPath":"/Users/harsh/Projects","relativePath":"project.zip","name":"project.zip","extension":"zip","sizeBytes":880803840,"mimeType":"application/zip"}'

# 4. Start a download transfer for it
curl -s -X POST http://localhost:8080/api/v1/transfers/download -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fileId":"<fileId>"}'
# → watch it progress: GET /api/v1/transfers, or connect a STOMP client to ws://localhost:8080/ws and subscribe to /topic/transfers/progress

# 5. Trip the ransomware shield for real (fires 25 real delete events through the actual detection pipeline)
curl -s -X POST http://localhost:8080/api/v1/security/simulate-ransomware-attack -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# → check the device got force-frozen: GET /api/v1/devices/<deviceId>
# → check the critical audit entry landed: GET /api/v1/audit?severity=critical

# 6. Kill-switch: revoke every issued token mesh-wide
curl -s -X POST http://localhost:8080/api/v1/security/revoke-all-sessions -H "Authorization: Bearer $TOKEN"
# → $TOKEN (and every other outstanding access/refresh token) now gets 401 TOKEN_REVOKED on the next request
```

Full endpoint list is in the plan doc's "Per-service contracts" section; every response DTO mirrors
`../src/types.ts` field-for-field, so the existing frontend components could be wired to these endpoints with
a thin API-client swap for their current mock-data props.

## Kafka topics

| Topic | Payload | Producers → Consumers |
|---|---|---|
| `device-events` | `DomainEvent` | device-service → security-service, notification-service |
| `file-events` | `DomainEvent` | file-service → security-service, notification-service |
| `transfer-events` | `DomainEvent` | transfer-service → security-service, notification-service |
| `transfer-progress` | `TransferProgressEvent` | transfer-service → notification-service (high-frequency, NOT audit-logged) |
| `auth-events` | `DomainEvent` | auth-service → security-service, notification-service |
| `security-alerts` | `DomainEvent` | security-service → security-service (self, ledger), notification-service |
| `device-freeze-command` | `DeviceFreezeCommand` | security-service → device-service |
| `audit-log-created` | `AuditEventDto` | security-service → notification-service |

## Design notes / trade-offs (documented on purpose, not oversights)

- **"Clear Alerts" doesn't delete ledger rows.** The audit ledger is immutable by design — `DELETE
  /api/v1/audit/unread` just moves a per-viewer Redis cursor (`audit:cleared-at`) forward; `GET
  /api/v1/audit` always returns full history regardless.
- **Per-user logout vs. global revoke are two different mechanisms.** Logout bumps that user's `tokenVersion`
  in Mongo, which only blocks *refresh-token renewal* (access tokens are short-TTL, so they're left to expire
  naturally). "Revoke All Sessions" is the stronger one — it bumps a global Redis epoch the gateway checks on
  every request, instantly invalidating every token for every user.
- **`storageTotalBytes`/`storageUsedBytes` start at 0** on a freshly paired device rather than inventing
  numbers — there's no real agent reporting real disk stats yet.
- **`ipHash` in the audit ledger is a deterministic demo stand-in** (hashed from the event id), not a real
  network-layer client IP — this build is control-plane only, there's no real request-IP correlation pipeline
  end-to-end.
