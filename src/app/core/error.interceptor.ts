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
  CONFIG.auth.changePassword,
];

const PASSWORD_FLOW_CODES = new Set([
  'CURRENT_PASSWORD_INCORRECT',
  'PASSWORD_CONFIRMATION_MISMATCH',
  'PASSWORD_CHANGED_RELOGIN_REQUIRED',
  'CENTRAL_PASSWORD_MANAGED',
  'VALIDATION_ERROR',
]);

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
        'SESSION_REPLACED',
        'PRODUCT_ACCESS_DISABLED',
      ];
      const errorCode = String(error?.error?.code || error?.error?.errorCode || '');

      if (isApiRequest && accessChangedCodes.includes(errorCode)) {
        authService.handleAuthFailure();
        return throwError(() => error);
      }

      // Wrong current password / validation on change-password must not force logout.
      if (
        isApiRequest &&
        req.url.startsWith(CONFIG.auth.changePassword) &&
        (PASSWORD_FLOW_CODES.has(errorCode) || error.status === 400 || error.status === 401)
      ) {
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
