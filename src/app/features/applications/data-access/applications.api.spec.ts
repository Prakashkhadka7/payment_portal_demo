import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@core/http/api-base-url.token';
import { ApplicationsApi } from './applications.api';

describe('ApplicationsApi', () => {
  let api: ApplicationsApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    api = TestBed.inject(ApplicationsApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sends the list query as parameters, leaving out empty filters', () => {
    api
      .list({ page: 2, pageSize: 10, status: undefined, search: '', sortBy: 'status' })
      .subscribe();

    const request = httpTesting.expectOne((req) => req.url === '/api/applications');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['page', 'pageSize', 'sortBy']);
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ items: [], total: 0, page: 2, pageSize: 10 });
  });

  it('loads one application, encoding the id taken from the URL', () => {
    api.get('app 1/../x').subscribe();

    httpTesting.expectOne({ method: 'GET', url: '/api/applications/app%201%2F..%2Fx' }).flush({});
  });

  it('creates a draft with the data wrapped as the API expects', () => {
    const data = { business: { legalName: 'Spec Traders' } } as never;

    api.create(data).subscribe();

    const request = httpTesting.expectOne({ method: 'POST', url: '/api/applications' });
    expect(request.request.body).toEqual({ data });
    request.flush({});
  });

  it('saves a draft with its version for optimistic concurrency', () => {
    const body = { version: 3, data: {} as never };

    api.saveDraft('app-0001', body).subscribe();

    const request = httpTesting.expectOne({ method: 'PUT', url: '/api/applications/app-0001' });
    expect(request.request.body).toEqual(body);
    request.flush({});
  });

  it('calls the review, assignment and reveal endpoints', () => {
    api
      .decide('app-1', { decision: 'APPROVED', riskLevel: 'LOW', comment: 'Looks fine.' })
      .subscribe();
    api.assign('app-1', { reviewerId: 'u-1' }).subscribe();
    api.reveal('app-1', { field: 'iban' }).subscribe();
    api.reviewers().subscribe();

    httpTesting.expectOne({ method: 'POST', url: '/api/applications/app-1/decision' }).flush({});
    httpTesting.expectOne({ method: 'POST', url: '/api/applications/app-1/assignment' }).flush({});
    httpTesting
      .expectOne({ method: 'POST', url: '/api/applications/app-1/sensitive/reveal' })
      .flush({});
    httpTesting.expectOne({ method: 'GET', url: '/api/users/reviewers' }).flush([]);
  });

  it('loads the status counts', () => {
    api.counts().subscribe();

    httpTesting.expectOne({ method: 'GET', url: '/api/applications/counts' }).flush({});
  });

  it('submits a draft', () => {
    api.submit('app-0001').subscribe();

    httpTesting.expectOne({ method: 'POST', url: '/api/applications/app-0001/submit' }).flush({});
  });
});
