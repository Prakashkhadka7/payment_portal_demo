import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { Sort } from '@angular/material/sort';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { Permission } from '@contracts';
import { HasPermissionDirective } from '@core/auth/has-permission.directive';
import { PermissionService } from '@core/auth/permission.service';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { StateMessage } from '@shared/ui/state-message/state-message';
import { map } from 'rxjs';
import { PAGE_SIZE_OPTIONS, SORT_FIELDS } from '../data-access/application.constants';
import {
  parseListQuery,
  type ResolvedListQuery,
  toQueryParams,
} from '../data-access/application-list-query';
import { ApplicationListStore } from '../data-access/application-list.store';
import { ApplicationCards } from './application-cards/application-cards';
import { visibleColumns } from './application-columns';
import { ApplicationFilters } from './application-filters/application-filters';
import { ApplicationTable } from './application-table/application-table';

const PHONE_QUERY = '(max-width: 599.98px)';
const MAX_SKELETON_ROWS = 8;

/**
 * Dashboard container. The URL is the single source of truth for page, filters and sort: user
 * actions only update the URL, and the store reacts to it. This keeps back/forward, refresh and
 * shared links consistent for free.
 */
@Component({
  selector: 'app-application-list',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    RouterLink,
    HasPermissionDirective,
    PageHeader,
    Skeleton,
    StateMessage,
    ApplicationCards,
    ApplicationFilters,
    ApplicationTable,
  ],
  providers: [ApplicationListStore],
  templateUrl: './application-list.html',
  styleUrl: './application-list.scss',
})
export class ApplicationList {
  protected readonly store = inject(ApplicationListStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly permissions = inject(PermissionService);

  protected readonly pageSizeOptions = [...PAGE_SIZE_OPTIONS];
  protected readonly isPhone = toSignal(
    inject(BreakpointObserver)
      .observe(PHONE_QUERY)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly columns = computed(() =>
    visibleColumns((permission) => this.permissions.has(permission)),
  );
  protected readonly skeletonRows = computed(() =>
    Math.min(this.store.query().pageSize, MAX_SKELETON_ROWS),
  );

  /** What the list contains depends on the user's scope, so say so. */
  protected readonly description = computed(() => {
    const can = (permission: Permission): boolean => this.permissions.has(permission);
    if (can('application:assign')) {
      return 'All merchant applications in the portal. Assign submitted ones to a reviewer.';
    }
    if (can('application:create') && can('application:review')) {
      return 'Applications you created, plus those assigned to you for review.';
    }
    if (can('application:review')) {
      return 'Applications assigned to you for risk review.';
    }
    return 'Your merchant applications, from first draft to final decision.';
  });

  protected readonly emptyMessage = computed(() =>
    this.permissions.has('application:create')
      ? "You haven't started any merchant applications yet."
      : this.permissions.has('application:review')
        ? 'No applications are assigned to you yet.'
        : 'No applications have been created yet.',
  );

  /** Announced politely to screen readers whenever the visible results change. */
  protected readonly announcement = computed(() => {
    if (this.store.isLoading()) {
      return 'Loading applications…';
    }
    if (this.store.error()) {
      return '';
    }
    const { page, pageSize } = this.store.query();
    const total = this.store.total();
    const shown = this.store.items().length;
    if (shown === 0) {
      return 'No applications found.';
    }
    const from = (page - 1) * pageSize + 1;
    return `Showing ${from}–${from + shown - 1} of ${total} applications.`;
  });

  constructor() {
    this.store.connect(this.route.queryParams.pipe(map(parseListQuery)));
  }

  protected search(search: string): void {
    // Typing replaces the history entry instead of adding one per pause.
    this.navigate({ search: search || undefined, page: 1 }, { replaceUrl: true });
  }

  protected filterByStatus(status: ResolvedListQuery['status']): void {
    this.navigate({ status, page: 1 });
  }

  protected sort({ active, direction }: Sort): void {
    const sortBy = SORT_FIELDS.find((field) => field === active);
    if (sortBy) {
      this.navigate({ sortBy, sortDirection: direction || 'desc', page: 1 });
    }
  }

  protected changePage({ pageIndex, pageSize }: PageEvent): void {
    const pageSizeChanged = pageSize !== this.store.query().pageSize;
    this.navigate({ pageSize, page: pageSizeChanged ? 1 : pageIndex + 1 });
  }

  protected clearFilters(): void {
    this.navigate({ status: undefined, search: undefined, page: 1 });
  }

  protected goToFirstPage(): void {
    this.navigate({ page: 1 });
  }

  private navigate(
    changes: Partial<ResolvedListQuery>,
    { replaceUrl = false }: { replaceUrl?: boolean } = {},
  ): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams({ ...this.store.query(), ...changes }),
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
