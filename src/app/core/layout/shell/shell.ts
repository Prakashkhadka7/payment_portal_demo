import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { type MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { AuthStore } from '@core/auth/auth.store';
import { PermissionService } from '@core/auth/permission.service';
import type { Role } from '@contracts';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { initialsOf } from '@shared/utils/initials';
import { filter, map } from 'rxjs';
import { NAV_ITEMS } from '../nav-items';

const ROLE_LABELS: Readonly<Record<Role, string>> = {
  SALES: 'Sales',
  REVIEWER: 'Reviewer',
  ADMIN: 'Admin',
};

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatTooltipModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly permissions = inject(PermissionService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly user = inject(AuthStore).user;
  protected readonly isHandset = toSignal(
    inject(BreakpointObserver)
      .observe(Breakpoints.Handset)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly NAV_ITEMS = computed(() =>
    NAV_ITEMS.filter((item) => !item.permission || this.permissions.has(item.permission)),
  );
  protected readonly initials = computed(() => initialsOf(this.user()?.displayName ?? ''));
  protected readonly roleLabel = computed(() =>
    (this.user()?.roles ?? []).map((role) => ROLE_LABELS[role]).join(' · '),
  );

  /** On phones the drawer overlays the content, so close it after navigating. */
  protected closeOnHandset(drawer: MatSidenav): void {
    if (this.isHandset()) {
      void drawer.close();
    }
  }

  protected logout(): void {
    this.confirmDialog
      .confirm({
        title: 'Sign out?',
        message: 'You will need to sign in again to continue working in the portal.',
        confirmLabel: 'Sign out',
        icon: 'logout',
      })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.auth.logout());
  }
}
