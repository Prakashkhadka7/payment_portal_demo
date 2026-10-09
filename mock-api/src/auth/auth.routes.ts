import { Router, type CookieOptions, type Response } from 'express';
import type { AuthSession } from '../../../contracts/index.ts';
import type { MockApiConfig } from '../config.ts';
import { HttpError, unauthorized } from '../shared/http-error.ts';
import { asObject, readString } from '../shared/input.ts';
import { toAuthUser, type UserRecord, type UserRepository } from '../users/user.repository.ts';
import type { LoginRateLimiter } from './login-rate-limiter.ts';
import { hashPassword, verifyPassword } from './password.ts';
import type { TokenStore } from './token-store.ts';

export const REFRESH_COOKIE = 'pp_refresh';
/**
 * Non-secret companion of the refresh cookie, readable by the app. It only tells the client a
 * session may exist, so it can skip the refresh call on start-up when there is nothing to restore.
 */
export const SESSION_HINT_COOKIE = 'pp_session';

/** The refresh cookie is only ever sent to the auth endpoints, never to data endpoints. */
const REFRESH_COOKIE_PATH = '/api/auth';
const INVALID_CREDENTIALS = 'Invalid username or password';
const MAX_PASSWORD_LENGTH = 200;

export interface AuthRouterDeps {
  readonly users: UserRepository;
  readonly tokens: TokenStore;
  readonly rateLimiter: LoginRateLimiter;
  readonly config: Pick<MockApiConfig, 'refreshTokenTtlSeconds' | 'secureCookies'>;
}

export function createAuthRouter({ users, tokens, rateLimiter, config }: AuthRouterDeps): Router {
  const router = Router();

  // Verified against when the username is unknown, so both failure paths take the same time.
  const decoyHash = hashPassword('decoy-password-for-timing');

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.secureCookies,
    path: REFRESH_COOKIE_PATH,
  };
  const hintCookieOptions: CookieOptions = {
    sameSite: 'strict',
    secure: config.secureCookies,
    path: '/',
  };

  const clearSessionCookies = (res: Response): void => {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.clearCookie(SESSION_HINT_COOKIE, hintCookieOptions);
  };

  const startSession = (res: Response, user: UserRecord): void => {
    const { token, expiresIn } = tokens.issueAccessToken(user.id);
    const maxAge = config.refreshTokenTtlSeconds * 1000;
    res.cookie(REFRESH_COOKIE, tokens.issueRefreshToken(user.id), { ...cookieOptions, maxAge });
    res.cookie(SESSION_HINT_COOKIE, '1', { ...hintCookieOptions, maxAge });
    const session: AuthSession = { accessToken: token, expiresIn, user: toAuthUser(user) };
    res.json(session);
  };

  router.post('/login', async (req, res) => {
    const body = asObject(req.body, 'body');
    const username = readString(body, 'username', 'body', 100).toLowerCase();
    // Passwords are compared exactly as typed: never trimmed or normalised.
    const password = typeof body['password'] === 'string' ? body['password'] : '';
    if (!username || !password || password.length > MAX_PASSWORD_LENGTH) {
      throw unauthorized(INVALID_CREDENTIALS);
    }

    const rateLimitKey = `${req.ip}:${username}`;
    if (rateLimiter.isBlocked(rateLimitKey)) {
      throw new HttpError(429, 'TOO_MANY_REQUESTS', 'Too many failed attempts. Try again later.');
    }

    const user = users.findByUsername(username);
    const isValid = await verifyPassword(password, user?.passwordHash ?? (await decoyHash));
    if (!user || !isValid) {
      rateLimiter.recordFailure(rateLimitKey);
      throw unauthorized(INVALID_CREDENTIALS);
    }

    rateLimiter.reset(rateLimitKey);
    startSession(res, user);
  });

  router.post('/refresh', (req, res) => {
    const presented: unknown = req.cookies?.[REFRESH_COOKIE];
    const userId = typeof presented === 'string' ? tokens.consumeRefreshToken(presented) : null;
    const user = userId ? users.findById(userId) : undefined;

    if (!user) {
      clearSessionCookies(res);
      throw unauthorized('Session expired. Please sign in again.');
    }
    startSession(res, user);
  });

  router.post('/logout', (req, res) => {
    const presented: unknown = req.cookies?.[REFRESH_COOKIE];
    if (typeof presented === 'string') {
      tokens.revokeRefreshToken(presented);
    }
    clearSessionCookies(res);
    res.status(204).end();
  });

  return router;
}
