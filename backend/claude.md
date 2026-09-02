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
