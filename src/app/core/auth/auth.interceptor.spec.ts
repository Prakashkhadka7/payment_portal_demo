import {
  HttpClient,
  type HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { createSession } from '../../../testing/auth-fixtures';
import { API_BASE_URL } from '../http/api-base-url.token';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

const REFRESH_URL = '/api/auth/refresh';
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let store: AuthStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    store.setSession(createSession(['SALES'], { accessToken: 'expired-token' }));
  });

  afterEach(() => httpTesting.verify());

  it('attaches the bearer token to API requests only', () => {
    http.get('/api/applications').subscribe();
    http.get('https://cdn.example.com/asset.json').subscribe();
    http.post(REFRESH_URL, null).subscribe();

    const api = httpTesting.expectOne('/api/applications');
    const external = httpTesting.expectOne('https://cdn.example.com/asset.json');
    const auth = httpTesting.expectOne(REFRESH_URL);

    expect(api.request.headers.get('Authorization')).toBe('Bearer expired-token');
    expect(external.request.headers.has('Authorization')).toBe(false);
    expect(auth.request.headers.has('Authorization')).toBe(false);
    [api, external].forEach((request) => request.flush({}));
    auth.flush(createSession());
  });

  it('refreshes once when concurrent requests get 401 and retries each with the new token', () => {
    const urls = ['/api/a', '/api/b', '/api/c'];
    const received: string[] = [];
    urls.forEach((url) =>
      http.get<{ url: string }>(url).subscribe((body) => received.push(body.url)),
    );

    urls.forEach((url) => httpTesting.expectOne(url).flush(null, UNAUTHORIZED));
    const refreshes = httpTesting.match(REFRESH_URL);
    expect(refreshes).toHaveLength(1);
    refreshes[0].flush(createSession(['SALES'], { accessToken: 'fresh-token' }));

    urls.forEach((url) => {
      const retry = httpTesting.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh-token');
      retry.flush({ url });
    });
    expect(received).toEqual(urls);
    expect(store.accessToken()).toBe('fresh-token');
  });

  it('reuses a token refreshed by another request instead of refreshing again', () => {
    http.get('/api/slow').subscribe();
    http.get('/api/fast').subscribe();

    httpTesting.expectOne('/api/fast').flush(null, UNAUTHORIZED);
    httpTesting
      .expectOne(REFRESH_URL)
      .flush(createSession(['SALES'], { accessToken: 'fresh-token' }));
    httpTesting.expectOne('/api/fast').flush({});

    // The slow request was sent with the old token and only now fails.
    httpTesting.expectOne('/api/slow').flush(null, UNAUTHORIZED);

    httpTesting.expectNone(REFRESH_URL);
    const retry = httpTesting.expectOne('/api/slow');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retry.flush({});
  });

  it('ends the session and fails every waiting request when the refresh fails', () => {
    const errors: number[] = [];
    ['/api/a', '/api/b'].forEach((url) =>
      http.get(url).subscribe({ error: (error: HttpErrorResponse) => errors.push(error.status) }),
    );

    httpTesting.expectOne('/api/a').flush(null, UNAUTHORIZED);
    httpTesting.expectOne('/api/b').flush(null, UNAUTHORIZED);
    httpTesting.expectOne(REFRESH_URL).flush(null, UNAUTHORIZED);

    expect(errors).toEqual([401, 401]);
    expect(store.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: expect.any(String) },
    });
  });

  it('retries only once: a second 401 is returned to the caller', () => {
    let status: number | undefined;
    http.get('/api/a').subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });

    httpTesting.expectOne('/api/a').flush(null, UNAUTHORIZED);
    httpTesting
      .expectOne(REFRESH_URL)
      .flush(createSession(['SALES'], { accessToken: 'fresh-token' }));
    httpTesting.expectOne('/api/a').flush(null, UNAUTHORIZED);

    httpTesting.expectNone(REFRESH_URL);
    expect(status).toBe(401);
  });

  it('passes other errors through without refreshing', () => {
    let status: number | undefined;
    http.get('/api/a').subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });

    httpTesting.expectOne('/api/a').flush(null, { status: 503, statusText: 'Unavailable' });

    httpTesting.expectNone(REFRESH_URL);
    expect(status).toBe(503);
  });
});
