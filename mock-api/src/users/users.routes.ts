import { Router } from 'express';
import type { UserRef } from '../../../contracts/index.ts';
import { requirePermission } from '../auth/auth.middleware.ts';
import type { UserRepository } from './user.repository.ts';

export function createUsersRouter(users: UserRepository): Router {
  const router = Router();

  /** Candidates for assignment. Only callers who can assign may list them. */
  router.get('/reviewers', requirePermission('application:assign'), (_req, res) => {
    const reviewers: UserRef[] = users
      .findByRole('REVIEWER')
      .map((user) => ({ id: user.id, displayName: user.displayName }));
    res.json(reviewers);
  });

  return router;
}
