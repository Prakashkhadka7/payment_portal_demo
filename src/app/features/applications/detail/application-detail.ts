import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, type OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type {
  ApiError,
  ApplicationAction,
  ApplicationDetail as ApplicationDetailData,
  ApplicationEvent,
  ReviewDecision,
  RiskLevel,
  UserRef,
} from '@contracts';
import { toApiError } from '@core/http/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { StateMessage } from '@shared/ui/state-message/state-message';
import { ValidationMessagePipe } from '@shared/validators/validation-message.pipe';
import { catchError, EMPTY, filter, finalize, type Observable, switchMap, tap } from 'rxjs';
import {
  BUSINESS_TYPE_LABELS,
  COUNTRY_OPTIONS,
  CURRENCY_LABELS,
  INDUSTRY_LABELS,
  RISK_LABELS,
} from '../data-access/application.constants';
import { ApplicationsApi } from '../data-access/applications.api';
import { RiskBadge } from '../ui/risk-badge/risk-badge';
import { SensitiveValue } from '../ui/sensitive-value/sensitive-value';
import { StatusBadge } from '../ui/status-badge/status-badge';
import { describeEvent } from './history-labels';

type DecisionEvent = Extract<ApplicationEvent, { type: 'DECISION' }>;

/**
 * Read-only, sectioned view of one application with its risk history. What the user may do
 * here comes from the server's `allowedActions`, so the UI never re-implements the rules.
 */
@Component({
  selector: 'app-application-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ValidationMessagePipe,
    MatIconModule,
    PageHeader,
    Skeleton,
    StateMessage,
    RiskBadge,
    SensitiveValue,
    StatusBadge,
  ],
  templateUrl: './application-detail.html',
  styleUrl: './application-detail.scss',
})
export class ApplicationDetail implements OnInit {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  private readonly api = inject(ApplicationsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly detail = signal<ApplicationDetailData | null>(null);
  protected readonly loadError = signal<ApiError | null>(null);

  /** Risk decisions, newest first. */
  protected readonly decisions = computed(() =>
    (this.detail()?.history ?? [])
      .filter((event): event is DecisionEvent => event.type === 'DECISION')
      .reverse(),
  );
  /** Full audit trail, newest first. */
  protected readonly activity = computed(() => [...(this.detail()?.history ?? [])].reverse());

  protected readonly labels = {
    businessType: BUSINESS_TYPE_LABELS,
    industry: INDUSTRY_LABELS,
    currency: CURRENCY_LABELS,
    country: Object.fromEntries(COUNTRY_OPTIONS.map(({ code, name }) => [code, name])),
  };
  protected readonly describeEvent = describeEvent;
  protected readonly riskLevels = Object.entries(RISK_LABELS);

  protected readonly reviewForm = this.fb.group({
    decision: this.fb.control<ReviewDecision | null>(null, Validators.required),
    riskLevel: this.fb.control<RiskLevel | null>(null, Validators.required),
    comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
  });
  protected readonly reviewerId = new FormControl('', {
    nonNullable: true,
    validators: Validators.required,
  });
  protected readonly reviewers = signal<UserRef[]>([]);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  ngOnInit(): void {
    this.api
      .get(this.id())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.detail.set(detail);
          if (this.can('assign')) {
            this.loadReviewers(detail.createdBy.id);
          }
        },
        error: (error: unknown) => this.loadError.set(toApiError(error)),
      });
  }

  protected can(action: ApplicationAction): boolean {
    return this.detail()?.allowedActions.includes(action) ?? false;
  }

  /** Assigned REVIEWER: confirms, then records the decision (rejecting is styled as dangerous). */
  protected recordDecision(): void {
    const { decision, riskLevel, comment } = this.reviewForm.getRawValue();
    if (this.reviewForm.invalid || !decision || !riskLevel) {
      this.reviewForm.markAllAsTouched();
      return;
    }
    const approve = decision === 'APPROVED';
    this.confirmDialog
      .confirm({
        title: approve ? 'Approve this application?' : 'Reject this application?',
        message: 'The decision is final and is recorded in the risk history.',
        confirmLabel: approve ? 'Approve' : 'Reject',
        icon: approve ? 'task_alt' : 'block',
        tone: approve ? 'default' : 'danger',
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this.run(this.api.decide(this.id(), { decision, riskLevel, comment }))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /** ADMIN: assigns the selected reviewer. */
  protected assignReviewer(): void {
    if (this.reviewerId.invalid) {
      this.reviewerId.markAsTouched();
      return;
    }
    this.run(this.api.assign(this.id(), { reviewerId: this.reviewerId.value }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /** Runs an action and shows the updated application, or the server's error message. */
  private run(request$: Observable<ApplicationDetailData>): Observable<ApplicationDetailData> {
    this.busy.set(true);
    this.actionError.set(null);
    return request$.pipe(
      tap((detail) => this.detail.set(detail)),
      catchError((error: unknown) => {
        this.actionError.set(toApiError(error).message);
        return EMPTY;
      }),
      finalize(() => this.busy.set(false)),
    );
  }

  /** A reviewer may not review an application they created, so the creator is not offered. */
  private loadReviewers(creatorId: string): void {
    this.api
      .reviewers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((reviewers) => this.reviewers.set(reviewers.filter((r) => r.id !== creatorId)));
  }
}
