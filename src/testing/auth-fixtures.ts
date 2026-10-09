import type { AuthSession, AuthUser, Permission, Role } from '@contracts';

const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  SALES: [
    'application:read',
    'application:create',
    'application:edit',
    'application:submit',
    'sensitive:reveal',
  ],
  REVIEWER: ['application:read', 'application:review', 'sensitive:reveal'],
  ADMIN: ['application:read', 'application:assign', 'sensitive:reveal'],
};

/** Builds a fictional user whose permissions are the union of the given roles, like the API. */
export function createUser(roles: readonly Role[], overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: `u-${roles.join('-').toLowerCase()}`,
    username: `${roles[0]?.toLowerCase() ?? 'user'}.test`,
    displayName: `Test ${roles.join(' + ')}`,
    roles,
    permissions: [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role]))],
    ...overrides,
  };
}

export function createSession(
  roles: readonly Role[] = ['SALES'],
  overrides: Partial<AuthSession> = {},
): AuthSession {
  return { accessToken: 'test-access-token', expiresIn: 60, user: createUser(roles), ...overrides };
}
