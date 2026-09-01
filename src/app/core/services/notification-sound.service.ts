import { Injectable } from '@angular/core';

const MUTE_KEY = 'hms_notification_mute';
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

  private playTone(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.04;
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
