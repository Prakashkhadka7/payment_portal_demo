import type { Role } from '../../../contracts/index.ts';
import { hashPassword } from '../auth/password.ts';
import type { UserRecord } from '../users/user.repository.ts';

interface SeedUser {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly roles: readonly Role[];
}

/** Fictional demo accounts. Their shared password comes from SEED_USER_PASSWORD, never from code. */
export const SEED_USERS = {
  salesAsha: {
    id: 'u-sales-asha',
    username: 'sales.asha',
    displayName: 'Asha (Sales)',
    roles: ['SALES'],
  },
  salesBikash: {
    id: 'u-sales-bikash',
    username: 'sales.bikash',
    displayName: 'Bikash (Sales)',
    roles: ['SALES'],
  },
  reviewerRita: {
    id: 'u-reviewer-rita',
    username: 'reviewer.rita',
    displayName: 'Rita (Reviewer)',
    roles: ['REVIEWER'],
  },
  reviewerRohan: {
    id: 'u-reviewer-rohan',
    username: 'reviewer.rohan',
    displayName: 'Rohan (Reviewer)',
    roles: ['REVIEWER'],
  },
  adminAnil: {
    id: 'u-admin-anil',
    username: 'admin.anil',
    displayName: 'Anil (Admin)',
    roles: ['ADMIN'],
  },
  /** Holds two roles: demonstrates permission union and separation of duties. */
  multiMaya: {
    id: 'u-multi-maya',
    username: 'multi.maya',
    displayName: 'Maya (Sales + Reviewer)',
    roles: ['SALES', 'REVIEWER'],
  },
} as const satisfies Record<string, SeedUser>;

export async function createSeedUsers(password: string): Promise<UserRecord[]> {
  return Promise.all(
    Object.values(SEED_USERS).map(async (user) => ({
      ...user,
      passwordHash: await hashPassword(password),
    })),
  );
}
