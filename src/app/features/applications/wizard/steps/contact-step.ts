import { Component, input } from '@angular/core';
import { COUNTRY_OPTIONS } from '../../data-access/application.constants';
import { type ContactForm, FIELD_LIMITS } from '../form/application-form';
import { STEP_IMPORTS } from './step-imports';

@Component({
  selector: 'app-contact-step',
  imports: [...STEP_IMPORTS],
  templateUrl: './contact-step.html',
})
export class ContactStep {
  readonly form = input.required<ContactForm>();

  protected readonly limits = FIELD_LIMITS;
  protected readonly countries = COUNTRY_OPTIONS;
}
