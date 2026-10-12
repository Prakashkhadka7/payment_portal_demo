import type { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import { type WebSocket, WebSocketServer } from 'ws';
import type { ApplicationChangedMessage } from '../../../contracts/index.ts';
import { canView } from '../applications/application.policy.ts';
import type { ApplicationRecord } from '../applications/application.record.ts';
import type { TokenStore } from '../auth/token-store.ts';
import { toSessionUser, type SessionUser, type UserRepository } from '../users/user.repository.ts';

export type ApplicationChanges = EventEmitter<{ change: [ApplicationRecord] }>;

/**
 * WebSocket endpoint at `/api/events`. Browsers cannot send an Authorization header with a
 * WebSocket, so the first message carries the access token. Each change is sent only to users
 * allowed to view that application.
 */
export function attachRealtime(
  server: Server,
  tokens: TokenStore,
  users: UserRepository,
  changes: ApplicationChanges,
): void {
  const wss = new WebSocketServer({ server, path: '/api/events' });
  const sessions = new Map<WebSocket, SessionUser>();

  wss.on('connection', (socket) => {
    socket.once('message', (data) => {
      const userId = tokens.resolveAccessToken(readToken(data.toString()));
      const user = userId ? users.findById(userId) : undefined;
      if (!user) {
        socket.close(4401, 'Unauthorized');
        return;
      }
      sessions.set(socket, toSessionUser(user));
    });
    socket.on('close', () => sessions.delete(socket));
  });

  changes.on('change', (record) => {
    const message: ApplicationChangedMessage = { type: 'application.changed', id: record.id };
    sessions.forEach((user, socket) => {
      if (canView(user, record)) {
        socket.send(JSON.stringify(message));
      }
    });
  });
}

function readToken(raw: string): string {
  try {
    const token: unknown = JSON.parse(raw)?.accessToken;
    return typeof token === 'string' ? token : '';
  } catch {
    return '';
  }
}
