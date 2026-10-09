import { FormArray, FormControl, FormGroup } from '@angular/forms';
import {
  httpUrlValidator,
  ibanValidator,
  maxTotalValidator,
  notGreaterThanValidator,
  notInFutureValidator,
  phoneValidator,
} from './app-validators';

const control = (value: unknown) => new FormControl(value);

describe('app validators', () => {
  it('all pass on empty values, leaving "required" to Validators.required', () => {
    for (const validator of [
      ibanValidator,
      httpUrlValidator,
      phoneValidator,
      notInFutureValidator(),
    ]) {
      expect(validator(control(''))).toBeNull();
      expect(validator(control(null))).toBeNull();
    }
  });

  it('ibanValidator flags a bad checksum', () => {
    expect(ibanValidator(control('GB82WEST12345698765432'))).toBeNull();
    expect(ibanValidator(control('GB83WEST12345698765432'))).toEqual({ iban: true });
  });

  it('httpUrlValidator accepts only http(s) URLs', () => {
    expect(httpUrlValidator(control('https://shop.example.com'))).toBeNull();
    expect(httpUrlValidator(control('shop.example.com'))).toEqual({ url: true });
    expect(httpUrlValidator(control('javascript:alert(1)'))).toEqual({ url: true });
  });

  it('phoneValidator accepts common international formats', () => {
    expect(phoneValidator(control('+977 1-441 2345'))).toBeNull();
    expect(phoneValidator(control('call me'))).toEqual({ phone: true });
  });

  it('notInFutureValidator compares calendar dates against today', () => {
    const validator = notInFutureValidator(() => new Date(2026, 9, 9));

    expect(validator(control('2026-10-09'))).toBeNull();
    expect(validator(control('2019-04-15'))).toBeNull();
    expect(validator(control('2026-10-10'))).toEqual({ futureDate: { max: '2026-10-09' } });
  });

  it('maxTotalValidator sums a field across rows', () => {
    const owners = (...shares: (number | null)[]) =>
      new FormArray(shares.map((share) => new FormGroup({ share: new FormControl(share) })));
    const validator = maxTotalValidator('share', 100);

    expect(validator(owners(60, 40))).toBeNull();
    expect(validator(owners(60, null))).toBeNull();
    expect(validator(owners(70, 40))).toEqual({ maxTotal: { max: 100, actual: 110 } });
  });

  it('notGreaterThanValidator compares two fields of a group', () => {
    const banking = (ticket: number | null, volume: number | null) =>
      new FormGroup({ ticket: new FormControl(ticket), volume: new FormControl(volume) });
    const validator = notGreaterThanValidator('ticket', 'volume');

    expect(validator(banking(500, 10_000))).toBeNull();
    expect(validator(banking(500, null))).toBeNull();
    expect(validator(banking(20_000, 10_000))).toEqual({
      notGreaterThan: { field: 'ticket', limitField: 'volume' },
    });
  });
});
