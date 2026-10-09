import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ApiError, ApplicationDataInput, ApplicationDetail } from '@contracts';
import { toApiError } from '@core/http/api-error';
import { isEqual } from 'lodash-es';
import {
  catchError,
  concatMap,
  debounceTime,
  EMPTY,
  map,
  merge,
  type Observable,
  of,
  Subject,
  tap,
} from 'rxjs';
import { ApplicationWizardStore } from './application-wizard.store';
import type { ApplicationForm } from './form/application-form';
import { toApplicationInput } from './form/application-form.mapper';

export const AUTO_SAVE_DEBOUNCE_MS = 1500;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Saves the draft while the user types: debounced, skipped when the content equals what the
 * server already holds, and saved in order (`concatMap`) so the first save creates the draft
 * before later ones update it. A failed save leaves the form untouched and can be retried.
 */
@Injectable()
export class DraftAutoSave {
  private readonly store = inject(ApplicationWizardStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retry$ = new Subject<void>();
  private form: ApplicationForm | null = null;
  private onSaved: (detail: ApplicationDetail) => void = () => undefined;
  /** What the server holds, as form data. */
  private lastSaved: ApplicationDataInput | null = null;

  readonly status = signal<SaveStatus>('idle');
  readonly savedAt = signal<Date | null>(null);
  readonly error = signal<ApiError | null>(null);

  /**
   * Starts saving changes. Call once the form holds its starting values (empty or the loaded
   * draft), so those are not saved again. `onSaved` lets the page adopt server-assigned values.
   */
  connect(form: ApplicationForm, onSaved: (detail: ApplicationDetail) => void): void {
    this.form = form;
    this.onSaved = onSaved;
    this.lastSaved = toApplicationInput(form);

    merge(form.valueChanges.pipe(debounceTime(AUTO_SAVE_DEBOUNCE_MS)), this.retry$)
      .pipe(
        map(() => toApplicationInput(form)),
        // Compared when the save runs, so against the latest saved content.
        concatMap((data) =>
          isEqual(data, this.lastSaved)
            ? EMPTY
            : this.save(data).pipe(
                catchError((error: unknown) => {
                  this.error.set(toApiError(error));
                  this.status.set('error');
                  return EMPTY;
                }),
              ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  hasUnsavedChanges(): boolean {
    return this.form !== null && !isEqual(toApplicationInput(this.form), this.lastSaved);
  }

  retry(): void {
    this.retry$.next();
  }

  /** Used by submit: saves the current values unless the server already has them. */
  saveNow(): Observable<ApplicationDetail> {
    const draft = this.store.detail();
    if (draft && !this.hasUnsavedChanges()) {
      return of(draft);
    }
    return this.form ? this.save(toApplicationInput(this.form)) : EMPTY;
  }

  private save(data: ApplicationDataInput): Observable<ApplicationDetail> {
    this.status.set('saving');
    return this.store.save(data).pipe(
      tap((detail) => {
        // Remember the content with the server-assigned owner ids the form adopts next.
        this.lastSaved = {
          ...data,
          owners: data.owners.map((owner, i) => ({
            ...owner,
            id: owner.id ?? detail.data.owners[i]?.id,
          })),
        };
        this.onSaved(detail);
        this.error.set(null);
        this.savedAt.set(new Date());
        this.status.set('saved');
      }),
    );
  }
}
