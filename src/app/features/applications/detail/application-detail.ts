import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { StateMessage } from '@shared/ui/state-message/state-message';

/** Placeholder: the sectioned detail view, risk history and review controls come in step 6. */
@Component({
  selector: 'app-application-detail',
  imports: [MatButtonModule, RouterLink, PageHeader, StateMessage],
  template: `
    <app-page-header eyebrow="Application" heading="Application details" />
    <app-state-message icon="construction" heading="Detail view is coming next">
      <p>Sections, risk history and review controls are part of the next step.</p>
      <a stateActions mat-stroked-button routerLink="/applications">Back to applications</a>
    </app-state-message>
  `,
})
export class ApplicationDetail {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();
}
