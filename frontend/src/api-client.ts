/**
 * Storage Sharing API client — the first real (non-mock) backend integration in this frontend.
 * Everything else in `src/` still runs on `data/initialData.ts` mock state (see `backend/README.md`:
 * "the existing frontend components could be wired to these endpoints with a thin API-client swap
 * for their current mock-data props" — that swap, for every other feature, is intentionally out of
 * scope here; this file covers only the sharing + P2P/relay-transfer endpoints Task 8 asked for).
 *
 * Talks to the api-gateway (`VITE_API_BASE_URL`, default `http://localhost:8080`) exactly the way
 * `backend/README.md`'s curl walkthrough does — same paths, same `Authorization: Bearer` + JSON.
 *
 * Auth: request/token handling now lives in `./api/client.ts` (`apiFetch`) — every function below
 * is a thin wrapper over it, so it gets the same auto-attached bearer token and auto-redirect-to-
 * `/login` on 401 that `./pages/LoginPage.tsx` relies on. `getAuthToken`/`setAuthToken` are kept
 * here only so existing imports (`stomp-client.ts`, `QrPairingModal.tsx`) don't need to change.
 */
import { apiFetch, getToken, setSession, ApiError, isAuthError, API_BASE_URL } from './api/client';

export { ApiError, isAuthError };

/** @deprecated use `getToken` from `./api/client` directly in new code. */
export function getAuthToken(): string | null {
  return getToken();
}

/** @deprecated the old dev-token stub's signature (access token only, no refresh token/user) —
 *  real sign-in goes through `./pages/LoginPage.tsx` + `./api/authApi.ts`, which call
 *  `./api/client.ts`'s `setSession()` with the full session instead. */
export function setAuthToken(token: string): void {
  setSession({ accessToken: token });
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  /** Skip JSON.stringify + Content-Type — caller is passing a FormData body (multipart). */
  raw?: boolean;
}

function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return apiFetch<T>(path, options);
}

// ─────────────────────────────── Share requests (Task 2/3) ───────────────────────────────

import type {
  ShareRequest,
  ShareRequestCreate,
  ShareAcceptance,
  ShareRejection,
  SharedStorage,
  SharedStorageOverview,
  StorageFile,
  ShareStatus,
  P2PInitiateResponse,
  RelayUploadResponse,
  RelayStatus,
} from './types';

export function createShareRequest(body: ShareRequestCreate): Promise<ShareRequest> {
  return request('/api/v1/share/request', { method: 'POST', body });
}

export function getShareRequestsSent(status?: ShareStatus): Promise<ShareRequest[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/v1/share/requests/sent${qs}`);
}

export function getShareRequestsReceived(status?: ShareStatus): Promise<ShareRequest[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/v1/share/requests/received${qs}`);
}

export function acceptShareRequest(requestId: string, body: ShareAcceptance): Promise<SharedStorage> {
  return request(`/api/v1/share/request/${encodeURIComponent(requestId)}/accept`, { method: 'POST', body });
}

export function rejectShareRequest(requestId: string, body: ShareRejection = {}): Promise<ShareRequest> {
  return request(`/api/v1/share/request/${encodeURIComponent(requestId)}/reject`, { method: 'POST', body });
}

// ─────────────────────────────── Shared storage CRUD (Task 4) ───────────────────────────────

export function getSharedStorage(): Promise<SharedStorageOverview> {
  return request('/api/v1/share/storage');
}

/** "Access" a shared storage grant — lists the files inside it (READ permission required server-side). */
export function accessSharedStorage(sharedStorageId: string): Promise<StorageFile[]> {
  return request(`/api/v1/share/storage/${encodeURIComponent(sharedStorageId)}/files`);
}

export function uploadToSharedStorage(
  sharedStorageId: string,
  metadata: { relativePath: string; name: string; extension: string; sizeBytes: number; mimeType: string; sha256Hash?: string; sampleContent?: string }
): Promise<StorageFile> {
  return request(`/api/v1/share/storage/${encodeURIComponent(sharedStorageId)}/files`, { method: 'POST', body: metadata });
}

export function deleteSharedStorageFile(sharedStorageId: string, fileId: string): Promise<StorageFile> {
  return request(`/api/v1/share/storage/${encodeURIComponent(sharedStorageId)}/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
}

export function revokeSharedStorage(sharedStorageId: string): Promise<SharedStorage> {
  return request(`/api/v1/share/storage/${encodeURIComponent(sharedStorageId)}`, { method: 'DELETE' });
}

// ─────────────────────────────── P2P / Relay transfer (Task 5/6) ───────────────────────────────

export function initiateP2PTransfer(fileId: string, targetDeviceId: string): Promise<P2PInitiateResponse> {
  return request('/api/v1/transfers/p2p/initiate', { method: 'POST', body: { fileId, targetDeviceId } });
}

export function sendP2POffer(transferId: string, sdpOffer: string): Promise<void> {
  return request(`/api/v1/transfers/p2p/${encodeURIComponent(transferId)}/offer`, { method: 'POST', body: { sdpOffer } });
}

export function sendP2PAnswer(transferId: string, sdpAnswer: string): Promise<void> {
  return request(`/api/v1/transfers/p2p/${encodeURIComponent(transferId)}/answer`, { method: 'POST', body: { sdpAnswer } });
}

export function sendP2PIceCandidate(transferId: string, candidate: string): Promise<void> {
  return request(`/api/v1/transfers/p2p/${encodeURIComponent(transferId)}/ice-candidate`, { method: 'POST', body: { candidate } });
}

/**
 * Relay-mode upload — real multipart, matching transfer-service's
 * `POST /api/v1/transfers/relay/upload` (`file` binary part + `metadata` JSON part).
 */
export function initiateRelayTransfer(
  file: File,
  metadata: { sourceDeviceId: string; targetDeviceId: string; name: string; mimeType: string }
): Promise<RelayUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  return request('/api/v1/transfers/relay/upload', { method: 'POST', body: form, raw: true });
}

export function getRelayTransferStatus(transferId: string): Promise<RelayStatus> {
  return request(`/api/v1/transfers/relay/${encodeURIComponent(transferId)}/status`);
}

/** Returns the download URL directly rather than fetching it here — large binary responses are
 *  better handed to the browser (`<a href>`/`window.location`) than buffered through `fetch()`. */
export function getRelayDownloadUrl(transferId: string): string {
  return `${API_BASE_URL}/api/v1/transfers/relay/${encodeURIComponent(transferId)}/download`;
}

// ─────────────────────────────── Device pairing (QR-only) ───────────────────────────────
// The first real (non-mock) device pairing wired into this frontend — see QrPairingModal.tsx.
// There is no manual-code fallback anywhere in this flow: sessionId only ever moves between these
// two calls via a scanned QR code.

import type { Device, PairingSession, PairingConfirm } from './types';

export function initiatePairing(): Promise<PairingSession> {
  return request('/api/v1/devices/pair/init', { method: 'POST' });
}

export function confirmPairing(body: PairingConfirm): Promise<Device> {
  return request('/api/v1/devices/pair/confirm', { method: 'POST', body });
}
