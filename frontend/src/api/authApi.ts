/**
 * Register/login against auth-service (`/api/v1/auth/**`, both on the gateway's public allow-list —
 * see `JwtAuthGlobalFilter.PUBLIC_PREFIXES` — so these calls carry no bearer token themselves).
 */
import { apiFetch, setSession, type StoredUser } from './client';

export interface RegisterPayload {
  email: string;
  password: string;
  /** Optional — auth-service's `name` field is nullable, see backend `User.java`/`RegisterRequest`. */
  name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

/** The actual wire shape auth-service's `AuthController` returns — a flat record (`AuthResponse`),
 *  no nested `user` object. Adapted into `AuthResult` below so every caller in this frontend gets a
 *  consistent `{ accessToken, refreshToken, user }` shape regardless of the backend's own DTO. */
interface RawAuthResponse {
  userId: string;
  email: string;
  name: string | null;
  accessToken: string;
  refreshToken: string;
}

function toAuthResult(raw: RawAuthResponse): AuthResult {
  return {
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    user: { id: raw.userId, email: raw.email, name: raw.name ?? null },
  };
}

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const raw = await apiFetch<RawAuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: { email: payload.email, password: payload.password, name: payload.name?.trim() || undefined },
    skipAuth: true,
  });
  const result = toAuthResult(raw);
  setSession(result);
  return result;
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const raw = await apiFetch<RawAuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: payload,
    skipAuth: true,
  });
  const result = toAuthResult(raw);
  setSession(result);
  return result;
}
