import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthSession, LoginRequest } from '@contracts';
import {
  catchError,
  EMPTY,
  finalize,
  map,
  type Observable,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { AuthApi } from './auth.api';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  // The refresh currently in flight, shared by every caller until it settles.
  private refreshInFlight$: Observable<string> | null = null;

  login(credentials: LoginRequest): Observable<AuthSession> {
    return this.api.login(credentials).pipe(tap((session) => this.store.setSession(session)));
  }

  refreshAccessToken(failedToken: string | null): Observable<string> {
    const current = this.store.accessToken();
    if (current && current !== failedToken) {
      return of(current);
    }

    this.refreshInFlight$ ??= this.api.refresh().pipe(
      tap((session) => this.store.setSession(session)),
      map((session) => session.accessToken),
      catchError((error: unknown) => {
        this.endSession();
        return throwError(() => error);
      }),
      finalize(() => (this.refreshInFlight$ = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshInFlight$;
  }

  /**
   * Restores the session from the refresh cookie on app start; stays signed out on failure.
   * Without the session hint there is no cookie to restore from, so no request is made.
   */
  restoreSession(): Observable<void> {
    if (!this.api.hasSessionHint()) {
      return EMPTY;
    }
    return this.api.refresh().pipe(
      tap((session) => this.store.setSession(session)),
      map(() => undefined),
      catchError(() => EMPTY),
    );
  }

  // Clears local state immediately
  logout(): void {
    this.store.clear();
    this.api.clearSessionHint();
    this.api
      .logout()
      .pipe(catchError(() => EMPTY))
      .subscribe();
    void this.router.navigate(['/login']);
  }

  private endSession(): void {
    const returnUrl = this.router.url;
    this.store.clear();
    void this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }
}
