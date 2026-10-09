import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { StateMessage } from '@shared/ui/state-message/state-message';

@Component({
  selector: 'app-forbidden',
  imports: [MatButtonModule, RouterLink, StateMessage],
  template: `
    <app-state-message icon="lock" heading="You don't have access to this page">
      <p>Your role does not include permission for this area.</p>
      <a stateActions mat-flat-button routerLink="/">Go to dashboard</a>
    </app-state-message>
  `,
})
export class Forbidden {}
