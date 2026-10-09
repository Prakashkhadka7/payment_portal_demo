export type IsoDateTime = string;

export type IsoDate = string;

export interface UserRef {
  readonly id: string;
  readonly displayName: string;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export type SortDirection = 'asc' | 'desc';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL';

export interface ApiError {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly fieldErrors?: Readonly<Record<string, string>>;
}
