import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

export const hostedLoginGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasSessionToken()) {
    return router.createUrlTree([authService.defaultAppRoute()]);
  }

  if (authService.shouldUseLocalLogin()) {
    return true;
  }

  if (route.queryParamMap.get('ssoCode')) {
    return true;
  }

  authService.redirectToHostedLogin();
  return false;
};
