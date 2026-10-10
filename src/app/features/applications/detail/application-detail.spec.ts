import { HttpErrorResponse } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import type { ApplicationAction, UserRef } from '@contracts';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { of, throwError } from 'rxjs';
import { createDetail } from '../../../../testing/application-fixtures';
import { ApplicationsApi } from '../data-access/applications.api';
import { ApplicationDetail } from './application-detail';

describe('ApplicationDetail', () => {
  const api = {
    get: vi.fn(),
    decide: vi.fn(),
    assign: vi.fn(),
    reviewers: vi.fn(),
    reveal: vi.fn(),
  };
  const confirmDialog = { confirm: vi.fn() };
  const snackBar = { open: vi.fn() };
  let fixture: ComponentFixture<ApplicationDetail>;
  let element: HTMLElement;

  const render = async (
    allowedActions: ApplicationAction[],
    status = 'IN_REVIEW' as const,
    assignedReviewer: UserRef | null = null,
  ): Promise<void> => {
    Object.values(api).forEach((fn) => fn.mockReset());
    confirmDialog.confirm.mockReset().mockReturnValue(of(true));
    snackBar.open.mockReset();
    api.get.mockReturnValue(of(createDetail({ status, allowedActions, assignedReviewer })));
    api.reviewers.mockReturnValue(
      of([
        { id: 'u-sales', displayName: 'Test Sales' },
        { id: 'u-rev', displayName: 'Test Reviewer' },
      ]),
    );
    TestBed.configureTestingModule({
      imports: [ApplicationDetail],
      providers: [
        provideRouter([]),
        { provide: ApplicationsApi, useValue: api },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    fixture = TestBed.createComponent(ApplicationDetail);
    fixture.componentRef.setInput('id', 'app-0001');
    element = fixture.nativeElement;
    await fixture.whenStable();
  };

  const headings = (): string[] =>
    [...element.querySelectorAll('h2')].map((h) => h.textContent?.trim() ?? '');

  it('shows the application in sections with its risk history, masked by default', async () => {
    await render([]);

    expect(headings()).toEqual(
      expect.arrayContaining([
        'Business',
        'Contact',
        'Owners',
        'Banking',
        'Status',
        'Risk history',
      ]),
    );
    expect(element.textContent).toContain('•••• 5432');
    expect(element.querySelector('app-sensitive-value button')).toBeNull();
  });

  it('hides review and assignment controls from users without those permissions (e.g. SALES)', async () => {
    await render(['edit', 'submit', 'reveal-sensitive'], 'DRAFT' as never);

    expect(headings()).not.toContain('Record risk decision');
    expect(headings()).not.toContain('Assign reviewer');
    expect(element.querySelector('a[href="/applications/app-0001/edit"]')).not.toBeNull();
  });

  it('lets the assigned reviewer confirm and record a decision', async () => {
    await render(['review', 'reveal-sensitive']);
    api.decide.mockReturnValue(of(createDetail({ status: 'APPROVED', allowedActions: [] })));
    const component = fixture.componentInstance;
    component['reviewForm'].setValue({
      decision: 'APPROVED',
      riskLevel: 'LOW',
      comment: 'Documents verified.',
    });

    component['recordDecision']();
    await fixture.whenStable();

    expect(confirmDialog.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ confirmLabel: 'Approve' }),
    );
    expect(api.decide).toHaveBeenCalledWith('app-0001', {
      decision: 'APPROVED',
      riskLevel: 'LOW',
      comment: 'Documents verified.',
    });
    expect(snackBar.open).toHaveBeenCalledWith('MA-2026-0001 approved', 'OK', expect.anything());
    expect(headings()).not.toContain('Record risk decision');
  });

  it('asks for a dangerous-action confirmation before rejecting, and does nothing if cancelled', async () => {
    await render(['review']);
    confirmDialog.confirm.mockReturnValue(of(false));
    fixture.componentInstance['reviewForm'].setValue({
      decision: 'REJECTED',
      riskLevel: 'HIGH',
      comment: 'Ownership unclear.',
    });

    fixture.componentInstance['recordDecision']();

    expect(confirmDialog.confirm).toHaveBeenCalledWith(expect.objectContaining({ tone: 'danger' }));
    expect(api.decide).not.toHaveBeenCalled();
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('lets ADMIN assign a reviewer, never offering the creator, and confirms it', async () => {
    await render(['assign', 'reveal-sensitive'], 'SUBMITTED' as never);
    api.assign.mockReturnValue(
      of(
        createDetail({
          status: 'IN_REVIEW',
          allowedActions: ['assign'],
          assignedReviewer: { id: 'u-rev', displayName: 'Test Reviewer' },
        }),
      ),
    );

    expect(fixture.componentInstance['reviewers']().map((r) => r.id)).toEqual(['u-rev']);

    fixture.componentInstance['reviewerId'].setValue('u-rev');
    fixture.componentInstance['assignReviewer']();

    expect(api.assign).toHaveBeenCalledWith('app-0001', { reviewerId: 'u-rev' });
    expect(snackBar.open).toHaveBeenCalledWith(
      'MA-2026-0001 assigned to Test Reviewer',
      'OK',
      expect.anything(),
    );
  });

  it('preselects the current reviewer when the application is already assigned', async () => {
    await render(['assign'], undefined, { id: 'u-rev', displayName: 'Test Reviewer' });

    expect(fixture.componentInstance['reviewerId'].value).toBe('u-rev');
    expect(headings()).toContain('Reassign reviewer');
  });

  it('explains when the application cannot be opened', async () => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    TestBed.configureTestingModule({
      imports: [ApplicationDetail],
      providers: [provideRouter([]), { provide: ApplicationsApi, useValue: api }],
    });
    fixture = TestBed.createComponent(ApplicationDetail);
    fixture.componentRef.setInput('id', 'missing');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain("doesn't exist or you don't have access");
  });
});
