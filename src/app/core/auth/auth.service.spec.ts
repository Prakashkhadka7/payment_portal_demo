import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { createSession } from '../../../testing/auth-fixtures';
import { API_BASE_URL } from '../http/api-base-url.token';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

describe('AuthService', () => {
  let service: AuthService;
  let store: AuthStore;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(AuthService);
    store = TestBed.inject(AuthStore);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpTesting.verify();
    document.cookie = 'pp_session=; max-age=0; path=/';
  });

  it('stores the session after a successful login', () => {
    const session = createSession(['REVIEWER']);

    service.login({ username: 'reviewer.test', password: 'secret-value' }).subscribe();
    httpTesting.expectOne({ method: 'POST', url: '/api/auth/login' }).flush(session);

    expect(store.user()).toEqual(session.user);
    expect(store.accessToken()).toBe(session.accessToken);
  });

  it('restores the session from the refresh cookie on start', () => {
    const session = createSession();
    document.cookie = 'pp_session=1; path=/';

    service.restoreSession().subscribe();
    httpTesting.expectOne('/api/auth/refresh').flush(session);

    expect(store.isAuthenticated()).toBe(true);
  });

  it('does not call the API on start when there is no session to restore', () => {
    const complete = vi.fn();

    service.restoreSession().subscribe({ complete });

    httpTesting.expectNone('/api/auth/refresh');
    expect(complete).toHaveBeenCalled();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('stays signed out without erroring when the session can no longer be restored', () => {
    const error = vi.fn();
    document.cookie = 'pp_session=1; path=/';

    service.restoreSession().subscribe({ error });
    httpTesting
      .expectOne('/api/auth/refresh')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(error).not.toHaveBeenCalled();
    expect(store.isAuthenticated()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears the session immediately on logout, even if the server call fails', () => {
    store.setSession(createSession());
    document.cookie = 'pp_session=1; path=/';

    service.logout();

    expect(store.isAuthenticated()).toBe(false);
    expect(document.cookie).not.toContain('pp_session');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    httpTesting.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Error' });
  });
});
