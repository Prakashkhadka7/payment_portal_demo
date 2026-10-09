import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { createSession } from '../../../testing/auth-fixtures';
import { AuthStore } from './auth.store';
import { HasPermissionDirective } from './has-permission.directive';

@Component({
  imports: [HasPermissionDirective],
  template: `
    <p *appHasPermission="'application:create'" data-testid="create">Create</p>
    <p
      *appHasPermission="['application:review', 'application:assign']; else noAccess"
      data-testid="review"
    >
      Review
    </p>
    <ng-template #noAccess><p data-testid="no-access">No access</p></ng-template>
  `,
})
class Host {}

describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<Host>;
  let store: AuthStore;

  const visible = (testId: string): boolean =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`) !== null;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    store = TestBed.inject(AuthStore);
    await fixture.whenStable();
  });

  it('renders nothing protected when signed out, but shows the else template', () => {
    expect(visible('create')).toBe(false);
    expect(visible('review')).toBe(false);
    expect(visible('no-access')).toBe(true);
  });

  it('shows content the current user is permitted to see', async () => {
    store.setSession(createSession(['SALES']));
    await fixture.whenStable();

    expect(visible('create')).toBe(true);
    expect(visible('review')).toBe(false);
    expect(visible('no-access')).toBe(true);
  });

  it('updates when the session changes', async () => {
    store.setSession(createSession(['SALES']));
    await fixture.whenStable();

    store.setSession(createSession(['ADMIN']));
    await fixture.whenStable();

    expect(visible('create')).toBe(false);
    expect(visible('review')).toBe(true);
    expect(visible('no-access')).toBe(false);
  });
});
