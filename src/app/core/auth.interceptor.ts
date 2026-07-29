import { HttpInterceptorFn } from '@angular/common/http';

import { CONFIG } from '../../../config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(CONFIG.storage.token);
  const isApiRequest = req.url.startsWith(CONFIG.baseUrl);

  if (!isApiRequest) {
    return next(req);
  }

  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return next(req.clone({ setHeaders: headers }));
};
