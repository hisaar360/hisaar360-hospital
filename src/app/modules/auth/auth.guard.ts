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
    console.groupCollapsed('[HMS Auth] authGuard forward ssoCode');
    console.log('from', state.url);
    console.log('to', '/login/access');
    console.groupEnd();
    return router.createUrlTree(['/login/access'], {
      queryParams: { ssoCode },
    });
  }

  if (!authService.hasSessionToken()) {
    console.warn('[HMS Auth] authGuard: no token → hosted login');
    authService.handleAuthFailure();
    return false;
  }

  if (authService.getCurrentUser()) {
    return true;
  }

  console.log('[HMS Auth] authGuard: hydrating /auth/me');
  return authService.me().pipe(
    map(() => true),
    catchError((err) => {
      console.error('[HMS Auth] authGuard /me failed', err?.error || err);
      authService.handleAuthFailure();
      return of(false);
    })
  );
};
