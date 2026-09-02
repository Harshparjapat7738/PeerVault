/**
 * Thin shared STOMP-over-SockJS connection to notification-service's `/ws` endpoint (the same one
 * every `/topic/*` in `backend/notification-service` fans out over — see
 * `KafkaToWebSocketRelay`). One connection, many destinations: `subscribeStomp` multiplexes
 * subscribers over it and re-subscribes everything on reconnect, so callers don't need to think
 * about connection lifecycle at all.
 */
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_BASE_URL: string = (import.meta as any).env?.VITE_WS_BASE_URL || 'http://localhost:8080';

type Handler = (body: any) => void;

let client: Client | null = null;
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

function ensureClient(): Client {
  if (client) return client;
  client = new Client({
    webSocketFactory: () => new SockJS(`${WS_BASE_URL}/ws`) as any,
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
  return client;
}

/** Subscribe to a STOMP destination. Returns an unsubscribe function. */
export function subscribeStomp(destination: string, onMessage: Handler): () => void {
  ensureClient();
  if (!handlersByDestination.has(destination)) handlersByDestination.set(destination, new Set());
  handlersByDestination.get(destination)!.add(onMessage);
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
