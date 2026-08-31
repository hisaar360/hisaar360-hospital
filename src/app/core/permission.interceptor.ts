import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { CONFIG } from '../../../config';
import { emptyApiData, resolveApiAccess } from './api-access';

export const permissionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(CONFIG.baseUrl)) {
    return next(req);
  }

  const decision = resolveApiAccess(req.method, req.url);
  if (decision.action === 'allow') {
    return next(req);
  }

  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return of(
      new HttpResponse({
        status: 200,
        body: {
          success: true,
          statusCode: 200,
          message: 'OK',
          data: emptyApiData(decision.empty),
          timestamp: new Date().toISOString(),
        },
      })
    );
  }

  return throwError(
    () =>
      new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden',
        url: req.url,
        error: {
          success: false,
          statusCode: 403,
          message: 'You do not have permission to perform this action',
          error: 'FORBIDDEN',
        },
      })
  );
};
