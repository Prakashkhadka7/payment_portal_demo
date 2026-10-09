import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApplicationListQuery, ApplicationSummary, Page } from '@contracts';
import { API_BASE_URL } from '@core/http/api-base-url.token';
import type { Observable } from 'rxjs';

/** HTTP client for the applications resource. Stateless: state lives in the feature stores. */
@Injectable({ providedIn: 'root' })
export class ApplicationsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/applications`;

  list(query: ApplicationListQuery): Observable<Page<ApplicationSummary>> {
    return this.http.get<Page<ApplicationSummary>>(this.baseUrl, { params: toHttpParams(query) });
  }
}

/** Omits undefined values so optional filters are simply absent from the request. */
function toHttpParams(query: ApplicationListQuery): HttpParams {
  return Object.entries(query).reduce(
    (params, [key, value]) =>
      value === undefined || value === '' ? params : params.set(key, String(value)),
    new HttpParams(),
  );
}
