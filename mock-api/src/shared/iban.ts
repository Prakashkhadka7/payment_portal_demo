/**
 * IBAN checksum validation (ISO 13616, mod-97). Mirrors the client-side validator so the server
 * never trusts the client's validation alone.
 */
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!IBAN_PATTERN.test(iban)) {
    return false;
  }
  return mod97(`${iban.slice(4)}${iban.slice(0, 4)}`) === 1;
}

/** Computes the two check digits for a country code and BBAN (used to seed fictitious data). */
export function ibanCheckDigits(countryCode: string, bban: string): string {
  const remainder = mod97(`${bban}${countryCode}00`);
  return String(98 - remainder).padStart(2, '0');
}

/** Letters map to 10..35; the number is processed in chunks to stay within safe integers. */
function mod97(input: string): number {
  const digits = input.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) {
    remainder = Number(`${remainder}${digits.slice(i, i + 7)}`) % 97;
  }
  return remainder;
}
