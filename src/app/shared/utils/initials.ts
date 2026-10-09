const MAX_INITIALS = 2;

/**
 * Up to two initials for an avatar. Parenthesised notes such as "(Sales)" and punctuation are
 * ignored, so "Bikash (Sales)" gives "B" and "Asha K." gives "AK". Works for any alphabet.
 */
export function initialsOf(displayName: string): string {
  const words = displayName.replace(/\([^)]*\)/g, ' ').match(/\p{L}[\p{L}'-]*/gu) ?? [];
  return words
    .slice(0, MAX_INITIALS)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
