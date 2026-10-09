import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { PermissionService, type PermissionRequirement } from './permission.service';

/** Requires a session; otherwise redirects to login and remembers where the user was going. */
export const authGuard: CanMatchFn = () => {
  if (inject(AuthStore).isAuthenticated()) {
    return true;
  }
  const router = inject(Router);
  const returnUrl = router.currentNavigation()?.extractedUrl.toString();
  return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
};

// Keeps signed-in users away from the login page.
export const guestGuard: CanMatchFn = () =>
  !inject(AuthStore).isAuthenticated() || inject(Router).createUrlTree(['/']);

// Requires the given permission ; otherwise shows the forbidden page.
export function permissionGuard(requirement: PermissionRequirement): CanMatchFn {
  return () =>
    inject(PermissionService).satisfies(requirement) ||
    inject(Router).createUrlTree(['/forbidden']);
}
