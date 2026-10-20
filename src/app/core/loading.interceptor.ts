import { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from './services/loading.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const shouldSkipByUrl = (url: string): boolean => {
  const path = (url || '').toLowerCase();

  if (/\.(svg|png|jpe?g|gif|webp|ico|woff2?|ttf|css|js)(\?|$)/i.test(url)) {
    return true;
  }

  // Birth certificate fetch uses a local spinner; global overlay can stick above the modal.
  if (/\/birth-records\/certificates\//i.test(path)) {
    return true;
  }

  // Notification / health polling must never block the UI.
  if (
    /\/notifications(\?|$|\/)/i.test(path) ||
    /\/auth\/(refresh|me|logout)/i.test(path) ||
    /\/health(\?|$|\/)/i.test(path)
  ) {
    return true;
  }

  return false;
};

const defaultMessage = (method: string, url: string): { title: string; message: string } => {
  const path = (url || '').toLowerCase();

  if (/\/auth\/|\/sso|\/login/i.test(path)) {
    return { title: 'Signing you in…', message: 'Please wait' };
  }
  if (/\/payment|\/refund|\/collect/i.test(path)) {
    return { title: 'Processing payment…', message: 'Updating billing records' };
  }
  if (/\/invoice|\/print|\/statement/i.test(path)) {
    return { title: 'Preparing document…', message: 'Almost ready' };
  }
  if (/\/ward|\/admission|\/bed|\/discharge/i.test(path)) {
    return {
      title: method === 'DELETE' ? 'Updating ward…' : 'Saving ward changes…',
      message: 'Please wait',
    };
  }
  if (/\/lab|\/pharmacy|\/ot|\/operation/i.test(path)) {
    return { title: 'Saving changes…', message: 'Updating clinical records' };
  }
  if (method === 'DELETE') {
    return { title: 'Removing…', message: 'Please wait' };
  }
  if (MUTATING.has(method)) {
    return { title: 'Saving changes…', message: 'Please wait' };
  }
  return { title: 'Loading…', message: 'Please wait' };
};

const shouldSkipLoader = (req: HttpRequest<unknown>): boolean => {
  if (req.headers.has('X-Skip-Loader')) {
    return true;
  }

  if (shouldSkipByUrl(req.url || '')) {
    return true;
  }

  const method = (req.method || 'GET').toUpperCase();
  // Full-screen overlay blocks clicks on list GETs — track mutations (and forced GETs).
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    if (req.headers.has('X-Force-Loader')) {
      return false;
    }
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

    const method = (req.method || 'GET').toUpperCase();
    const { title, message } = defaultMessage(method, req.url || '');
    this.loading.show({ title, message });

    return next.handle(req).pipe(finalize(() => this.loading.hide()));
  }
}
