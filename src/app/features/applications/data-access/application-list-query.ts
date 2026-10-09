import type { Params } from '@angular/router';
import type { ApplicationListQuery } from '@contracts';
import {
  APPLICATION_STATUSES,
  PAGE_SIZE_OPTIONS,
  SORT_DIRECTIONS,
  SORT_FIELDS,
} from './application.constants';

/** The dashboard query with defaults applied, so every field is always present. */
export type ResolvedListQuery = Required<Omit<ApplicationListQuery, 'status' | 'search'>> &
  Pick<ApplicationListQuery, 'status' | 'search'>;

export const DEFAULT_LIST_QUERY: ResolvedListQuery = {
  page: 1,
  pageSize: 10,
  sortBy: 'updatedAt',
  sortDirection: 'desc',
};

const MAX_SEARCH_LENGTH = 100;

/**
 * Reads the dashboard state from URL query parameters. The URL is user-editable, so anything
 * unknown or out of range silently falls back to the default instead of reaching the API.
 */
export function parseListQuery(params: Params): ResolvedListQuery {
  const page = Number(params['page']);
  const pageSize = Number(params['pageSize']);
  const search = typeof params['search'] === 'string' ? params['search'].trim() : '';

  return {
    page: Number.isInteger(page) && page >= 1 ? page : DEFAULT_LIST_QUERY.page,
    pageSize: PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_LIST_QUERY.pageSize,
    status: oneOf(params['status'], APPLICATION_STATUSES),
    search: search ? search.slice(0, MAX_SEARCH_LENGTH) : undefined,
    sortBy: oneOf(params['sortBy'], SORT_FIELDS) ?? DEFAULT_LIST_QUERY.sortBy,
    sortDirection:
      oneOf(params['sortDirection'], SORT_DIRECTIONS) ?? DEFAULT_LIST_QUERY.sortDirection,
  };
}

/**
 * Converts a query back to URL parameters, writing only non-default values so URLs stay short
 * and shareable. `null` removes a parameter when merged into the current URL.
 */
export function toQueryParams(query: ResolvedListQuery): Params {
  const differs = <K extends keyof ResolvedListQuery>(key: K) =>
    query[key] !== DEFAULT_LIST_QUERY[key] ? query[key] : null;

  return {
    page: differs('page'),
    pageSize: differs('pageSize'),
    status: query.status ?? null,
    search: query.search ?? null,
    sortBy: differs('sortBy'),
    sortDirection: differs('sortDirection'),
  };
}

export function isSameQuery(a: ResolvedListQuery, b: ResolvedListQuery): boolean {
  return (Object.keys(DEFAULT_LIST_QUERY) as (keyof ResolvedListQuery)[])
    .concat('status', 'search')
    .every((key) => a[key] === b[key]);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}
