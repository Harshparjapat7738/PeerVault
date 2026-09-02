export interface ArchitectureDeliverable {
  id: string;
  sectionNumber: number;
  title: string;
  category: 'Strategic' | 'Architecture' | 'Security' | 'Flows' | 'System Design' | 'Execution';
  summary: string;
  content: string;
}

export const ARCHITECTURE_SECTIONS: ArchitectureDeliverable[] = [
  {
    id: 'sec_01_verdict',
    sectionNumber: 1,
    title: 'Executive Verdict & Core Thesis',
    category: 'Strategic',
    summary: 'Personal Distributed Storage Mesh transforms user hardware into a private, zero-trust cloud without central plaintext storage.',
    content: `### Executive Verdict: Strong Go (8.5/10)

The **Personal Distributed Storage Network (PeerVault / DeviceMesh)** solves the fundamental problem of multi-device fragmentation:
> *"My data is on my home workstation or NAS, but I am travelling with only my laptop or phone."*

#### Core Architectural Paradigm
1. **Zero-Trust Separation:** The Central Platform acts as a **Control Plane** (Identity, Ephemeral Session Negotiation, Device Registry, Audit, and NAT Signaling) while the user's hardware forms the **Data Plane** (P2P direct encrypted file streaming).
2. **Zero-Knowledge by Design:** The cloud service never stores, inspects, or decrypts user files. Encrypted relay fallback acts solely on ciphertext blocks with ephemeral session keys.
3. **Fail-Closed Security:** Storage agents operate with least privilege, sandboxed to explicit user-approved roots (/Documents, /Projects), with absolute kernel-level blocking of system paths (/etc, C:\\Windows, ~/.ssh).`
  },
  {
    id: 'sec_02_product_spec',
    sectionNumber: 2,
    title: 'Product Definition & Target Archetypes',
    category: 'Strategic',
    summary: 'Functional scope, user personas (Developers, Homelab, Creatives), and core feature matrix.',
    content: `### Product Definition & Boundaries

#### Target Personas
- **Software Engineers & Homelabbers:** Manage code repos, datasets, and server storage across laptops, desktop rigs, and TrueNAS boxes.
- **Content Creators & Videographers:** Access massive 4K RAW video files stored on 16TB home NAS without paying $100s/month for cloud object storage.
- **Privacy-First Professionals:** Access confidential legal, medical, or proprietary documents without third-party cloud exposure.

#### Out-of-Scope Anti-Goals (Do Not Build)
- ❌ Do NOT turn devices into public HTTP file servers.
- ❌ Do NOT automatically mirror all files to central cloud storage.
- ❌ Do NOT expose raw OS filesystem hierarchies or arbitrary path execution.`
  },
  {
    id: 'sec_06_final_architecture',
    sectionNumber: 6,
    title: 'Final Architecture: Control Plane vs. Data Plane',
    category: 'Architecture',
    summary: 'Clean separation between stateless control plane signaling and high-throughput P2P data channels.',
    content: `### Control Plane vs. Data Plane Decomposition

\`\`\`text
┌────────────────────────────────────────────────────────────────────────┐
│                        PEERVAULT CONTROL PLANE                         │
│   (Auth / Session Vault / Device Registry / STUN-TURN Signaling / Audit)│
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ HTTPS / WSS Signaling            │ HTTPS / WSS Signaling
                   │ (TLS 1.3 + JWT Session Token)    │ (TLS 1.3 + JWT Session Token)
                   ▼                                 ▼
       ┌────────────────────────┐         ┌────────────────────────┐
       │   Laptop A (Source)    │         │  Phone B (Requester)   │
       │  Rust Storage Agent    │         │  Client Application    │
       │  Allowed: /Projects    │         │  Role: Read-Only       │
       └───────────┬────────────┘         └───────────┬────────────┘
                   │                                  │
                   │◄════════════════════════════════►│
                     Direct P2P Encrypted Data Channel
                     (Noise Protocol / WebRTC / QUIC)
                     
                     [Fallback Path if NAT Traversal Fails]:
                     Laptop A ──► Encrypted Relay ──► Phone B
                     (Relay receives ONLY AES-GCM / ChaCha20 Ciphertext)
\`\`\`

#### Component Roles
1. **Control Plane (Node.js/Go):** Coordinates authentication, device state, permission policy checks, and WebRTC/ICE candidate exchange.
2. **Storage Agent Daemon (Rust):** Runs locally on storage nodes. Enforces path sandboxing, canonicalization, local SHA-256 chunk hashing, and direct peer socket bindings.
3. **Encrypted Relay Layer (eBPF / Rust):** Stateless byte-forwarding relay when symmetric NAT prevents direct P2P. Has zero decryption capabilities.`
  },
  {
    id: 'sec_08_tech_stack',
    sectionNumber: 8,
    title: 'Technology Stack Selection & Trade-Offs',
    category: 'Architecture',
    summary: 'Selected: Rust for Storage Agent, TypeScript/React for UI, PostgreSQL for metadata, Noise/WebRTC for transport.',
    content: `### Technology Stack Matrix

| Layer | Chosen Technology | Alternatives Evaluated | Rationale & Trade-Offs |
| :--- | :--- | :--- | :--- |
| **Storage Agent** | **Rust** | Go, Java, C++ | Memory safety without GC pauses; native OS sandboxing (pledge/capsicum/AppArmor); compact static binary. |
| **Control Plane** | **TypeScript / Node.js** | Go, Java Spring | High developer velocity for signaling, rich WebSocket ecosystem, clean integration with web frontend. |
| **Frontend UI** | **React + Tailwind CSS** | Vue, Angular | Fluid responsive state management, rich data visualization (Recharts, D3, Lucide icons, Motion). |
| **Database** | **PostgreSQL (Relational)** | MongoDB, DynamoDB | ACID compliance for device permissions, RBAC/ABAC relational constraints, hash-chained audit ledgers. |
| **P2P Transport** | **WebRTC DataChannel / QUIC** | Raw TCP, VPN (WireGuard) | Built-in NAT traversal (STUN/ICE), multiplexed streams, reliable chunk ordering, native browser support. |
| **Encryption** | **Noise Protocol / ChaCha20-Poly1305** | Plain TLS, AES-CBC | Post-quantum friendly key exchange (X25519), authenticated encryption, low CPU overhead on mobile. |`
  },
  {
    id: 'sec_09_security_threat_model',
    sectionNumber: 9,
    title: 'Security Architecture & STRIDE Threat Model',
    category: 'Security',
    summary: 'Full STRIDE analysis covering Spoofing, Tampering, Repudiation, Info Disclosure, DoS, and Elevation of Privilege.',
    content: `### STRIDE Threat Model & Defense Mechanisms

1. **Spoofing (Device & Account):**
   - *Threat:* Rogue device attempts registration with cloned MAC/hostname.
   - *Mitigation:* Asymmetric ECDSA P-256 / Ed25519 keypairs stored in OS Secure Enclave / TPM; ephemeral 120s pairing PIN + out-of-band QR verification.

2. **Tampering (In-Transit Data):**
   - *Threat:* Man-in-the-Middle modifies file chunks during transfer.
   - *Mitigation:* Chunk-level SHA-256 checksums verified before writing to disk; ChaCha20-Poly1305 authenticated encryption.

3. **Repudiation (Disputed Actions):**
   - *Threat:* Compromised client claims it did not initiate file deletion.
   - *Mitigation:* Cryptographically signed operation tokens logged in an immutable, hash-chained audit log.

4. **Information Disclosure (Central Breach):**
   - *Threat:* Compromised central server exposes stored files.
   - *Mitigation:* Zero-Knowledge data plane. The central server never receives plaintext file contents or private encryption keys.

5. **Denial of Service (Ransomware Flood):**
   - *Threat:* Compromised agent executes mass remote delete of 50,000 files.
   - *Mitigation:* Destructive Action Shield: Soft-delete quarantine (30-day trash bin), deletion rate-limiting (max 20/min), anomaly detection circuit breakers.

6. **Elevation of Privilege (Sandbox Escape):**
   - *Threat:* Attacker issues \`../../etc/shadow\` or symlink attack to escape allowed folders.
   - *Mitigation:* Strict path canonicalization on the storage agent before any filesystem I/O; kernel-level directory isolation.`
  },
  {
    id: 'sec_11_pairing_flow',
    sectionNumber: 11,
    title: 'Cryptographic Device Pairing Flow',
    category: 'Flows',
    summary: 'Step-by-step handshake between New Storage Agent, Control Plane, and Authenticated User Device.',
    content: `### Step-by-Step Device Pairing Workflow

\`\`\`text
[New Storage Device]           [Control Plane]             [User Mobile / Web]
        │                              │                            │
        │ 1. Generate ECDSA Keypair    │                            │
        │    (Private key in TPM)      │                            │
        │ 2. POST /api/devices/pair    │                            │
        ├─────────────────────────────►│                            │
        │◄─────────────────────────────┤ 3. Return Session ID +     │
        │    Display 6-Digit PIN + QR  │    120s TTL Ephemeral Key  │
        │                              │                            │
        │                              │ 4. Scan QR / Enter PIN     │
        │                              │◄───────────────────────────┤
        │                              │ 5. Verify Biometric/Passkey│
        │                              │ 6. Select Allowed Roots    │
        │                              │    (/Projects, /Documents) │
        │ 7. Issue Device Certificate  │                            │
        │◄─────────────────────────────┤                            │
        │ 8. Acknowledge & Activate    │                            │
        ├─────────────────────────────►│ 9. Mesh Device Active       │
        │                              ├───────────────────────────►│
\`\`\``
  },
  {
    id: 'sec_24_database_ddl',
    sectionNumber: 24,
    title: 'Database Schema (PostgreSQL DDL)',
    category: 'System Design',
    summary: 'Production relational schema for Devices, Allowed Roots, Ephemeral Sessions, Files, and Immutable Audit Trail.',
    content: `### PostgreSQL DDL Specification

\`\`\`sql
-- Users and Accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    passkey_credential_id BYTEA,
    mfa_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registered Storage Devices
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(20) NOT NULL, -- 'laptop', 'desktop', 'nas', 'phone'
    os_type VARCHAR(20) NOT NULL,
    public_key_fingerprint VARCHAR(128) NOT NULL UNIQUE,
    agent_version VARCHAR(32) NOT NULL,
    status VARCHAR(20) DEFAULT 'online', -- 'online', 'offline', 'frozen', 'revoked'
    nat_type VARCHAR(20) DEFAULT 'restricted',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configured Storage Roots (Sandboxes)
CREATE TABLE storage_roots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    root_path VARCHAR(1024) NOT NULL,
    label VARCHAR(100) NOT NULL,
    is_read_only BOOLEAN DEFAULT FALSE,
    allow_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active & Historical Transfer Jobs
CREATE TABLE transfer_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    source_device_id UUID REFERENCES devices(id),
    target_device_id UUID REFERENCES devices(id),
    file_path VARCHAR(1024) NOT NULL,
    size_bytes BIGINT NOT NULL,
    transferred_bytes BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'queued',
    mode VARCHAR(20) DEFAULT 'p2p_direct',
    sha256_checksum VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Immutable Hash-Chained Audit Ledger
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    device_id UUID REFERENCES devices(id),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    authorized BOOLEAN NOT NULL,
    prev_log_hash VARCHAR(64) NOT NULL,
    current_log_hash VARCHAR(64) NOT NULL
);
CREATE INDEX idx_audit_device ON audit_logs(device_id, timestamp);
\`\`\``
  },
  {
    id: 'sec_25_api_endpoints',
    sectionNumber: 25,
    title: 'API Design & WebSocket Protocols',
    category: 'System Design',
    summary: 'RESTful control endpoints, WebSocket signaling protocols, and rate-limiting rules.',
    content: `### API Specification Matrix

#### 1. REST Control Plane Endpoints
- \`POST /api/v1/auth/passkey/verify\` — WebAuthn challenge & session JWT generation.
- \`POST /api/v1/devices/pair/init\` — Generate ephemeral 6-digit PIN & ECDH challenge.
- \`POST /api/v1/devices/pair/confirm\` — Out-of-band attestation and allowed root assignment.
- \`POST /api/v1/devices/:id/freeze\` — Emergency freeze node (revokes all active sessions).
- \`GET  /api/v1/devices/:id/files\` — Remote metadata query against authorized roots.
- \`POST /api/v1/transfers/orchestrate\` — Instruct Source Device to initiate P2P streaming to Target Device.

#### 2. WebSocket Signaling (WSS) Protocol
- \`MSG_TYPE: SIGNAL_ICE_CANDIDATE\` — Exchange STUN/TURN ICE candidates for P2P connection.
- \`MSG_TYPE: SIGNAL_OFFER / SIGNAL_ANSWER\` — WebSockets SDP negotiation.
- \`MSG_TYPE: HEARTBEAT_PING / PONG\` — Outbound health check with battery/standby metadata.`
  },
  {
    id: 'sec_36_claude_prompts',
    sectionNumber: 36,
    title: 'Ready-to-Build Claude Code Prompts',
    category: 'Execution',
    summary: 'Sequential, bounded execution prompts for incremental production development with CLAUDE.md memory.',
    content: `### Sequential Claude Code Build Prompts

#### Prompt 1: Core Cryptographic Agent Sandbox (Rust)
> "Implement the Rust Storage Agent sandbox module (\`src/sandbox.rs\`). Read \`CLAUDE.md\`. Ensure strict canonicalization using \`std::fs::canonicalize\` to prevent \`../\` path traversal and symlink escapes outside configured \`allowed_roots\`. Add unit tests testing directory traversal attack vectors. Update \`CLAUDE.md\` upon completion."

#### Prompt 2: Signaling Server & ICE Broker (TypeScript / Node.js)
> "Build the WebSocket signaling controller (\`src/server/signaling.ts\`). Implement SDP offer/answer exchange, ICE candidate routing between paired device IDs, and ephemeral token TTL validation. Enforce rate limiting of 50 signaling messages/sec. Add integration tests."

#### Prompt 3: Chunk Streaming & SHA-256 Verifier (Rust/WASM)
> "Create the chunked transfer engine (\`src/transfer/chunker.rs\`). Implement 256KB block chunking, ChaCha20-Poly1305 frame encryption, backpressure handling, and per-chunk SHA-256 rolling integrity verification. Add tests for simulated packet drops and transfer resumption."

#### Prompt 4: Destructive Action & Mass-Delete Rate Limiter
> "Build the Ransomware & Mass Deletion Shield (\`src/security/shield.ts\`). Enforce a 30-day soft delete quarantine buffer for all delete operations. Implement an anomaly detection trigger when more than 20 files are deleted within 60 seconds. Add unit tests for circuit breaker tripping."`
  },
  {
    id: 'sec_37_storage_sharing',
    sectionNumber: 37,
    title: 'Cross-User Storage Sharing',
    category: 'Flows',
    summary: 'Request/accept/reject lifecycle for granting another PeerVault account read/write/delete access to one of your storage roots, over either a direct WebRTC channel or server-mediated relay.',
    content: `### Cross-User Storage Sharing

Every flow so far in this brief is single-tenant: one person's own devices, mesh-internal. Sharing is
the first genuinely cross-user capability — granting a *different* PeerVault account scoped access to
one of your storage roots, without ever handing over a device's full filesystem.

#### 1. Request → Accept/Reject Lifecycle

\`\`\`text
  Requester Device                 share-service                  Target Device
        │                               │                               │
        │  POST /api/v1/share/request   │                               │
        │──────────────────────────────>│  ShareRequest{status:PENDING} │
        │                               │──── share-requests (Kafka) ──>│ (via /topic/share/requests)
        │                               │                               │
        │                               │  POST .../accept or .../reject
        │                               │<──────────────────────────────│
        │<── share-acceptances/-rejections (Kafka → /topic/share/status)│
\`\`\`

A share request carries \`storageRootId\`, a \`permissions\` set (\`read\`/\`write\`/\`delete\`, independently
grantable), a \`transferMode\` (\`direct\` | \`relay\`, chosen up front — see §2), and an expiry (default
72h, configurable per request). Accepting creates a \`SharedStorage\` grant — a persistent,
revocable record distinct from the (now-historical) request that produced it; rejecting or letting
it expire never does. Every transition — created, accepted, rejected, storage access granted,
storage access revoked — is folded into the same hash-chained audit ledger every other mesh action
is, indistinguishable in the ledger from a same-user device action except by its
\`SHARE_*\`-prefixed event type.

#### 2. Two Transfer Modes, Chosen at Request Time

- **Direct (WebRTC):** the accepting device and the requester negotiate a peer-to-peer data channel.
  The control plane's only role is signaling relay — SDP offer/answer and ICE candidates pass through
  a Kafka-backed WebSocket channel scoped per-transfer (\`/topic/webrtc/{transferId}\`); actual bytes
  never touch the server. Best throughput, but needs both devices online and NAT-traversable at the
  same moment.
- **Relay (server-mediated):** for when P2P can't connect, or the two devices are never online at the
  same time (the truly *async* case — sharing with someone in a different timezone). The uploading
  device hands its bytes to the control plane once; they sit in server-side storage under a TTL
  (default 7 days) until the target device retrieves them, tracked by a poll-able status endpoint
  (\`GET .../status → { uploadComplete, downloadAvailable }\`). This is the one place in the whole
  system the control plane legitimately holds plaintext-adjacent file bytes, even briefly — everywhere
  else in this brief, that's an explicit anti-goal (§2).

#### 3. Access Control — Enforced Once, at the Boundary

A \`SharedStorage\` grant's \`permissions\` gate every operation the recipient performs through it
(\`GET/POST .../files\`, \`DELETE .../files/{id}\`) — READ to list, WRITE to upload, DELETE to trash. The
owner always retains full access to their own root regardless of what they granted someone else. The
grant itself can be revoked unilaterally by its owner at any time (\`DELETE /api/v1/share/storage/{id}\`),
immediately invalidating the recipient's access — no waiting for expiry, no cooperation needed from
the recipient's side.`
  }
];
