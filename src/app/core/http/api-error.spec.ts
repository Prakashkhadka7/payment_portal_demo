import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './api-error';

describe('toApiError', () => {
  it('returns the API error body as-is', () => {
    const body = { code: 'CONFLICT', message: 'Changed elsewhere' };

    expect(toApiError(new HttpErrorResponse({ status: 409, error: body }))).toEqual(body);
  });

  it('maps network failures to a friendly message', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 }))).toEqual({
      code: 'SERVICE_UNAVAILABLE',
      message: expect.stringContaining('Unable to reach the server'),
    });
  });

  it('handles non-HTTP errors', () => {
    expect(toApiError(new Error('boom')).code).toBe('INTERNAL');
  });
});
