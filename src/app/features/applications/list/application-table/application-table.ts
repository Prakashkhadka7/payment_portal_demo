import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { type Sort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import type { ApplicationSortField, ApplicationSummary, SortDirection } from '@contracts';
import { RiskBadge } from '../../ui/risk-badge/risk-badge';
import { StatusBadge } from '../../ui/status-badge/status-badge';
import type { ApplicationColumn } from '../application-columns';

/** Presentational, server-sorted table of applications. */
@Component({
  selector: 'app-application-table',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    RiskBadge,
    StatusBadge,
  ],
  templateUrl: './application-table.html',
  styleUrl: './application-table.scss',
})
export class ApplicationTable {
  readonly items = input.required<readonly ApplicationSummary[]>();
  readonly columns = input.required<readonly ApplicationColumn[]>();
  readonly sortBy = input.required<ApplicationSortField>();
  readonly sortDirection = input.required<SortDirection>();
  readonly busy = input(false);

  readonly sortChange = output<Sort>();

  protected readonly trackById = (_: number, row: ApplicationSummary): string => row.id;

  /** Only when it adds information, e.g. not "Acme" under "Acme Pvt. Ltd.". */
  protected showsTradingName({ legalName, tradingName }: ApplicationSummary): boolean {
    return !!tradingName && !legalName.toLowerCase().startsWith(tradingName.toLowerCase());
  }
}
