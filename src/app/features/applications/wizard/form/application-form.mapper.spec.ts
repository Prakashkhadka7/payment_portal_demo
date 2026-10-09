import { TestBed } from '@angular/core/testing';
import { NonNullableFormBuilder } from '@angular/forms';
import type { ApplicationDataView } from '@contracts';
import { type ApplicationForm, createApplicationForm } from './application-form';
import {
  applyServerErrors,
  populateForm,
  syncServerState,
  toApplicationInput,
} from './application-form.mapper';

const SAVED_DATA: ApplicationDataView = {
  business: {
    legalName: 'Spec Traders Pvt. Ltd.',
    tradingName: 'Spec Traders',
    businessType: 'PRIVATE_LIMITED',
    registrationNumber: 'REG-000001',
    industry: 'RETAIL',
    website: 'https://spec.example.com',
    establishedOn: '2020-01-15',
  },
  contact: {
    contactName: 'Test Contact',
    email: 'contact@example.com',
    phone: '+977 1 4412345',
    addressLine1: '1 Spec Street',
    addressLine2: '',
    city: 'Kathmandu',
    postalCode: '44600',
    country: 'NP',
  },
  owners: [
    {
      id: 'owner-1',
      fullName: 'Owner One',
      title: 'Director',
      ownershipPercentage: 60,
      taxId: { masked: '•••• 6789' },
    },
    { id: 'owner-2', fullName: 'Owner Two', title: '', ownershipPercentage: 40, taxId: null },
  ],
  banking: {
    accountHolderName: 'Spec Traders',
    bankName: 'Sample Bank Ltd.',
    currency: 'NPR',
    monthlyVolume: 100_000,
    averageTicketSize: 1_000,
    iban: { masked: '•••• 5432' },
  },
};

describe('application form mapper', () => {
  let fb: NonNullableFormBuilder;
  let form: ApplicationForm;

  beforeEach(() => {
    fb = TestBed.inject(NonNullableFormBuilder);
    form = createApplicationForm(fb, () => new Date(2026, 9, 9));
  });

  describe('populateForm', () => {
    it('loads saved data without firing value changes', () => {
      const changes = vi.fn();
      form.valueChanges.subscribe(changes);

      populateForm(form, fb, SAVED_DATA);

      expect(changes).not.toHaveBeenCalled();
      expect(form.controls.business.controls.legalName.value).toBe('Spec Traders Pvt. Ltd.');
      expect(form.controls.owners.length).toBe(2);
      expect(form.controls.owners.at(0).controls.id.value).toBe('owner-1');
    });

    it('never puts masked values into inputs, and only requires what is not stored yet', () => {
      populateForm(form, fb, SAVED_DATA);
      const [storedOwner, newOwner] = form.controls.owners.controls;
      const iban = form.controls.banking.controls.iban;

      expect(storedOwner.controls.taxId.value).toBe('');
      expect(storedOwner.controls.taxId.hasError('required')).toBe(false);
      expect(newOwner.controls.taxId.hasError('required')).toBe(true);
      expect(iban.value).toBe('');
      expect(iban.hasError('required')).toBe(false);
    });
  });

  describe('toApplicationInput', () => {
    it('omits untouched sensitive values so the stored ones are kept', () => {
      populateForm(form, fb, SAVED_DATA);

      const input = toApplicationInput(form);

      expect(input.banking).not.toHaveProperty('iban');
      expect(input.owners[0]).toEqual({
        id: 'owner-1',
        fullName: 'Owner One',
        title: 'Director',
        ownershipPercentage: 60,
      });
      expect(JSON.stringify(input)).not.toContain('•');
    });

    it('sends newly typed sensitive values, normalised', () => {
      form.controls.banking.controls.iban.setValue(' gb82 west 1234 5698 7654 32 ');
      form.controls.owners.at(0).controls.taxId.setValue('  TIN-1  ');

      const input = toApplicationInput(form);

      expect(input.banking.iban).toBe('GB82WEST12345698765432');
      expect(input.owners[0].taxId).toBe('TIN-1');
      expect(input.owners[0]).not.toHaveProperty('id');
    });
  });

  describe('syncServerState', () => {
    it('adopts server ids for new owners and keeps what the user typed', () => {
      form.controls.owners.at(0).patchValue({ fullName: 'New Owner', taxId: 'TIN-9' });
      form.controls.banking.controls.iban.setValue('GB82WEST12345698765432');

      syncServerState(form, SAVED_DATA);

      const row = form.controls.owners.at(0);
      expect(row.controls.id.value).toBe('owner-1');
      expect(row.controls.taxId.value).toBe('TIN-9');
      expect(form.controls.banking.controls.iban.value).toBe('GB82WEST12345698765432');
    });

    it('makes sensitive fields optional once the server stores them', () => {
      syncServerState(form, SAVED_DATA);

      expect(form.controls.owners.at(0).controls.taxId.hasError('required')).toBe(false);
      expect(form.controls.banking.controls.iban.hasError('required')).toBe(false);
    });
  });

  describe('applyServerErrors', () => {
    it('places server messages on the matching controls, including array rows', () => {
      populateForm(form, fb, SAVED_DATA);

      const unmatched = applyServerErrors(form, {
        'banking.iban': 'Must be a valid IBAN',
        'owners[1].taxId': 'Required',
        owners: 'Total ownership cannot exceed 100%',
      });

      expect(form.controls.banking.controls.iban.getError('server')).toBe('Must be a valid IBAN');
      expect(form.controls.owners.at(1).controls.taxId.getError('server')).toBe('Required');
      expect(form.controls.owners.getError('server')).toBe('Total ownership cannot exceed 100%');
      expect(unmatched).toEqual([]);
    });

    it('returns messages that match no control instead of dropping them', () => {
      expect(applyServerErrors(form, { 'somewhere.else': 'Oops' })).toEqual(['Oops']);
    });
  });
});
