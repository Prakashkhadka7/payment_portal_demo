import type { ValidationErrors } from '@angular/forms';

type MessageFactory = (error: unknown) => string;

/**
 * One place for user-facing validation copy, keyed by validator error name. The first matching
 * error wins, in this order, so the most fundamental problem is shown first.
 */
const MESSAGES: Readonly<Record<string, MessageFactory>> = {
  required: () => 'This field is required',
  email: () => 'Enter a valid email address',
  minlength: (e) => `Enter at least ${(e as { requiredLength: number }).requiredLength} characters`,
  maxlength: (e) => `Use at most ${(e as { requiredLength: number }).requiredLength} characters`,
  min: (e) => `Must be at least ${(e as { min: number }).min}`,
  max: (e) => `Must be at most ${(e as { max: number }).max}`,
  pattern: () => 'Use the expected format',
  iban: () => 'Enter a valid IBAN (check the country code and digits)',
  url: () => 'Enter a full web address starting with http:// or https://',
  phone: () => 'Enter a valid phone number, e.g. +977 1 4412345',
  futureDate: () => 'Date cannot be in the future',
  maxTotal: (e) =>
    `Total cannot exceed ${(e as { max: number }).max}% (currently ${(e as { actual: number }).actual}%)`,
  notGreaterThan: () => 'Average ticket cannot exceed the monthly volume',
  server: (e) => String(e),
};

/** The message for the most relevant error, or `null` when there is none. */
export function validationMessage(errors: ValidationErrors | null | undefined): string | null {
  if (!errors) {
    return null;
  }
  const key = Object.keys(MESSAGES).find((name) => name in errors);
  if (key) {
    return MESSAGES[key](errors[key]);
  }
  return Object.keys(errors).length > 0 ? 'This value is not valid' : null;
}
