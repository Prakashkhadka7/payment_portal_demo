import type { RequestHandler, Response } from 'express';
import type { Permission } from '../../../contracts/index.ts';
import { forbidden, unauthorized } from '../shared/http-error.ts';
import { toSessionUser, type SessionUser, type UserRepository } from '../users/user.repository.ts';
import { permissionsFor } from './role-permissions.ts';
import type { TokenStore } from './token-store.ts';

const BEARER_PREFIX = 'Bearer ';

/** Rejects requests without a valid, unexpired bearer access token. */
export function requireAuth(tokens: TokenStore, users: UserRepository): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : null;
    const userId = token ? tokens.resolveAccessToken(token) : null;
    const user = userId ? users.findById(userId) : undefined;

    if (!user) {
      throw unauthorized('Access token is missing, invalid or expired');
    }
    res.locals.user = toSessionUser(user);
    next();
  };
}

/** Coarse, role-derived check. Record-level rules live in the application policy. */
export function requirePermission(permission: Permission): RequestHandler {
  return (_req, res, next) => {
    if (!permissionsFor(currentUser(res).roles).includes(permission)) {
      throw forbidden();
    }
    next();
  };
}

/** The authenticated caller. Only valid on routes behind `requireAuth`. */
export function currentUser(res: Response): SessionUser {
  const user = res.locals.user;
  if (!user) {
    throw unauthorized();
  }
  return user;
}
