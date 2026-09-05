import { HttpInterceptorFn } from '@angular/common/http';

import { CONFIG } from '../../../config';

const AUTH_ENDPOINTS_WITHOUT_BEARER = [
  CONFIG.auth.login,
  CONFIG.auth.ssoLogin,
  CONFIG.auth.refresh,
  CONFIG.auth.forgotPassword,
  CONFIG.auth.resetPassword,
];

const shouldSkipBearer = (url: string): boolean =>
  AUTH_ENDPOINTS_WITHOUT_BEARER.some((endpoint) => url.startsWith(endpoint));

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(CONFIG.storage.token);
  const isApiRequest = req.url.startsWith(CONFIG.baseUrl);

  if (!isApiRequest) {
    return next(req);
  }

  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (token && !shouldSkipBearer(req.url)) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return next(req.clone({ setHeaders: headers }));
};
