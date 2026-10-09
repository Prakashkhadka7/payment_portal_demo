import { isValidIban, normalizeIban } from './iban';

describe('IBAN', () => {
  it.each([
    ['GB82WEST12345698765432'],
    ['gb82 west 1234 5698 7654 32'],
    ['DE89370400440532013000'],
  ])('accepts the valid IBAN %s', (iban) => {
    expect(isValidIban(iban)).toBe(true);
  });

  it.each([
    ['wrong checksum', 'GB83WEST12345698765432'],
    ['too short', 'GB82WEST'],
    ['missing country', '82WEST12345698765432'],
    ['illegal characters', 'GB82-WEST-1234-5698-7654-32'],
  ])('rejects an IBAN with %s', (_case, iban) => {
    expect(isValidIban(iban)).toBe(false);
  });

  it('normalises spacing and case', () => {
    expect(normalizeIban(' gb82 west 1234 ')).toBe('GB82WEST1234');
  });
});
