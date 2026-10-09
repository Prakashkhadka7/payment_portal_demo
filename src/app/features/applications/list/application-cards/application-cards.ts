import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { ApplicationSummary } from '@contracts';
import { RiskBadge } from '../../ui/risk-badge/risk-badge';
import { StatusBadge } from '../../ui/status-badge/status-badge';
import type { ApplicationColumn } from '../application-columns';

/** Phone layout of the application list: one card per application, same permission rules. */
@Component({
  selector: 'app-application-cards',
  imports: [DatePipe, RouterLink, MatIconModule, RiskBadge, StatusBadge],
  templateUrl: './application-cards.html',
  styleUrl: './application-cards.scss',
})
export class ApplicationCards {
  readonly items = input.required<readonly ApplicationSummary[]>();
  readonly columns = input.required<readonly ApplicationColumn[]>();
  readonly busy = input(false);

  protected shows(column: ApplicationColumn): boolean {
    return this.columns().includes(column);
  }
}
