import { randomBytes } from 'node:crypto';

export interface TokenStoreOptions {
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  /** Injectable clock so tests can simulate expiry. */
  readonly now?: () => number;
}

export interface IssuedAccessToken {
  readonly token: string;
  readonly expiresIn: number;
}

interface TokenEntry {
  readonly userId: string;
  readonly expiresAt: number;
}

/**
 * Opaque random tokens kept in memory. Unlike signed JWTs this needs no signing secret, so there
 * is nothing to commit or leak; restarting the server simply invalidates every session.
 */
export class TokenStore {
  private readonly accessTokens = new Map<string, TokenEntry>();
  private readonly refreshTokens = new Map<string, TokenEntry>();
  private readonly options: TokenStoreOptions;
  private readonly now: () => number;

  constructor(options: TokenStoreOptions) {
    this.options = options;
    this.now = options.now ?? Date.now;
  }

  issueAccessToken(userId: string): IssuedAccessToken {
    const ttl = this.options.accessTokenTtlSeconds;
    return { token: this.issue(this.accessTokens, userId, ttl), expiresIn: ttl };
  }

  issueRefreshToken(userId: string): string {
    return this.issue(this.refreshTokens, userId, this.options.refreshTokenTtlSeconds);
  }

  /** Returns the owning user id, or `null` if the token is unknown or expired. */
  resolveAccessToken(token: string): string | null {
    return this.resolve(this.accessTokens, token);
  }

  /**
   * Single use: the refresh token is removed as it is read, so every refresh must rotate it.
   * A stolen token that was already used is therefore worthless.
   */
  consumeRefreshToken(token: string): string | null {
    const userId = this.resolve(this.refreshTokens, token);
    this.refreshTokens.delete(token);
    return userId;
  }

  revokeRefreshToken(token: string): void {
    this.refreshTokens.delete(token);
  }

  private issue(store: Map<string, TokenEntry>, userId: string, ttlSeconds: number): string {
    const token = randomBytes(32).toString('base64url');
    store.set(token, { userId, expiresAt: this.now() + ttlSeconds * 1000 });
    return token;
  }

  private resolve(store: Map<string, TokenEntry>, token: string): string | null {
    const entry = store.get(token);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= this.now()) {
      store.delete(token);
      return null;
    }
    return entry.userId;
  }
}
