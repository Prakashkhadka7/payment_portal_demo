import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import type { MaskedValue, SensitiveFieldRef } from '@contracts';
import { finalize } from 'rxjs';
import { ApplicationsApi } from '../../data-access/applications.api';

export const REVEAL_DURATION_MS = 30_000;

/**
 * A sensitive value, masked by default. When allowed, "Reveal" fetches the clear value from the
 * audited endpoint (the server re-checks the role); it is held only here and re-masked after
 * 30 seconds, on "Hide", or when the page is left.
 */
@Component({
  selector: 'app-sensitive-value',
  imports: [MatButtonModule],
  template: `
    @if (masked(); as value) {
      <span class="app-mono">{{ revealed() ?? value.masked }}</span>
      @if (canReveal()) {
        <button
          mat-button
          type="button"
          class="sensitive__toggle"
          [disabled]="loading()"
          (click)="toggle()"
        >
          {{ revealed() ? 'Hide' : 'Reveal' }}
        </button>
      }
      @if (failed()) {
        <span class="sensitive__error" role="alert">Couldn't reveal this value.</span>
      }
    } @else {
      <span class="sensitive__empty">Not provided</span>
    }
  `,
  styleUrl: './sensitive-value.scss',
})
export class SensitiveValue {
  readonly applicationId = input.required<string>();
  readonly target = input.required<SensitiveFieldRef>();
  readonly masked = input<MaskedValue | null>(null);
  readonly canReveal = input(false);

  private readonly api = inject(ApplicationsApi);
  private readonly destroyRef = inject(DestroyRef);
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly revealed = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.hideTimer));
  }

  protected toggle(): void {
    if (this.revealed()) {
      this.hide();
      return;
    }
    this.loading.set(true);
    this.failed.set(false);
    this.api
      .reveal(this.applicationId(), this.target())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ value }) => {
          this.revealed.set(value);
          this.hideTimer = setTimeout(() => this.hide(), REVEAL_DURATION_MS);
        },
        error: () => this.failed.set(true),
      });
  }

  private hide(): void {
    clearTimeout(this.hideTimer);
    this.revealed.set(null);
  }
}
