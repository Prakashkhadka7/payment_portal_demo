import type {
  ApplicationDataInput,
  ApplicationListQuery,
  OwnerInput,
  RecordDecisionRequest,
  SensitiveFieldRef,
} from '../../../contracts/index.ts';
import { badRequest } from '../shared/http-error.ts';
import {
  asArray,
  asObject,
  readEnum,
  readNullableEnum,
  readNullableIsoDate,
  readNullableNumber,
  readOptionalString,
  readString,
  type JsonObject,
} from '../shared/input.ts';
import {
  APPLICATION_STATUSES,
  BUSINESS_TYPES,
  CURRENCY_CODES,
  INDUSTRY_CATEGORIES,
  REVIEW_DECISIONS,
  RISK_LEVELS,
  SORT_DIRECTIONS,
  SORT_FIELDS,
} from './application.enums.ts';

export const MAX_OWNERS = 4;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 10;
const MAX_COMMENT_LENGTH = 1000;

/**
 * Parses draft data. Every field is optional (drafts may be incomplete) but must have the right
 * type; completeness is checked separately on submit.
 */
export function parseApplicationDataInput(value: unknown): ApplicationDataInput {
  const data = asObject(value ?? {}, 'data');
  const business = asObject(data['business'] ?? {}, 'data.business');
  const contact = asObject(data['contact'] ?? {}, 'data.contact');
  const banking = asObject(data['banking'] ?? {}, 'data.banking');
  const owners = asArray(data['owners'] ?? [], 'data.owners', MAX_OWNERS);

  return {
    business: {
      legalName: readString(business, 'legalName', 'data.business'),
      tradingName: readString(business, 'tradingName', 'data.business'),
      businessType: readNullableEnum(business, 'businessType', 'data.business', BUSINESS_TYPES),
      registrationNumber: readString(business, 'registrationNumber', 'data.business', 50),
      industry: readNullableEnum(business, 'industry', 'data.business', INDUSTRY_CATEGORIES),
      website: readString(business, 'website', 'data.business', 300),
      establishedOn: readNullableIsoDate(business, 'establishedOn', 'data.business'),
    },
    contact: {
      contactName: readString(contact, 'contactName', 'data.contact'),
      email: readString(contact, 'email', 'data.contact', 254),
      phone: readString(contact, 'phone', 'data.contact', 30),
      addressLine1: readString(contact, 'addressLine1', 'data.contact'),
      addressLine2: readString(contact, 'addressLine2', 'data.contact'),
      city: readString(contact, 'city', 'data.contact', 100),
      postalCode: readString(contact, 'postalCode', 'data.contact', 20),
      country: readString(contact, 'country', 'data.contact', 2).toUpperCase(),
    },
    owners: owners.map((owner, index) => parseOwner(owner, `data.owners[${index}]`)),
    banking: {
      accountHolderName: readString(banking, 'accountHolderName', 'data.banking'),
      bankName: readString(banking, 'bankName', 'data.banking'),
      currency: readNullableEnum(banking, 'currency', 'data.banking', CURRENCY_CODES),
      monthlyVolume: readNullableNumber(banking, 'monthlyVolume', 'data.banking'),
      averageTicketSize: readNullableNumber(banking, 'averageTicketSize', 'data.banking'),
      iban: readSensitive(banking, 'iban', 'data.banking', 42),
    },
  };
}

function parseOwner(value: unknown, path: string): OwnerInput {
  const owner = asObject(value, path);
  return {
    id: readOptionalString(owner, 'id', path, 64),
    fullName: readString(owner, 'fullName', path),
    title: readString(owner, 'title', path, 100),
    ownershipPercentage: readNullableNumber(owner, 'ownershipPercentage', path),
    taxId: readSensitive(owner, 'taxId', path, 30),
  };
}

/** Rejects masked placeholders so a `•••• 1234` echoed back can never overwrite the real value. */
function readSensitive(
  source: JsonObject,
  key: string,
  path: string,
  maxLength: number,
): string | undefined {
  const value = readOptionalString(source, key, path, maxLength);
  if (value?.includes('•')) {
    throw badRequest(`${path}.${key} must be omitted to keep the stored value, not sent masked`);
  }
  return value;
}

export function parseVersion(source: JsonObject): number {
  const version = source['version'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw badRequest('version must be a positive integer');
  }
  return version;
}

export function parseListQuery(rawQuery: Readonly<Record<string, unknown>>): ApplicationListQuery {
  // Treat `?status=` like an absent parameter.
  const query = Object.fromEntries(Object.entries(rawQuery).filter(([, value]) => value !== ''));
  const search = singleValue(query['search'], 'search');
  return {
    page: readInteger(query['page'], 'page', 1, 1, 100_000),
    pageSize: readInteger(query['pageSize'], 'pageSize', DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
    status: readNullableEnum(query, 'status', 'query', APPLICATION_STATUSES) ?? undefined,
    search: search?.trim().slice(0, 100) || undefined,
    sortBy: readNullableEnum(query, 'sortBy', 'query', SORT_FIELDS) ?? 'updatedAt',
    sortDirection: readNullableEnum(query, 'sortDirection', 'query', SORT_DIRECTIONS) ?? 'desc',
  };
}

export function parseDecisionRequest(value: unknown): RecordDecisionRequest {
  const body = asObject(value, 'body');
  return {
    decision: readEnum(body, 'decision', 'body', REVIEW_DECISIONS),
    riskLevel: readEnum(body, 'riskLevel', 'body', RISK_LEVELS),
    comment: readString(body, 'comment', 'body', MAX_COMMENT_LENGTH),
  };
}

export function parseSensitiveFieldRef(value: unknown): SensitiveFieldRef {
  const body = asObject(value, 'body');
  const field = readEnum(body, 'field', 'body', ['iban', 'ownerTaxId'] as const);
  if (field === 'iban') {
    return { field };
  }
  const ownerId = readString(body, 'ownerId', 'body', 64);
  if (!ownerId) {
    throw badRequest('body.ownerId is required for ownerTaxId');
  }
  return { field, ownerId };
}

function singleValue(value: unknown, name: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw badRequest(`${name} must be a single value`);
  }
  return value;
}

function readInteger(
  value: unknown,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = singleValue(value, name);
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw badRequest(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}
