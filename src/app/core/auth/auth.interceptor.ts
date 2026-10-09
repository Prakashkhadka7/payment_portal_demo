import {
  HttpErrorResponse,
  HttpStatusCode,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL, isApiUrl } from '../http/api-base-url.token';
import { AUTH_PATH } from './auth.api';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

// Attaches the bearer token to API requests and recovers from an expired token:

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  if (!isApiUrl(request.url, apiBaseUrl) || request.url.startsWith(`${apiBaseUrl}${AUTH_PATH}`)) {
    return next(request);
  }

  const auth = inject(AuthService);
  const sentWithToken = inject(AuthStore).accessToken();

  return next(withBearer(request, sentWithToken)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== HttpStatusCode.Unauthorized) {
        return throwError(() => error);
      }
      return auth
        .refreshAccessToken(sentWithToken)
        .pipe(switchMap((freshToken) => next(withBearer(request, freshToken))));
    }),
  );
};

function withBearer<T>(request: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}
