import { inject, Injectable } from '@angular/core';
import type { Permission } from '@contracts';
import { AuthStore } from './auth.store';

export type PermissionRequirement = Permission | readonly Permission[];

// The one place UI code asks if permission is granted.

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly permissions = inject(AuthStore).permissions;

  has(permission: Permission): boolean {
    return this.permissions().has(permission);
  }

  hasAny(permissions: readonly Permission[]): boolean {
    return permissions.some((permission) => this.has(permission));
  }

  hasAll(permissions: readonly Permission[]): boolean {
    return permissions.every((permission) => this.has(permission));
  }

  satisfies(requirement: PermissionRequirement): boolean {
    return typeof requirement === 'string' ? this.has(requirement) : this.hasAny(requirement);
  }
}
