import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in',
    canMatch: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./core/layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'applications' },
      {
        path: 'applications',
        loadChildren: () =>
          import('./features/applications/applications.routes').then((m) => m.APPLICATION_ROUTES),
      },
      {
        path: 'forbidden',
        title: 'Access denied',
        loadComponent: () => import('./features/errors/forbidden').then((m) => m.Forbidden),
      },
      {
        path: '**',
        title: 'Page not found',
        loadComponent: () => import('./features/errors/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
