import { Component, computed, input } from '@angular/core';
import type { RiskLevel } from '@contracts';
import { RISK_LABELS } from '../../data-access/application.constants';

@Component({
  selector: 'app-risk-badge',
  template: `
    @if (level(); as risk) {
      <span class="risk risk--{{ risk.toLowerCase() }}">
        <span class="risk__bars" aria-hidden="true"><i></i><i></i><i></i></span>
        {{ label() }}
      </span>
    } @else {
      <span class="risk risk--none" aria-label="No risk decision yet">—</span>
    }
  `,
  styleUrl: './risk-badge.scss',
})
export class RiskBadge {
  readonly level = input<RiskLevel | null>(null);
  protected readonly label = computed(() => {
    const level = this.level();
    return level ? RISK_LABELS[level] : '';
  });
}
