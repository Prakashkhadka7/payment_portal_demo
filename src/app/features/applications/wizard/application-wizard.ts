import { BreakpointObserver } from '@angular/cdk/layout';
import { DecimalPipe } from '@angular/common';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  type OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { Router, RouterLink } from '@angular/router';
import type { ApiError, ApplicationDataInput } from '@contracts';
import { toApiError } from '@core/http/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { StateMessage } from '@shared/ui/state-message/state-message';
import { finalize, map, switchMap, tap } from 'rxjs';
import {
  BUSINESS_TYPE_LABELS,
  COUNTRY_OPTIONS,
  CURRENCY_LABELS,
  INDUSTRY_LABELS,
} from '../data-access/application.constants';
import { ApplicationWizardStore } from './application-wizard.store';
import { createApplicationForm } from './form/application-form';
import {
  applyServerErrors,
  populateForm,
  syncServerState,
  toApplicationInput,
} from './form/application-form.mapper';
import { BankingStep } from './steps/banking-step';
import { BusinessStep } from './steps/business-step';
import { ContactStep } from './steps/contact-step';
import { OwnersStep } from './steps/owners-step';

/**
 * Create or edit a merchant application in steps. Each step must be valid before moving
 * forward; going back is always allowed. The server validates everything again on submit.
 */
@Component({
  selector: 'app-application-wizard',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    PageHeader,
    Skeleton,
    StateMessage,
    BankingStep,
    BusinessStep,
    ContactStep,
    OwnersStep,
  ],
  providers: [
    ApplicationWizardStore,
    { provide: STEPPER_GLOBAL_OPTIONS, useValue: { showError: true } },
  ],
  templateUrl: './application-wizard.html',
  styleUrl: './application-wizard.scss',
})
export class ApplicationWizard implements OnInit {
  readonly id = input<string>();

  protected readonly store = inject(ApplicationWizardStore);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stepper = viewChild(MatStepper);

  protected readonly form = createApplicationForm(this.fb);
  protected readonly confirmed = new FormControl(false, {
    nonNullable: true,
    validators: Validators.requiredTrue,
  });
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  /** Snapshot shown on the review step, refreshed whenever the user arrives there. */
  protected readonly review = signal<ApplicationDataInput | null>(null);

  protected readonly isPhone = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 719.98px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly heading = computed(() => {
    const detail = this.store.detail();
    return detail ? `Edit ${detail.reference}` : 'New application';
  });

  protected readonly labels = {
    businessType: BUSINESS_TYPE_LABELS,
    industry: INDUSTRY_LABELS,
    currency: CURRENCY_LABELS,
    country: Object.fromEntries(COUNTRY_OPTIONS.map(({ code, name }) => [code, name])),
  };

  /** Step order; used to jump to the first step with problems. */
  private readonly stepControls: readonly AbstractControl[] = [
    this.form.controls.business,
    this.form.controls.contact,
    this.form.controls.owners,
    this.form.controls.banking,
  ];

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.store
        .load(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((detail) => populateForm(this.form, this.fb, detail.data));
    }
  }

  /** Shows the step's errors (by touching its fields) before trying to move on. */
  protected next(control: AbstractControl, stepper: MatStepper): void {
    control.markAllAsTouched();
    stepper.next();
  }

  protected onStepChange(index: number): void {
    if (index === this.stepControls.length) {
      this.review.set(toApplicationInput(this.form));
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.confirmed.invalid) {
      this.form.markAllAsTouched();
      this.confirmed.markAsTouched();
      this.goToFirstInvalidStep();
      return;
    }
    this.submitting.set(true);
    this.formError.set(null);

    // Save first (creating the draft if needed), then submit the saved version.
    this.store
      .save(toApplicationInput(this.form))
      .pipe(
        tap((saved) => syncServerState(this.form, saved.data)),
        switchMap((saved) => this.store.submit(saved.id)),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (submitted) => {
          this.snackBar.open(`${submitted.reference} submitted for review`, 'OK', {
            duration: 5000,
          });
          void this.router.navigate(['/applications', submitted.id]);
        },
        error: (error: unknown) => this.showSubmitError(toApiError(error)),
      });
  }

  /** Masks a newly typed sensitive value on the review screen, like stored ones. */
  protected masked(value: string | undefined): string | null {
    return value ? `•••• ${value.slice(-4)}` : null;
  }

  private showSubmitError(error: ApiError): void {
    if (error.code === 'VALIDATION_FAILED') {
      const unmatched = applyServerErrors(this.form, error.fieldErrors ?? {});
      this.formError.set(
        unmatched.length > 0
          ? unmatched.join(' ')
          : 'Some details need attention before submitting.',
      );
      this.goToFirstInvalidStep();
    } else if (error.code === 'CONFLICT') {
      this.formError.set('This application was changed elsewhere. Reload the page to continue.');
    } else {
      this.formError.set(error.message);
    }
  }

  private goToFirstInvalidStep(): void {
    const index = this.stepControls.findIndex((control) => control.invalid);
    const stepper = this.stepper();
    if (stepper && index >= 0) {
      stepper.selectedIndex = index;
    }
  }
}
