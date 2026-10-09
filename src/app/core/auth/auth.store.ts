import { computed, Injectable, signal } from '@angular/core';
import type { AuthSession, AuthUser, Permission } from '@contracts';

interface AuthState {
  readonly user: AuthUser | null;
  readonly accessToken: string | null;
}

const INITIAL_STATE: AuthState = { user: null, accessToken: null };

// Single source of truth for the current session.
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly state = signal<AuthState>(INITIAL_STATE);

  readonly user = computed(() => this.state().user);
  readonly accessToken = computed(() => this.state().accessToken);
  readonly isAuthenticated = computed(() => this.state().user !== null);
  readonly permissions = computed<ReadonlySet<Permission>>(
    () => new Set(this.state().user?.permissions ?? []),
  );

  setSession({ user, accessToken }: AuthSession): void {
    this.state.set({ user, accessToken });
  }

  clear(): void {
    this.state.set(INITIAL_STATE);
  }
}
