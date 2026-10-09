import type { Permission, Role } from '../../../contracts/index.ts';

/** Single source of truth for what each role may do globally. */
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

/** Users may hold several roles; their permissions are the de-duplicated union. */
export function permissionsFor(roles: readonly Role[]): Permission[] {
  return [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role]))];
}
