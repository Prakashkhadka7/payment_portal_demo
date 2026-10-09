import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NonNullableFormBuilder } from '@angular/forms';
import type { ApplicationDetail } from '@contracts';
import { of, Subject, throwError } from 'rxjs';
import { createDetail } from '../../../../testing/application-fixtures';
import { ApplicationWizardStore } from './application-wizard.store';
import { AUTO_SAVE_DEBOUNCE_MS, DraftAutoSave } from './draft-auto-save';
import { type ApplicationForm, createApplicationForm } from './form/application-form';
import { syncServerState } from './form/application-form.mapper';

describe('DraftAutoSave', () => {
  const store = { save: vi.fn(), detail: vi.fn() };
  let autoSave: DraftAutoSave;
  let form: ApplicationForm;

  beforeEach(() => {
    store.save.mockReset().mockReturnValue(of(createDetail()));
    store.detail.mockReset().mockReturnValue(null);
    TestBed.configureTestingModule({
      providers: [DraftAutoSave, { provide: ApplicationWizardStore, useValue: store }],
    });
    autoSave = TestBed.inject(DraftAutoSave);
    form = createApplicationForm(TestBed.inject(NonNullableFormBuilder));
    vi.useFakeTimers();
    // Like the page: adopt server-assigned owner ids after each save.
    autoSave.connect(form, (detail) => syncServerState(form, detail.data));
  });

  afterEach(() => vi.useRealTimers());

  const type = (legalName: string): void =>
    form.controls.business.controls.legalName.setValue(legalName);
  const savedNames = (): string[] => store.save.mock.calls.map(([data]) => data.business.legalName);

  it('saves once, with the latest values, after the user pauses typing', () => {
    type('A');
    type('Acme');
    expect(autoSave.hasUnsavedChanges()).toBe(true);

    vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);

    expect(savedNames()).toEqual(['Acme']);
    expect(autoSave.status()).toBe('saved');
    expect(autoSave.hasUnsavedChanges()).toBe(false);
  });

  it('does not save content equal to what was last saved', () => {
    type('Acme');
    vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);

    type('Acm');
    type('Acme');
    vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);

    expect(savedNames()).toEqual(['Acme']);
  });

  it('does not save the starting values again', () => {
    type('');
    vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);

    expect(store.save).not.toHaveBeenCalled();
  });

  it('saves one after another, so the draft is created before it is updated', () => {
    const inFlight = new Subject<ApplicationDetail>();
    store.save.mockReturnValueOnce(inFlight);
    type('First');
    vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    type('Second');
    vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);

    expect(store.save).toHaveBeenCalledTimes(1);

    inFlight.next(createDetail());
    inFlight.complete();

    expect(savedNames()).toEqual(['First', 'Second']);
  });

  it('keeps the form untouched on failure and saves again on retry', () => {
    store.save.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
    type('Acme');
    vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);

    expect(autoSave.status()).toBe('error');
    expect(form.controls.business.controls.legalName.value).toBe('Acme');
    expect(autoSave.hasUnsavedChanges()).toBe(true);

    autoSave.retry();

    expect(savedNames()).toEqual(['Acme', 'Acme']);
    expect(autoSave.status()).toBe('saved');
  });

  it('saveNow reuses the saved draft when nothing changed', () => {
    const draft = createDetail();
    store.detail.mockReturnValue(draft);
    const results: ApplicationDetail[] = [];

    autoSave.saveNow().subscribe((detail) => results.push(detail));

    expect(results).toEqual([draft]);
    expect(store.save).not.toHaveBeenCalled();
  });
});
