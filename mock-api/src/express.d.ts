import type { SessionUser } from './users/user.repository.ts';

declare global {
  namespace Express {
    interface Locals {
      /** Set by `requireAuth` for every authenticated request. */
      user?: SessionUser;
    }
  }
}

export {};
