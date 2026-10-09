import { HttpErrorResponse } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Location } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { createDetail, VALID_FORM_VALUE } from '../../../../testing/application-fixtures';
import { ApplicationsApi } from '../data-access/applications.api';
import { ApplicationWizard } from './application-wizard';
import type { ApplicationForm } from './form/application-form';

describe('ApplicationWizard', () => {
  const api = { get: vi.fn(), create: vi.fn(), saveDraft: vi.fn(), submit: vi.fn() };
  const confirmDialog = { confirm: vi.fn() };
  let fixture: ComponentFixture<ApplicationWizard>;
  let element: HTMLElement;
  let router: Router;

  const render = async (id?: string): Promise<void> => {
    TestBed.configureTestingModule({
      imports: [ApplicationWizard],
      providers: [
        provideRouter([]),
        { provide: ApplicationsApi, useValue: api },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ApplicationWizard);
    if (id) {
      fixture.componentRef.setInput('id', id);
    }
    element = fixture.nativeElement;
    await fixture.whenStable();
  };

  // Protected members are reached through index access, as the template does.
  const form = (): ApplicationForm => fixture.componentInstance['form'];
  const fillAndConfirm = (): void => {
    form().patchValue(VALID_FORM_VALUE);
    fixture.componentInstance['confirmed'].setValue(true);
  };
  const submit = async (): Promise<void> => {
    fixture.componentInstance['submit']();
    await fixture.whenStable();
  };

  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    confirmDialog.confirm.mockReset().mockReturnValue(of(false));
  });

  /** Resolves the route guard hook the way the router would. */
  const canLeave = async (): Promise<boolean> => {
    const result = fixture.componentInstance.canLeave();
    if (!isObservable(result)) {
      return result;
    }
    const decision = firstValueFrom(result);
    await fixture.whenStable();
    return decision;
  };

  it('starts a new application on the first step', async () => {
    await render();

    expect(element.querySelector('h1')?.textContent).toContain('New application');
    expect(api.get).not.toHaveBeenCalled();
    expect(element.querySelector('input[formcontrolname="legalName"]')).not.toBeNull();
  });

  it('does not move past a step with errors and shows them', async () => {
    await render();

    const next = [...element.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Next',
    )!;
    next.click();
    await fixture.whenStable();

    expect(element.querySelector('input[formcontrolname="legalName"]')).not.toBeNull();
    expect(element.querySelectorAll('mat-error').length).toBeGreaterThan(0);
  });

  it('loads a draft for editing into the form', async () => {
    api.get.mockReturnValue(of(createDetail()));

    await render('app-0001');

    expect(api.get).toHaveBeenCalledWith('app-0001');
    expect(element.querySelector('h1')?.textContent).toContain('Edit MA-2026-0001');
    expect(form().controls.business.controls.legalName.value).toBe('Spec Traders Pvt. Ltd.');
    expect(form().controls.banking.controls.iban.value).toBe('');
  });

  it('locks applications the server no longer allows to be edited', async () => {
    api.get.mockReturnValue(of(createDetail({ status: 'SUBMITTED', allowedActions: [] })));

    await render('app-0001');

    expect(element.textContent).toContain('This application can no longer be edited');
    expect(element.querySelector('mat-stepper')).toBeNull();
  });

  it('saves then submits, and opens the submitted application', async () => {
    api.create.mockReturnValue(of(createDetail({ id: 'app-new' })));
    api.submit.mockReturnValue(of(createDetail({ id: 'app-new', status: 'SUBMITTED' })));
    await render();
    fillAndConfirm();

    await submit();

    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.submit).toHaveBeenCalledWith('app-new');
    expect(router.navigate).toHaveBeenCalledWith(['/applications', 'app-new']);
  });

  it('does not submit until the details are confirmed', async () => {
    await render();
    form().patchValue(VALID_FORM_VALUE);

    await submit();

    expect(api.create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Please confirm before submitting.');
  });

  it('shows server validation errors on the matching fields', async () => {
    api.create.mockReturnValue(of(createDetail({ id: 'app-new' })));
    api.submit.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Some fields are invalid',
              fieldErrors: { 'banking.iban': 'Must be a valid IBAN' },
            },
          }),
      ),
    );
    await render();
    fillAndConfirm();

    await submit();

    expect(form().controls.banking.controls.iban.getError('server')).toBe('Must be a valid IBAN');
    expect(element.querySelector('.wizard__error')?.textContent).toContain('need attention');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  describe('leaving the page', () => {
    it('allows leaving straight away when nothing is unsaved', async () => {
      await render();

      expect(await canLeave()).toBe(true);
      expect(confirmDialog.confirm).not.toHaveBeenCalled();
    });

    it('asks before leaving with changes that are not saved yet', async () => {
      await render();
      form().controls.business.controls.legalName.setValue('Acme');

      expect(await canLeave()).toBe(false);
      expect(confirmDialog.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Leave without saving?', tone: 'danger' }),
      );
    });
  });

  it('switches the address to the edit URL after the first save of a new application', async () => {
    api.create.mockReturnValue(of(createDetail({ id: 'app-new' })));
    await render();
    const location = TestBed.inject(Location);
    vi.spyOn(location, 'path').mockReturnValue('/applications/new');
    const replaceState = vi.spyOn(location, 'replaceState');

    form().controls.business.controls.legalName.setValue('Acme');
    fixture.componentInstance['autoSave'].retry();

    expect(replaceState).toHaveBeenCalledWith('/applications/app-new/edit');
  });

  it('explains a conflicting change made elsewhere', async () => {
    api.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({ status: 409, error: { code: 'CONFLICT', message: 'Changed' } }),
      ),
    );
    await render();
    fillAndConfirm();

    await submit();

    expect(element.querySelector('.wizard__error')?.textContent).toContain('changed elsewhere');
  });
});
