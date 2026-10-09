const DEFAULT_URL = '/';

/**
 * Allows only same-app paths after login, preventing open redirects such as `//evil.example`
 */
export function safeReturnUrl(url: string | null | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return DEFAULT_URL;
  }
  return url;
}
