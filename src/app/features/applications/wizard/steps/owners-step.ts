import { Component, inject, input } from '@angular/core';
import { type FormArray, NonNullableFormBuilder } from '@angular/forms';
import type { MaskedValue } from '@contracts';
import { MAX_OWNERS } from '../../data-access/application.constants';
import { createOwnerForm, FIELD_LIMITS, type OwnerForm } from '../form/application-form';
import { STEP_IMPORTS } from './step-imports';

@Component({
  selector: 'app-owners-step',
  imports: [...STEP_IMPORTS],
  templateUrl: './owners-step.html',
  styleUrl: './owners-step.scss',
})
export class OwnersStep {
  readonly owners = input.required<FormArray<OwnerForm>>();
  /** Masked tax ids already on file, keyed by owner id. */
  readonly storedTaxIds = input<ReadonlyMap<string, MaskedValue | null>>(new Map());

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly limits = FIELD_LIMITS;
  protected readonly maxOwners = MAX_OWNERS;

  protected storedTaxId(owner: OwnerForm): MaskedValue | null {
    const id = owner.controls.id.value;
    return id ? (this.storedTaxIds().get(id) ?? null) : null;
  }

  protected addOwner(): void {
    if (this.owners().length < MAX_OWNERS) {
      this.owners().push(createOwnerForm(this.fb));
    }
  }

  protected removeOwner(index: number): void {
    this.owners().removeAt(index);
    this.owners().markAsTouched();
  }
}
