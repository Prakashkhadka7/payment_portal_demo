import { Component, input } from '@angular/core';
import type { MaskedValue } from '@contracts';
import { CURRENCY_LABELS } from '../../data-access/application.constants';
import { type BankingForm, FIELD_LIMITS } from '../form/application-form';
import { STEP_IMPORTS } from './step-imports';

@Component({
  selector: 'app-banking-step',
  imports: [...STEP_IMPORTS],
  templateUrl: './banking-step.html',
  styleUrl: './banking-step.scss',
})
export class BankingStep {
  readonly form = input.required<BankingForm>();
  readonly storedIban = input<MaskedValue | null>(null);

  protected readonly limits = FIELD_LIMITS;
  protected readonly currencies = Object.entries(CURRENCY_LABELS);
}
