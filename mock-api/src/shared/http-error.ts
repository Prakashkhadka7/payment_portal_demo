import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiError, ApiErrorCode } from '../../../contracts/index.ts';

/** An error that maps directly to an HTTP response with an `ApiError` body. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fieldErrors?: Readonly<Record<string, string>>;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fieldErrors?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const badRequest = (message: string, fieldErrors?: Record<string, string>): HttpError =>
  new HttpError(400, 'BAD_REQUEST', message, fieldErrors);

export const unauthorized = (message = 'Authentication required'): HttpError =>
  new HttpError(401, 'UNAUTHORIZED', message);

export const forbidden = (
  message = 'You do not have permission to perform this action',
): HttpError => new HttpError(403, 'FORBIDDEN', message);

/** Also used when a record exists but is outside the caller's scope, so existence is not leaked. */
export const notFound = (resource = 'Resource'): HttpError =>
  new HttpError(404, 'NOT_FOUND', `${resource} not found`);

export const conflict = (message: string): HttpError => new HttpError(409, 'CONFLICT', message);

export const validationFailed = (fieldErrors: Record<string, string>): HttpError =>
  new HttpError(422, 'VALIDATION_FAILED', 'Some fields are invalid or incomplete', fieldErrors);

export const notFoundHandler: RequestHandler = () => {
  throw notFound('Endpoint');
};

/** Converts any thrown error into an `ApiError` response without leaking internals. */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    const body: ApiError = {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors && { fieldErrors: error.fieldErrors }),
    };
    res.status(error.status).json(body);
    return;
  }

  if (isBodyParserError(error)) {
    const body: ApiError = { code: 'BAD_REQUEST', message: 'Malformed request body' };
    res.status(400).json(body);
    return;
  }

  console.error('Unhandled error', error);
  const body: ApiError = { code: 'INTERNAL', message: 'Unexpected server error' };
  res.status(500).json(body);
};

function isBodyParserError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    error.type.startsWith('entity.')
  );
}
