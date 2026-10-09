import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { HasPermissionDirective } from '@core/auth/has-permission.directive';
import { PageHeader } from '@shared/ui/page-header/page-header';

/** Placeholder body: the server-side table, filters and states are built in the next step. */
@Component({
  selector: 'app-application-list',
  imports: [MatButtonModule, MatIconModule, RouterLink, HasPermissionDirective, PageHeader],
  template: `
    <app-page-header
      eyebrow="Workspace"
      heading="Applications"
      description="Track merchant applications from first draft to final risk decision."
    >
      <a
        *appHasPermission="'application:create'"
        pageActions
        mat-flat-button
        routerLink="/applications/new"
      >
        <mat-icon>add</mat-icon>
        New application
      </a>
    </app-page-header>
  `,
})
export class ApplicationList {}
