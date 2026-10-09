import type { Permission } from '@contracts';

export interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly path: string;
  /** Hidden unless the user holds this permission. Omit for items everyone may see. */
  readonly permission?: Permission;
  /** Highlight only on an exact URL match (avoids parent routes staying active). */
  readonly exact?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Applications', icon: 'dashboard', path: '/applications', exact: true },
  {
    label: 'New application',
    icon: 'add_business',
    path: '/applications/new',
    permission: 'application:create',
  },
];
