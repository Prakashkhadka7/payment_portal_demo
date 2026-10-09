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

export const SIGNING_OUT = 'signingOut';

// Keeps signed-in users away from the login page, except while they are signing out.
export const guestGuard: CanMatchFn = () => {
  const router = inject(Router);
  const signingOut = router.currentNavigation()?.extras.state?.[SIGNING_OUT] === true;
  return signingOut || !inject(AuthStore).isAuthenticated() || router.createUrlTree(['/']);
};

// Requires the given permission ; otherwise shows the forbidden page.
export function permissionGuard(requirement: PermissionRequirement): CanMatchFn {
  return () =>
    inject(PermissionService).satisfies(requirement) ||
    inject(Router).createUrlTree(['/forbidden']);
}
