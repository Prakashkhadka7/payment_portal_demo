import { computed, inject, Injectable, signal } from '@angular/core';
import type { ApiError, ApplicationDataInput, ApplicationDetail, MaskedValue } from '@contracts';
import { toApiError } from '@core/http/api-error';
import { catchError, EMPTY, type Observable, tap } from 'rxjs';
import { ApplicationsApi } from '../data-access/applications.api';

interface WizardState {
  readonly loadStatus: 'loading' | 'ready' | 'error';
  readonly detail: ApplicationDetail | null;
  readonly loadError: ApiError | null;
}

/**
 * Persistence for the application form, scoped to the wizard page. It owns the server copy of
 * the draft (id, version, masked sensitive values); the form owns what the user is typing.
 */
@Injectable()
export class ApplicationWizardStore {
  private readonly api = inject(ApplicationsApi);
  private readonly state = signal<WizardState>({
    loadStatus: 'ready',
    detail: null,
    loadError: null,
  });

  readonly detail = computed(() => this.state().detail);
  readonly loadStatus = computed(() => this.state().loadStatus);
  readonly loadError = computed(() => this.state().loadError);
  /** New applications are editable; saved ones only if the server still allows it. */
  readonly isEditable = computed(() => this.detail()?.allowedActions.includes('edit') ?? true);
  readonly storedIban = computed(() => this.detail()?.data.banking.iban ?? null);
  readonly storedTaxIds = computed<ReadonlyMap<string, MaskedValue | null>>(
    () => new Map(this.detail()?.data.owners.map((owner) => [owner.id, owner.taxId])),
  );

  /** Loads a draft for editing. Failures become `loadError` state instead of erroring. */
  load(id: string): Observable<ApplicationDetail> {
    this.state.set({ loadStatus: 'loading', detail: null, loadError: null });
    return this.api.get(id).pipe(
      tap((detail) => this.state.set({ loadStatus: 'ready', detail, loadError: null })),
      catchError((error: unknown) => {
        this.state.set({ loadStatus: 'error', detail: null, loadError: toApiError(error) });
        return EMPTY;
      }),
    );
  }

  /**
   * Creates the draft on the first save, then saves with the last known version so a change
   * made elsewhere (another tab) is rejected with 409 instead of being silently overwritten.
   */
  save(data: ApplicationDataInput): Observable<ApplicationDetail> {
    const current = this.detail();
    const request$ = current
      ? this.api.saveDraft(current.id, { version: current.version, data })
      : this.api.create(data);
    return request$.pipe(tap((detail) => this.setDetail(detail)));
  }

  submit(id: string): Observable<ApplicationDetail> {
    return this.api.submit(id).pipe(tap((detail) => this.setDetail(detail)));
  }

  private setDetail(detail: ApplicationDetail): void {
    this.state.update((state) => ({ ...state, detail }));
  }
}
