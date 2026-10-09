import type { AuthUser, Role, UserRef } from '../../../contracts/index.ts';
import type { PasswordHash } from '../auth/password.ts';
import { permissionsFor } from '../auth/role-permissions.ts';

export interface UserRecord {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly roles: readonly Role[];
  readonly passwordHash: PasswordHash;
}

/** The authenticated caller as seen by route handlers (no credentials attached). */
export type SessionUser = Pick<UserRecord, 'id' | 'displayName' | 'roles'>;

export class UserRepository {
  private readonly byId: ReadonlyMap<string, UserRecord>;

  constructor(users: readonly UserRecord[]) {
    this.byId = new Map(users.map((user) => [user.id, user]));
  }

  findById(id: string): UserRecord | undefined {
    return this.byId.get(id);
  }

  findByUsername(username: string): UserRecord | undefined {
    const normalized = username.toLowerCase();
    return [...this.byId.values()].find((user) => user.username === normalized);
  }

  findByRole(role: Role): UserRecord[] {
    return [...this.byId.values()].filter((user) => user.roles.includes(role));
  }

  /** Resolves a user reference, tolerating ids of users that no longer exist. */
  toRef(id: string): UserRef {
    const user = this.byId.get(id);
    return { id, displayName: user?.displayName ?? 'Unknown user' };
  }
}

export function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    roles: user.roles,
    permissions: permissionsFor(user.roles),
  };
}

export function toSessionUser(user: UserRecord): SessionUser {
  return { id: user.id, displayName: user.displayName, roles: user.roles };
}
