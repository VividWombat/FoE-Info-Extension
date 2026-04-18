/**
 * WebSocketService.ts
 *
 * Manages the persistent WebSocket connection to the FoE game server.
 *
 * ## How it fits in the extension
 *
 * The game exposes a WebSocket endpoint alongside its HTTP API. After the
 * player logs in, the HTTP response from `StartupService/getData` contains
 * two fields:
 *   - `socketGatewayUrl`  e.g. "wss://de20.forgeofempires.com/socket/"
 *   - `socketToken`       a JWT-style bearer token
 *
 * `StartupRequestHandler` extracts those fields and calls `connectWebSocket`.
 * This module then:
 *   1. Opens the WebSocket connection.
 *   2. Authenticates by sending `SocketAuthenticationService/authWithToken`.
 *   3. Parses every incoming frame (same JSON format as HTTP responses).
 *   4. Forwards each parsed message to the handler callback supplied by
 *      `index.ts` (`handleWebSocketMessage`), which routes it through the
 *      same else-if handler chain as HTTP traffic.
 *
 * ## Adding support for a new WS-pushed service
 *
 * No changes needed here. Add a new `else if (msg.requestClass === 'XxxService')`
 * branch inside `handleWebSocketMessage()` in index.ts, exactly the same way
 * you would for an HTTP-intercepted service.
 *
 * ## Frame format
 *
 * The server sends JSON arrays, each element having the same envelope as HTTP:
 * ```json
 * [{ "requestClass": "SomeService", "requestMethod": "someMethod", "responseData": {...} }]
 * ```
 * Single-object frames (not wrapped in an array) are also handled.
 */

import { HandlerMessage } from './types';

/** Shape of the authentication request sent to the server on connection open. */
type SocketAuthMessage = {
  requestClass: string;
  requestMethod: string;
  /** Array containing the bearer token as its only element. */
  requestData: string[];
  requestId: number;
};

/** The single active WebSocket connection, or null when disconnected. */
let activeSocket: WebSocket | null = null;

/**
 * Serialises the authentication message the server expects immediately after
 * the WebSocket handshake completes.
 */
function buildAuthPayload(token: string): string {
  const msg: SocketAuthMessage = {
    requestClass: 'SocketAuthenticationService',
    requestMethod: 'authWithToken',
    requestData: [token],
    requestId: 1,
  };
  return JSON.stringify([msg]);
}

/**
 * Parses a raw WebSocket frame string and dispatches each message envelope
 * it contains to `handler`.
 *
 * Frames that are not valid JSON, or that lack a `requestClass` field, are
 * silently dropped (e.g. the auth-confirmation response).
 */
function parseFrame(
  data: string,
  handler: (msg: HandlerMessage) => void,
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return;
  }
  const messages: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
  for (const entry of messages) {
    if (entry && typeof entry === 'object' && 'requestClass' in entry) {
      handler(entry as HandlerMessage);
    }
  }
}

/**
 * Opens a WebSocket connection to `gatewayUrl`, authenticates with `token`,
 * and routes all subsequent server-push frames to `handler`.
 *
 * Calling this while a connection is already open closes the old one first,
 * so it is safe to call on each `StartupService/getData` (i.e. page reload).
 *
 * @param gatewayUrl - Full `wss://` URL from `responseData.socketGatewayUrl`.
 * @param token      - Bearer token from `responseData.socketToken`.
 * @param handler    - Receives every parsed message envelope. Typically
 *                     `handleWebSocketMessage` from index.ts.
 */
export function connectWebSocket(
  gatewayUrl: string,
  token: string,
  handler: (msg: HandlerMessage) => void,
): void {
  if (activeSocket) {
    activeSocket.close();
    activeSocket = null;
  }

  console.debug('[FoE-Info] WS connecting →', gatewayUrl);
  const ws = new WebSocket(gatewayUrl);
  activeSocket = ws;

  ws.addEventListener('open', () => {
    console.debug('[FoE-Info] WS open — authenticating');
    ws.send(buildAuthPayload(token));
  });

  ws.addEventListener('message', ({ data }) => {
    if (typeof data === 'string') {
      parseFrame(data, handler);
    }
  });

  ws.addEventListener('close', ({ code, reason }) => {
    console.debug('[FoE-Info] WS closed', code, reason);
    // Guard: only null out if this is still the active socket, not a stale
    // reference left over from a previous connectWebSocket call.
    if (activeSocket === ws) activeSocket = null;
  });

  ws.addEventListener('error', (err) => {
    console.debug('[FoE-Info] WS error', err);
  });
}

/** Closes the active WebSocket connection, if any. */
export function disconnectWebSocket(): void {
  activeSocket?.close();
  activeSocket = null;
}
