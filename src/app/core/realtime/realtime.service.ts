import { inject, Injectable } from '@angular/core';
import type { ApplicationChangedMessage, AuthenticateMessage } from '@contracts';
import { defer, repeat, retry, share } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import { AuthStore } from '../auth/auth.store';
import { API_BASE_URL } from '../http/api-base-url.token';

const RECONNECT_DELAY_MS = 3_000;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly authStore = inject(AuthStore);
  private readonly url = toWebSocketUrl(inject(API_BASE_URL));

  /** Emits whenever an application this user may view changes. */
  readonly applicationChanges$ = defer(() =>
    webSocket<ApplicationChangedMessage>({
      url: this.url,
      // Browsers cannot send an Authorization header with a WebSocket: authenticate first.
      openObserver: { next: ({ target }) => this.authenticate(target as WebSocket) },
    }),
  ).pipe(
    // Reconnect after an error or a close
    retry({ delay: RECONNECT_DELAY_MS }),
    repeat({ delay: RECONNECT_DELAY_MS }),
    share(),
  );

  private authenticate(socket: WebSocket): void {
    const message: AuthenticateMessage = {
      type: 'authenticate',
      accessToken: this.authStore.accessToken() ?? '',
    };
    socket.send(JSON.stringify(message));
  }
}

/** `/api` → `ws(s)://<page host>/api/events`, so it goes through the same origin and proxy. */
function toWebSocketUrl(apiBaseUrl: string): string {
  const url = new URL(`${apiBaseUrl}/events`, location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}
