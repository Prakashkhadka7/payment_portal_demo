import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Role } from '@contracts';
import { AuthStore } from '@core/auth/auth.store';
import { NEVER, of, throwError } from 'rxjs';
import { createPage, createSummary } from '../../../../testing/application-fixtures';
import { createSession } from '../../../../testing/auth-fixtures';
import { DEFAULT_LIST_QUERY } from '../data-access/application-list-query';
import { ApplicationsApi } from '../data-access/applications.api';
import { ApplicationFilters } from './application-filters/application-filters';
import { ApplicationList } from './application-list';

describe('ApplicationList (dashboard page)', () => {
  const api = { list: vi.fn() };
  let harness: RouterTestingHarness;

  const setUp = async (roles: readonly Role[] = ['SALES']): Promise<void> => {
    api.list.mockReset().mockReturnValue(of(createPage([createSummary()])));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'applications', component: ApplicationList }]),
        { provide: ApplicationsApi, useValue: api },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    TestBed.inject(AuthStore).setSession(createSession(roles));
    harness = await RouterTestingHarness.create();
  };

  const open = async (url = '/applications'): Promise<HTMLElement> => {
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    return harness.routeNativeElement as HTMLElement;
  };

  const settle = async (): Promise<HTMLElement> => {
    await harness.fixture.whenStable();
    return harness.routeNativeElement as HTMLElement;
  };

  const currentUrl = (): string => TestBed.inject(Router).url;

  it('loads exactly the page described by the URL', async () => {
    await setUp();

    await open('/applications?status=DRAFT&page=2&sortBy=legalName&sortDirection=asc');

    expect(api.list).toHaveBeenCalledWith({
      ...DEFAULT_LIST_QUERY,
      page: 2,
      status: 'DRAFT',
      sortBy: 'legalName',
      sortDirection: 'asc',
    });
  });

  it('shows skeleton rows and marks the region busy during the first load', async () => {
    await setUp();
    api.list.mockReturnValue(NEVER);

    const element = await open();

    expect(element.querySelector('app-skeleton')).not.toBeNull();
    expect(element.querySelector('.list')?.getAttribute('aria-busy')).toBe('true');
  });

  it('renders the results and announces the visible range', async () => {
    await setUp();
    api.list.mockReturnValue(
      of(createPage([createSummary(), createSummary({ id: 'app-0002' })], { total: 12 })),
    );

    const element = await open();

    expect(element.querySelectorAll('tr.table__row')).toHaveLength(2);
    expect(element.querySelector('.list > p[aria-live]')?.textContent).toContain(
      'Showing 1–2 of 12 applications.',
    );
  });

  it('shows the error with a retry that reloads the same page', async () => {
    await setUp();
    api.list.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));

    let element = await open('/applications?status=APPROVED');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't load applications",
    );

    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    element = await settle();

    expect(api.list).toHaveBeenCalledTimes(2);
    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'APPROVED' }));
    expect(element.querySelectorAll('tr.table__row')).toHaveLength(1);
  });

  it('writes filter changes to the URL and resets to the first page', async () => {
    await setUp();
    await open('/applications?page=3');

    harness.fixture.debugElement
      .query(By.directive(ApplicationFilters))
      .componentInstance.statusChange.emit('APPROVED');
    await settle();

    expect(currentUrl()).toBe('/applications?status=APPROVED');
    expect(api.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'APPROVED', page: 1 }),
    );
  });

  it('offers to clear filters when nothing matches', async () => {
    await setUp();
    api.list.mockReturnValue(of(createPage([])));

    const element = await open('/applications?search=nothing');
    const clear = [...element.querySelectorAll('app-state-message button')].find((button) =>
      button.textContent?.includes('Clear filters'),
    ) as HTMLButtonElement;
    clear.click();
    await settle();

    expect(currentUrl()).toBe('/applications');
  });

  describe('permission-aware UI', () => {
    it('lets SALES start an application from the header and the empty state', async () => {
      await setUp(['SALES']);
      api.list.mockReturnValue(of(createPage([])));

      const element = await open();

      expect(element.querySelectorAll('a[href="/applications/new"]')).toHaveLength(2);
      expect(element.textContent).toContain("You haven't started any merchant applications yet.");
    });

    it('never offers creation to REVIEWER, and explains their scope instead', async () => {
      await setUp(['REVIEWER']);
      api.list.mockReturnValue(of(createPage([])));

      const element = await open();

      expect(element.querySelector('a[href="/applications/new"]')).toBeNull();
      expect(element.textContent).toContain('No applications are assigned to you yet.');
    });

    it('shows ADMIN the oversight columns', async () => {
      await setUp(['ADMIN']);

      const element = await open();
      const headers = [...element.querySelectorAll('th')].map((th) => th.textContent?.trim());

      expect(headers).toEqual(expect.arrayContaining(['Submitted by', 'Reviewer', 'Risk']));
      expect(element.querySelector('a[href="/applications/new"]')).toBeNull();
    });
  });
});
