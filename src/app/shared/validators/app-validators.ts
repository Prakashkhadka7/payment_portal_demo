import type { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidIban } from './iban';

/**
 * Reusable validators. Each one passes on empty values: whether a field is required is decided
 * separately with `Validators.required`, so these compose freely.
 */

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

const isEmpty = (value: unknown): boolean => value === null || value === undefined || value === '';

/** International Bank Account Number with a valid checksum. Error key: `iban`. */
export const ibanValidator: ValidatorFn = ({ value }) =>
  isEmpty(value) || isValidIban(String(value)) ? null : { iban: true };

/** An http(s) URL. Error key: `url`. */
export const httpUrlValidator: ValidatorFn = ({ value }) => {
  if (isEmpty(value)) {
    return null;
  }
  try {
    const { protocol } = new URL(String(value));
    return protocol === 'http:' || protocol === 'https:' ? null : { url: true };
  } catch {
    return { url: true };
  }
};

/** Digits with optional `+`, spaces, brackets and dashes, 7–20 characters. Error key: `phone`. */
export const phoneValidator: ValidatorFn = ({ value }) =>
  isEmpty(value) || PHONE_PATTERN.test(String(value)) ? null : { phone: true };

/**
 * An ISO `YYYY-MM-DD` date that is not after today. `today` is injectable for tests.
 * Error key: `futureDate`.
 */
export function notInFutureValidator(today: () => Date = () => new Date()): ValidatorFn {
  return ({ value }) => {
    if (isEmpty(value)) {
      return null;
    }
    const todayIso = toIsoDate(today());
    return String(value) > todayIso ? { futureDate: { max: todayIso } } : null;
  };
}

/**
 * FormArray-level: the numbers at `key` across all rows must not add up to more than `max`
 * (e.g. owners' shares ≤ 100 %). Error key: `maxTotal`.
 */
export function maxTotalValidator(key: string, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const total = (control as FormArray).controls.reduce(
      (sum, row) => sum + (Number(row.get(key)?.value) || 0),
      0,
    );
    return total > max ? { maxTotal: { max, actual: total } } : null;
  };
}

/**
 * Group-level cross-field rule: `smallerKey` must not exceed `largerKey` (e.g. an average ticket
 * cannot exceed the monthly volume). Error key: `notGreaterThan`.
 */
export function notGreaterThanValidator(smallerKey: string, largerKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const smaller = group.get(smallerKey)?.value;
    const larger = group.get(largerKey)?.value;
    if (isEmpty(smaller) || isEmpty(larger)) {
      return null;
    }
    return Number(smaller) > Number(larger)
      ? { notGreaterThan: { field: smallerKey, limitField: largerKey } }
      : null;
  };
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
