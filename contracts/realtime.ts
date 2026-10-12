/**
 * Realtime channel (`/api/events`, WebSocket). The client authenticates with its first message;
 * the server then pushes a notice whenever an application the user may view changes. The notice
 * carries no data: clients refetch over REST.
 */
export interface AuthenticateMessage {
  readonly type: 'authenticate';
  readonly accessToken: string;
}

export interface ApplicationChangedMessage {
  readonly type: 'application.changed';
  readonly id: string;
}
