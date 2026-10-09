const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

/** Removes spaces and upper-cases, the canonical form for storage and comparison. */
export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/**
 * ISO 13616 IBAN check: shape plus mod-97 checksum. The server runs the same check on submit;
 * this copy only gives users instant feedback.
 */
export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!IBAN_PATTERN.test(iban)) {
    return false;
  }
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  const digits = rearranged.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
  let remainder = 0;
  // Process in chunks so the number stays within safe integer range.
  for (let i = 0; i < digits.length; i += 7) {
    remainder = Number(`${remainder}${digits.slice(i, i + 7)}`) % 97;
  }
  return remainder === 1;
}
