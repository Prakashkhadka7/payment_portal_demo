import { TestBed } from '@angular/core/testing';
import { NonNullableFormBuilder } from '@angular/forms';
import { type ApplicationForm, createApplicationForm, createOwnerForm } from './application-form';

describe('application form', () => {
  let fb: NonNullableFormBuilder;
  let form: ApplicationForm;

  beforeEach(() => {
    fb = TestBed.inject(NonNullableFormBuilder);
    form = createApplicationForm(fb, () => new Date(2026, 9, 9));
  });

  it('starts as an empty application with one owner and sensible defaults', () => {
    expect(form.controls.owners.length).toBe(1);
    expect(form.controls.contact.controls.country.value).toBe('NP');
    expect(form.controls.banking.controls.currency.value).toBe('NPR');
    expect(form.valid).toBe(false);
  });

  it('requires the fields a reviewer needs and validates their format', () => {
    const { business, contact } = form.controls;
    contact.controls.email.setValue('not-an-email');
    business.controls.website.setValue('ftp://files.example.com');
    business.controls.establishedOn.setValue(new Date(2030, 0, 1));

    expect(business.controls.legalName.hasError('required')).toBe(true);
    expect(contact.controls.email.hasError('email')).toBe(true);
    expect(business.controls.website.hasError('url')).toBe(true);
    expect(business.controls.establishedOn.hasError('futureDate')).toBe(true);
  });

  it('limits total ownership to 100% across owners', () => {
    const owners = form.controls.owners;
    owners.at(0).controls.ownershipPercentage.setValue(70);
    owners.push(createOwnerForm(fb));
    owners.at(1).controls.ownershipPercentage.setValue(40);

    expect(owners.hasError('maxTotal')).toBe(true);

    owners.at(1).controls.ownershipPercentage.setValue(30);
    expect(owners.hasError('maxTotal')).toBe(false);
  });

  it('requires at least one owner', () => {
    form.controls.owners.clear();

    expect(form.controls.owners.hasError('atLeastOne')).toBe(true);
  });

  it('rejects an average ticket larger than the monthly volume', () => {
    const banking = form.controls.banking;
    banking.patchValue({ monthlyVolume: 10_000, averageTicketSize: 20_000 });

    expect(banking.hasError('notGreaterThan')).toBe(true);
  });

  it('requires sensitive values only when nothing is stored yet', () => {
    expect(createOwnerForm(fb).controls.taxId.hasError('required')).toBe(true);
    expect(createOwnerForm(fb, { hasStoredTaxId: true }).controls.taxId.hasError('required')).toBe(
      false,
    );
    expect(form.controls.banking.controls.iban.hasError('required')).toBe(true);
  });
});
