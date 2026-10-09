import type { ApplicationSortField, ApplicationStatus, RiskLevel, SortDirection } from '@contracts';

export const STATUS_LABELS: Readonly<Record<ApplicationStatus, string>> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const RISK_LABELS: Readonly<Record<RiskLevel, string>> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const APPLICATION_STATUSES = Object.keys(STATUS_LABELS) as ApplicationStatus[];

export const SORT_FIELDS: readonly ApplicationSortField[] = ['updatedAt', 'legalName', 'status'];
export const SORT_DIRECTIONS: readonly SortDirection[] = ['asc', 'desc'];
export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50];
