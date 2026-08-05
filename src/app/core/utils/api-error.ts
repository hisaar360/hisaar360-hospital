import { HttpErrorResponse } from '@angular/common/http';

export function extractApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong.'
): string {
  const httpError = error as HttpErrorResponse | null;
  const response = httpError?.error as
    | { message?: string | string[]; error?: string }
    | undefined;

  if (typeof response?.message === 'string' && response.message.trim()) {
    return response.message;
  }

  if (Array.isArray(response?.message) && response.message.length) {
    return String(response.message[0]);
  }

  if (typeof response?.error === 'string' && response.error.trim()) {
    return response.error;
  }

  return fallback;
}

export function extractApiErrorCode(error: unknown): string {
  const httpError = error as HttpErrorResponse | null;
  const response = httpError?.error as
    | { errorCode?: string; code?: string; error?: string }
    | undefined;

  return String(response?.errorCode || response?.code || response?.error || '')
    .trim()
    .toUpperCase();
}
