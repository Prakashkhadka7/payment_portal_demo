import { HttpClient } from '@angular/common/http';
import { DOCUMENT, inject, Injectable } from '@angular/core';
import type { AuthSession, LoginRequest } from '@contracts';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url.token';

export const AUTH_PATH = '/auth/';

const SESSION_HINT_COOKIE = 'pp_session';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/auth`;
  private readonly document = inject(DOCUMENT);

  hasSessionHint(): boolean {
    return this.document.cookie
      .split(';')
      .some((cookie) => cookie.trim().startsWith(`${SESSION_HINT_COOKIE}=`));
  }

  clearSessionHint(): void {
    this.document.cookie = `${SESSION_HINT_COOKIE}=; max-age=0; path=/`;
  }

  login(credentials: LoginRequest): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.baseUrl}/login`, credentials);
  }

  refresh(): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.baseUrl}/refresh`, null);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, null);
  }
}
