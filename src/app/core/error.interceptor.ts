import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { CONFIG } from '../../../config';
import { AuthService } from './services/auth.service';

const ALREADY_RETRIED = new HttpContextToken<boolean>(() => false);

const AUTH_ENDPOINTS = [
  CONFIG.auth.login,
  CONFIG.auth.ssoLogin,
  CONFIG.auth.refresh,
  CONFIG.auth.logout,
];

const isAuthEndpoint = (url: string): boolean =>
  AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isApiRequest = req.url.startsWith(CONFIG.baseUrl);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const accessChangedCodes = [
        'ACCESS_VERSION_CHANGED',
        'SESSION_REVOKED',
        'SESSION_EXPIRED',
        'PRODUCT_ACCESS_DISABLED',
      ];
      const errorCode = String(error?.error?.code || error?.error?.errorCode || '');

      if (isApiRequest && accessChangedCodes.includes(errorCode)) {
        authService.handleAuthFailure();
        return throwError(() => error);
      }

      const canAttemptRefresh =
        error.status === 401 &&
        isApiRequest &&
        !isAuthEndpoint(req.url) &&
        !req.context.get(ALREADY_RETRIED) &&
        authService.hasRefreshToken();

      if (canAttemptRefresh) {
        return authService.refreshSession().pipe(
          switchMap((token) =>
            next(
              req.clone({
                setHeaders: { Authorization: `Bearer ${token}` },
                context: req.context.set(ALREADY_RETRIED, true),
              })
            )
          ),
          catchError((refreshError) => {
            authService.handleAuthFailure();
            return throwError(() => refreshError);
          })
        );
      }

      if (error.status === 401 && isApiRequest) {
        authService.handleAuthFailure();
      }

      return throwError(() => error);
    })
  );
};
