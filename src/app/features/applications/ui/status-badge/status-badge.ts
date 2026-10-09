import { Component, computed, input } from '@angular/core';
import type { ApplicationStatus } from '@contracts';
import { STATUS_LABELS } from '../../data-access/application.constants';

/** Application status as a coloured dot + label (never colour alone, for accessibility). */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge__dot" aria-hidden="true"></span>{{ label() }}`,
  styleUrl: './status-badge.scss',
  host: { '[class]': '"badge badge--" + status().toLowerCase()' },
})
export class StatusBadge {
  readonly status = input.required<ApplicationStatus>();
  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
}
