import { Injectable, NgZone, inject, signal } from '@angular/core';

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
  readonly loading = this.loadingState.asReadonly();

  show(): void {
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
    this.zone.run(() => this.loadingState.set(false));
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
