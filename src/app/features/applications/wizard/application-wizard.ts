import { BreakpointObserver } from '@angular/cdk/layout';
import { DatePipe, DecimalPipe, DOCUMENT, Location } from '@angular/common';
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
import type { ApiError, ApplicationDataInput, ApplicationDetail } from '@contracts';
import { toApiError } from '@core/http/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import type { CanLeave } from '@shared/guards/can-leave.guard';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { StateMessage } from '@shared/ui/state-message/state-message';
import { finalize, map, type Observable, switchMap } from 'rxjs';
import {
  BUSINESS_TYPE_LABELS,
  COUNTRY_OPTIONS,
  CURRENCY_LABELS,
  INDUSTRY_LABELS,
} from '../data-access/application.constants';
import { ApplicationWizardStore } from './application-wizard.store';
import { DraftAutoSave } from './draft-auto-save';
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
    DatePipe,
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
    DraftAutoSave,
    { provide: STEPPER_GLOBAL_OPTIONS, useValue: { showError: true } },
  ],
  templateUrl: './application-wizard.html',
  styleUrl: './application-wizard.scss',
  host: { '(window:beforeunload)': 'warnBeforeUnload($event)' },
})
export class ApplicationWizard implements OnInit, CanLeave {
  readonly id = input<string>();

  protected readonly store = inject(ApplicationWizardStore);
  protected readonly autoSave = inject(DraftAutoSave);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);
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
    if (!id) {
      this.startAutoSave();
      return;
    }
    this.store
      .load(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((detail) => {
        populateForm(this.form, this.fb, detail.data);
        this.startAutoSave();
      });
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

    // Save the latest values if needed (creating the draft), then submit that version.
    this.autoSave
      .saveNow()
      .pipe(
        switchMap((draft) => this.store.submit(draft.id)),
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

  /** Route guard hook: asks before leaving with changes that are not saved yet. */
  canLeave(): Observable<boolean> | boolean {
    return (
      !this.autoSave.hasUnsavedChanges() ||
      this.confirmDialog.confirm({
        title: 'Leave without saving?',
        message: 'Your latest changes are not saved yet and will be lost.',
        confirmLabel: 'Leave page',
        cancelLabel: 'Stay',
        icon: 'warning',
        tone: 'danger',
      })
    );
  }

  /** Closing or reloading the tab with unsaved edits shows the browser's own warning. */
  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.autoSave.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  protected retrySave(): void {
    this.autoSave.retry();
  }

  protected reload(): void {
    this.document.defaultView?.location.reload();
  }

  /** Masks a newly typed sensitive value on the review screen, like stored ones. */
  protected masked(value: string | undefined): string | null {
    return value ? `•••• ${value.slice(-4)}` : null;
  }

  private startAutoSave(): void {
    this.autoSave.connect(this.form, (saved) => this.adoptSaved(saved));
  }

  /**
   * Adopts what the server assigned. After the first save of a new application the address
   * becomes its edit URL (without re-creating the page), so a refresh reopens the draft.
   */
  private adoptSaved(saved: ApplicationDetail): void {
    syncServerState(this.form, saved.data);
    if (this.location.path().endsWith('/applications/new')) {
      this.location.replaceState(`/applications/${saved.id}/edit`);
    }
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
