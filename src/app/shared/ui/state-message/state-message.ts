import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-state-message',
  imports: [MatIconModule],
  template: `
    <mat-icon class="state__icon" aria-hidden="true">{{ icon() }}</mat-icon>
    <h2 class="state__heading">{{ heading() }}</h2>
    <div class="state__body"><ng-content /></div>
    <div class="state__actions"><ng-content select="[stateActions]" /></div>
  `,
  styleUrl: './state-message.scss',
})
export class StateMessage {
  readonly icon = input.required<string>();
  readonly heading = input.required<string>();
}
