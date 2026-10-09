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
});
