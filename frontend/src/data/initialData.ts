import { Device, StorageFile, TransferTask, AuditEvent, ThreatItem } from '../types';

export const INITIAL_DEVICES: Device[] = [
  {
    id: 'dev_m3_max_01',
    name: 'MacBook Pro 16" (Laptop A)',
    type: 'laptop',
    os: 'macOS',
    agentVersion: 'v1.4.2-rust',
    status: 'online',
    publicKeyFingerprint: 'SHA256:e8f9a2b7c4d1...99a03b12',
    ipMasked: '192.168.1.104 (Outbound TLS)',
    natType: 'full_cone',
    lastSeen: 'Just now',
    batteryLevel: 94,
    isCharging: true,
    storageTotalBytes: 1000 * 1024 * 1024 * 1024, // 1 TB
    storageUsedBytes: 420 * 1024 * 1024 * 1024, // 420 GB
    directP2PCapable: true,
    isFavorite: true,
    pairedAt: '2026-06-12',
    pinnedLocation: 'Home Studio',
    tags: ['Primary Workstation', 'Rust Toolchain', 'P2P Direct'],
    activeConnectionsCount: 2,
    allowedRoots: [
      {
        id: 'root_m3_projects',
        path: '/Users/harsh/Projects',
        label: 'Active Projects & Repos',
        isReadOnly: false,
        allowDelete: true,
        totalFiles: 142,
        totalSizeBytes: 48 * 1024 * 1024 * 1024
      },
      {
        id: 'root_m3_docs',
        path: '/Users/harsh/Documents',
        label: 'Personal Documents & Research',
        isReadOnly: false,
        allowDelete: false, // Protected against remote deletion
        totalFiles: 89,
        totalSizeBytes: 12 * 1024 * 1024 * 1024
      }
    ]
  },
  {
    id: 'dev_truenas_02',
    name: 'Home TrueNAS Core (NAS Vault)',
    type: 'nas',
    os: 'Linux',
    agentVersion: 'v1.4.2-rust',
    status: 'online',
    publicKeyFingerprint: 'SHA256:7c4d1e8f9a2b...44f21d89',
    ipMasked: '192.168.1.200 (LAN Direct + STUN)',
    natType: 'upnp',
    lastSeen: 'Just now (Uptime: 142d)',
    storageTotalBytes: 16000 * 1024 * 1024 * 1024, // 16 TB
    storageUsedBytes: 9800 * 1024 * 1024 * 1024, // 9.8 TB
    directP2PCapable: true,
    isFavorite: true,
    pairedAt: '2026-05-01',
    pinnedLocation: 'Home Rack',
    tags: ['ZFS Mirror', 'Always-On', 'Immutable Snapshots'],
    activeConnectionsCount: 3,
    allowedRoots: [
      {
        id: 'root_nas_backups',
        path: '/mnt/tank/backups',
        label: 'Encrypted Device Backups',
        isReadOnly: false,
        allowDelete: false,
        totalFiles: 3400,
        totalSizeBytes: 4200 * 1024 * 1024 * 1024
      },
      {
        id: 'root_nas_media',
        path: '/mnt/tank/media',
        label: '4K Footage & Photography RAW',
        isReadOnly: true,
        allowDelete: false,
        totalFiles: 1820,
        totalSizeBytes: 3100 * 1024 * 1024 * 1024
      },
      {
        id: 'root_nas_archives',
        path: '/mnt/tank/archives',
        label: 'Cold Storage Archives',
        isReadOnly: false,
        allowDelete: true,
        totalFiles: 950,
        totalSizeBytes: 1400 * 1024 * 1024 * 1024
      }
    ]
  },
  {
    id: 'dev_rtx4090_03',
    name: 'Workstation RTX 4090 (Desktop B)',
    type: 'desktop',
    os: 'Linux',
    agentVersion: 'v1.4.2-rust',
    status: 'online',
    publicKeyFingerprint: 'SHA256:1a2b3c4d5e6f...88c99d00',
    ipMasked: '10.0.4.15 (Tailscale / P2P)',
    natType: 'restricted',
    lastSeen: '1 min ago',
    storageTotalBytes: 4000 * 1024 * 1024 * 1024, // 4 TB NVMe
    storageUsedBytes: 2100 * 1024 * 1024 * 1024,
    directP2PCapable: true,
    isFavorite: false,
    pairedAt: '2026-06-20',
    pinnedLocation: 'Office Desk',
    tags: ['CUDA Machine', 'High Bandwidth', '10GbE'],
    activeConnectionsCount: 1,
    allowedRoots: [
      {
        id: 'root_workstation_models',
        path: '/home/harsh/ai-models',
        label: 'AI Checkpoints & Datasets',
        isReadOnly: false,
        allowDelete: true,
        totalFiles: 34,
        totalSizeBytes: 1200 * 1024 * 1024 * 1024
      },
      {
        id: 'root_workstation_builds',
        path: '/home/harsh/builds',
        label: 'Compiled Artifacts & ISOs',
        isReadOnly: false,
        allowDelete: true,
        totalFiles: 82,
        totalSizeBytes: 450 * 1024 * 1024 * 1024
      }
    ]
  },
  {
    id: 'dev_pixel9_04',
    name: 'Google Pixel 9 Pro (Travel Client)',
    type: 'phone',
    os: 'Android',
    agentVersion: 'v1.4.1-mobile',
    status: 'online',
    publicKeyFingerprint: 'SHA256:99f01e2d3c4b...77e88a99',
    ipMasked: 'Cellular CGNAT (Relay Fallback)',
    natType: 'symmetric',
    lastSeen: 'Just now',
    batteryLevel: 78,
    isCharging: false,
    storageTotalBytes: 512 * 1024 * 1024 * 1024, // 512 GB
    storageUsedBytes: 198 * 1024 * 1024 * 1024,
    directP2PCapable: false, // Symmetric NAT -> Uses zero-knowledge relay
    isFavorite: true,
    pairedAt: '2026-07-04',
    pinnedLocation: 'Mobile / Roaming',
    tags: ['Remote Client', 'Biometric Passkey', 'Zero-Trust'],
    activeConnectionsCount: 1,
    allowedRoots: [
      {
        id: 'root_pixel_dcim',
        path: '/storage/emulated/0/DCIM/Camera',
        label: 'Mobile Camera Roll (Sync Only)',
        isReadOnly: true,
        allowDelete: false,
        totalFiles: 420,
        totalSizeBytes: 24 * 1024 * 1024 * 1024
      }
    ]
  },
  {
    id: 'dev_thinkpad_05',
    name: 'ThinkPad T14 (Off-site Travel Laptop)',
    type: 'laptop',
    os: 'Windows',
    agentVersion: 'v1.3.9-win',
    status: 'sleeping',
    publicKeyFingerprint: 'SHA256:33d44e55f66a...11b22c33',
    ipMasked: 'Disconnected / Sleep Mode',
    natType: 'restricted',
    lastSeen: '4 hours ago (Standby)',
    batteryLevel: 62,
    isCharging: false,
    storageTotalBytes: 512 * 1024 * 1024 * 1024,
    storageUsedBytes: 140 * 1024 * 1024 * 1024,
    directP2PCapable: false,
    isFavorite: false,
    pairedAt: '2026-04-18',
    pinnedLocation: 'Backpack',
    tags: ['Windows 11', 'BitLocker Active'],
    activeConnectionsCount: 0,
    allowedRoots: [
      {
        id: 'root_thinkpad_docs',
        path: 'C:\\Users\\Harsh\\Documents\\Sync',
        label: 'Offline Briefcase',
        isReadOnly: false,
        allowDelete: false,
        totalFiles: 52,
        totalSizeBytes: 8 * 1024 * 1024 * 1024
      }
    ]
  }
];

export const INITIAL_FILES: StorageFile[] = [
  {
    id: 'file_proj_zip',
    deviceId: 'dev_m3_max_01',
    rootId: 'root_m3_projects',
    rootPath: '/Users/harsh/Projects',
    relativePath: 'mesh-engine/project.zip',
    name: 'project.zip',
    extension: 'zip',
    sizeBytes: 840 * 1024 * 1024, // 840 MB
    modifiedAt: '2026-08-29 18:42:10',
    sha256Hash: 'a7b8c9d0e1f2a3b4c5d6e7f80918273645abcdef0192837465abcdeffedcba01',
    mimeType: 'application/zip',
    isDirectory: false,
    isFavorite: true,
    version: 3,
    permissions: { read: true, write: true, delete: true },
    sampleContent: '[Binary Archive: 14 source packages, cargo.lock, e2e test suite, e2e certificate templates]'
  },
  {
    id: 'file_rust_agent_rs',
    deviceId: 'dev_m3_max_01',
    rootId: 'root_m3_projects',
    rootPath: '/Users/harsh/Projects',
    relativePath: 'mesh-engine/src/agent.rs',
    name: 'agent.rs',
    extension: 'rs',
    sizeBytes: 18 * 1024, // 18 KB
    modifiedAt: '2026-08-30 02:14:00',
    sha256Hash: '5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d',
    mimeType: 'text/rust',
    isDirectory: false,
    isFavorite: true,
    version: 12,
    permissions: { read: true, write: true, delete: true },
    sampleContent: `// Zero-Trust PeerVault Storage Agent Sandbox
use std::path::{Path, PathBuf};
use ring::digest::{Context, SHA256};

pub struct StorageSandbox {
    allowed_roots: Vec<PathBuf>,
}

impl StorageSandbox {
    pub fn new(roots: Vec<PathBuf>) -> Self {
        let canonical_roots = roots.into_iter()
            .filter_map(|r| r.canonicalize().ok())
            .collect();
        Self { allowed_roots: canonical_roots }
    }

    /// Verifies that requested path cannot escape allowed roots via ../ or symlink
    pub fn validate_path(&self, requested: &Path) -> Result<PathBuf, SandboxError> {
        let canonical = requested.canonicalize()
            .map_err(|_| SandboxError::PathNotFound)?;

        let is_allowed = self.allowed_roots.iter()
            .any(|root| canonical.starts_with(root));

        if !is_allowed {
            return Err(SandboxError::AccessDenied("Path traversal outside allowed root"));
        }
        Ok(canonical)
    }
}`
  },
  {
    id: 'file_security_brief',
    deviceId: 'dev_m3_max_01',
    rootId: 'root_m3_docs',
    rootPath: '/Users/harsh/Documents',
    relativePath: 'Security/ZeroTrust_Architecture_2026.pdf',
    name: 'ZeroTrust_Architecture_2026.pdf',
    extension: 'pdf',
    sizeBytes: 4200 * 1024,
    modifiedAt: '2026-08-25 11:20:00',
    sha256Hash: '99887766554433221100aabbccddeeff00112233445566778899aabbccddeeff',
    mimeType: 'application/pdf',
    isDirectory: false,
    isFavorite: true,
    version: 1,
    permissions: { read: true, write: false, delete: false },
    sampleContent: '[PDF Document: Cryptographic Proof of Zero-Knowledge Encrypted Relays & Noise Protocol Framework]'
  },
  {
    id: 'file_client_env',
    deviceId: 'dev_m3_max_01',
    rootId: 'root_m3_projects',
    rootPath: '/Users/harsh/Projects',
    relativePath: 'mesh-engine/.env.example',
    name: '.env.example',
    extension: 'env',
    sizeBytes: 1200,
    modifiedAt: '2026-08-28 09:12:00',
    sha256Hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    mimeType: 'text/plain',
    isDirectory: false,
    version: 2,
    permissions: { read: true, write: true, delete: true },
    sampleContent: `PEERVAULT_CONTROL_PLANE_URL=https://mesh.peervault.internal:8443
PEERVAULT_DEVICE_ID=dev_m3_max_01
PEERVAULT_ECDSA_PRIVKEY_KEYRING=security_enclave
PEERVAULT_P2P_PORT_RANGE=50000-50100
PEERVAULT_RELAY_FALLBACK=true`
  },
  {
    id: 'file_zfs_dataset',
    deviceId: 'dev_truenas_02',
    rootId: 'root_nas_backups',
    rootPath: '/mnt/tank/backups',
    relativePath: 'zfs_snapshots/2026-08-29-daily.zfs.enc',
    name: '2026-08-29-daily.zfs.enc',
    extension: 'enc',
    sizeBytes: 42 * 1024 * 1024 * 1024, // 42 GB
    modifiedAt: '2026-08-29 03:00:00',
    sha256Hash: 'ccddeeff00112233445566778899aabbccddeeff00112233445566778899aabb',
    mimeType: 'application/octet-stream',
    isDirectory: false,
    isFavorite: false,
    version: 1,
    permissions: { read: true, write: false, delete: false },
    sampleContent: '[Encrypted ZFS Snapshot stream: AES-256-GCM / Ephemeral Session Key]'
  },
  {
    id: 'file_nas_media_raw',
    deviceId: 'dev_truenas_02',
    rootId: 'root_nas_media',
    rootPath: '/mnt/tank/media',
    relativePath: 'RawFootage/Kyoto_CherryBlossom_4K.mov',
    name: 'Kyoto_CherryBlossom_4K.mov',
    extension: 'mov',
    sizeBytes: 12 * 1024 * 1024 * 1024, // 12 GB
    modifiedAt: '2026-08-14 16:30:00',
    sha256Hash: 'feeeddccbbaa99887766554433221100feeeddccbbaa99887766554433221100',
    mimeType: 'video/quicktime',
    isDirectory: false,
    isFavorite: true,
    version: 1,
    permissions: { read: true, write: false, delete: false },
    sampleContent: '[ProRes 422 HQ 4K 60FPS Video Footage - 12.4 GB - Direct P2P Streaming enabled]'
  },
  {
    id: 'file_ai_checkpoint',
    deviceId: 'dev_rtx4090_03',
    rootId: 'root_workstation_models',
    rootPath: '/home/harsh/ai-models',
    relativePath: 'vision-encoder-v4.safetensors',
    name: 'vision-encoder-v4.safetensors',
    extension: 'safetensors',
    sizeBytes: 8200 * 1024 * 1024, // 8.2 GB
    modifiedAt: '2026-08-28 22:15:00',
    sha256Hash: '445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233',
    mimeType: 'application/octet-stream',
    isDirectory: false,
    isFavorite: true,
    version: 4,
    permissions: { read: true, write: true, delete: true },
    sampleContent: '[PyTorch Model Weights Tensor Dictionary: 7B Parameters, BFloat16]'
  },
  {
    id: 'file_trash_sample',
    deviceId: 'dev_m3_max_01',
    rootId: 'root_m3_projects',
    rootPath: '/Users/harsh/Projects',
    relativePath: '.trash_vault/old_deprecated_credentials.json',
    name: 'old_deprecated_credentials.json',
    extension: 'json',
    sizeBytes: 2400,
    modifiedAt: '2026-08-27 14:10:00',
    sha256Hash: '887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa99',
    mimeType: 'application/json',
    isDirectory: false,
    version: 1,
    inTrash: true,
    trashedAt: '2026-08-27 14:10:00',
    trashExpiresAt: '2026-09-26 14:10:00', // 30-day soft delete retention
    permissions: { read: true, write: false, delete: true },
    sampleContent: `{\n  "status": "revoked",\n  "audit_reason": "Rotated via security protocol on 2026-08-27"\n}`
  }
];

export const INITIAL_TRANSFERS: TransferTask[] = [
  {
    id: 'tx_p2p_01',
    name: 'project.zip (Laptop A -> NAS Vault)',
    sourceDeviceId: 'dev_m3_max_01',
    targetDeviceId: 'dev_truenas_02',
    sourceDeviceName: 'MacBook Pro 16"',
    targetDeviceName: 'Home TrueNAS Core',
    sourceFilePath: '/Users/harsh/Projects/mesh-engine/project.zip',
    targetFilePath: '/mnt/tank/backups/mesh-engine/project.zip',
    sizeBytes: 840 * 1024 * 1024,
    transferredBytes: 588 * 1024 * 1024,
    speedBytesPerSec: 48.5 * 1024 * 1024, // 48.5 MB/s
    status: 'transferring',
    mode: 'p2p_direct',
    chunksTotal: 3360,
    chunksCompleted: 2352,
    etaSeconds: 5,
    sha256Checksum: 'a7b8c9d0e1f2a3b4c5d6e7f80918273645abcdef0192837465abcdeffedcba01',
    createdAt: '2026-08-30 02:16:10',
    startedAt: '2026-08-30 02:16:12'
  },
  {
    id: 'tx_relay_02',
    name: 'vision-encoder-v4.safetensors (Desktop B -> Pixel 9 Pro)',
    sourceDeviceId: 'dev_rtx4090_03',
    targetDeviceId: 'dev_pixel9_04',
    sourceDeviceName: 'Workstation RTX 4090',
    targetDeviceName: 'Google Pixel 9 Pro',
    sourceFilePath: '/home/harsh/ai-models/vision-encoder-v4.safetensors',
    targetFilePath: '/storage/emulated/0/Download/vision-encoder-v4.safetensors',
    sizeBytes: 8200 * 1024 * 1024,
    transferredBytes: 8200 * 1024 * 1024,
    speedBytesPerSec: 0,
    status: 'completed',
    mode: 'relay_encrypted',
    chunksTotal: 32800,
    chunksCompleted: 32800,
    etaSeconds: 0,
    sha256Checksum: '445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233',
    createdAt: '2026-08-30 01:45:00',
    startedAt: '2026-08-30 01:45:02',
    completedAt: '2026-08-30 01:52:18'
  }
];

export const INITIAL_AUDIT_LOGS: AuditEvent[] = [
  {
    id: 'audit_01',
    timestamp: '2026-08-30 02:16:12',
    eventType: 'file_transfer',
    severity: 'info',
    deviceId: 'dev_m3_max_01',
    deviceName: 'MacBook Pro 16"',
    actor: 'User (harshparjapat7738@gmail.com)',
    action: 'Direct P2P Data Channel Established',
    details: 'ECDH handshake completed with Home TrueNAS. Mode: Direct LAN (192.168.1.104 <-> 192.168.1.200). Cipher: ChaCha20-Poly1305.',
    authorized: true,
    ipHash: 'sha256:d8b2...41a9'
  },
  {
    id: 'audit_02',
    timestamp: '2026-08-30 02:14:05',
    eventType: 'file_access',
    severity: 'info',
    deviceId: 'dev_pixel9_04',
    deviceName: 'Google Pixel 9 Pro',
    actor: 'Mobile Client (Biometric Passkey Verified)',
    action: 'Remote File Inspection: project.zip',
    details: 'Metadata query authorized against root /Users/harsh/Projects on MacBook Pro 16". Ephemeral token TTL: 60s.',
    authorized: true,
    ipHash: 'sha256:11a0...99bb'
  },
  {
    id: 'audit_03',
    timestamp: '2026-08-30 01:10:45',
    eventType: 'sandbox_violation',
    severity: 'warning',
    deviceId: 'dev_thinkpad_05',
    deviceName: 'ThinkPad T14',
    actor: 'System Sandbox Daemon',
    action: 'Path Traversal Attempt Blocked (../etc/shadow)',
    details: 'Remote command attempted canonical escape "../../../etc/shadow". Blocked by Rust Agent Sandbox Layer. Device security score unaffected.',
    authorized: false,
    ipHash: 'sha256:99f0...88e1'
  },
  {
    id: 'audit_04',
    timestamp: '2026-08-29 19:40:22',
    eventType: 'device_pair',
    severity: 'info',
    deviceId: 'dev_pixel9_04',
    deviceName: 'Google Pixel 9 Pro',
    actor: 'User (harshparjapat7738@gmail.com)',
    action: 'Device Pairing Success',
    details: 'Scanned ephemeral pairing QR code. Public key registered: SHA256:99f01e2d... Permission dialog attested.',
    authorized: true,
    ipHash: 'sha256:11a0...99bb'
  }
];

export const STRIDE_THREAT_MATRIX: ThreatItem[] = [
  {
    id: 'stride_s',
    strideCategory: 'Spoofing',
    title: 'Rogue Device Spoofing & Fake Node Injection',
    targetComponent: 'Device Registry & Agent Handshake',
    description: 'An attacker attempts to register a rogue device using a cloned identifier or hostname.',
    attackVector: 'Forged device metadata, MAC address spoofing, unauthorized API calls.',
    mitigationRule: 'Enforce asymmetric ECDSA P-256 / Ed25519 device keypairs stored in OS Secure Enclave. Ephemeral 120s pairing session, QR-only attestation with an explicit granted-permissions dialog.',
    status: 'mitigated',
    lastEvaluated: 'Continuous Real-time'
  },
  {
    id: 'stride_t',
    strideCategory: 'Tampering',
    title: 'In-Transit File Alteration / Man-in-the-Middle',
    targetComponent: 'P2P Data Channel & Relay Service',
    description: 'Malicious actor or compromised relay server attempts to inject bytes or modify transferred files.',
    attackVector: 'BGP hijacking, rogue TURN relay interception, active packet manipulation.',
    mitigationRule: 'Noise Protocol Framework / TLS 1.3 with chunk-level SHA-256 integrity verification. Zero-knowledge encrypted relay (relay sees only ciphertext).',
    status: 'mitigated',
    lastEvaluated: 'Continuous Real-time'
  },
  {
    id: 'stride_r',
    strideCategory: 'Repudiation',
    title: 'Denied Remote Action / Unauthorized File Deletion',
    targetComponent: 'Audit Subsystem & Policy Engine',
    description: 'A user or compromised device claims they did not initiate a remote delete or sensitive file read.',
    attackVector: 'Unsigned requests, log deletion, lack of cryptographic nonces.',
    mitigationRule: 'Every remote command carries a cryptographic signature bound to the device session token, logged to an immutable hash-chained audit ledger.',
    status: 'mitigated',
    lastEvaluated: 'Active Hash-Chaining'
  },
  {
    id: 'stride_i',
    strideCategory: 'Information Disclosure',
    title: 'Central Control Plane Raw File Leakage',
    targetComponent: 'Control Plane Database & API Gateway',
    description: 'Central server compromise exposes private files, full filesystem structures, or credentials.',
    attackVector: 'SQL injection on control plane, server-side data exfiltration.',
    mitigationRule: 'Strict separation of Control Plane vs Data Plane. Central database stores zero plaintext file data. End-to-end encrypted device-to-device streaming.',
    status: 'mitigated',
    lastEvaluated: 'Zero-Knowledge Verified'
  },
  {
    id: 'stride_d',
    strideCategory: 'Denial of Service',
    title: 'Ransomware Mass Deletion & Disk Exhaustion',
    targetComponent: 'Storage Agent Filesystem Engine',
    description: 'Ransomware on a paired node attempts to delete 50,000 files across all mesh devices simultaneously.',
    attackVector: 'Automated rapid remote delete API flood, huge file upload spam.',
    mitigationRule: 'Destructive Action Shield: Soft-delete quarantine (30-day trash bin), rate limiter cap (max 20 deletes/min), automatic anomaly circuit breaker.',
    status: 'mitigated',
    lastEvaluated: 'Shield Enabled'
  },
  {
    id: 'stride_e',
    strideCategory: 'Elevation of Privilege',
    title: 'Path Traversal & Symlink Sandbox Escape',
    targetComponent: 'Local Storage Agent Daemon',
    description: 'Remote command issues `../../etc/shadow` or creates a symlink pointing to sensitive OS directories.',
    attackVector: 'Dot-dot-slash traversal, junction point redirection, symlink dereferencing.',
    mitigationRule: 'Agent strictly canonicalizes all paths locally before I/O. Forbidden system directories (/etc, C:\\Windows, ~/.ssh) hard-blocked at kernel boundary.',
    status: 'mitigated',
    lastEvaluated: 'Sandbox Active'
  }
];
