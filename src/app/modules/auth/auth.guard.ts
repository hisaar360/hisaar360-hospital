import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Central Auth redirects to /?ssoCode=... — forward to the SSO login handler.
  const ssoCode = router.parseUrl(state.url).queryParamMap.get('ssoCode');
  if (ssoCode && !authService.hasSessionToken()) {
    return router.createUrlTree(['/login/access'], {
      queryParams: { ssoCode },
    });
  }

  if (!authService.hasSessionToken()) {
    authService.handleAuthFailure();
    return false;
  }

  if (authService.isAccessTokenExpired() && !authService.hasRefreshToken()) {
    authService.handleAuthFailure();
    return false;
  }

  if (authService.getCurrentUser()) {
    return true;
  }

  return authService.me().pipe(
    map(() => true),
    catchError(() => {
      authService.handleAuthFailure();
      return of(false);
    })
  );
};
