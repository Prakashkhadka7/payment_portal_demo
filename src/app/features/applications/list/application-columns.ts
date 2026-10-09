import type { Permission } from '@contracts';

export type ApplicationColumn =
  'reference' | 'merchant' | 'status' | 'createdBy' | 'reviewer' | 'risk' | 'updatedAt' | 'actions';

/**
 * Columns that are useful for what the user can do:
 * - who submitted it matters to reviewers and admins (sales only ever see their own);
 * - who is reviewing it matters to admins (to assign) and to sales (to follow up);
 * - risk matters to those who record or oversee decisions.
 */
export function visibleColumns(can: (permission: Permission) => boolean): ApplicationColumn[] {
  const reviewsOrAssigns = can('application:review') || can('application:assign');
  const columns: (ApplicationColumn | false)[] = [
    'reference',
    'merchant',
    'status',
    reviewsOrAssigns && 'createdBy',
    (can('application:assign') || can('application:create')) && 'reviewer',
    reviewsOrAssigns && 'risk',
    'updatedAt',
    'actions',
  ];
  return columns.filter((column): column is ApplicationColumn => column !== false);
}
