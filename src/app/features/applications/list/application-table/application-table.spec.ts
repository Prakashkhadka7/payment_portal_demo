import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ApplicationSummary } from '@contracts';
import { createSummary } from '../../../../../testing/application-fixtures';
import type { ApplicationColumn } from '../application-columns';
import { ApplicationTable } from './application-table';

const ALL_COLUMNS: ApplicationColumn[] = [
  'reference',
  'merchant',
  'status',
  'createdBy',
  'reviewer',
  'risk',
  'updatedAt',
  'actions',
];

describe('ApplicationTable', () => {
  let fixture: ComponentFixture<ApplicationTable>;
  let element: HTMLElement;

  const render = async (
    items: ApplicationSummary[],
    columns: ApplicationColumn[] = ALL_COLUMNS,
  ): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ApplicationTable);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('sortBy', 'updatedAt');
    fixture.componentRef.setInput('sortDirection', 'desc');
    element = fixture.nativeElement;
    await fixture.whenStable();
  };

  const headers = (): string[] =>
    [...element.querySelectorAll('th')].map((th) => th.textContent?.trim() ?? '');

  it('renders only the requested columns', async () => {
    await render([createSummary()], ['reference', 'merchant', 'status', 'updatedAt']);

    expect(headers()).toEqual(['Reference', 'Merchant', 'Status', 'Updated']);
  });

  it('links each row to the application detail', async () => {
    await render([createSummary({ id: 'app-0042' })]);

    expect(element.querySelector('.table__row-link')?.getAttribute('href')).toBe(
      '/applications/app-0042',
    );
  });

  it('offers "Edit draft" only when the server allows editing that record', async () => {
    await render([
      createSummary({ id: 'app-0001', status: 'DRAFT', allowedActions: ['edit', 'submit'] }),
      createSummary({ id: 'app-0002', status: 'SUBMITTED', allowedActions: [] }),
    ]);

    const editLinks = element.querySelectorAll('a[aria-label^="Edit draft"]');
    expect(editLinks).toHaveLength(1);
    expect(editLinks[0].getAttribute('href')).toBe('/applications/app-0001/edit');
  });

  it('flags submitted applications that still need a reviewer', async () => {
    await render([
      createSummary({ status: 'SUBMITTED', assignedReviewer: null }),
      createSummary({
        id: 'app-0002',
        status: 'IN_REVIEW',
        assignedReviewer: { id: 'u-r', displayName: 'Test Reviewer' },
      }),
    ]);

    expect(element.querySelectorAll('.table__unassigned')).toHaveLength(1);
    expect(element.textContent).toContain('Test Reviewer');
  });

  it('hides a trading name that only repeats the legal name', async () => {
    await render([
      createSummary({ legalName: 'Koshi Demo Crafts Pvt. Ltd.', tradingName: 'Koshi Demo Crafts' }),
      createSummary({
        id: 'app-0002',
        legalName: 'Bagmati Holdings Ltd.',
        tradingName: 'Rara Cafe',
      }),
    ]);

    expect(element.querySelectorAll('.table__secondary')).toHaveLength(1);
    expect(element.textContent).toContain('Trading as Rara Cafe');
  });

  it('emits the requested sort when a sortable header is clicked', async () => {
    await render([createSummary()]);
    const sorts: string[] = [];
    fixture.componentInstance.sortChange.subscribe(({ active, direction }) =>
      sorts.push(`${active}:${direction}`),
    );

    element
      .querySelector<HTMLElement>('[mat-sort-header="legalName"] .mat-sort-header-container')!
      .click();

    expect(sorts).toEqual(['legalName:asc']);
  });
});
