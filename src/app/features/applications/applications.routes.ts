import type { Routes } from '@angular/router';
import { permissionGuard } from '@core/auth/auth.guards';

export const APPLICATION_ROUTES: Routes = [
  {
    path: '',
    title: 'Applications',
    loadComponent: () => import('./list/application-list').then((m) => m.ApplicationList),
  },
  {
    path: 'new',
    title: 'New application',
    canMatch: [permissionGuard('application:create')],
    loadComponent: () => import('./wizard/application-wizard').then((m) => m.ApplicationWizard),
  },
  {
    path: ':id/edit',
    title: 'Edit application',
    canMatch: [permissionGuard('application:edit')],
    loadComponent: () => import('./wizard/application-wizard').then((m) => m.ApplicationWizard),
  },
  {
    path: ':id',
    title: 'Application',
    loadComponent: () => import('./detail/application-detail').then((m) => m.ApplicationDetail),
  },
];
