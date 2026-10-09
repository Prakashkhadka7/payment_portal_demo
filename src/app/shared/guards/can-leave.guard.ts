import type { CanDeactivateFn } from '@angular/router';
import type { Observable } from 'rxjs';

export interface CanLeave {
  canLeave(): Observable<boolean> | boolean;
}

/** Asks the page whether it is safe to navigate away (e.g. unsaved form changes). */
export const canLeaveGuard: CanDeactivateFn<CanLeave> = (component) => component.canLeave();
