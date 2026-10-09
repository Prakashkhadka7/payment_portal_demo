import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { StateMessage } from '@shared/ui/state-message/state-message';

@Component({
  selector: 'app-not-found',
  imports: [MatButtonModule, RouterLink, StateMessage],
  template: `
    <app-state-message icon="search_off" heading="Page not found">
      <p>The page you are looking for does not exist or has moved.</p>
      <a stateActions mat-flat-button routerLink="/">Go to dashboard</a>
    </app-state-message>
  `,
})
export class NotFound {}
