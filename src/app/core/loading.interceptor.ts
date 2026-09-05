import { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from './services/loading.service';

const shouldSkipLoader = (req: HttpRequest<unknown>): boolean => {
  const url = req.url || '';

  if (/\.(svg|png|jpe?g|gif|webp|ico|woff2?|ttf|css|js)(\?|$)/i.test(url)) {
    return true;
  }

  // Explicit opt-out for background work.
  if (req.headers.has('X-Skip-Loader')) {
    return true;
  }

  // Birth certificate fetch uses a local spinner; global overlay can stick above the modal.
  if (/\/birth-records\/certificates\//i.test(url)) {
    return true;
  }

  // Notification polling must never block the UI.
  if (/\/notifications(\?|$|\/)/i.test(url)) {
    return true;
  }

  // Full-screen overlay blocks clicks (file pickers, nav). Only show it for mutations.
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  return false;
};

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private readonly loading: LoadingService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler) {
    if (shouldSkipLoader(req)) {
      return next.handle(req);
    }

    this.loading.show();

    return next.handle(req).pipe(finalize(() => this.loading.hide()));
  }
}
