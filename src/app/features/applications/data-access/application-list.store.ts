import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ApiError, ApplicationSummary, Page } from '@contracts';
import { toApiError } from '@core/http/api-error';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  type Observable,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { DEFAULT_LIST_QUERY, isSameQuery, type ResolvedListQuery } from './application-list-query';
import { ApplicationsApi } from './applications.api';

type LoadStatus = 'loading' | 'success' | 'error';

interface ListState {
  readonly query: ResolvedListQuery;
  readonly status: LoadStatus;
  readonly page: Page<ApplicationSummary> | null;
  readonly error: ApiError | null;
}

type LoadResult =
  | { readonly page: Page<ApplicationSummary>; readonly error: null }
  | { readonly page: null; readonly error: ApiError };

/**
 * Dashboard state, scoped to the list page (provided by the component, destroyed with it).
 * Signals expose the state to the template; RxJS handles the asynchronous loading flow.
 */
@Injectable()
export class ApplicationListStore {
  private readonly api = inject(ApplicationsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retry$ = new Subject<void>();

  private readonly state = signal<ListState>({
    query: DEFAULT_LIST_QUERY,
    status: 'loading',
    page: null,
    error: null,
  });

  readonly query = computed(() => this.state().query);
  readonly items = computed(() => this.state().page?.items ?? []);
  readonly total = computed(() => this.state().page?.total ?? 0);
  readonly error = computed(() => this.state().error);
  readonly isLoading = computed(() => this.state().status === 'loading');
  readonly isFirstLoad = computed(() => this.isLoading() && this.state().page === null);
  readonly hasActiveFilters = computed(() => !!this.query().status || !!this.query().search);

  /**
   * Loads a page whenever the query changes (or on retry). `switchMap` cancels a request that is
   * still in flight when a newer query arrives, so a slow, outdated response can never overwrite
   * the latest one. Errors are turned into state, keeping the stream alive for the next query.
   */
  connect(query$: Observable<ResolvedListQuery>): void {
    combineLatest([
      query$.pipe(distinctUntilChanged(isSameQuery)),
      this.retry$.pipe(startWith(undefined)),
    ])
      .pipe(
        map(([query]) => query),
        tap((query) => this.state.update((s) => ({ ...s, query, status: 'loading', error: null }))),
        switchMap((query) => this.load(query)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ page, error }) =>
        this.state.update((s) => ({
          ...s,
          page,
          error,
          status: error ? 'error' : 'success',
        })),
      );
  }

  retry(): void {
    this.retry$.next();
  }

  private load(query: ResolvedListQuery): Observable<LoadResult> {
    return this.api.list(query).pipe(
      map((page): LoadResult => ({ page, error: null })),
      catchError((error: unknown) => of<LoadResult>({ page: null, error: toApiError(error) })),
    );
  }
}
