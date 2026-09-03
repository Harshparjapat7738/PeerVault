export type DeviceStatus = 'online' | 'offline' | 'sleeping' | 'frozen' | 'unauthorized';
export type DeviceType = 'laptop' | 'desktop' | 'nas' | 'phone' | 'server';
export type OSType = 'macOS' | 'Linux' | 'Windows' | 'Android' | 'iOS';
export type NATType = 'full_cone' | 'restricted' | 'symmetric' | 'upnp';

export interface StorageRoot {
  id: string;
  path: string;
  label: string;
  isReadOnly: boolean;
  allowDelete: boolean;
  totalFiles: number;
  totalSizeBytes: number;
}

/**
 * Granted at QR-pairing confirm-time (see PairingSession / PairingConfirm). Read access to a
 * device's own shared roots isn't a field here — it's implicit and always true, and a checkbox
 * that's always checked isn't a real choice, so it isn't modeled as one.
 */
export interface SharingPermissions {
  canShareStorage: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShareFurther: boolean;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  os: OSType;
  agentVersion: string;
  status: DeviceStatus;
  publicKeyFingerprint: string;
  ipMasked: string;
  natType: NATType;
  lastSeen: string;
  batteryLevel?: number;
  isCharging?: boolean;
  storageTotalBytes: number;
  storageUsedBytes: number;
  allowedRoots: StorageRoot[];
  tags: string[];
  activeConnectionsCount: number;
  directP2PCapable: boolean;
  isFavorite?: boolean;
  pairedAt: string;
  pinnedLocation?: string;
  sharingPermissions?: SharingPermissions;
  /** The account that owns this device (server-assigned at pairing time). Optional so the existing
   *  mock devices in data/initialData.ts don't need backfilling. */
  userId?: string;
}

export interface StorageFile {
  id: string;
  deviceId: string;
  rootId: string;
  rootPath: string;
  relativePath: string;
  name: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  sha256Hash: string;
  mimeType: string;
  isDirectory: boolean;
  isFavorite?: boolean;
  inTrash?: boolean;
  trashedAt?: string;
  trashExpiresAt?: string;
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  version: number;
  sampleContent?: string;
}

export type TransferStatus = 
  | 'queued' 
  | 'negotiating' 
  | 'transferring' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type TransferMode = 'p2p_direct' | 'relay_encrypted';

export interface TransferTask {
  id: string;
  name: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  sourceDeviceName: string;
  targetDeviceName: string;
  sourceFilePath: string;
  targetFilePath: string;
  sizeBytes: number;
  transferredBytes: number;
  speedBytesPerSec: number;
  status: TransferStatus;
  mode: TransferMode;
  chunksTotal: number;
  chunksCompleted: number;
  etaSeconds: number;
  sha256Checksum: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorReason?: string;
}

// Response for POST /api/v1/transfers/p2p/initiate. The WebRTC offer/answer/ICE-candidate messages
// themselves aren't mirrored here — they only ever travel over /topic/webrtc/{transferId}, never as
// a REST response body (same as TransferProgressEvent, which isn't mirrored either).
export interface P2PInitiateResponse {
  transferId: string;
  signalingChannelId: string;
}

// Response for POST /api/v1/transfers/relay/upload.
export interface RelayUploadResponse {
  transferId: string;
  relayUrl: string;
}

// Response for GET /api/v1/transfers/relay/{id}/status.
export interface RelayStatus {
  transferId: string;
  status: TransferStatus;
  uploadComplete: boolean;
  downloadAvailable: boolean;
  sizeBytes: number;
  transferredBytes: number;
  expiresAt?: string;
}

export type AuditSeverity = 'info' | 'warning' | 'critical';
export type AuditEventType =
  | 'auth'
  | 'device_pair'
  | 'device_freeze'
  | 'device_revoke'
  | 'file_access'
  | 'file_transfer'
  | 'file_delete'
  | 'threat_detected'
  | 'policy_change'
  | 'sandbox_violation'
  | 'share_request_created'
  | 'share_request_accepted'
  | 'share_request_rejected'
  | 'share_storage_access_granted'
  | 'share_storage_access_revoked'
  | 'share_file_accessed';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  deviceId?: string;
  deviceName?: string;
  actor: string;
  action: string;
  details: string;
  authorized: boolean;
  ipHash: string;
}

export type STRIDECategory = 
  | 'Spoofing' 
  | 'Tampering' 
  | 'Repudiation' 
  | 'Information Disclosure' 
  | 'Denial of Service' 
  | 'Elevation of Privilege';

export interface ThreatItem {
  id: string;
  strideCategory: STRIDECategory;
  title: string;
  targetComponent: string;
  description: string;
  attackVector: string;
  mitigationRule: string;
  status: 'mitigated' | 'monitoring' | 'blocked';
  lastEvaluated: string;
}

/** QR-only pairing: sessionId is the pairing secret, carried solely inside qrPayload. There is no
 * separate human-typed code — nothing to fall back to manual entry with. */
export interface PairingSession {
  sessionId: string;
  qrPayload: string;
  expiresInSeconds: number;
  deviceFingerprint: string;
  ephemeralECDHKey: string;
}

/** Body for POST /api/v1/devices/pair/confirm. */
export interface PairingConfirm {
  sessionId: string;
  name: string;
  type: DeviceType;
  os: OSType;
  allowedRoots: Array<{ path: string; label: string; allowDelete: boolean }>;
  permissions: SharingPermissions;
}

export type SharePermission = 'read' | 'write' | 'delete';

export type ShareStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked';

export type ShareTransferMode = 'direct' | 'relay';

export interface ShareRequest {
  id: string;
  requesterUserId: string;
  requesterDeviceId: string;
  targetUserId: string;
  targetDeviceId: string;
  storageRootId: string;
  permissions: SharePermission[];
  status: ShareStatus;
  transferMode: ShareTransferMode;
  message?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShareRequestCreate {
  requesterDeviceId: string;
  // Exactly one of targetUserId / targetEmail is required — pass targetUserId for a known
  // contact, or targetEmail to address someone by email (resolved to a userId server-side).
  targetUserId?: string;
  targetEmail?: string;
  targetDeviceId: string;
  storageRootId: string;
  permissions: SharePermission[];
  transferMode: ShareTransferMode;
  message?: string;
  expiresAt?: string;
}

export interface ShareResponse {
  shareRequestId: string;
  status: ShareStatus;
  message?: string;
}

export interface SharedStorage {
  id: string;
  ownerId: string;
  ownerDeviceId: string;
  sharedWithUserId: string;
  sharedWithDeviceId: string;
  storageRootId: string;
  permissions: SharePermission[];
  transferMode: ShareTransferMode;
  isActive: boolean;
  createdAt: string;
  revokedAt?: string;
}

export interface SharedStorageList {
  items: SharedStorage[];
  totalCount: number;
}

// Response for GET /api/v1/share/storage — both directions in one call.
export interface SharedStorageOverview {
  sharedWithMe: SharedStorage[];
  sharedByMe: SharedStorage[];
}

// Body for POST /api/v1/share/request/{requestId}/accept — the request id is a path param, not
// part of the body. targetDeviceId is which of the accepter's devices receives the grant, chosen
// at accept time; permissions/transferMode carry over from the original ShareRequest as-is.
export interface ShareAcceptance {
  targetDeviceId: string;
  customMessage?: string;
}

// Body for POST /api/v1/share/request/{requestId}/reject — entirely optional.
export interface ShareRejection {
  reason?: string;
}
