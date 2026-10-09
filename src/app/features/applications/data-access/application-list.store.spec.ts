import { TestBed } from '@angular/core/testing';
import type { ApplicationSummary, Page } from '@contracts';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { DEFAULT_LIST_QUERY, type ResolvedListQuery } from './application-list-query';
import { ApplicationListStore } from './application-list.store';
import { ApplicationsApi } from './applications.api';

function pageOf(...references: string[]): Page<ApplicationSummary> {
  return {
    items: references.map(
      (reference) =>
        ({ id: reference, reference, legalName: reference }) as unknown as ApplicationSummary,
    ),
    total: references.length,
    page: 1,
    pageSize: 10,
  };
}

describe('ApplicationListStore', () => {
  let store: ApplicationListStore;
  let query$: Subject<ResolvedListQuery>;
  let responses: Subject<Page<ApplicationSummary>>[];
  const api = { list: vi.fn() };

  beforeEach(() => {
    responses = [];
    api.list.mockReset().mockImplementation(() => {
      const response = new Subject<Page<ApplicationSummary>>();
      responses.push(response);
      return response;
    });
    TestBed.configureTestingModule({
      providers: [ApplicationListStore, { provide: ApplicationsApi, useValue: api }],
    });
    store = TestBed.inject(ApplicationListStore);
    query$ = new Subject();
    store.connect(query$);
  });

  const respond = (index: number, page: Page<ApplicationSummary>): void => {
    responses[index].next(page);
    responses[index].complete();
  };

  it('shows a first load, then the page of results', () => {
    query$.next(DEFAULT_LIST_QUERY);
    expect(store.isFirstLoad()).toBe(true);

    respond(0, pageOf('MA-1', 'MA-2'));

    expect(store.isLoading()).toBe(false);
    expect(store.items().map((item) => item.reference)).toEqual(['MA-1', 'MA-2']);
    expect(store.total()).toBe(2);
  });

  it('keeps the previous results visible while the next query loads', () => {
    query$.next(DEFAULT_LIST_QUERY);
    respond(0, pageOf('MA-1'));

    query$.next({ ...DEFAULT_LIST_QUERY, page: 2 });

    expect(store.isLoading()).toBe(true);
    expect(store.isFirstLoad()).toBe(false);
    expect(store.items()).toHaveLength(1);
  });

  it('ignores a slow response for a query the user has already replaced', () => {
    query$.next({ ...DEFAULT_LIST_QUERY, search: 'old' });
    query$.next({ ...DEFAULT_LIST_QUERY, search: 'new' });

    respond(1, pageOf('NEW'));
    responses[0].next(pageOf('STALE'));

    expect(store.items().map((item) => item.reference)).toEqual(['NEW']);
    expect(store.query().search).toBe('new');
  });

  it('does not refetch when the same query arrives again', () => {
    query$.next(DEFAULT_LIST_QUERY);
    query$.next({ ...DEFAULT_LIST_QUERY });

    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('exposes a readable error and recovers on retry', () => {
    query$.next(DEFAULT_LIST_QUERY);
    responses[0].error(new HttpErrorResponse({ status: 503 }));

    expect(store.error()?.code).toBe('SERVICE_UNAVAILABLE');
    expect(store.isLoading()).toBe(false);

    store.retry();
    expect(store.error()).toBeNull();
    respond(1, pageOf('MA-1'));

    expect(api.list).toHaveBeenLastCalledWith(DEFAULT_LIST_QUERY);
    expect(store.items()).toHaveLength(1);
  });

  it('keeps working for later queries after an error', () => {
    query$.next(DEFAULT_LIST_QUERY);
    responses[0].error(new HttpErrorResponse({ status: 500 }));

    query$.next({ ...DEFAULT_LIST_QUERY, status: 'DRAFT' });
    respond(1, pageOf('MA-9'));

    expect(store.error()).toBeNull();
    expect(store.items()).toHaveLength(1);
  });

  it('knows when filters are active', () => {
    query$.next({ ...DEFAULT_LIST_QUERY, status: 'APPROVED' });

    expect(store.hasActiveFilters()).toBe(true);
  });
});
