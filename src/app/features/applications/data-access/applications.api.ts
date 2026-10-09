import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApplicationDataInput,
  ApplicationDetail,
  ApplicationListQuery,
  ApplicationSummary,
  AssignReviewerRequest,
  CreateApplicationRequest,
  Page,
  RecordDecisionRequest,
  RevealSensitiveRequest,
  RevealSensitiveResponse,
  SaveDraftRequest,
  UserRef,
} from '@contracts';
import { API_BASE_URL } from '@core/http/api-base-url.token';
import type { Observable } from 'rxjs';

/** HTTP client for the applications resource. Stateless: state lives in the feature stores. */
@Injectable({ providedIn: 'root' })
export class ApplicationsApi {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly baseUrl = `${this.apiBaseUrl}/applications`;

  list(query: ApplicationListQuery): Observable<Page<ApplicationSummary>> {
    return this.http.get<Page<ApplicationSummary>>(this.baseUrl, { params: toHttpParams(query) });
  }

  get(id: string): Observable<ApplicationDetail> {
    return this.http.get<ApplicationDetail>(this.url(id));
  }

  /** Creates a draft owned by the current user. Drafts may be incomplete. */
  create(data: ApplicationDataInput): Observable<ApplicationDetail> {
    const body: CreateApplicationRequest = { data };
    return this.http.post<ApplicationDetail>(this.baseUrl, body);
  }

  /** Replaces the draft data. Fails with 409 if `version` is stale (changed elsewhere). */
  saveDraft(id: string, request: SaveDraftRequest): Observable<ApplicationDetail> {
    return this.http.put<ApplicationDetail>(this.url(id), request);
  }

  /** Locks the draft for review. Fails with 422 and per-field errors when incomplete. */
  submit(id: string): Observable<ApplicationDetail> {
    return this.http.post<ApplicationDetail>(`${this.url(id)}/submit`, null);
  }

  /** ADMIN only: assigns a reviewer, moving the application into review. */
  assign(id: string, body: AssignReviewerRequest): Observable<ApplicationDetail> {
    return this.http.post<ApplicationDetail>(`${this.url(id)}/assignment`, body);
  }

  /** Assigned REVIEWER only: records the approve/reject decision with a risk level. */
  decide(id: string, body: RecordDecisionRequest): Observable<ApplicationDetail> {
    return this.http.post<ApplicationDetail>(`${this.url(id)}/decision`, body);
  }

  /** Returns one sensitive value in clear; the server checks the role and audits the access. */
  reveal(id: string, target: RevealSensitiveRequest): Observable<RevealSensitiveResponse> {
    return this.http.post<RevealSensitiveResponse>(`${this.url(id)}/sensitive/reveal`, target);
  }

  /** Reviewer candidates for assignment (ADMIN only). */
  reviewers(): Observable<UserRef[]> {
    return this.http.get<UserRef[]>(`${this.apiBaseUrl}/users/reviewers`);
  }

  /** Ids come from the URL, so they are encoded rather than trusted as path segments. */
  private url(id: string): string {
    return `${this.baseUrl}/${encodeURIComponent(id)}`;
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
