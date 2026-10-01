import { Injectable } from '@angular/core';

const MUTE_KEY = 'hms_notification_mute';
const DESKTOP_KEY = 'hms_notification_desktop';
const PLAYED_KEY = 'hms_notification_played_ids';

@Injectable({ providedIn: 'root' })
export class NotificationSoundService {
  private audioContext: AudioContext | null = null;
  private userInteracted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.userInteracted = true;
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  get muted(): boolean {
    return localStorage.getItem(MUTE_KEY) === '1';
  }

  setMuted(value: boolean): void {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  }

  toggleMute(): boolean {
    const next = !this.muted;
    this.setMuted(next);
    return next;
  }

  /** Browser desktop toast preference (separate from Notification.permission). */
  get desktopEnabled(): boolean {
    return localStorage.getItem(DESKTOP_KEY) === '1';
  }

  setDesktopEnabled(value: boolean): void {
    localStorage.setItem(DESKTOP_KEY, value ? '1' : '0');
  }

  get desktopPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return 'unsupported';
    }
    return Notification.permission;
  }

  async requestDesktopPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      this.setDesktopEnabled(true);
      return 'granted';
    }
    if (Notification.permission === 'denied') {
      this.setDesktopEnabled(false);
      return 'denied';
    }
    const result = await Notification.requestPermission();
    this.setDesktopEnabled(result === 'granted');
    return result;
  }

  showDesktopToast(title: string, options?: { body?: string; tag?: string }): void {
    if (
      !this.desktopEnabled ||
      typeof window === 'undefined' ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted'
    ) {
      return;
    }
    try {
      const notification = new Notification(title || 'Hospital alert', {
        body: options?.body || '',
        tag: options?.tag || undefined,
        silent: true,
      });
      window.setTimeout(() => notification.close(), 8000);
    } catch {
      // Ignore permission / browser quirks.
    }
  }

  playOnce(notificationId: string): void {
    if (this.muted || !this.userInteracted || !notificationId) {
      return;
    }
    const played = this.readPlayedIds();
    if (played.has(notificationId)) {
      return;
    }
    played.add(notificationId);
    this.writePlayedIds(played);
    this.playTone();
  }

  /** Settings preview — ignores mute/play-once tracking so user can verify speakers. */
  playPreview(): void {
    this.userInteracted = true;
    this.playTone(0.08);
  }

  private playTone(volume = 0.04): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = volume;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      oscillator.stop(ctx.currentTime + 0.26);
    } catch {
      // Browser blocked or unsupported — ignore silently.
    }
  }

  private readPlayedIds(): Set<string> {
    try {
      const raw = JSON.parse(localStorage.getItem(PLAYED_KEY) || '[]') as string[];
      return new Set(raw.slice(-200));
    } catch {
      return new Set();
    }
  }

  private writePlayedIds(ids: Set<string>): void {
    localStorage.setItem(PLAYED_KEY, JSON.stringify(Array.from(ids).slice(-200)));
  }
}
