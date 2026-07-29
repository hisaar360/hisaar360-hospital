import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.hasSessionToken()) {
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
