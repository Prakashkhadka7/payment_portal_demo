import type { NonNullableFormBuilder } from '@angular/forms';
import type { ApplicationDataInput, ApplicationDataView } from '@contracts';
import { normalizeIban } from '@shared/validators/iban';
import {
  type ApplicationForm,
  bankAccountValidators,
  createOwnerForm,
  ownerTaxIdValidators,
} from './application-form';

/** Quiet updates: loading data must not look like user edits (e.g. to auto-save). */
const SILENT = { emitEvent: false } as const;

/**
 * Builds the API payload from the form. Sensitive values are sent only when the user typed a
 * new one; leaving them empty keeps what the server stores, and masked text is never echoed.
 */
export function toApplicationInput(form: ApplicationForm): ApplicationDataInput {
  const { business, contact, owners, banking } = form.getRawValue();
  const { iban, ...bankingDetails } = banking;

  return {
    business,
    contact,
    owners: owners.map(({ id, taxId, ...owner }) => ({
      ...owner,
      ...(id ? { id } : {}),
      ...(taxId.trim() ? { taxId: taxId.trim() } : {}),
    })),
    banking: {
      ...bankingDetails,
      ...(iban.trim() ? { iban: normalizeIban(iban) } : {}),
    },
  };
}

/**
 * Loads saved draft data into the form without emitting value changes. Sensitive inputs stay
 * empty.
 */
export function populateForm(
  form: ApplicationForm,
  fb: NonNullableFormBuilder,
  data: ApplicationDataView,
): void {
  const { iban, ...banking } = data.banking;
  const { business, contact, owners } = form.controls;

  business.patchValue(data.business, SILENT);
  contact.patchValue(data.contact, SILENT);

  owners.clear(SILENT);
  data.owners.forEach(({ id, taxId, ...owner }) => {
    const row = createOwnerForm(fb, { id, hasStoredTaxId: taxId !== null });
    row.patchValue(owner, SILENT);
    owners.push(row, SILENT);
  });

  const ibanControl = form.controls.banking.controls.iban;
  ibanControl.setValidators(bankAccountValidators(iban !== null));
  form.controls.banking.patchValue({ ...banking, iban: '' }, SILENT);
  form.updateValueAndValidity(SILENT);
}

/**
 * After a save, adopts what the server now holds without touching what the user typed:
 * server-assigned ids for new owners (so the next save updates rather than duplicates them),
 * and "value on file" status for sensitive fields (making them optional).
 */
export function syncServerState(form: ApplicationForm, data: ApplicationDataView): void {
  form.controls.owners.controls.forEach((row, index) => {
    const saved = data.owners[index];
    if (!saved) {
      return;
    }
    if (!row.controls.id.value) {
      row.controls.id.setValue(saved.id, SILENT);
    }
    row.controls.taxId.setValidators(ownerTaxIdValidators(saved.taxId !== null));
    row.controls.taxId.updateValueAndValidity(SILENT);
  });
  const iban = form.controls.banking.controls.iban;
  iban.setValidators(bankAccountValidators(data.banking.iban !== null));
  iban.updateValueAndValidity(SILENT);
}

/**
 * Shows server-side validation errors (422 `fieldErrors`) on the matching controls, e.g.
 * `owners[0].taxId` → owners › row 0 › taxId. 
 */
export function applyServerErrors(
  form: ApplicationForm,
  fieldErrors: Readonly<Record<string, string>>,
): string[] {
  const unmatched: string[] = [];
  for (const [path, message] of Object.entries(fieldErrors)) {
    const segments = path.split(/\.|\[(\d+)\]/).filter(Boolean);
    const control = form.get(
      segments.map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment)),
    );
    if (control) {
      control.setErrors({ ...control.errors, server: message });
      control.markAsTouched();
    } else {
      unmatched.push(message);
    }
  }
  return unmatched;
}
