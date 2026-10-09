import type { Permission } from '@contracts';
import { createUser } from '../../../../testing/auth-fixtures';
import { visibleColumns } from './application-columns';

const columnsFor = (...roles: Parameters<typeof createUser>[0][number][]) => {
  const permissions = new Set<Permission>(createUser(roles).permissions);
  return visibleColumns((permission) => permissions.has(permission));
};

describe('visibleColumns', () => {
  it('shows SALES who reviews their applications, but not who created them', () => {
    expect(columnsFor('SALES')).toEqual([
      'reference',
      'merchant',
      'status',
      'reviewer',
      'updatedAt',
      'actions',
    ]);
  });

  it('shows REVIEWER the submitter and risk, but not reviewer assignment', () => {
    expect(columnsFor('REVIEWER')).toEqual([
      'reference',
      'merchant',
      'status',
      'createdBy',
      'risk',
      'updatedAt',
      'actions',
    ]);
  });

  it('shows ADMIN every column needed to oversee and assign', () => {
    expect(columnsFor('ADMIN')).toEqual([
      'reference',
      'merchant',
      'status',
      'createdBy',
      'reviewer',
      'risk',
      'updatedAt',
      'actions',
    ]);
  });

  it('combines columns for users with several roles', () => {
    expect(columnsFor('SALES', 'REVIEWER')).toContain('createdBy');
    expect(columnsFor('SALES', 'REVIEWER')).toContain('reviewer');
  });
});
