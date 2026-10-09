import {
  type FormArray,
  type FormControl,
  type FormGroup,
  type NonNullableFormBuilder,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import type { BusinessType, CurrencyCode, IndustryCategory } from '@contracts';
import {
  httpUrlValidator,
  ibanValidator,
  maxTotalValidator,
  notGreaterThanValidator,
  notInFutureValidator,
  phoneValidator,
} from '@shared/validators/app-validators';

/** Field length limits, mirroring the API so a draft save never fails on length. */
export const FIELD_LIMITS = {
  text: 200,
  registrationNumber: 50,
  website: 300,
  email: 254,
  phone: 30,
  city: 100,
  postalCode: 20,
  title: 100,
  taxId: 30,
  iban: 42,
} as const;

export interface BusinessControls {
  legalName: FormControl<string>;
  tradingName: FormControl<string>;
  businessType: FormControl<BusinessType | null>;
  registrationNumber: FormControl<string>;
  industry: FormControl<IndustryCategory | null>;
  website: FormControl<string>;
  establishedOn: FormControl<string | null>;
}

export interface ContactControls {
  contactName: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  addressLine1: FormControl<string>;
  addressLine2: FormControl<string>;
  city: FormControl<string>;
  postalCode: FormControl<string>;
  country: FormControl<string>;
}

export interface OwnerControls {
  /** Server id of an existing owner, so its stored tax id is kept when not replaced. */
  id: FormControl<string | null>;
  fullName: FormControl<string>;
  title: FormControl<string>;
  ownershipPercentage: FormControl<number | null>;
  taxId: FormControl<string>;
}

export interface BankingControls {
  accountHolderName: FormControl<string>;
  bankName: FormControl<string>;
  currency: FormControl<CurrencyCode | null>;
  monthlyVolume: FormControl<number | null>;
  averageTicketSize: FormControl<number | null>;
  iban: FormControl<string>;
}

export type BusinessForm = FormGroup<BusinessControls>;
export type ContactForm = FormGroup<ContactControls>;
export type OwnerForm = FormGroup<OwnerControls>;
export type BankingForm = FormGroup<BankingControls>;

export interface ApplicationFormControls {
  business: BusinessForm;
  contact: ContactForm;
  owners: FormArray<OwnerForm>;
  banking: BankingForm;
}

export type ApplicationForm = FormGroup<ApplicationFormControls>;

/** Field validators describe what a complete, submittable application needs. */
export function createApplicationForm(
  fb: NonNullableFormBuilder,
  today: () => Date = () => new Date(),
): ApplicationForm {
  const { required, maxLength, email, min } = Validators;
  const text = (limit: number = FIELD_LIMITS.text): ValidatorFn[] => [required, maxLength(limit)];

  return fb.group({
    business: fb.group({
      legalName: fb.control('', text()),
      tradingName: fb.control('', maxLength(FIELD_LIMITS.text)),
      businessType: fb.control<BusinessType | null>(null, required),
      registrationNumber: fb.control('', text(FIELD_LIMITS.registrationNumber)),
      industry: fb.control<IndustryCategory | null>(null, required),
      website: fb.control('', [httpUrlValidator, maxLength(FIELD_LIMITS.website)]),
      establishedOn: fb.control<string | null>(null, [required, notInFutureValidator(today)]),
    }),
    contact: fb.group({
      contactName: fb.control('', text()),
      email: fb.control('', [required, email, maxLength(FIELD_LIMITS.email)]),
      phone: fb.control('', [required, phoneValidator, maxLength(FIELD_LIMITS.phone)]),
      addressLine1: fb.control('', text()),
      addressLine2: fb.control('', maxLength(FIELD_LIMITS.text)),
      city: fb.control('', text(FIELD_LIMITS.city)),
      postalCode: fb.control('', text(FIELD_LIMITS.postalCode)),
      country: fb.control('NP', required),
    }),
    owners: fb.array(
      [createOwnerForm(fb)],
      [atLeastOneValidator, maxTotalValidator('ownershipPercentage', 100)],
    ),
    banking: fb.group(
      {
        accountHolderName: fb.control('', text()),
        bankName: fb.control('', text()),
        currency: fb.control<CurrencyCode | null>('NPR', required),
        monthlyVolume: fb.control<number | null>(null, [required, min(1)]),
        averageTicketSize: fb.control<number | null>(null, [required, min(1)]),
        iban: fb.control('', bankAccountValidators(false)),
      },
      { validators: notGreaterThanValidator('averageTicketSize', 'monthlyVolume') },
    ),
  });
}

export interface OwnerFormOptions {
  readonly id?: string | null;
  /** True when the server already holds a tax id for this owner (so a new one is optional). */
  readonly hasStoredTaxId?: boolean;
}

export function createOwnerForm(
  fb: NonNullableFormBuilder,
  { id = null, hasStoredTaxId = false }: OwnerFormOptions = {},
): OwnerForm {
  const { required, maxLength, min, max } = Validators;
  return fb.group({
    id: fb.control<string | null>(id),
    fullName: fb.control('', [required, maxLength(FIELD_LIMITS.text)]),
    title: fb.control('', maxLength(FIELD_LIMITS.title)),
    ownershipPercentage: fb.control<number | null>(null, [required, min(1), max(100)]),
    taxId: fb.control('', ownerTaxIdValidators(hasStoredTaxId)),
  });
}

/**
 * A write-only field is required only while nothing is stored yet; once the server holds a
 * value, leaving the field empty keeps it.
 */
export function sensitiveValidators(
  validators: ValidatorFn[],
  hasStoredValue: boolean,
): ValidatorFn[] {
  return hasStoredValue ? validators : [Validators.required, ...validators];
}

/** Validators for an owner's write-only tax id. */
export function ownerTaxIdValidators(hasStoredValue: boolean): ValidatorFn[] {
  return sensitiveValidators([Validators.maxLength(FIELD_LIMITS.taxId)], hasStoredValue);
}

/** Validators for the write-only IBAN field. */
export function bankAccountValidators(hasStoredValue: boolean): ValidatorFn[] {
  return sensitiveValidators(
    [ibanValidator, Validators.maxLength(FIELD_LIMITS.iban)],
    hasStoredValue,
  );
}

/** FormArray must contain at least one row. Error key: `atLeastOne`. */
const atLeastOneValidator: ValidatorFn = (control) =>
  (control as FormArray).length > 0 ? null : { atLeastOne: true };
