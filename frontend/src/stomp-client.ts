/**
 * Thin shared STOMP-over-SockJS connection to notification-service's `/ws` endpoint (the same one
 * every `/topic/*` in `backend/notification-service` fans out over — see
 * `KafkaToWebSocketRelay`). One connection, many destinations: `subscribeStomp` multiplexes
 * subscribers over it and re-subscribes everything on reconnect, so callers don't need to think
 * about connection lifecycle at all.
 *
 * Auth: the gateway's `JwtAuthGlobalFilter` requires a token on every non-public route, `/ws`
 * included — but a browser can't attach an `Authorization` header to a WebSocket upgrade request,
 * so the token rides along as an `access_token` query param instead (the gateway accepts either
 * form, header or query param, but only for `/ws/**`). Until a token exists in `localStorage` (set
 * by a real sign-in — see `src/pages/LoginPage.tsx` / `src/api/client.ts`), every connection
 * attempt would just 401 — rather than let stompjs hammer that forever on its `reconnectDelay`, we
 * don't even open a connection until a token shows up, polling `localStorage` (cheap, no network)
 * instead of the socket itself.
 */
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAuthToken } from './api-client';

const WS_BASE_URL: string = (import.meta as any).env?.VITE_WS_BASE_URL || 'http://localhost:8080';
const TOKEN_POLL_MS = 2000;

type Handler = (body: any) => void;

let client: Client | null = null;
let tokenPollTimer: ReturnType<typeof setInterval> | null = null;
const handlersByDestination = new Map<string, Set<Handler>>();
const activeSubscriptions = new Map<string, StompSubscription>();

function subscribeOnWire(destination: string) {
  if (!client?.connected || activeSubscriptions.has(destination)) return;
  const sub = client.subscribe(destination, (message: IMessage) => {
    let body: any;
    try {
      body = JSON.parse(message.body);
    } catch {
      return; // Malformed/non-JSON frame — nothing a subscriber could do with it either.
    }
    handlersByDestination.get(destination)?.forEach((h) => h(body));
  });
  activeSubscriptions.set(destination, sub);
}

/** Read fresh on every (re)connect attempt — not hoisted to a constant — so a token pasted in
 *  after the first failed attempt, or rotated later, is picked up without a page reload. */
function buildSockJsUrl(): string {
  const token = getAuthToken();
  return token ? `${WS_BASE_URL}/ws?access_token=${encodeURIComponent(token)}` : `${WS_BASE_URL}/ws`;
}

function startClient() {
  client = new Client({
    webSocketFactory: () => new SockJS(buildSockJsUrl()) as any,
    reconnectDelay: 5000,
    onConnect: () => {
      // Covers both the first connect and any reconnect after a dropped connection.
      activeSubscriptions.clear();
      for (const destination of handlersByDestination.keys()) {
        subscribeOnWire(destination);
      }
    },
  });
  client.activate();
}

function ensureClient(): void {
  if (client) return;
  if (getAuthToken()) {
    startClient();
    return;
  }
  // No dev token yet — wait for one instead of opening (and endlessly retrying) a connection
  // that the gateway will just 401.
  if (!tokenPollTimer) {
    tokenPollTimer = setInterval(() => {
      if (getAuthToken()) {
        clearInterval(tokenPollTimer!);
        tokenPollTimer = null;
        startClient();
      }
    }, TOKEN_POLL_MS);
  }
}

/** Subscribe to a STOMP destination. Returns an unsubscribe function. */
export function subscribeStomp(destination: string, onMessage: Handler): () => void {
  if (!handlersByDestination.has(destination)) handlersByDestination.set(destination, new Set());
  handlersByDestination.get(destination)!.add(onMessage);
  ensureClient();
  subscribeOnWire(destination);

  return () => {
    const handlers = handlersByDestination.get(destination);
    handlers?.delete(onMessage);
    if (handlers && handlers.size === 0) {
      activeSubscriptions.get(destination)?.unsubscribe();
      activeSubscriptions.delete(destination);
      handlersByDestination.delete(destination);
    }
  };
}

/** Call right after storing a fresh token (login/register, or a manual `setAuthToken` from
 *  devtools) to connect immediately instead of waiting for the next poll tick, and to replace a
 *  connection that had been sitting on a stale/invalid token. */
export function reconnectStomp(): void {
  if (client) {
    client.deactivate();
    client = null;
  }
  ensureClient();
}
