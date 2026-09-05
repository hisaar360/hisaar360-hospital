import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

export const hostedLoginGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const ssoCode = route.queryParamMap.get('ssoCode');
  // Escape hatch for leftover local User accounts only: /login/access?localLogin=1
  const allowLocalLogin = route.queryParamMap.get('localLogin') === '1';

  // Fresh SSO always wins — ignore any leftover token from a prior role/login.
  if (ssoCode) {
    authService.beginFreshSsoHandoff();
    return true;
  }

  if (authService.hasSessionToken()) {
    return router.createUrlTree([authService.defaultAppRoute()]);
  }

  // Default: never show hospital login form — send to Central Auth portal.
  // Local dev → http://localhost:4200/login
  // Production → https://hisaar360.com/login
  if (!allowLocalLogin) {
    authService.redirectToHostedLogin();
    return false;
  }

  return true;
};
