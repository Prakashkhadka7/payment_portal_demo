import { badRequest } from './http-error.ts';

/**
 * Minimal runtime readers for untrusted JSON. Each reader picks one known key and checks its
 * type, so unknown properties (e.g. `status`, `createdBy`) can never be mass-assigned.
 */
export type JsonObject = Readonly<Record<string, unknown>>;

const DEFAULT_MAX_LENGTH = 200;

export function asObject(value: unknown, path: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw badRequest(`${path} must be an object`);
  }
  return value as JsonObject;
}

export function asArray(value: unknown, path: string, maxItems: number): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw badRequest(`${path} must be an array`);
  }
  if (value.length > maxItems) {
    throw badRequest(`${path} accepts at most ${maxItems} items`);
  }
  return value;
}

export function readString(
  source: JsonObject,
  key: string,
  path: string,
  maxLength = DEFAULT_MAX_LENGTH,
): string {
  const value = source[key] ?? '';
  if (typeof value !== 'string') {
    throw badRequest(`${path}.${key} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw badRequest(`${path}.${key} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

/** Like `readString`, but `undefined` stays `undefined` (used for write-only sensitive values). */
export function readOptionalString(
  source: JsonObject,
  key: string,
  path: string,
  maxLength = DEFAULT_MAX_LENGTH,
): string | undefined {
  return source[key] === undefined ? undefined : readString(source, key, path, maxLength);
}

export function readNullableNumber(source: JsonObject, key: string, path: string): number | null {
  const value = source[key] ?? null;
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw badRequest(`${path}.${key} must be a number`);
  }
  return value;
}

export function readNullableEnum<T extends string>(
  source: JsonObject,
  key: string,
  path: string,
  allowed: readonly T[],
): T | null {
  const value = source[key] ?? null;
  if (value === null) {
    return null;
  }
  if (!allowed.includes(value as T)) {
    throw badRequest(`${path}.${key} must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

export function readEnum<T extends string>(
  source: JsonObject,
  key: string,
  path: string,
  allowed: readonly T[],
): T {
  const value = readNullableEnum(source, key, path, allowed);
  if (value === null) {
    throw badRequest(`${path}.${key} is required`);
  }
  return value;
}

/** Accepts `YYYY-MM-DD` only. */
export function readNullableIsoDate(source: JsonObject, key: string, path: string): string | null {
  const value = source[key] ?? null;
  if (value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(Date.parse(value))) {
    throw badRequest(`${path}.${key} must be a date in YYYY-MM-DD format`);
  }
  return value;
}

/** Turns an exhaustive `Record<T, true>` into its keys, so adding a union member is a type error. */
export function enumValues<T extends string>(members: Record<T, true>): readonly T[] {
  return Object.keys(members) as T[];
}
