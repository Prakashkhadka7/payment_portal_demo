import { Component, input } from '@angular/core';

/**
 * Consistent page heading. Page-level buttons are projected into the `[pageActions]` slot, so
 * each page decides its own actions while layout and typography stay uniform.
 *
 * @example
 * <app-page-header eyebrow="Workspace" heading="Applications" description="…">
 *   <a pageActions mat-flat-button routerLink="new">New application</a>
 * </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  template: `
    <div class="page-header__text">
      @if (eyebrow(); as eyebrowText) {
        <p class="app-eyebrow page-header__eyebrow">{{ eyebrowText }}</p>
      }
      <h1 class="page-header__title">{{ heading() }}</h1>
      @if (description(); as descriptionText) {
        <p class="page-header__description">{{ descriptionText }}</p>
      }
    </div>
    <div class="page-header__actions"><ng-content select="[pageActions]" /></div>
  `,
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly eyebrow = input<string>();
  readonly description = input<string>();
}
