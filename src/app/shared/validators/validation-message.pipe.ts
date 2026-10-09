import { Pipe, type PipeTransform } from '@angular/core';
import type { ValidationErrors } from '@angular/forms';
import { validationMessage } from './validation-messages';

/**
 * `{{ control.errors | validationMessage }}` — the user-facing message for a control's errors.
 * Pure: recomputed only when the errors object changes.
 */
@Pipe({ name: 'validationMessage' })
export class ValidationMessagePipe implements PipeTransform {
  transform(errors: ValidationErrors | null | undefined): string | null {
    return validationMessage(errors);
  }
}
