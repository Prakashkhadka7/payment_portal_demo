import { Component, input } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { BUSINESS_TYPE_LABELS, INDUSTRY_LABELS } from '../../data-access/application.constants';
import { type BusinessForm, FIELD_LIMITS } from '../form/application-form';
import { STEP_IMPORTS } from './step-imports';

@Component({
  selector: 'app-business-step',
  imports: [...STEP_IMPORTS, MatDatepickerModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './business-step.html',
})
export class BusinessStep {
  readonly form = input.required<BusinessForm>();

  protected readonly limits = FIELD_LIMITS;
  protected readonly businessTypes = Object.entries(BUSINESS_TYPE_LABELS);
  protected readonly industries = Object.entries(INDUSTRY_LABELS);
  protected readonly today = new Date();
}
