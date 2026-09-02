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
 * Auth: there is no login screen anywhere in this frontend yet (`Header.tsx` shows a hardcoded
 * "harshparjapat" identity) and building one is its own task, not part of Task 8's explicit list —
 * `getAuthToken()` is a thin, clearly-marked stub reading a token a developer can drop into
 * `localStorage` by hand (e.g. from the backend README's curl walkthrough) for now.
 */

const API_BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN_STORAGE_KEY = 'peervault_token';

/** Stand-in until a real login flow exists — see this file's header comment. */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // localStorage can throw in a private-browsing/blocked-storage context — nothing meaningful to
    // recover here, the caller just won't have a persisted token for next time.
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  /** Skip JSON.stringify + Content-Type — caller is passing a FormData body (multipart). */
  raw?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!options.raw && options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.raw ? (options.body as BodyInit) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    // Matches ErrorResponse's shape from com.peervault.common.exception.GlobalExceptionHandler.
    let message = `Request failed (${response.status})`;
    let errorCode: string | undefined;
    try {
      const body = await response.json();
      message = body.message || message;
      errorCode = body.errorCode;
    } catch {
      // Non-JSON error body (e.g. the gateway itself rejecting the request) — keep the generic message.
    }
    throw new ApiError(message, response.status, errorCode);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
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
