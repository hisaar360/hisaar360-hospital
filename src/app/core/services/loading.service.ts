import { Injectable, NgZone, inject, signal } from '@angular/core';

export interface LoadingShowOptions {
  title?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly zone = inject(NgZone);
  private activeRequests = 0;
  private showStartedAt = 0;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private stuckTimer: ReturnType<typeof setTimeout> | null = null;
  /** Keep overlay briefly so saves don't flash; keep short so UI isn't blocked. */
  private readonly minDurationMs = 250;
  /** Hard safety: never leave the click-blocking overlay up forever. */
  private readonly maxDurationMs = 12_000;

  private readonly loadingState = signal(false);
  private readonly titleState = signal('Loading…');
  private readonly messageState = signal('Please wait');

  readonly loading = this.loadingState.asReadonly();
  readonly title = this.titleState.asReadonly();
  readonly message = this.messageState.asReadonly();

  show(options?: LoadingShowOptions): void {
    if (options?.title) {
      this.titleState.set(options.title);
    } else if (this.activeRequests === 0) {
      this.titleState.set('Loading…');
    }
    if (options?.message) {
      this.messageState.set(options.message);
    } else if (this.activeRequests === 0) {
      this.messageState.set('Please wait');
    }

    this.activeRequests += 1;

    if (this.activeRequests !== 1) {
      return;
    }

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.showStartedAt = Date.now();
    this.zone.run(() => this.loadingState.set(true));
    this.armStuckWatchdog();
  }

  hide(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    if (this.activeRequests > 0) {
      return;
    }

    const elapsed = Date.now() - this.showStartedAt;
    const remaining = Math.max(0, this.minDurationMs - elapsed);

    this.hideTimer = setTimeout(() => {
      this.zone.run(() => {
        this.hideTimer = null;
        if (this.activeRequests === 0) {
          this.loadingState.set(false);
          this.titleState.set('Loading…');
          this.messageState.set('Please wait');
          this.clearStuckWatchdog();
        }
      });
    }, remaining);
  }

  /** Force-clear a stuck overlay (e.g. hung HTTP that never finalized). */
  reset(): void {
    this.activeRequests = 0;
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.clearStuckWatchdog();
    this.zone.run(() => {
      this.loadingState.set(false);
      this.titleState.set('Loading…');
      this.messageState.set('Please wait');
    });
  }

  private armStuckWatchdog(): void {
    this.clearStuckWatchdog();
    this.stuckTimer = setTimeout(() => {
      if (this.loadingState()) {
        this.reset();
      }
    }, this.maxDurationMs);
  }

  private clearStuckWatchdog(): void {
    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
      this.stuckTimer = null;
    }
  }
}
