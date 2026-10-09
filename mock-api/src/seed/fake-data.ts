import { ibanCheckDigits } from '../shared/iban.ts';

/** Deterministic PRNG (mulberry32) so seed data is identical on every start and in tests. */
export function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

export function digits(random: () => number, length: number): string {
  return Array.from({ length }, () => Math.floor(random() * 10)).join('');
}

/** A checksum-valid but invented German-format IBAN. */
export function fictitiousIban(random: () => number): string {
  const bban = `9${digits(random, 17)}`;
  return `DE${ibanCheckDigits('DE', bban)}${bban}`;
}
