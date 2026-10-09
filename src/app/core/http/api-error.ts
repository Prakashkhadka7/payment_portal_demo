import { HttpErrorResponse } from '@angular/common/http';
import type { ApiError, ApiErrorCode } from '@contracts';

const FALLBACK_MESSAGES: Readonly<Record<number, string>> = {
  0: 'Unable to reach the server. Check your connection and try again.',
  500: 'Something went wrong on our side. Please try again.',
  503: 'The service is temporarily unavailable. Please try again.',
};
const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

// Normalises any HTTP failure into the API's `ApiError` shape, so components and stores handle
// one predictable type instead of inspecting `HttpErrorResponse` themselves.
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    if (isApiError(error.error)) {
      return error.error;
    }
    return {
      code: codeForStatus(error.status),
      message: FALLBACK_MESSAGES[error.status] ?? DEFAULT_MESSAGE,
    };
  }
  return { code: 'INTERNAL', message: DEFAULT_MESSAGE };
}

function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ApiError).code === 'string' &&
    typeof (body as ApiError).message === 'string'
  );
}

function codeForStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_FAILED';
    case 429:
      return 'TOO_MANY_REQUESTS';
    case 0:
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'INTERNAL';
  }
}
