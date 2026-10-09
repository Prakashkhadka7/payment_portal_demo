import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { createSession } from '../../../testing/auth-fixtures';
import { authGuard, guestGuard, permissionGuard } from './auth.guards';
import { AuthStore } from './auth.store';

@Component({ template: '' })
class Blank {}

describe('auth guards', () => {
  let store: AuthStore;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', canMatch: [guestGuard], component: Blank },
          { path: 'forbidden', component: Blank },
          {
            path: 'applications/new',
            canMatch: [authGuard, permissionGuard('application:create')],
            component: Blank,
          },
          { path: 'applications', canMatch: [authGuard], component: Blank },
          { path: '', component: Blank },
        ]),
      ],
    });
    store = TestBed.inject(AuthStore);
    harness = await RouterTestingHarness.create();
  });

  const currentUrl = (): string => TestBed.inject(Router).url;

  it('sends anonymous users to login and remembers the requested URL', async () => {
    await harness.navigateByUrl('/applications?status=DRAFT');

    expect(currentUrl()).toBe('/login?returnUrl=%2Fapplications%3Fstatus%3DDRAFT');
  });

  it('lets signed-in users through', async () => {
    store.setSession(createSession(['REVIEWER']));

    await harness.navigateByUrl('/applications');

    expect(currentUrl()).toBe('/applications');
  });

  it('shows the forbidden page when a permission is missing', async () => {
    store.setSession(createSession(['REVIEWER']));

    await harness.navigateByUrl('/applications/new');

    expect(currentUrl()).toBe('/forbidden');
  });

  it('allows the route when any of the user roles grants the permission', async () => {
    store.setSession(createSession(['REVIEWER', 'SALES']));

    await harness.navigateByUrl('/applications/new');

    expect(currentUrl()).toBe('/applications/new');
  });

  it('keeps signed-in users away from the login page', async () => {
    store.setSession(createSession());

    await harness.navigateByUrl('/login');

    expect(currentUrl()).toBe('/');
  });
});
