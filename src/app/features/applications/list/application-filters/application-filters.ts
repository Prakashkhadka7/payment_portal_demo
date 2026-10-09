import { Component, effect, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { ApplicationStatus } from '@contracts';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { APPLICATION_STATUSES, STATUS_LABELS } from '../../data-access/application.constants';

export const SEARCH_DEBOUNCE_MS = 300;

/** Presentational filter bar: receives the current filters, emits the user's changes. */
@Component({
  selector: 'app-application-filters',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './application-filters.html',
  styleUrl: './application-filters.scss',
})
export class ApplicationFilters {
  readonly status = input<ApplicationStatus | undefined>();
  readonly search = input<string | undefined>();
  readonly hasActiveFilters = input(false);

  readonly statusChange = output<ApplicationStatus | undefined>();
  /** Debounced, trimmed search text; empty string means "no search". */
  readonly searchChange = output<string>();
  readonly clearFilters = output<void>();

  protected readonly statuses = APPLICATION_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  constructor() {
    // Keep the box in sync when the URL changes externally (back/forward, "clear filters").
    effect(() => {
      const value = this.search() ?? '';
      if (this.searchControl.value.trim() !== value) {
        this.searchControl.setValue(value, { emitEvent: false });
      }
    });

    // Wait for a pause in typing so each keystroke does not trigger a request.
    this.searchControl.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => this.searchChange.emit(value));
  }

  protected clearSearch(): void {
    this.searchControl.setValue('');
  }
}
