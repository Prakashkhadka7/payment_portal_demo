import { isValidIban } from '../shared/iban.ts';
import type { ApplicationDataRecord } from './application.record.ts';

/** Field path → message. Empty when the application is complete and valid. */
export type FieldErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const REQUIRED = 'Required';

/**
 * Server-side completeness check run on submit. Mirrors the client validators: the client gives
 * fast feedback, the server is the authority.
 */
export function validateForSubmission(data: ApplicationDataRecord, today: string): FieldErrors {
  const errors: FieldErrors = {};
  const require = (path: string, value: unknown): void => {
    if (value === null || value === '') {
      errors[path] = REQUIRED;
    }
  };

  const { business, contact, owners, banking } = data;

  require('business.legalName', business.legalName);
  require('business.businessType', business.businessType);
  require('business.registrationNumber', business.registrationNumber);
  require('business.industry', business.industry);
  require('business.establishedOn', business.establishedOn);
  if (business.establishedOn && business.establishedOn > today) {
    errors['business.establishedOn'] = 'Cannot be in the future';
  }
  if (business.website && !isHttpUrl(business.website)) {
    errors['business.website'] = 'Must be a valid http(s) URL';
  }

  require('contact.contactName', contact.contactName);
  require('contact.addressLine1', contact.addressLine1);
  require('contact.city', contact.city);
  require('contact.postalCode', contact.postalCode);
  checkPattern(errors, 'contact.email', contact.email, EMAIL_PATTERN, 'Must be a valid email');
  checkPattern(
    errors,
    'contact.phone',
    contact.phone,
    PHONE_PATTERN,
    'Must be a valid phone number',
  );
  checkPattern(
    errors,
    'contact.country',
    contact.country,
    COUNTRY_PATTERN,
    'Must be a 2-letter code',
  );

  if (owners.length === 0) {
    errors['owners'] = 'At least one owner is required';
  }
  owners.forEach((owner, index) => {
    const path = `owners[${index}]`;
    require(`${path}.fullName`, owner.fullName);
    require(`${path}.taxId`, owner.taxId);
    const share = owner.ownershipPercentage;
    if (share === null || share <= 0 || share > 100) {
      errors[`${path}.ownershipPercentage`] = 'Must be between 0 and 100';
    }
  });
  const totalOwnership = owners.reduce((sum, owner) => sum + (owner.ownershipPercentage ?? 0), 0);
  if (totalOwnership > 100) {
    errors['owners'] = 'Total ownership cannot exceed 100%';
  }

  require('banking.accountHolderName', banking.accountHolderName);
  require('banking.bankName', banking.bankName);
  require('banking.currency', banking.currency);
  if (!banking.iban) {
    errors['banking.iban'] = REQUIRED;
  } else if (!isValidIban(banking.iban)) {
    errors['banking.iban'] = 'Must be a valid IBAN';
  }
  const { monthlyVolume, averageTicketSize } = banking;
  if (monthlyVolume === null || monthlyVolume <= 0) {
    errors['banking.monthlyVolume'] = 'Must be greater than 0';
  }
  if (averageTicketSize === null || averageTicketSize <= 0) {
    errors['banking.averageTicketSize'] = 'Must be greater than 0';
  } else if (monthlyVolume !== null && averageTicketSize > monthlyVolume) {
    errors['banking.averageTicketSize'] = 'Cannot exceed monthly volume';
  }

  return errors;
}

function checkPattern(
  errors: FieldErrors,
  path: string,
  value: string,
  pattern: RegExp,
  message: string,
): void {
  if (!value) {
    errors[path] = REQUIRED;
  } else if (!pattern.test(value)) {
    errors[path] = message;
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
