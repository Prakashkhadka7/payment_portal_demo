import type {
  ApplicationSortField,
  ApplicationStatus,
  BusinessType,
  CurrencyCode,
  IndustryCategory,
  RiskLevel,
  SortDirection,
} from '@contracts';

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

export const BUSINESS_TYPE_LABELS: Readonly<Record<BusinessType, string>> = {
  SOLE_PROPRIETOR: 'Sole proprietor',
  PARTNERSHIP: 'Partnership',
  PRIVATE_LIMITED: 'Private limited company',
  PUBLIC_LIMITED: 'Public limited company',
  NON_PROFIT: 'Non-profit organisation',
};

export const INDUSTRY_LABELS: Readonly<Record<IndustryCategory, string>> = {
  RETAIL: 'Retail',
  FOOD_AND_BEVERAGE: 'Food & beverage',
  TRAVEL: 'Travel & hospitality',
  EDUCATION: 'Education',
  HEALTHCARE: 'Healthcare',
  DIGITAL_GOODS: 'Digital goods',
  PROFESSIONAL_SERVICES: 'Professional services',
};

export const CURRENCY_LABELS: Readonly<Record<CurrencyCode, string>> = {
  NPR: 'NPR · Nepalese rupee',
  USD: 'USD · US dollar',
  EUR: 'EUR · Euro',
  GBP: 'GBP · Pound sterling',
};

/** ISO 3166-1 alpha-2 codes offered for the business address. */
export const COUNTRY_OPTIONS: readonly { readonly code: string; readonly name: string }[] = [
  { code: 'NP', name: 'Nepal' },
  { code: 'IN', name: 'India' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'US', name: 'United States' },
];

/** The API accepts at most this many owners per application. */
export const MAX_OWNERS = 4;
