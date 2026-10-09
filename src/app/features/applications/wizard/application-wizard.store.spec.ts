import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { createDetail } from '../../../../testing/application-fixtures';
import { ApplicationsApi } from '../data-access/applications.api';
import { ApplicationWizardStore } from './application-wizard.store';

describe('ApplicationWizardStore', () => {
  const api = { get: vi.fn(), create: vi.fn(), saveDraft: vi.fn(), submit: vi.fn() };
  let store: ApplicationWizardStore;

  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    TestBed.configureTestingModule({
      providers: [ApplicationWizardStore, { provide: ApplicationsApi, useValue: api }],
    });
    store = TestBed.inject(ApplicationWizardStore);
  });

  it('creates the draft on the first save, then saves with the latest version', () => {
    api.create.mockReturnValue(of(createDetail({ id: 'app-9', version: 1 })));
    api.saveDraft.mockReturnValue(of(createDetail({ id: 'app-9', version: 2 })));
    const data = {} as never;

    store.save(data).subscribe();
    store.save(data).subscribe();

    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.saveDraft).toHaveBeenCalledWith('app-9', { version: 1, data });
    expect(store.detail()?.version).toBe(2);
  });

  it('loads a draft and exposes what is already on file', () => {
    api.get.mockReturnValue(of(createDetail()));

    store.load('app-0001').subscribe();

    expect(store.loadStatus()).toBe('ready');
    expect(store.storedIban()).toEqual({ masked: '•••• 5432' });
    expect(store.storedTaxIds().get('owner-1')).toEqual({ masked: '•••• 6789' });
  });

  it('turns a failed load into state instead of an error', () => {
    api.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const error = vi.fn();

    store.load('missing').subscribe({ error });

    expect(error).not.toHaveBeenCalled();
    expect(store.loadStatus()).toBe('error');
    expect(store.loadError()?.code).toBe('NOT_FOUND');
  });

  it('is editable for new drafts, and for saved ones only while the server allows it', () => {
    expect(store.isEditable()).toBe(true);

    api.get.mockReturnValue(of(createDetail({ status: 'SUBMITTED', allowedActions: [] })));
    store.load('app-0001').subscribe();

    expect(store.isEditable()).toBe(false);
  });
});
