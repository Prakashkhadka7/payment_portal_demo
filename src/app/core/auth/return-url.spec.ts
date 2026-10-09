import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('keeps in-app paths, including query strings', () => {
    expect(safeReturnUrl('/applications?status=DRAFT')).toBe('/applications?status=DRAFT');
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['absolute URL', 'https://evil.example'],
    ['protocol-relative URL', '//evil.example'],
    ['backslash trick', '/\\evil.example'],
    ['javascript URL', 'javascript:alert(1)'],
  ])('falls back to the home page for a %s', (_case, url) => {
    expect(safeReturnUrl(url)).toBe('/');
  });
});
