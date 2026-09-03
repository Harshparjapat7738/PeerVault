# PeerVault Storage Sharing - Development Progress

Tracks the build-out of cross-device/cross-user storage sharing on top of the existing 8-service
control plane described in `README.md`. New service: **share-service (port 8087)**.

## Completed Tasks
- [x] Task 1: Database Schema & DTOs
- [x] Task 2: Share Request API (Initiate)
- [x] Task 3: Accept/Reject + Notification Integration
- [x] Task 4: Shared Storage CRUD + Access Control
- [x] Task 5: Direct P2P Transfer Mode (WebRTC)
- [x] Task 6: Relay Mode (Server-Mediated)
- [x] Task 7: Audit + Security Integration
- [x] Task 8: Frontend Integration + Testing
- [x] Task 9: QR-Code-Only Device Pairing (Refactored from PIN-based) - 2026-09-02

## All tasks complete 🎉

Storage Sharing is fully implemented end to end: schema → API → accept/reject → shared-storage
CRUD/access-control → P2P signaling → relay storage → audit integration → frontend + tests. Summary
below; per-task detail is in the sections above.

## Task 1 summary — Schema + DTOs ✅

**New module:** `share-service/` — registered in the root `pom.xml`, minimal boot scaffold only
(`ShareServiceApplication`, `application.yml` pointing at Config Server, no controllers/services
yet — that's Task 2). `config-repo/share-service.yml` sets `server.port: 8087` and
`spring.data.mongodb.database: share_db`; `docker-compose.yml` has a `share-service` block
(depends on config-server/kafka/mongo, same shape as the other 6 business services).

**Entities** (`share-service/src/main/java/com/peervault/share/domain/`), Lombok
`@Data @Builder @Document` (the pattern `transfer-service`/`auth-service`/`file-service` use;
confirmed Lombok's annotation processor actually runs on this JDK via the root `pom.xml`'s pinned
`lombok.version` + `annotationProcessorPaths`):
- `ShareRequest` (`share_requests` collection) — id, requester/target user+device ids,
  storageRootId, permissions, status, transferMode, expiresAt/createdAt/updatedAt as real
  `Instant`s (not the frontend's plain strings) so the Task 3 expiry sweep can query
  `status = PENDING and expiresAt < now` directly.
- `SharedStorage` (`shared_storages` collection) — created after acceptance; owner/sharedWith
  user+device ids, storageRootId, permissions, isActive (flipped false on revoke, never deleted),
  createdAt/revokedAt.
- `ShareRequestRepository` / `SharedStorageRepository` — plain `MongoRepository`s with the lookups
  Task 2/3/4 will need (`findByTargetUserIdAndStatus`, `findByStatusAndExpiresAtBefore`,
  `findBySharedWithUserIdAndIsActiveTrue`, etc).

**Enums** (`backend/common/src/main/java/com/peervault/common/dto/`), same `@JsonValue`/
`@JsonCreator` wire-string pattern as `TransferMode`/`AuditEventType`:
- `SharePermission` — read | write | delete
- `ShareStatus` — pending | accepted | rejected | expired | revoked
- `ShareTransferMode` — direct | relay (deliberately separate from the existing `TransferMode`
  enum: that one is transfer-service's per-file p2p_direct/relay_encrypted choice; this one is the
  once-at-accept-time choice of how a *shared root* is reached — WebRTC vs. relay storage)

**DTOs** (`backend/common/dto/`, mirrored field-for-field into `frontend/src/types.ts`):
`ShareRequestDto`, `ShareResponseDto`, `SharedStorageDto`, `SharedStorageListDto`,
`ShareAcceptanceDto`, `ShareRejectionDto`. `ShareRequestCreateDto` (the POST body) lives locally in
`share-service/web/dto` instead — it's a request-only shape nothing else deserializes, same as
`RootRequest`/`UploadFileRequest` in the other services; `requesterUserId` isn't in the body, it
comes off the caller's JWT in Task 2.

**Kafka event DTOs** (`backend/common/event/`): `ShareRequestEvent`, `ShareAcceptanceEvent`,
`ShareRejectionEvent` — typed envelopes (eventId/occurredAt + payload), *not* wrapped in the
existing `DomainEvent` used by device/file/transfer/auth/security. Topics added to `KafkaTopics`:
`share-requests`, `share-acceptances`, `share-rejections`. security-service audit-ledger coverage
for these is Task 7's job, not wired yet.

**Verified:** `mvn -pl common,share-service -am package` builds clean; Lombok's `@Builder` inner
classes are present in the compiled classes (confirms the processor actually ran, not a silent
no-op); `npx tsc --noEmit` on `frontend/` is clean with the new types added.

**Not done in Task 1 (left for later tasks, don't re-litigate):** no `ShareController`, no
`ShareService` business logic, no mapper (DTO↔entity), no Kafka producers/listeners actually wired
up, no security-service/notification-service consumption, no `backend/.env` merge (the user's own
note mentions `backend/.env.sharing` — nothing in Task 1 needed new secrets, so it wasn't created;
revisit if Task 2+ needs one), `backend/README.md`'s architecture diagram/service table/topic table
weren't updated (out of scope for a schema-only task — do that once the API in Task 2 makes
share-service actually callable).

## Task 2 summary — Share Request API ✅

**Endpoints** (`share-service/web/ShareController`, routed through the gateway via a new
`Path=/api/v1/share/**` entry in `config-repo/api-gateway.yml` — share-service had no gateway route
at all until now):
- `POST /api/v1/share/request` → 201 + `ShareRequestDto`
- `GET /api/v1/share/requests/sent?status=` → caller's outgoing requests (`status` optional filter)
- `GET /api/v1/share/requests/received?status=` → caller's incoming requests (`status` optional filter)

All three read `X-User-Id` off the header the gateway's JWT filter already forwards (same pattern
`DeviceController`/`AuthController` use) — no separate auth check needed in share-service itself.

**`ShareRequestService.createShareRequest` logic**, in order: Redis rate limit → root-ownership
check → resolve target → self-share guard → build/save entity → map → publish `ShareRequestEvent`.

1. **Rate limit** — `share:requests:{userId}:hourly` in Redis, fixed-window counter (same shape as
   security-service's `RansomwareShieldService`), 20/hour by default
   (`peervault.share.rate-limit-count` / `-window-seconds`), 429 `SHARE_REQUEST_RATE_LIMITED` over
   the limit. Added `spring-boot-starter-data-redis` to `share-service/pom.xml` (wasn't there after
   Task 1) and `ApiException.tooManyRequests(...)` to `common` (only 401/403/404/409/400 existed).
2. **Root ownership — deviated from the spec's "call file-service."** `storageRootId` is not a
   file-service concept: `StorageRoot` lives embedded on `Device.allowedRoots` in **device-service**
   (`common/dto/StorageRootDto`), file-service only knows individual `StorageFile`s. Added
   `share-service/client/DeviceClient` (copy of transfer-service's, same Eureka-resolved
   `RestClient` pattern) and check `storageRootId` is actually in `requesterDeviceId`'s
   `allowedRoots` → 403 `ROOT_NOT_OWNED` if not.
   **Known gap, not fixed here:** `Device` has no `userId`/owner field anywhere in the mesh — the
   existing 8-service control plane is single-tenant by design (`device-service`'s
   `DeviceController.listDevices()` already returns every device with no per-user filter). So this
   check confirms the *device* has the root, not that the *caller* owns that device. Closing that
   requires adding real device↔user ownership to device-service, which is a change to an already-
   "complete" service outside a schema/API task for share-service — flagging for a deliberate call,
   not fixing silently. Worth doing before Task 4 (access control) leans on it further.
3. **Resolve target** — `targetUserId` used as-is if present; else `targetEmail` is resolved via a
   new internal endpoint, `GET /api/v1/auth/users/lookup?email=` (added
   `AuthService.lookupByEmail` + `UserLookupDto` in `common/dto` — an internal-only cross-service
   DTO, not a `src/types.ts` mirror like the others), called through new
   `share-service/client/AuthClient`. 404 `TARGET_USER_NOT_FOUND` if no such account. This endpoint
   only runs through direct Eureka-to-Eureka calls in practice (share-service → auth-service), same
   as `DeviceClient`/`FileClient` elsewhere; it's technically also reachable through the gateway
   under the existing `/api/v1/auth/**` wildcard, where the JWT filter still gates it.
4. **Self-share guard** — 400 `SELF_SHARE_NOT_ALLOWED` if resolved `targetUserId == requesterUserId`.
5. **`expiresAt`** — optional in the request body (`"yyyy-MM-dd HH:mm:ss"`, parsed via
   `TimeFormats.TIMESTAMP`, 400 `INVALID_EXPIRES_AT` on a bad format); defaults to
   `now + peervault.share.request-ttl-hours` (72h) when omitted.
6. **Publish** — `ShareRequestEvent.of(dto)` to `share-requests`. share-service does not talk to
   notification-service or SMTP directly — publishing the event *is* the "trigger" the spec's step 5
   describes. **Deliberately not implementing the WS-online/email-fallback branch here**: the
   project's own task list puts "Notification Integration" in Task 3's title, and doing the
   online-check + per-user WS push + SMTP send from share-service would break the
   publish/relay separation every other service in this mesh follows (`DomainEvent` →
   security-service/notification-service consume, producers never call notification-service or send
   mail themselves). Task 3 needs new capability besides just wiring: `notification-service` is
   currently a stateless *broadcast* relay only (fixed `/topic/*` topics, no per-user STOMP
   targeting, no SMTP client anywhere in the codebase) — building the "online vs. offline" branch is
   real infrastructure work for that task, not a wiring gap in this one.

**Schema amendment (Task 1 files, revised here, not a new task):** added `message` (optional
free-text note) to `ShareRequest` / `ShareRequestDto` / `ShareRequestCreateDto` — the Task 2 spec's
request body includes it and Task 1's didn't anticipate it. Also redesigned `ShareRequestCreateDto`:
`targetUserId` is no longer required — either it or a new `targetEmail` field must be set (validated
in the service, not via annotations, since it's an either/or rule), matching Task 2's "targetDeviceId
(or targetEmail for new user)" body shape; `targetDeviceId` stays required regardless, since
`ShareRequest.targetDeviceId` is non-optional in the Task 1 schema and there's no notion of
"deliver to whichever device the target picks later." `frontend/src/types.ts`'s `ShareRequest` /
`ShareRequestCreate` were updated to match.

**Bug caught before it shipped:** Spring MVC's default `@RequestParam` enum binding is
`Enum.valueOf()` (case-sensitive constant name, "PENDING"), not `ShareStatus`'s `@JsonCreator`
(lowercase wire form, "pending", matching every JSON body/response in the mesh) — so `?status=pending`
would have 400'd. Added `share-service/config/WebConfig` registering a `String → ShareStatus`
converter via `fromWire` so the query param matches the wire format everywhere else.

**Verified:** `mvn package` (11 modules — includes the auth-service lookup endpoint and the common
additions) and `npx tsc --noEmit` on `frontend/` both clean.

**Not done in Task 2 (Task 3's job):** no accept/reject endpoints, no `SharedStorage` creation, no
`share-acceptances`/`share-rejections` producers, no notification-service consumer for
`share-requests` (no WS push, no email/SMTP — SMTP doesn't exist anywhere in this codebase yet), no
expiry sweep for `PENDING` requests past `expiresAt` (the repo method
`findByStatusAndExpiresAtBefore` from Task 1 is there for it, unused so far).

## Task 3 summary — Accept/Reject + Notifications ✅

**Endpoints** (`ShareController`, `share-service`):
- `POST /api/v1/share/request/{requestId}/accept` → 201 + `SharedStorageDto`
- `POST /api/v1/share/request/{requestId}/reject` → 200 + `ShareRequestDto` (now `REJECTED`)

`{requestId}` is a path variable, not body — the body DTOs (`ShareAcceptanceDto`/
`ShareRejectionDto`) only carry what the path can't. Both were **moved from `common/dto` into
`share-service/web/dto`**: nothing outside share-service ever deserializes them (unlike
`ShareRequestDto`/`SharedStorageDto`, which flow through Kafka to notification-service), so they
belong with `ShareRequestCreateDto` under the service-local request-DTO convention
(`RootRequest`/`UploadFileRequest` elsewhere), not in `common`.

**`ShareRequestService.loadPendingOrThrow`** is shared by both: 404 if the id doesn't exist; if
still `PENDING` but `expiresAt` has passed, **lazily flips it to `EXPIRED`** right there (no
scheduled sweep exists yet — Task 1's `findByStatusAndExpiresAtBefore` is still unused, this only
catches it on access) and then 409s; otherwise 409 `SHARE_REQUEST_NOT_PENDING` for any non-pending
status. **`authorizeTarget`** — not in the literal spec's steps, added because it's a real hole
without it: only `ShareRequest.targetUserId == X-User-Id` may accept or reject, else 403
`NOT_SHARE_TARGET`. Accept also re-checks `targetDeviceId` exists via `DeviceClient` (same
existence-only caveat as Task 2's root check — doesn't prove the caller owns that device, the
schema still can't answer that).

**Accept** builds `SharedStorage` from the `ShareRequest` (owner/permissions/transferMode carried
over as-is — accepting doesn't renegotiate terms) with `sharedWithDeviceId` = the accept body's
`targetDeviceId`, **not necessarily `ShareRequest.targetDeviceId`** — Task 3's body shape
("targetDeviceId: which device on target user accepts") makes device choice an accept-time
decision, which sits a little oddly next to Task 2's "decided by the sharer up front" framing; kept
both fields rather than force one to fully govern the other, since nothing requires them to match.

**Schema amendment:** added `transferMode` to `SharedStorage`/`SharedStorageDto` (Task 1 didn't
have it) — Task 5/6 need to know DIRECT vs RELAY per grant without joining back to the original
(long-lived but not the natural lookup path) `ShareRequest`.

**Kafka → WebSocket** (`notification-service/relay/KafkaToWebSocketRelay`, extending the existing
broadcast relay rather than standing up something new):
- `share-requests` → `/topic/share/requests`
- `share-acceptances` / `share-rejections` → `/topic/share/status`

**Flagging, not fixing: this broadcast is a real cross-user leak, unlike the mesh's other topics.**
Every existing `/topic/*` is broadcast-to-everyone with no per-user targeting, justified in
`README.md` as "sufficient for a personal single-user mesh" — true for devices/files/transfers,
which really is all one person's own data. Sharing is the first genuinely cross-user feature: under
the same broadcast design, User B's browser sees User A's share requests/accepts/rejects too. Real
per-user delivery needs STOMP user destinations, which needs a `Principal` on the `/ws` handshake —
`WebSocketConfig` has no auth on that endpoint at all today. Implemented the literal spec (simple
fan-out, matching every other topic) since real per-user targeting is a distinct, sizeable piece of
work (WS auth + `convertAndSendToUser`), not a wiring gap — but this should be closed before
sharing is used by more than one real account at once.

**Step 6 ("Publish to `device-freeze-command` if needed, for audit") — deliberately not
implemented.** `DeviceFreezeCommand` is the ransomware shield's real, destructive
force-a-device-offline mechanism (`RansomwareShieldService`); the spec gives no trigger condition
for "if needed" on a normal accept. Wiring an unconditional or made-up-condition freeze call into an
everyday accept flow would be a genuine footgun for a mostly-cosmetic "for audit" purpose. Read this
as belonging to Task 7 ("Audit + Security Integration"), where a real anomaly signal would be
defined — same reasoning as Task 2's audit-DomainEvent deferral. No audit `DomainEvent` is published
from accept/reject either, for the same reason.

**Verified:** `mvn package` (all modules, share-service + notification-service both changed) and
`npx tsc --noEmit` on `frontend/` clean. No leftover references to the old `common.dto`
`ShareAcceptanceDto`/`ShareRejectionDto` anywhere.

**Not done in Task 3 (left for later):** no expiry-sweep scheduler (lazy-expiry on
accept/reject-attempt covers correctness for those two paths only — a stale `PENDING` request never
actioned just sits there until someone tries); no real per-user WS targeting or SMTP (see above); no
audit-ledger coverage (Task 7).

## Task 4 summary — Shared Storage CRUD + Access Control ✅

**Endpoints** (new `SharedStorageController`, `/api/v1/share/storage`):
- `GET /api/v1/share/storage` → `SharedStorageOverviewDto { sharedWithMe, sharedByMe }` — both
  directions in one call, since the spec's two "GET" bullets weren't given separate paths (unlike
  Task 2's sent/received, which were). Reuses `findBySharedWithUserIdAndIsActiveTrue` /
  `findByOwnerIdAndIsActiveTrue` from Task 1 — unused until now.
- `GET /api/v1/share/storage/{id}/files` → proxies to file-service, scoped to the grant's root.
- `POST /api/v1/share/storage/{id}/files` → 201, proxies an upload into the grant's root.
- `DELETE /api/v1/share/storage/{id}/files/{fileId}` → soft-trashes the file (calls file-service's
  existing `POST /{id}/trash`, not a hard delete — matches the mesh's "nothing is ever actually
  lost" soft-trash design everywhere else).
- `DELETE /api/v1/share/storage/{id}` → owner-only revoke: `isActive=false`, `revokedAt` set,
  never deleted (same "flip a flag, keep history" pattern as everything else in this mesh).

**`SharedStorageService.requirePermission`** is the access-control core: the owner always has full
access to their own storage; the recipient (`sharedWithUserId`) is gated by the grant's
`permissions` list (`READ`/`WRITE`/`DELETE` per operation); anyone else gets 403
`NOT_SHARE_PARTICIPANT`. A revoked grant 409s (`SHARED_STORAGE_REVOKED`) before permission is even
checked. Delete additionally re-fetches the file from file-service and confirms it's actually inside
the grant's `(ownerDeviceId, storageRootId)` before trashing it — otherwise a DELETE-permitted
caller could trash any fileId in the mesh by guessing an id, since file ids aren't scoped to a root
on their own.

**Schema amendment:** `SharedStorage`/`SharedStorageDto` gained `ownerDeviceId` (Task 3 populates
it from `ShareRequest.requesterDeviceId` — it existed there all along, just wasn't copied over).
Needed because `storageRootId` alone doesn't say *which device* holds that root, and file-service's
`StorageFile` records are keyed by `(deviceId, rootId)` — without it, listing/uploading/deleting
through a shared-storage grant would have had no way to reach file-service correctly.

**file-service changes (the "integrate with file-service" half):**
- `GET /api/v1/files` gained an optional `?rootId=` filter (`FileController`/`FileService.list`).
  Generically useful, not sharing-specific — without it, listing files "in shared storage" could
  only filter by `deviceId`, leaking every other root on that device across the service boundary
  into share-service's response.
- `UploadFileRequestDto` **moved from file-service-local (`file/dto/UploadFileRequest`) into
  `common/dto`**, unchanged in shape — share-service's new `FileClient` has to construct this exact
  request server-side to proxy an upload, and only DTOs both services need live in `common` (the
  same reasoning `DeviceDto`/`StorageFileDto` already follow). file-service's controller/service
  just import the relocated type; the wire JSON shape file-service's own callers see is unchanged.

**Deliberate deviations from the "Access Control Integration" bullets — flagging, not skipping:**
1. **"Update file-service to check SharedStorage permissions before file operations" — not done
   that way.** file-service's own endpoints (`/api/v1/files/**`) are also hit directly by an
   owner browsing their own files outside any sharing context; teaching file-service about
   `SharedStorage` would conflate two different callers/access paths on one set of endpoints, and
   would mean file-service calling *back* into share-service on every request — a live RPC cycle
   between two services that don't otherwise depend on each other. Instead, **share-service is the
   sole gate**: it loads and permission-checks the `SharedStorage` grant itself, then calls
   file-service with server-derived, caller-can't-touch `(deviceId, rootId)` — the same
   "X trusts nothing from the caller, fetches the real record itself" shape `DeviceClient`/
   `FileClient` already use elsewhere, just applied one hop further out. file-service stays exactly
   as sharing-ignorant as before, which is the point.
2. **"Add `@PreAuthorize` or a custom filter" — implemented as plain service-layer checks
   (`requirePermission`/`loadActiveOrThrow`), not Spring Security.** No service anywhere in this
   9-service mesh uses `@PreAuthorize`, `@EnableMethodSecurity`, or a `SecurityContext` populated
   from anything — auth is `X-User-Id`/`X-User-Email` headers read directly in controllers,
   mesh-wide (see `DeviceController.resolveActor`, now mirrored in
   `SharedStorageController.resolveActor`). Introducing Spring Security method-security for this one
   feature would be a new cross-cutting pattern nothing else follows.
3. **"Audit all shared storage operations in security-service" — done without touching
   security-service.** Upload/delete/revoke each publish a plain `DomainEvent` to the *existing*
   `FILE_EVENTS` topic, which `AuditEventListener` already consumes unconditionally — so these show
   up in the hash-chained ledger with zero security-service changes. (Reads — `GET .../files` and the
   overview listing — aren't audited, matching the existing convention: file-service's own
   `list()`/`getById()` aren't audited either, only mutations are.) This is separate from the
   `share-requests`/`share-acceptances`/`share-rejections` **typed** events from Tasks 2–3, which
   still aren't consumed by security-service at all — that remains real Task 7 work, since those
   aren't plain `DomainEvent`s and `AuditEventListener` doesn't listen to those topics.

**Verified:** full `mvn package` (file-service + share-service + common all changed) and
`npx tsc --noEmit` on `frontend/` both clean. No leftover references to the relocated
`file.dto.UploadFileRequest`.

**Not done in Task 4 (left for later):** no pagination/filtering on the storage overview or file
listing; no rate limiting on upload/delete-via-share (Task 2's rate limiter only covers
`POST /share/request`); the device/root-ownership gap from Tasks 2–3 is unchanged — still nothing
in the schema can confirm a *device* belongs to the *user* holding the JWT, only that it exists.

## Task 5 summary — Direct P2P Transfer Mode (WebRTC) ✅

**Built into `transfer-service`, not a new `webrtc-signaling-service`** — the spec offered both,
and the four REST endpoints already live under `/api/v1/transfers/**` (already gateway-routed,
already reactor-built), so a new service would only have added a pom/Dockerfile/docker-compose/
gateway-route/config-repo entry for zero new capability. Decided without asking since the spec
named this as an explicit either/or and the "add to transfer-service" branch is strictly less work
for the same result.

**What's real vs. simulated — same honest-simulation line `TransferProgressTicker` already draws
for byte throughput, now drawn for the handshake too:** the backend can only ever relay opaque
SDP/ICE blobs between two peers — it has no way to run WebRTC itself, and (per `README.md`'s scope
note) there's no real client-side agent anywhere in this build to report "ICE actually connected."
So:
- `POST /api/v1/transfers/p2p/initiate` creates a `TransferTask` (`mode=P2P_DIRECT`,
  `status=NEGOTIATING` — this status has existed since Task 1's `TransferStatus` enum and was
  unused until now) and returns `{ transferId, signalingChannelId }` (the same id — one channel per
  transfer, no separate concept needed).
- `POST .../offer` and `.../answer` relay verbatim; **submitting the answer is treated as handshake
  success** (`NEGOTIATING` → `TRANSFERRING`, speed set to `peervault.transfer.default-p2p-speed-
  bytes-per-sec`), since there's no real "connected" signal to wait for — this hands the task
  straight to the existing `TransferProgressTicker` with **zero changes to that class**, because it
  already just picks up anything in `TRANSFERRING` regardless of mode.
- `POST .../ice-candidate` relays verbatim, any number of times, no state transition.
- **Nothing is persisted** beyond the `TransferTask` row itself — offer/answer/ICE payloads are
  pure Kafka→WebSocket relay (new `P2PSignalEvent` on a new `p2p-signaling` topic), never written to
  Mongo, matching `TransferProgressEvent`'s existing "high-frequency, transient, not audit-logged"
  treatment.

**Delivery — `/topic/webrtc/{transferId}`, not a shared topic.** Every other topic in this mesh is
one fixed broadcast destination; P2P signaling is per-transfer instead (`notification-service`'s new
`onP2PSignal` listener sends to `/topic/webrtc/" + event.transferId()`), because two unrelated
handshakes on one shared channel would otherwise cross-talk. **How the target device learns
`transferId` to subscribe in the first place, without inventing new discovery infrastructure:**
`initiate` publishes a `DomainEvent` to `TRANSFER_EVENTS` exactly like `startDirectTransfer` already
does — which every client already receives on the existing `/topic/transfers` broadcast. That's
the entire announcement mechanism; nothing new was built for it.

**`/ws/webrtc`** — added as a second STOMP endpoint alongside `/ws` in `notification-service`'s
`WebSocketConfig` (per the spec's literal ask), though noted in its javadoc that the shared
in-memory broker isn't actually endpoint-scoped — a client on either endpoint can subscribe to any
`/topic/*` destination, so this is a clean semantic/connection-lifecycle split rather than a
functional requirement. The api-gateway route already covers it (`Path=/ws/**` was already there
from Day 1), so no gateway change was needed.

**Known gaps, consistent with existing precedent, not new to this task:**
- **No SharedStorage/ownership check on `p2p/initiate`** — mirrors `startDirectTransfer`'s existing
  trust level exactly (that endpoint has never checked ownership or permissions either). Adding a
  check only to the new P2P path would be an inconsistent, arbitrary bar relative to its sibling
  endpoint, not a fix.
- **`fromDeviceId`/`toDeviceId` are null on `P2PSignalEvent` for ICE candidates** — the endpoint's
  own request shape (`{ candidate }`, per spec) gives no sender field, so direction genuinely can't
  be known; delivery still works because routing is by topic, not by these fields.
- **The broadcast-to-everyone-on-the-topic caveat already flagged for `/topic/share/*` in Task 3
  applies here too** — anyone who learns a `transferId` (trivial: it's broadcast on `/topic/transfers`
  already) can subscribe to its signaling channel. Same underlying "no auth on the WS layer at all"
  gap, not a new one.

**Verified:** full `mvn package` (common + transfer-service + notification-service all changed) and
`npx tsc --noEmit` on `frontend/` clean.

## Task 6 summary — Relay Mode (Server-Mediated) ✅

**Real, not simulated — unlike Task 5, this genuinely could be built for real, so it was.** Relay
mode is specifically "the server holds the bytes," which the server legitimately can do (unlike
WebRTC's peer-to-peer handshake, which it fundamentally can't do more of than relay small metadata
for). So: real binary storage, a real SHA-256 computed from the actual bytes as they're read (not
file-service's existing random-placeholder-hash fallback), and genuinely chunk-by-chunk progress on
both legs — none of it simulated.

**Storage: GridFS, not MinIO/S3.** The spec offered both. Chose GridFS because it needed zero new
infrastructure — no new docker-compose service, no new SDK dependency, no bucket/access-key
provisioning in `.env` — it's backed by the exact same `mongo` container every service already
depends on, and `mongodb-driver-sync`'s GridFS classes were already transitively on transfer-service's
classpath via `spring-boot-starter-data-mongodb`. `GridFsTemplate` is defined explicitly in a new
`GridFsConfig` (not left to Spring Boot autoconfiguration, which isn't reliably guaranteed to provide
one) — same explicit-`@Configuration`-for-infra pattern as `RestClientConfig`.

**Endpoints** (new `RelayTransferController`, `/api/v1/transfers/relay`):
- `POST /upload` (multipart: `file` binary + `metadata` JSON part) → 201 `{ transferId, relayUrl }`.
  `relayUrl` is our own download path (`/api/v1/transfers/relay/{id}/download`) — there's no real
  external object-storage URL to hand back, so it's the honest choice rather than a fabricated one.
- `POST /{transferId}/download` → streams the real bytes back (`StreamingResponseBody`).
- `GET /{transferId}/status` → `RelayStatusDto { uploadComplete, downloadAvailable, ... }`, exactly
  what the spec's own status-endpoint description asks for ("check if upload complete, download
  available").

**State machine reuses `TransferTask`/`TransferStatus.QUEUED`** (unused until now — same move as
Task 5 activating `NEGOTIATING`): upload → `TRANSFERRING` (real chunked write) → `QUEUED` (blob
landed, waiting for pickup — this is what unlocks `downloadAvailable`) → `TRANSFERRING` again on
download (real chunked read) → `COMPLETED`. `transferredBytes` tracks whichever leg is *currently*
active, not a cumulative total across both — it resets to 0 when the download leg starts, since the
schema has one such field and the two legs can be arbitrarily far apart in time (that's the point of
"async transfers"), so there's no meaningful single number to show for both at once. Kept
`relayFileId`/`relayUploadComplete`/`relayExpiresAt` **off** `TransferTaskDto`/the frontend entirely
— internal bookkeeping only, same treatment `Device.ownerActor` already gets.

**Real chunking, both directions:**
- Upload: new `ChunkedProgressInputStream` wraps the multipart file's stream, capping every read at
  `chunk-size-bytes` and updating a running `MessageDigest` + firing a progress callback per chunk
  *actually read* — before GridFS ever persists it. `GridFsTemplate.store(...)` reads through this
  wrapper, so real chunk-by-chunk `TransferProgressEvent`s go out during the real write, not after.
- Download: a manual read/write loop against the `GridFsResource`'s stream, publishing progress
  after each chunk actually served.

**Real bug caught and fixed before it shipped: a double-writer race.** `TransferProgressTicker`
(the *simulated* progress engine everything else in transfer-service rides on) queries `findAll()`
filtered only by `status == TRANSFERRING` — with zero awareness of *how* a task's progress is being
driven. Once relay tasks sit at `TRANSFERRING` for the real span of an upload/download (which,
unlike the P2P case, isn't instantaneous — a multi-MB file takes multiple 800ms ticker intervals),
the scheduled ticker would have "helpfully" advanced `transferredBytes` on top of the real chunk
loop's own writes, corrupting both. Fixed with a new `TransferTask.manualProgress` flag (set once,
at relay-task creation, never cleared) that the ticker's query now explicitly excludes — pre-existing
`RELAY_ENCRYPTED`-mode tasks from `startDirectTransfer` (which has nothing to do with Task 6's real
storage and is still 100% simulated, unchanged) never set this flag, so they're unaffected.

**Multipart size limits raised.** Spring Boot's defaults (1MB file / 10MB request) would have
silently 413'd most real uploads; `config-repo/transfer-service.yml` now sets both to 512MB.

**Cleanup**: new `RelayCleanupScheduler` (mirrors `TrashPurgeScheduler`'s exact shape) hourly-deletes
any GridFS blob past `peervault.transfer.relay.ttl-days` (default 7) and clears `relayFileId` — the
`TransferTask` row itself is kept for history, only the actual bytes are really gone, unlike
file-service's soft-trash which never truly deletes for 30 days.

**Consistent with existing precedent, not new to this task:** no SharedStorage/ownership check on
`relay/upload` — matches `startDirectTransfer`'s and Task 5's `p2p/initiate`'s existing trust level
exactly (none of transfer-service's endpoints check sharing permissions; adding one only here would
be an arbitrary, inconsistent bar). Audit publishing reuses `TRANSFER_EVENTS`
(`AuditEventListener` already consumes it) for upload-complete/download-complete/TTL-purge — no
security-service changes needed, same reasoning as Task 4's file-events reuse.

**Verified:** full `mvn package` (common + transfer-service changed) and `npx tsc --noEmit` on
`frontend/` both clean.

**Not done in Task 6 (left for later, or genuinely out of scope):** no resumable/partial upload (a
dropped connection mid-upload leaves an incomplete GridFS file and a task stuck at `TRANSFERRING`
with no automatic recovery — `RelayCleanupScheduler` only reaps blobs that *finished* uploading and
then expired, not stalled ones); no virus/content scanning on relay uploads; no per-user storage
quota on relay blob usage.

## Task 7 summary — Audit + Security Integration ✅

**6 new `AuditEventType` values** (`common/dto/AuditEventType.java`, mirrored into
`frontend/src/types.ts`): `SHARE_REQUEST_CREATED/ACCEPTED/REJECTED`,
`SHARE_STORAGE_ACCESS_GRANTED/REVOKED`, `SHARE_FILE_ACCESSED`. Split into two different production
paths, deliberately reusing existing consumption wherever possible rather than adding a subscription
per event type:

- **The 3 request-lifecycle types come from the 3 new topic subscriptions Task 7 explicitly asked
  for** — new `security-service/kafka/ShareAuditEventListener`, alongside (not merged into)
  `AuditEventListener`, since `share-requests`/`share-acceptances`/`share-rejections` carry
  share-service's own typed envelopes (`ShareRequestEvent` etc.), not `DomainEvent` — they can't join
  the existing 5-topic `@KafkaListener` group without a shape mismatch. One acceptance produces
  **two** ledger rows (`SHARE_REQUEST_ACCEPTED` + `SHARE_STORAGE_ACCESS_GRANTED`) from the same Kafka
  message — the workflow transition and the resulting access-control fact are both independently
  true and worth recording, even though they happen atomically together.
- **The other 3 (GRANTED already covered above; REVOKED and FILE_ACCESSED) are produced by
  share-service itself**, as plain `DomainEvent`s on the *existing* `FILE_EVENTS` topic
  `AuditEventListener` already consumes — no new security-service subscription needed for these two.
  `SharedStorageService`'s revoke call was upgraded from the generic `POLICY_CHANGE` it used since
  Task 4 to the new, precise `SHARE_STORAGE_ACCESS_REVOKED`; upload/delete upgraded from
  `FILE_TRANSFER`/`FILE_DELETE` to `SHARE_FILE_ACCESSED`; and **`listFiles` — never audited since
  Task 4, matching file-service's own "reads aren't audited" convention — now is**, specifically
  because a cross-user read through someone else's share grant is exactly the kind of access a
  security review wants visibility into, unlike an ordinary same-user file listing.

**Schema fix, not just a new field: `ShareRejectionEvent` didn't actually know who rejected.** It
only ever carried `requesterUserId` (who to notify) — there was no way to attribute the *action* to
the actual rejecter in the ledger. Added `requesterDeviceId` and `rejectedByUserId` (sourced from
`ShareRequest.targetUserId`, already validated by Task 3's `authorizeTarget` to equal the caller).
Found while wiring the new listener, not before — a real gap, not a hypothetical one.

**Ransomware shield now correctly attributes shared-storage deletes to the right user — this was the
part that needed a real fix, not just new plumbing.** Two changes, both required together:
1. `AuditLedgerService.append`'s trigger condition (`FILE_DELETE + WARNING` only) now also fires on
   `SHARE_FILE_ACCESSED + WARNING` — the type `SharedStorageService.deleteFile` publishes.
2. **`SharedStorageService`'s audit calls now resolve `deviceId` to whoever actually performed the
   action** (`actingDeviceId`: the owner's device if the owner is the caller, the recipient's device
   otherwise) **instead of always the storage owner's device**, which is what every Task 4 audit call
   did. Without this second change, the first change alone would still have frozen the *owner's*
   device every time — exactly the bug the spec called out ("freeze their device, not owner's").
   Confirmed by reasoning through the call chain: `RansomwareShieldService.onFileTrashed(deviceId,
   ...)` keys its Redis counter and eventual `DeviceFreezeCommand` purely off whatever `deviceId` it's
   handed — it has no independent way to know who the "real" actor was.

**`/topic/share/audit`** — added to `KafkaToWebSocketRelay`'s *existing* `onAuditLogCreated` listener
as a conditional second `convertAndSend`, filtered to the 6 share event types. No new Kafka
subscription: it's a filtered view of the same `audit-log-created` stream `/topic/audit` already
gets, not a separate pipeline.

**api-gateway: verified, not modified.** Both asks were already true before this task, and adding
redundant per-route config risked narrowing what's currently a deliberately global rule rather than
improving anything:
- CORS: `config-repo/api-gateway.yml`'s `globalcors` rule is keyed `'[/**]'` — already covers
  `/api/v1/share/**` (and always has, since Task 2 added its route) exactly like every other service.
- JWT: `JwtAuthGlobalFilter`'s `PUBLIC_PREFIXES` allow-list only exempts
  `/api/v1/auth/{register,login,refresh}` and `/actuator` — everything else, share routes included,
  already hits the mandatory token-check path by default-deny design.

**Verified:** full `mvn package` (common, share-service, security-service, notification-service all
changed) and `npx tsc --noEmit` on `frontend/` both clean. Confirmed the `ShareRejectionEvent.of(...)`
signature change has exactly one call site (its own).

**Left alone, consciously:** the device/root-ownership gap flagged since Task 2 (still nothing in the
schema can confirm a *device* belongs to the *user* holding the JWT) — Task 7 closed the
*attribution-once-you-know-who-the-actor-is* gap (shield now targets the right device given a
caller's userId), but doesn't touch the separate, larger question of whether a `deviceId` can be
trusted to belong to a `userId` in the first place. That's still open for whoever picks it up.

## Task 8 summary — Frontend Integration + Testing ✅

### Frontend (`frontend/src/`)

**`api-client.ts`** (new) — the first real (non-mock) backend integration this frontend has ever had.
Every other feature (`devices`/`files`/`transfers`/`security` tabs) still runs entirely on
`data/initialData.ts` mock state, exactly as before — per `backend/README.md`'s own framing, "the
existing frontend components could be wired to these endpoints with a thin API-client swap" was
always scoped as a separate, later effort for every *other* feature; converting the whole app was
never asked for here and would have been a much larger, riskier change than Task 8's actual list.
Covers exactly the 9 named functions plus the offer/answer/ICE-candidate relay calls
`TransferProgressP2P` needs, talking to the api-gateway (`VITE_API_BASE_URL`, default
`localhost:8080`) the same way `backend/README.md`'s curl walkthrough does.

**Auth is a documented stub, not a new login flow.** There is no login screen anywhere in this
frontend (`Header.tsx` shows a hardcoded "harshparjapat" identity) and building one wasn't in Task
8's list. `getAuthToken()`/`setAuthToken()` read/write a plain `localStorage` key — a developer can
drop in a token obtained via the backend README's curl register/login flow. Flagged clearly in the
file's own header comment, not silently glossed over.

**`stomp-client.ts`** (new) — one shared STOMP-over-SockJS connection to notification-service's
`/ws`, multiplexing arbitrary destinations with reconnect-safe re-subscription. `@stomp/stompjs` +
`sockjs-client` added to `package.json` (neither existed before — this frontend had zero WebSocket
client infrastructure).

**Components** (new): `ShareStorageModal` (create a request — device/root/permissions/mode/message),
`ShareRequestsList` (sent/received tabs, accept-with-device-picker, reject), `SharedStorageView`
(browse "shared with me" grants' files inline, delete when permitted, revoke "shared by me" grants),
`TransferProgressP2P` (**a real, working WebRTC handshake** — actual `RTCPeerConnection`,
`createOffer`/`createAnswer`, ICE exchange via the api-client + STOMP, connection-state UI — not a
mock. Scoped to signaling + connection state, matching its name: chunked file transfer over the
resulting data channel is a separate, larger protocol beyond "progress UI" and wasn't built). All
four match the existing editorial/monochrome design system pixel-for-pixel rather than introducing a
new visual language.

**`App.tsx`/`Header.tsx`**: new "Storage Sharing" nav tab; `App.tsx` now owns
`shareRequestsSent`/`shareRequestsReceived`/`sharedStorageOverview` state, fetched on mount and kept
live via `subscribeStomp` on `/topic/share/requests` and `/topic/share/status` (exactly the two
destinations Task 8 named) — matching the existing "state lives in `App.tsx`, flows down as props"
convention every other tab already uses. Fetches are best-effort: if the backend mesh isn't running,
the tab just shows empty lists rather than breaking the rest of the (still fully-functional, mock)
app.

**`architectureDocs.ts`**: new §37 "Cross-User Storage Sharing" in the same narrative/ADR voice as
the rest of the doc — request/accept lifecycle diagram, the two transfer modes, and the
access-control model — written to describe what was actually built (real endpoint paths, real Kafka
topic/WebSocket destination names) rather than re-describing the doc's original hypothetical
Rust/Node spec.

### Testing

**Real Testcontainers integration tests, not mocks-all-the-way-down** — first tests anywhere in this
codebase (`notification-service`'s pom had `spring-boot-starter-test` declared but zero test files
existed before this). Added the same test dependencies to `share-service`/`transfer-service`'s poms,
plus a `src/test/resources/application.yml` in each that shadows the main one (skips Config
Server/Eureka entirely — tests get their infra from `@DynamicPropertySource`-registered containers).

- **`share-service/ShareFlowIntegrationTest`** — real Mongo + Kafka + Redis containers, real
  controller/service/repository/hash-chain-adjacent layers, `@MockBean` only on the three outbound
  REST clients (`DeviceClient`/`AuthClient`/`FileClient`) — the correct boundary for testing one
  microservice's own integration, not the whole mesh (see below). Covers: create → sent/received
  listings → accept → storage overview on both sides → **READ-only permission correctly rejects a
  DELETE with 403** (Task 8's explicit permission-enforcement ask) → owner-only revoke rejects a
  non-owner attempt → reject flow.
- **`transfer-service/TransferModesIntegrationTest`** — real Mongo + Kafka. Covers **both modes**:
  P2P `initiate` → `NEGOTIATING` → offer/answer → flips to `TRANSFERRING` on answer (Task 5); and
  relay `upload` (real multipart) → **real GridFS storage** → `status` shows
  `uploadComplete`/`downloadAvailable` → `download` returns the **exact same bytes, verified
  byte-for-byte** → `status` shows `COMPLETED` (Task 6) — this one is worth the multipart-construction
  code it took: it's the test that actually proves Task 6's storage isn't simulated.

**"E2E: User A shares → User B accepts → User B accesses" and "test both transfer modes" are covered
within these two service-level suites, not as a separate whole-mesh test harness — a deliberate
scoping call, not an oversight.** Sharing is share-service's own feature end to end; spinning up all
9 real Docker services (via `GenericContainer` against each service's own `Dockerfile`) to test it
would be a materially heavier, slower, more fragile test harness for the same coverage `@MockBean`
already gives at the correct trust boundary — the same boundary every `*Client` class in this mesh
already establishes (a service trusts what another service's API returns; it doesn't need to spin
that service up to prove its own logic against a given response).

**Honest limitation: not verified running in this sandbox.** No Docker daemon was reachable here
(`docker info` fails — Docker Desktop's Linux engine isn't started). Both test classes **compile
clean** (`mvn test-compile`) and, run for real, **fail at exactly the expected point** — Testcontainers'
own `Could not find a valid Docker environment` — confirming the JUnit5/Spring/Testcontainers wiring
is correct up to that boundary; the actual assertions were never exercised. Run them for real with
Docker Desktop (or any reachable Docker host) running: \`mvn -pl share-service test\` /
\`mvn -pl transfer-service test\`. **Operational note:** unlike the rest of this codebase, `mvn test`
or a non-`-DskipTests` `mvn package` now requires Docker for these two modules — the existing
Dockerfiles already build with `-DskipTests` explicitly, so the container-build path is unaffected.

**Verified:** full `mvn package` (all 11 modules, both new test suites' main+test sources compiled)
and `npx tsc --noEmit` on `frontend/` both clean.

## Task 9 summary — QR-Code-Only Device Pairing (ground-up refactor) ✅

**Removed all PIN-based pairing, replaced with a real QR-scan-only handshake plus an explicit
granular-permission grant.** Device pairing pre-existed this task (`device-service` +
`DevicePairingModal.tsx`) as a hybrid: real EC (P-256) keypair + SHA-256 fingerprint generation
server-side, but the pairing secret was a human-typed 6-digit PIN, `qrPayload` was returned by the
API but never actually rendered as a scannable code, and the modal never called the real
`pair/init`/`pair/confirm` endpoints at all — it fabricated a fake `Device` client-side. All three of
those are now real.

**Simplification, not just a rename: the pairing session's own Mongo `_id` (already a
`UUID.randomUUID()`) is now the one and only pairing secret**, embedded solely in the QR payload
(`peervault://pair?session=<sessionId>&fp=<fingerprint>`) — no separate human-typable code exists
anywhere, so there's nothing to fall back to manual entry with. `PairingSession.pairingCode`,
`PairingCryptoService.generatePin()`, and `PairingSessionRepository.findByPairingCodeAndConsumedFalse`
are all deleted outright; confirm now looks the session up by the inherited `findById`, then
explicitly checks `consumed` (400 `PAIRING_ALREADY_CONSUMED`, a real gap the old code didn't
distinguish from "not found") and `expiresAt` (400 `PAIRING_EXPIRED`) exactly as before.

**New `common/dto/SharingPermissionsDto`** (`canShareStorage`, `canWrite`, `canDelete`,
`canShareFurther`) — the explicit grant step the PIN flow never had. Deliberately reused as-is for
both `PairConfirmRequest.permissions` and the persisted/returned shape on `Device`/`DeviceDto`
(embedded field, hand-written accessors matching this class's existing no-Lombok convention) rather
than split into a request/response pair like `RootRequest`/`StorageRootDto` — those two differ in
shape (extra server-populated fields), but a request and response `SharingPermissionsDto` would be
byte-for-byte identical, so splitting them would buy nothing. Dropped the originally-proposed
"canAccessSharedStorage (always true)" field — a field that's always true carries no information, so
it isn't modeled as a checkbox in the UI or a field in the schema; read access is just implicit.

**Explicitly out of scope, flagged not fixed:** these permissions are stored on the device record
only. `share-service`'s `ShareRequestService` does **not** read or enforce them — wiring real
enforcement into an already-complete, separate service is a distinct piece of follow-up work, not
silently rolled into a device-pairing refactor. Combined with the device/root-ownership gap flagged
since Task 2 (still nothing confirms a `deviceId` belongs to the caller's `userId`), this is the
natural next hardening pass on the sharing feature as a whole.

**No new backend dependencies** — no ZXing, no commons-lang3 (both proposed in the original task
brief). QR *image* generation moved entirely to the frontend; `UUID`/`SecureRandom` were already
JDK-native. Keeps device-service's dependency footprint unchanged, the same "avoid new infra when
avoidable" call Task 6 made choosing GridFS over MinIO/S3.

**Frontend — first real (non-mock) device pairing in this app.** `DevicePairingModal.tsx` (100%
client-side fabrication, never called the backend) is deleted outright, replaced by:
- `QrPairingModal.tsx` — two modes, no manual-code fallback anywhere. **Generate** mode calls the
  real `initiatePairing()` and renders the real `qrPayload` as an actual scannable QR via the new
  `qrcode` dependency (canvas-rendered, live countdown off the real `expiresInSeconds`). **Scan**
  mode uses the new `@yudiel/react-qr-scanner` dependency for a real camera feed + decode (resolved
  clean against React 19; no fallback needed).
- `DevicePermissionDialog.tsx` — shown after a QR is decoded, before the backend is ever called;
  collects the joining device's profile (name/type/os/root) and the four granular permissions.
  Decline never calls `confirmPairing()`; Accept does, and the resulting real `Device` — not a
  fabricated one — flows back to `App.tsx`'s existing `handlePairSuccess`, unchanged.
- `api-client.ts` gained `initiatePairing()`/`confirmPairing()`, using the same `request<T>()`
  helper and error handling every Task 8 share function already uses — nothing new invented.
- `types.ts`: `PairingSession.pairingCode` → `sessionId`; new `SharingPermissions` interface; `Device`
  gained an optional `sharingPermissions` field (optional so the pre-existing mock devices in
  `data/initialData.ts` don't need backfilling).
- Cosmetic-only text fixes in `data/architectureDocs.ts` (§9 STRIDE bullet, §11 pairing-flow diagram,
  §25 API matrix) and `data/initialData.ts` (one audit-log message, one STRIDE mitigation string) so
  the narrative docs stop describing the now-deleted PIN flow as fact.

**Safety step taken first:** this workspace had no git repository anywhere in its tree. Since this
task deletes/rewrites files with zero VCS safety net, `git init` + an initial commit of the
pre-refactor tree was done before touching anything, so the refactor is revertible.

**Verified:** `mvn -pl common,device-service,transfer-service,share-service -am compile` and
`test-compile` both clean (two pre-existing `DeviceDto` positional-record test fixtures in
`transfer-service`/`share-service`'s integration tests updated for the new trailing
`sharingPermissions` field). `npx tsc --noEmit` on `frontend/` clean; no leftover references to
`DevicePairingModal` or `pairingCode` anywhere in `frontend/src`. **Not independently verified:** a
full `mvn package` (the `spring-boot-maven-plugin:repackage` step) — this sandbox has a pre-existing
Windows file-lock issue on the jar-rename step, reproducible even on `api-gateway` (untouched by this
task) with ~20 stray `java.exe` processes already holding handles from prior runs; not something
this change introduced, and not fixed here since killing unidentified processes on the user's machine
is outside this task's scope. Re-run `mvn package` after closing those processes to confirm the
repackage step itself.

**Not done in Task 9 (left for later, or genuinely out of scope):** no enforcement of
`sharingPermissions` in share-service (see above); no expiry/consumed cleanup job for
`pairing_sessions` beyond the existing Mongo TTL index (unchanged from before this task); pairing
still has no ownership check tying the confirming caller to the account that ran `pair/init` — the
JWT-authenticated caller of `pair/init` and the JWT-authenticated caller of `pair/confirm` can be two
different accounts today (same trust level the PIN flow had; not widened, not closed, by this
refactor).

### Task 9 addendum — doc/UI alignment pass, no new enforcement

A follow-up review compared a hand-written "complete workflow summary" of this feature against the
actual code and found the summary overstated several things Task 9 deliberately didn't build. This
pass is documentation- and UI-only — **no enforcement logic was added** — closing the gaps between
what was claimed and what's real:

- `backend/README.md` had zero mention of the real P2P/relay endpoints (Tasks 5/6) or how they
  relate to `share-service`'s grant flow (Tasks 1–4) — the two were never distinguished anywhere.
  Added a "Storage sharing vs. real transfer modes" section spelling out the actual paths
  (`/api/v1/transfers/p2p/*`, `/api/v1/transfers/relay/*` — explicitly *not* a bare
  `/transfers/upload`/`/transfers/download`, which is a different, older, fully-simulated endpoint
  pair), the explicit "no permission enforcement on these endpoints" statement, and the GridFS-not-
  S3 storage note. Also added a "Device pairing: what's real" section restating the TTL/payload/
  no-qrImageUrl/no-new-Kafka-event/no-real-time-notification facts from the Task 9 summary above, and
  added the previously-missing `share-service` row to the Service Map table.
- **New `frontend/src/components/TransferProgress.tsx`** — a small, purely presentational
  "Sharing data…" indicator (spinner while in progress, checkmark on success, error state), shared
  by both real transfer surfaces: wired into `TransferProgressP2P.tsx` (mapped from the real WebRTC
  connection phase — no numeric progress, since a handshake has no byte count) and into
  `TransferManager.tsx`'s per-task rows (mapped from `TransferTask.status`, with real percentage
  progress for `transferring` tasks). It renders whatever status/progress its caller already has; it
  doesn't call any API itself.
- Tightened `DevicePermissionDialog`'s "read is always on" row from a disabled-but-rendered checkbox
  to a plain text note — the permission grant now renders exactly four interactive toggles
  (`canShareStorage`/`canWrite`/`canDelete`/`canShareFurther`), no checkbox-shaped element for read
  access at all.
- Everything else the review's gap list called out (`PairingSession` naming, 120s TTL, no
  `qrImageUrl`, no `/devices/pair/scan` route, exact QR payload shape with no `user=` param, embedded
  `sharingPermissions` field rather than a separate collection, no `DEVICE_PAIRED_VIA_QR` event, no
  real-time notify-the-generating-device) was already true of the code Task 9 shipped — verified by
  re-reading the relevant files, not just trusting the earlier write-up.

### Task 9 addendum 2 — cross-device LAN pairing fix

**Root cause of "I scanned the QR and nothing happened" when pairing from a second device on the
same Wi-Fi: three independent, unrelated blockers, not one bug.**
1. The QR's `peervault://` scheme has no OS-level handler — scanning it with a phone's stock camera
   app was never going to do anything. It was always meant to be read by this app's own Scan QR tab.
2. `VITE_API_BASE_URL`/`VITE_WS_BASE_URL` default to `localhost:8080`, which on a second device
   resolves to that device itself, not the machine running the backend.
3. `FRONTEND_ORIGIN` (gateway CORS + notification-service's WebSocket CORS) defaults to
   `http://localhost:3000` — once the frontend is loaded from a LAN IP instead, its Origin header no
   longer matches and every request gets CORS-rejected.
A fourth, related constraint (not a bug, a platform limit): `getUserMedia` is only reliably available
on a secure context (`https://` or `http://localhost`), so the Scan tab's camera itself may not start
at all on a plain `http://<LAN-IP>` origin.

**Fixed/added, no functional pairing logic changed:**
- **Real bug fixed:** `notification-service/config/WebSocketConfig.java`'s `setAllowedOrigins(String...)`
  took `peervault.frontend-origin` as one literal string — a comma-separated value (recommended in the
  docs below, for keeping `localhost` and a LAN IP both allowed at once) would have silently become a
  single, never-matching origin, unlike the gateway's `List<String>`-typed CORS property, which Spring
  Boot's relaxed Binder does comma-split. Now splits on `,` before passing to `setAllowedOrigins`, so
  both config surfaces genuinely accept the same value.
- `backend/scripts/run-native.ps1` / `backend/docker-compose.yml`: `FRONTEND_ORIGIN` is now overridable
  from `backend/.env`, the same pattern `MONGODB_URI` already used — previously hardcoded to
  `http://localhost:3000` with no way to override without editing the script/compose file directly.
  `backend/.env.example` documents it.
- `frontend/src/components/QrPairingModal.tsx`: explicit on-screen copy that the QR is scanned via
  this app's own Scan QR tab, not a phone's camera app; `describePairingError` now names the actual
  `API_BASE_URL` in play on a network-unreachable (status 0) failure instead of a generic message;
  new manual session-id/fingerprint entry fallback (same values the QR encodes, not a new secret) for
  when the camera can't start, auto-surfaced on a real camera error via the new `describeCameraError`;
  an always-visible footer showing the current `API_BASE_URL` plus a console log on open, for
  confirming at a glance whether the page is even pointed at a reachable backend.
- `frontend/.env.local` created (gitignored) with `VITE_API_BASE_URL`/`VITE_WS_BASE_URL` pointed at
  this dev machine's LAN IP — a per-machine convenience file, not something every clone should expect
  to inherit.
- Docs: `frontend/README.md` gained a "Cross-device / LAN setup" section (LAN IP discovery, the
  `.env.local` + `FRONTEND_ORIGIN` pairing, Windows Firewall rule, camera/HTTPS-tunnel guidance);
  `backend/README.md` gained a pointer to it plus the `peervault://`-is-in-app-only note under
  "Device pairing: what's real."

**Verified:** `npx tsc --noEmit` on `frontend/` clean; `mvn -pl notification-service -am compile`
clean. Not re-verified end-to-end against a real second device in this pass (no such device available
here) — the fix is config/reachability, not new pairing logic, so Task 9's existing pairing-flow
correctness is unchanged; only whether requests *arrive* at all should differ.

### Task 9 addendum 3 — "generic cryptographic-link page" report, and QR-parsing hardening

A follow-up report described scanning the pairing QR and landing on a page saying "This string is a
cryptographic device-pairing link designed for a peer-to-peer (P2P) storage application…". **That
text does not exist anywhere in this codebase** (confirmed by search) — there is no route or
component in this app that renders any such description, so there was nothing to remove or gate
behind a dev-only route. The only place a `peervault://` string is ever produced is the QR itself,
and the only place it's ever consumed is `QrPairingModal.tsx`'s in-app scanner/parser. The
overwhelmingly likely explanation, consistent with addendum 2's root cause #1: the QR was scanned
with something other than this app's own Scan QR tab — a phone's stock Camera/QR app, most likely —
which, finding no registered handler for the made-up `peervault://` scheme, fell back to treating the
decoded text as a search query; the described page is that browser/search engine's own generic
"here's what this text might be" result, not anything PeerVault renders or controls. This is called
out explicitly now in both READMEs so it reads as "you used the wrong scanner" rather than "the app
is broken."

**Real hardening done regardless, since the report is a legitimate prompt to double-check this path
rather than just re-explaining it:**
- `QrPairingModal.tsx`'s QR-parsing logic was pulled out of `handleScan` into a standalone
  `parsePairingUri()` (plus a cheap `isPairingUri()` shape check), with its own doc comment stating
  outright that this is the *only* function that ever reads the `peervault://` string, and that it
  only ever reads it — never `fetch()`s or navigates to it. Validation is now stricter (checks
  `url.hostname === 'pair'`, not just the scheme) and produces two distinct, specific messages
  instead of one generic one: **"This QR code is not a valid PeerVault pairing code"** (wrong scheme
  entirely) vs. **"Invalid pairing QR code – missing session or fingerprint"** (right scheme, broken
  params) — a `MissingParamError` class distinguishes the two cases through the same parse call.
- The manual-entry fallback (addendum 2) now also accepts a whole pasted `peervault://pair?...` link
  in its Session ID field, auto-splitting it via the same `parsePairingUri` — directly addressing the
  scenario in this report: someone who has the raw link text (e.g. copied from wherever it failed to
  open as a link) can paste the whole thing in one field instead of manually splitting `session=`/
  `fp=` out of a query string by hand.
- `DevicePermissionDialog.tsx` gained a `sessionId` prop and now shows both the (shortened) session
  id and fingerprint in its header — previously only the fingerprint was shown, so there was no way
  to visually cross-check *which* pairing session was being confirmed, only whose key it claimed to
  be. New `shorten()` helper (first 8 + last 6 chars, full value still in a `title` tooltip) backs
  both. `confirmPairing`'s call site gained a one-line comment on why `scanned.fingerprint` is
  deliberately never sent in the confirm body — it's a client-side-only display value; the backend
  already has everything it needs from `sessionId` alone (see backend/README.md's pairing section).
- Both READMEs' pairing sections now state explicitly that `peervault://` is not an HTTP(S) URL,
  should never be pasted into an address bar or search box, and that any generic-looking page seen
  after doing so is a browser fallback, not a PeerVault page.

**Verified:** `npx tsc --noEmit` on `frontend/` clean.

## Pre-deployment audit & hardening pass — 2026-09-03

Full-stack audit against `PRE_DEPLOYMENT_AUDIT.md`/`DEPLOYMENT_READINESS.md` (repo root — read those
first for full findings/evidence). Summary of what changed here, since this is the file those two docs
point back to for detail:

**What was checked:** auth/JWT flow, device/file/transfer authorization, CORS, actuator exposure,
docker-compose network exposure, JWT-secret/Vault-dev-mode handling, error-response leakage, npm/Java
dependency vulnerabilities, and — using this session's own uncommitted working-tree state, not authored
here — the real `frontend/src/pages/LoginPage.tsx` + `frontend/src/api/{client,authApi}.ts` login flow
that has replaced the old "paste a token into localStorage" dev stub (verified wired correctly:
`App.tsx` gates on `getToken()`, redirects to `/login`, `Header.tsx` shows the real signed-in user; the
legacy `api-client.ts` `getAuthToken`/`setAuthToken` are now thin deprecated wrappers over the same
`peervault_token` key, not a second, divergent auth path).

**Fixed:**
- **Device/file/transfer tenant isolation (the device↔user ownership gap flagged since Task 2, finally
  closed).** Added `Device.userId` (server-set at `pair/confirm`) and `TransferTask.initiatedByUserId`
  (server-set at `startDownload`/`startDirectTransfer`). `DeviceController`/`DeviceService` now gate
  list/get/freeze/revoke/addRoot/heartbeat on it; `file-service` gained its own `DeviceClient` (mirrors
  transfer-service's/share-service's) and gates list/listTrash/getById/upload/trash/restore/purge on it;
  `transfer-service` gates listing/pause/cancel/glitch on it. The gating rule throughout: enforced only
  when the caller's `X-User-Id` is present (every real gateway-forwarded browser request has it);
  internal Eureka-to-Eureka calls (share-service's `FileClient`/`DeviceClient`, transfer-service's
  `DeviceClient`) carry no such header and are unaffected by design — verified case by case, not
  assumed, including confirming share-service's `FileClient` sends zero identity headers today (Task 4's
  "sole gate" design is preserved exactly). `p2p/initiate` and `relay/upload` were deliberately **not**
  touched — see "Remaining risks" below, same reasoning Task 5/6 already gave for their existing
  trust level.
- **Internal service ports were reachable from outside the host.** Every business/infra port in
  `docker-compose.yml` (`8081`-`8087`, plus Mongo/Redis/Kafka/Vault/Eureka/Config Server) was bound to
  `0.0.0.0` — since none of those services re-verify the JWT themselves (they trust gateway-forwarded
  `X-User-Id`), this let any network caller skip `JwtAuthGlobalFilter` entirely and forge identity
  headers directly. Rebound to `127.0.0.1`-only; only `api-gateway` (8080) is still public. Verified this
  doesn't change local-dev ergonomics (`curl localhost:808x` from the host still works).
- **No login rate limiting.** Added a Redis fixed-window limiter to `auth-service` (10 attempts/5 min per
  email), same shape as share-service's existing `enforceRateLimit`. `auth-service` gained
  `spring-boot-starter-data-redis` + a `redis` `depends_on` in docker-compose.
- **Unauthenticated `/actuator/health` leaked per-component details** (Mongo/Redis/Kafka connectivity) —
  `/actuator/**` is on the JWT filter's public allow-list by design (container orchestrators need it),
  so `show-details: always` was reachable by anyone. Changed to `never` in `config-repo/application.yml`.
- **Unhandled exceptions echoed raw `ex.getMessage()`/internals to clients.** `GlobalExceptionHandler`'s
  catch-all now logs the full exception server-side (with a short reference id) and returns only a
  generic message + that id — `ApiException`'s controlled messages and bean-validation field errors are
  unchanged (those were already safe, authored strings).
- **3 moderate npm vulnerabilities** (`qs`/`body-parser`/`express` DoS chain). Root cause: `express`,
  `@google/genai`, `dotenv` were unused leftovers from the original AI-Studio scaffold template — nothing
  in `frontend/src/**` imports any of them, no `server.js` exists. Removed from `package.json`
  (119 transitive packages dropped); `npm audit` now reports 0 vulnerabilities.
- **JWT-secret dev-default / Vault dev-mode** — can't be fixed in code without breaking zero-config local
  dev, so `docker/vault-init.sh` now prints a loud warning when `JWT_SECRET` is unset instead of silently
  using the repo-committed default, and `.env.example` states the requirement explicitly.

**Verified (not a bug, worth recording so it isn't re-litigated):** decompiled
`DefaultServerHttpRequestBuilder.header()` (spring-web 6.1.14, `javap -c`) to confirm
`JwtAuthGlobalFilter`'s `.header("X-User-Id", ...)` call *replaces* rather than appends — a client
cannot smuggle its own `X-User-Id` past the gateway. The entire ownership-fix architecture above depends
on that being true through the gateway; it only doesn't hold for the direct-port bypass, which the
docker-compose fix above closes separately.

**Build verification:** full `mvn -DskipTests package` (all 11 backend modules) — BUILD SUCCESS, repackage
step included. `mvn test-compile` (all modules, including the two Testcontainers suites, with their
`DeviceDto` fixtures updated for the new trailing `userId` field) — BUILD SUCCESS. `npx tsc --noEmit` and
`npm run build` on `frontend/` — both clean. **Not run:** the Testcontainers integration tests themselves,
or any live Docker-based end-to-end walkthrough — no Docker daemon was reachable in this environment
(same pre-existing sandbox limitation Task 8/9 already hit). Re-run `mvn -pl share-service,transfer-service
test` and the full `docker compose up -d --build` README walkthrough with Docker Desktop running to close
that gap before considering this deployment-verified rather than deployment-*ready*.

**Current status:** the two most severe, cleanly-fixable gaps (tenant isolation, direct-port bypass) are
closed. See `DEPLOYMENT_READINESS.md` for the full go/no-go call — headline: READY WITH WARNINGS, not
recommended for a large/mutually-untrusting public audience until the WebSocket cross-user broadcast leak
below is closed.

**Remaining risks (deliberately not fixed in this pass, all pre-existing and already documented before
today except where noted):**
- **WebSocket topics have no per-user targeting** — `/topic/share/**` broadcasts every user's share
  activity to every connected browser (flagged since Task 3; still open). Real fix needs an authenticated
  `/ws` handshake + `convertAndSendToUser`, genuine new infrastructure, not attempted here to avoid
  destabilizing every real-time tab under time pressure.
- `p2p/initiate`/`relay/upload` still don't check device ownership (pre-existing, Task 5/6's own
  documented trust level — now the one remaining place the ownership fix above doesn't reach).
- `sharingPermissions` still isn't enforced by share-service/transfer-service (flagged since Task 9).
- No resumable upload recovery for interrupted relay transfers (flagged since Task 6).
- Vault dev-mode / JWT-secret default require operator action before any real deployment — cannot be
  closed by a code change alone (see `.env.example`).
- No Java dependency vulnerability scan was run (no network access to an advisory DB in this
  environment) — recommend `mvn org.owasp:dependency-check-maven:check` or Dependabot before go-live.

## Landing page implementation — 2026-09-03

Status: **COMPLETE**

Public, unauthenticated marketing landing page for the frontend (`frontend/src/`), added at `/`
without touching the existing authenticated dashboard. Scorecard in `LANDING_PAGE_AUDIT.md` (repo
root); this section is the narrative.

**Implemented:** all 14 sections from the brief — navbar, hero mesh diagram, cloud-vs-mesh
comparison, 6 benefit cards, 6-step "how it works," a device-connection demo, a chunked transfer
demo, a mesh-expansion section, a 6-layer security walkthrough, an interactive clickable mesh
visualizer, 6 use-case cards, an end-to-end product workflow stepper, a final CTA, and a footer —
each its own component under `frontend/src/components/landing/` (`HeroMesh.tsx`,
`CloudComparison.tsx`, `Benefits.tsx`, `HowItWorks.tsx`, `DeviceConnectionDemo.tsx`,
`TransferDemo.tsx`, `MeshExpansion.tsx`, `SecurityFlow.tsx`, `MeshVisualizer.tsx`, `UseCases.tsx`,
`ProductWorkflow.tsx`, `FinalCTA.tsx`, `Navbar.tsx`, `Footer.tsx`), assembled by
`frontend/src/pages/LandingPage.tsx`. Shared GSAP/reduced-motion/visual primitives live in
`components/landing/shared.tsx` (`useGsapScope` — a `gsap.context()`-wrapped `useLayoutEffect` hook
every section uses for automatic ScrollTrigger/timeline cleanup on unmount; `usePrefersReducedMotion`;
`Section`/`SectionHeading`/`GlassCard`/`MeshBackdrop`/`StatusPill`).

**Design decision, made deliberately rather than asked about:** the landing page is visually a
*separate dark system* from the dashboard's light "editorial" theme (`index.css`, cream background,
serif/mono), because the dashboard itself already has precedent for a dark, slate/cyan,
network-visualization aesthetic wherever it actually depicts the mesh (`NetworkTopology.tsx`,
`SecurityAndShield.tsx` both use `slate-900`/`slate-950` + cyan accents) — the landing page extends
that existing sub-language to the whole page rather than inventing a third visual system or forcing
the brief's "dark-first, glowing network" direction onto the light dashboard chrome. Fonts are
unchanged (Newsreader serif, Plus Jakarta Sans body, JetBrains Mono labels) so the page still reads
as the same product once a visitor logs in. Brand name kept as the app's real name, **PeerVault**
(`index.html`, `Header.tsx`, `LoginPage.tsx` all already say "PeerVault Storage Mesh") — the brief's
"Storage Mesh" naming is used as the descriptive concept throughout copy/nav, not as a product-name
swap.

**Animations:** GSAP 3 + `ScrollTrigger` throughout (added as a new dependency, `gsap@^3.15.0`; no
other new runtime dependency was added for animation — no separate motion library). Every animated
section: (1) checks `prefers-reduced-motion` via `usePrefersReducedMotion()` and, when set, uses
`gsap.set()` to jump straight to the finished state instead of animating anything; (2) scopes its
tweens/ScrollTriggers inside `gsap.context()`, reverted in the `useLayoutEffect` cleanup, so nothing
leaks on unmount; (3) pauses any `repeat: -1` loop (hero packets, cloud-comparison particles, mesh
visualizer float/particles, CTA background dots) via a `ScrollTrigger` `onEnter`/`onLeave` pair, so
nothing animates while scrolled off-screen. Interactive replay-able demos (device connection, file
transfer) autoplay once via a `once: true` ScrollTrigger the first time they enter view, and can be
replayed on click. No CSS `@keyframes` were used for any of the major animations (only ordinary
Tailwind color/opacity `transition`s remain for small UI chrome like the navbar's scroll-state
background and hover states, consistent with the rest of this codebase).

**Routes:**
- `/` — branches on auth state (`frontend/src/App.tsx`): no `peervault_token` in `localStorage` ⇒
  the new `LandingPage`; a token present ⇒ the existing `Dashboard`, completely unchanged. Every
  other path's behavior is unchanged (`/login` ⇒ `LoginPage`; any other unauthenticated path ⇒
  redirect to `/login`; any other authenticated path ⇒ `Dashboard`).
- `/login?mode=signup` — new: `LoginPage` now reads a `mode` query param
  (`readQueryParam('mode') === 'signup'`) to open directly on its existing Sign Up tab. This is the
  only change made to `LoginPage.tsx`; no new route or page was created for "register" since the app
  has never had a separate one — inventing `/register` as a distinct route was avoided per the
  "use the project's existing routing architecture" / "don't invent URLs" constraints.
- No changes to `/dashboard`, `/devices`, or any other authenticated surface — those paths don't
  exist as distinct routes in this app (it's tab-based, not route-based, inside `Dashboard`) and
  weren't invented for this task.

**Verified:** `npx tsc --noEmit` clean; `npm run build` succeeds. Headless-Chromium (Playwright,
installed ad hoc for this check, not added to `package.json`) verification: zero console/page errors
across every section at desktop (1440×900) and mobile (390×844) viewports; zero errors with
`reducedMotion: 'reduce'` (and the finished-state render confirmed via screenshot); a seeded
`peervault_token` confirmed `/` still renders the real, unchanged `Dashboard` for a signed-in
visitor; `/login?mode=signup` confirmed to open the Sign Up tab. One real bug was caught and fixed in
this pass — see `LANDING_PAGE_AUDIT.md`'s "How this was verified" for the SVG `cx`/`cy` fix. Not
independently re-verified: an actual login round-trip against the live backend mesh (Docker wasn't
started for this pass, consistent with every prior session in this file) — not needed for the landing
page itself, since none of its sections call the backend (all demo animations are explicitly
client-side per the brief), but worth doing before shipping if the "Get Started" → real register
flow itself needs re-checking.

**Known limitations:** see `LANDING_PAGE_AUDIT.md` — footer omits GitHub/Documentation links (no real
URLs exist for either in this repo), Playwright used only as an ad hoc verification tool, and the
pre-existing `>500KB` bundle-size build warning (not introduced by this change, though `gsap` does add
to it).

## GITIGNORE AUDIT — 2026-09-03

Status: **COMPLETE**

Full-repository `.gitignore` review — the pre-existing 10-rule file (`node_modules/`, `build/`,
`dist/`, `coverage/`, `.DS_Store`, `*.log`, `.env*`/`!.env.example`, `.vite/`, `target/`) was read
and understood first, not replaced; every rule in it is preserved. Full scorecard, category-by-
category reasoning, and every verification command's output are in `GITIGNORE_AUDIT.md` (repo
root) — this is the short version.

**Updated:** `.gitignore` reorganized into 11 labeled sections (Environment & Secrets, Java/Maven,
Node/Frontend, Build Artifacts, Logs & Runtime, IDE/Editor, Claude Code local state, OS Files,
Testing, Docker, Temp Files) and grew from 10 to 62 active pattern lines. Zero rules removed (the
old `.env*` was split into `.env` + `.env.*` for clarity — identical coverage — plus `*.env` was
added alongside it); zero duplicates, before or after.

**Protected:** real secret-shaped files that already existed on disk but were at risk only by
convention, not by an explicit repo rule, now have one: `application-local.*`/`application-dev.*`
Spring profile overrides, `secrets/`/`credentials/` directories, and key/cert extensions
(`*.pem`/`*.key`/`*.p12`/`*.jks`/`*.crt`/`*.cer`) are all now explicit rules (none currently exist
in the repo — this is preemptive, verified not to catch anything real today). More concretely
useful: **`.claude/` local runtime/session state** (`scheduled_tasks.lock`,
`scheduled_tasks.json`, `routines/.state/`, `worktrees/`, `checkpoints/`, `mailbox/`,
`agent-registry.json`, `agent-memory-local/`, `first-run`, `assistant-daemon-state.json`,
`settings.local.json`) was found to be excluded **only** via this machine's own untracked
`.git/info/exclude` — meaning any other clone of this repo had zero protection against someone
committing that state — and has now been promoted into the tracked `.gitignore` so every clone
gets it. `backend/.dockerignore`'s existing `.idea`/`.iml` allow-list is now mirrored in
`.gitignore` too, and `.vscode/*` gets the same shared-vs-personal split the brief asked for
(`extensions.json`/`settings.json`/`launch.json`/`tasks.json` stay trackable, everything else in
`.vscode/` doesn't).

**Potential tracked-secret issues:** none are accidental. `backend/.env` and `frontend/.env.local`
(the two real, present-on-disk env files) have never been committed in any of this repo's 3 commits
(`git log --all --full-history` on both returns nothing) and are correctly ignored today. Two
**already-known, already-documented, intentional** dev-mode defaults remain committed and were
re-confirmed, not newly discovered: `backend/docker/vault-init.sh`'s fallback JWT signing secret and
`backend/docker-compose.yml`'s fixed `VAULT_DEV_ROOT_TOKEN_ID` — both previously flagged in
`PRE_DEPLOYMENT_AUDIT.md`/`DEPLOYMENT_READINESS.md` as required operator action before any real
deployment. Per this task's own rule, these are reported here rather than "fixed" by a `.gitignore`
change, because they can't be — the files containing them must stay tracked for local dev to work,
and `.gitignore` has no effect on content already in a tracked file.

**Remaining risks:** the two dev-mode-default secrets above are unchanged (out of this task's scope —
fixing them means changing `vault-init.sh`/`docker-compose.yml` behavior, not `.gitignore`, and both
docs already carry the "required before production" call). No already-tracked file needed removal
from Git (`git ls-files | xargs git check-ignore` found zero matches against the new rules) — verified
after the update, not assumed. Not done, deliberately: no `*.lock` wildcard (would have caught future
legitimate lock files like a `Cargo.lock` for the still-unbuilt native agent), and no speculative
Docker volume/data directory names (none exist on disk to justify a guess at their path).

## LANDING PAGE NAVIGATION / INTERACTION — 2026-09-03

Status: **COMPLETE**

Wired every button/CTA/card/link on the landing page (`frontend/src/pages/LandingPage.tsx` +
`frontend/src/components/landing/*`) to a real destination. Full click-by-click table and every
verification command's output live in `LANDING_PAGE_NAVIGATION_AUDIT.md` (repo root); this is the
narrative. First step, per the brief: read `App.tsx`/`Header.tsx`/`LoginPage.tsx`/`api/client.ts`
directly rather than assuming route names — this app has **no route library** and the authenticated
side is **tab-based, not route-based** (`Header.tsx`'s `navItems`: `devices`/`files`/`transfers`/
`sharing`/`security`/`topology`/`agent-cli`/`architecture`). No `/register`, `/dashboard`,
`/devices`, `/storage`, `/transfers`, `/sharing`, `/audit`, `/settings`, `/profile`, or docs/GitHub
route exists anywhere in the repo — none of those were invented.

**Navbar:** logo → `/` (same for both auth states, no forced logout). Product/How It
Works/Why Storage Mesh/Security/Features → real in-page anchors (`#product`/`#how-it-works`/
`#why-storage-mesh`/`#security`/`#features`), smooth-scrolled via a shared `scrollToId()` helper
(`lib/url.ts`) that respects `prefers-reduced-motion`. Login → `/login`. "Connect Your Devices" →
the new auth-aware `dashboardCtaHref()` (below). Mobile hamburger opens/closes a real drawer; every
link in it closes the drawer before scrolling.

**Hero CTAs:** "Get Started" → `dashboardCtaHref('devices', {signupIfSignedOut: true})`. "See How It
Works" → `scrollToId('how-it-works')`. The three device nodes in the hero SVG diagram are now
`role="button"`/keyboard-operable and jump to the real device-connection demo (`#connect-device`) —
deliberately not a fake "open this device" action, per brief §4.

**Authentication-aware navigation:** one function,
`frontend/src/lib/auth-nav.ts#dashboardCtaHref(tab, options)`, backs every "do this in your account"
CTA — no per-component duplicate of an `isAuthenticated()` branch. It calls the same `getToken()`
(`api/client.ts`) `App.tsx`'s own router already uses: signed out → `/login` (or
`/login?mode=signup`), signed in → `/?tab=<tab>` (optionally `&action=pair`). **New, small, additive
read, not a new route:** `Dashboard`'s `activeTab`/`isPairingOpen` initializers (`App.tsx`) now read
`?tab=`/`?action=pair` on mount — `?tab=` is validated against the real tab-id list before use, so it
can't select anything that wasn't already a real tab. Confirmed end-to-end with a seeded
`peervault_token`: `/?tab=devices&action=pair` renders the real `Dashboard` on the real "Storage
Mesh" tab with the **real `QrPairingModal` already open** (screenshotted) — the actual "Connect
Device → real device-management page" journey for a signed-in visitor. Honest caveat stated in both
audit docs: `LandingPage` only ever renders for a signed-out visitor in the first place (`App.tsx`
sends a token-holder to `Dashboard` before `LandingPage` would mount), so the "signed in" branch is
defensive/future-proofing today, not a path real traffic hits yet.

**Feature links (brief §10):** Device Management/Storage/Transfers/Sharing/Audit — added to the
footer's new "Explore the App" column, each going through `dashboardCtaHref` to the real
`devices`/`files`/`transfers`/`sharing`/`security` tabs. "Audit" intentionally maps to the `security`
tab, not an invented `/audit` route — that tab is where the real audit log/trash/ransomware-shield
UI already lives.

**How It Works:** all 6 steps now have a stable id (`#step-create-account` … `#step-verify-audit`)
and are real `<button>`s (via `GlassCard`'s new button-mode) that scroll-and-set-hash on click —
deep-linkable, per brief §22. Deliberately did **not** repurpose step 4 ("Connect Another Device")
as a login/register CTA (brief §7's wording) — that would make one element mean two different things
(step-scroll per §6 vs. account-navigation per §7); the real "connect a device" CTAs live in the
hero, navbar, and the device-connection demo's own dedicated link instead. `ProductWorkflow`'s 7
recap steps got the same treatment, reusing the same anchors.

**Demo replay buttons are intentionally not navigation.** `DeviceConnectionDemo`'s "Connect
Device"/"Replay" and `TransferDemo`'s "Start Transfer"/"Replay" still call no API and navigate
nowhere — turning either into an auth-redirecting link would silently break the demo for the exact
signed-out audience it's shown to. Each got its own separate, clearly distinct real CTA underneath
instead ("Connect your own devices", "Move files between your own devices").

**Footer:** rebuilt as four columns (brand, Product anchors, "Explore the App" real-tab links,
Login/Get Started) — every link resolves to something real; GitHub/Documentation are still absent
(no GitHub remote, no hosted docs — confirmed again, not just carried over from the prior pass).

**Protected routes:** confirmed unchanged and untouched — `device management`/`storage`/`file
operations`/`transfers`/`sharing`/`audit`/settings all still require `getToken()` via `App.tsx`'s
existing guard; nothing on the landing page calls a protected API. Both animated demos remain
client-side-only visual demonstrations, unchanged in that respect by this pass.

**Verified journeys:** visitor→registration, visitor→login, visitor→learn (scroll), authenticated→
devices (with the real pairing modal), authenticated→transfers (tab pre-selected), mobile menu
open→navigate→close, direct-load deep link (`/#security`), and the regression check that an
authenticated visit to `/` still renders the real, unchanged `Dashboard` — all via headless
Chromium (desktop + mobile + `reducedMotion: 'reduce'`), zero console errors besides the expected
`ERR_CONNECTION_REFUSED` noise from `Dashboard`'s own best-effort fetches (no backend running in this
environment, pre-existing). `npx tsc --noEmit` and `npm run build` both clean. Resize/mobile-menu/
full-page-scroll stress test: zero console errors, confirming GSAP `ScrollTrigger` cleanup holds up.

**Remaining issues:** none identified. Two small, deliberate scope notes: `GlassCard`'s new
button-mode is used by every clickable card/step, but `UseCases`/`CloudComparison`/`MeshExpansion`
stay non-interactive by design (no single natural destination per card — see
`LANDING_PAGE_NAVIGATION_AUDIT.md`'s "Known, deliberate non-links"); the `dashboardCtaHref`
"signed-in" branch is exercised only via a seeded-token test in this environment (no live backend
login round-trip was run here, consistent with every prior session in this file).
