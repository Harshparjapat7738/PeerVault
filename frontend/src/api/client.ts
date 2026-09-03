/**
 * Shared HTTP client for every call this frontend makes to the api-gateway. Single source of truth
 * for the `peervault_token` localStorage key: attaches `Authorization: Bearer <token>` to every
 * request automatically, and reacts to a 401 by clearing the (now-invalid) session and sending the
 * user to `/login` instead of leaving every call site to notice and handle that itself.
 *
 * This replaces the old dev workflow where a developer had to open devtools and run
 * `localStorage.setItem('peervault_token', '<accessToken>')` by hand (see `../api-client.ts`'s
 * original header comment) — `../pages/LoginPage.tsx` + `./authApi.ts` are the real replacement.
 */

export const API_BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

export const TOKEN_STORAGE_KEY = 'peervault_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'peervault_refresh_token';
export const USER_STORAGE_KEY = 'peervault_user';

export interface StoredUser {
  id: string;
  email: string;
  /** Optional display name — auth-service's `name` field is nullable (see backend `User.java`). */
  name: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken?: string | null;
  user?: StoredUser | null;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

/** Persists a fresh session after register/login. Kept deliberately permissive (refreshToken/user
 *  both optional) so callers that only have an access token — e.g. the legacy `setAuthToken()`
 *  wrapper in `../api-client.ts` — can still use it. */
export function setSession(session: Session): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, session.accessToken);
    if (session.refreshToken) localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, session.refreshToken);
    if (session.user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
  } catch {
    // localStorage can throw in a private-browsing/blocked-storage context — nothing meaningful to
    // recover here, the caller just won't have a persisted session for next time.
  }
  // Dynamic import, not a top-of-file one: stomp-client.ts imports getAuthToken (which reads the
  // same key this module owns) from api-client.ts, so a static import back here risks a circular
  // dependency. This one only resolves at call time, well after both modules have finished
  // evaluating — it just nudges an already-waiting STOMP client to connect immediately instead of
  // sitting on its next ~2s localStorage poll.
  import('../stomp-client').then((m) => m.reconnectStomp()).catch(() => {});
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Nothing meaningful to recover from here either.
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

/** True when a response's status means "you're not authenticated" — used by callers that want to
 *  show a message before the redirect below takes effect. */
export function isAuthError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 401;
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip JSON.stringify + Content-Type — caller is passing a FormData body (multipart). */
  raw?: boolean;
  /** This call intentionally carries no bearer token (register/login/refresh themselves) — a 401
   *  from it means "bad credentials", a normal form error, not "your session died". Skips the
   *  clear-and-redirect-to-/login behavior below. */
  skipAuth?: boolean;
}

let redirecting = false;

function redirectToLogin(): void {
  clearSession();
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login' || redirecting) return;
  redirecting = true;
  window.location.assign('/login?reason=unauthorized');
}

/** Every authenticated request in this app goes through this. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token && !options.skipAuth) headers['Authorization'] = `Bearer ${token}`;
  if (!options.raw && options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.raw ? (options.body as BodyInit) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the PeerVault backend. Is the mesh running?', 0);
  }

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
    if (response.status === 401 && !options.skipAuth) redirectToLogin();
    throw new ApiError(message, response.status, errorCode);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
