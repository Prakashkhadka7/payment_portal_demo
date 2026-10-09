import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createSession } from '../../../testing/auth-fixtures';
import { AuthStore } from './auth.store';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  let service: PermissionService;
  let store: AuthStore;

  beforeEach(() => {
    service = TestBed.inject(PermissionService);
    store = TestBed.inject(AuthStore);
  });

  it('grants nothing when signed out', () => {
    expect(service.has('application:read')).toBe(false);
    expect(service.hasAny(['application:read', 'application:create'])).toBe(false);
  });

  it('checks single, any-of and all-of requirements', () => {
    store.setSession(createSession(['SALES']));

    expect(service.has('application:create')).toBe(true);
    expect(service.has('application:review')).toBe(false);
    expect(service.hasAny(['application:review', 'application:create'])).toBe(true);
    expect(service.hasAll(['application:review', 'application:create'])).toBe(false);
    expect(service.satisfies('application:submit')).toBe(true);
    expect(service.satisfies(['application:assign', 'application:review'])).toBe(false);
  });

  it('uses the union of permissions for users with several roles', () => {
    store.setSession(createSession(['SALES', 'REVIEWER']));

    expect(service.hasAll(['application:create', 'application:review'])).toBe(true);
  });

  it('is reactive inside computed signals', () => {
    const canReview = computed(() => service.has('application:review'));
    store.setSession(createSession(['SALES']));
    expect(canReview()).toBe(false);

    store.setSession(createSession(['REVIEWER']));

    expect(canReview()).toBe(true);
  });
});
