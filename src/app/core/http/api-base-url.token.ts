import { InjectionToken } from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

// True when a request targets our API
export function isApiUrl(url: string, apiBaseUrl: string): boolean {
  return url === apiBaseUrl || url.startsWith(`${apiBaseUrl}/`);
}
