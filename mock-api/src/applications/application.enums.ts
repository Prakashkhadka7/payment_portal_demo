import type {
  ApplicationSortField,
  ApplicationStatus,
  BusinessType,
  CurrencyCode,
  IndustryCategory,
  ReviewDecision,
  RiskLevel,
  SortDirection,
} from '../../../contracts/index.ts';
import { enumValues } from '../shared/input.ts';

/** Runtime lists of contract unions, used to validate untrusted input. Listed in lifecycle order. */
export const APPLICATION_STATUSES = enumValues<ApplicationStatus>({
  DRAFT: true,
  SUBMITTED: true,
  IN_REVIEW: true,
  APPROVED: true,
  REJECTED: true,
});

export const BUSINESS_TYPES = enumValues<BusinessType>({
  SOLE_PROPRIETOR: true,
  PARTNERSHIP: true,
  PRIVATE_LIMITED: true,
  PUBLIC_LIMITED: true,
  NON_PROFIT: true,
});

export const INDUSTRY_CATEGORIES = enumValues<IndustryCategory>({
  RETAIL: true,
  FOOD_AND_BEVERAGE: true,
  TRAVEL: true,
  EDUCATION: true,
  HEALTHCARE: true,
  DIGITAL_GOODS: true,
  PROFESSIONAL_SERVICES: true,
});

export const CURRENCY_CODES = enumValues<CurrencyCode>({
  NPR: true,
  USD: true,
  EUR: true,
  GBP: true,
});

export const RISK_LEVELS = enumValues<RiskLevel>({ LOW: true, MEDIUM: true, HIGH: true });

export const REVIEW_DECISIONS = enumValues<ReviewDecision>({ APPROVED: true, REJECTED: true });

export const SORT_FIELDS = enumValues<ApplicationSortField>({
  updatedAt: true,
  legalName: true,
  status: true,
});

export const SORT_DIRECTIONS = enumValues<SortDirection>({ asc: true, desc: true });
