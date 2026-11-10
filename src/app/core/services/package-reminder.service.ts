import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, map, of } from 'rxjs';

import { CONFIG } from '../../../../config';

export interface PackageReminderPayload {
  reminderId: string;
  message: string;
  expiryDate: string | null;
  sentAt?: string | null;
  sentByName?: string;
}

export interface PackageReminderEnvelope {
  reminder: PackageReminderPayload | null;
  expiryDate: string | null;
  subscriptionStatus?: string | null;
}

interface ApiSuccess<T> {
  success?: boolean;
  data?: T;
}

const RENEWAL_WINDOW_DAYS = 15;
const LOCAL_REMINDER_PREFIX = 'local-renewal-';

@Injectable({ providedIn: 'root' })
export class PackageReminderService {
  private readonly http = inject(HttpClient);

  readonly activeReminder = signal<PackageReminderPayload | null>(null);
  readonly packageExpiryDate = signal<string | null>(null);
  readonly subscriptionStatus = signal<string | null>(null);
  private loaded = false;

  readonly packageExpiryLabel = computed(() => {
    const value = this.packageExpiryDate();
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  });

  readonly isPackageExpired = computed(() => {
    const status = String(this.subscriptionStatus() || '').toLowerCase();
    if (status === 'expired' || status === 'cancelled' || status === 'suspended') {
      return true;
    }
    const value = this.packageExpiryDate();
    if (!value) {
      return false;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }
    const end = new Date(parsed);
    end.setHours(23, 59, 59, 999);
    return end.getTime() < Date.now();
  });

  refresh(force = false): void {
    if (this.loaded && !force) {
      return;
    }
    this.loaded = true;

    this.http
      .get<ApiSuccess<PackageReminderEnvelope | PackageReminderPayload | null>>(
        CONFIG.packageReminders.active,
      )
      .pipe(
        map((response) => response?.data ?? null),
        catchError(() => of(null)),
      )
      .subscribe((payload) => {
        this.applyPayload(payload, { keepExpiryOnEmpty: true });
        this.ensureLocalRenewalReminder();
      });
  }

  dismiss(): void {
    const current = this.activeReminder();
    if (!current?.reminderId) {
      this.activeReminder.set(null);
      return;
    }

    this.markLocalDismissed(current);
    this.activeReminder.set(null);

    if (current.reminderId.startsWith(LOCAL_REMINDER_PREFIX)) {
      return;
    }

    this.http
      .post(CONFIG.packageReminders.dismiss(current.reminderId), {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  clear(): void {
    this.activeReminder.set(null);
    this.packageExpiryDate.set(null);
    this.subscriptionStatus.set(null);
    this.loaded = false;
  }

  private applyPayload(
    payload: PackageReminderEnvelope | PackageReminderPayload | null,
    options?: { keepExpiryOnEmpty?: boolean },
  ): void {
    if (!payload) {
      this.activeReminder.set(null);
      if (!options?.keepExpiryOnEmpty) {
        this.packageExpiryDate.set(null);
        this.subscriptionStatus.set(null);
      }
      return;
    }

    const envelope = payload as PackageReminderEnvelope;
    if (envelope.reminder !== undefined || envelope.expiryDate !== undefined) {
      const reminder = envelope.reminder;
      this.activeReminder.set(
        reminder?.reminderId && reminder.message ? reminder : null,
      );
      const nextExpiry = envelope.expiryDate || reminder?.expiryDate || null;
      if (nextExpiry) {
        this.packageExpiryDate.set(nextExpiry);
      } else if (!options?.keepExpiryOnEmpty) {
        this.packageExpiryDate.set(null);
      }
      if (envelope.subscriptionStatus) {
        this.subscriptionStatus.set(envelope.subscriptionStatus);
      } else if (!options?.keepExpiryOnEmpty) {
        this.subscriptionStatus.set(null);
      }
      return;
    }

    const legacy = payload as PackageReminderPayload;
    if (legacy.reminderId && legacy.message) {
      this.activeReminder.set(legacy);
      if (legacy.expiryDate) {
        this.packageExpiryDate.set(legacy.expiryDate);
      } else if (!options?.keepExpiryOnEmpty) {
        this.packageExpiryDate.set(null);
      }
      return;
    }

    this.activeReminder.set(null);
    if (!options?.keepExpiryOnEmpty) {
      this.packageExpiryDate.set(null);
      this.subscriptionStatus.set(null);
    }
  }

  /**
   * From 15 days before expiry through expiry day, surface a professional
   * renewal notice when Central has not already sent a reminder.
   */
  private ensureLocalRenewalReminder(): void {
    if (this.activeReminder()) {
      return;
    }

    const expiry = this.packageExpiryDate();
    if (!expiry) {
      return;
    }

    const parsed = new Date(expiry);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }

    const end = new Date(parsed);
    end.setHours(23, 59, 59, 999);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((end.getTime() - Date.now()) / msPerDay);

    if (daysLeft > RENEWAL_WINDOW_DAYS) {
      return;
    }

    const dayKey = this.calendarDayKey(end);
    const reminderId = `${LOCAL_REMINDER_PREFIX}${dayKey}`;
    if (this.wasLocalDismissedToday(reminderId)) {
      return;
    }

    const dateLabel = end.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    this.activeReminder.set({
      reminderId,
      expiryDate: expiry,
      message: this.buildRenewalMessage(daysLeft, dateLabel),
      sentAt: new Date().toISOString(),
      sentByName: 'Hisaar360',
    });
  }

  private buildRenewalMessage(daysLeft: number, dateLabel: string): string {
    if (daysLeft < 0) {
      return (
        `Your Hisaar360 subscription package expired on ${dateLabel}. ` +
        `Please renew promptly to restore uninterrupted access to hospital operations and avoid any service disruption.`
      );
    }
    if (daysLeft === 0) {
      return (
        `Your Hisaar360 subscription package expires today (${dateLabel}). ` +
        `Please renew now to maintain uninterrupted access for your hospital team.`
      );
    }
    if (daysLeft === 1) {
      return (
        `Your Hisaar360 subscription package expires tomorrow (${dateLabel}). ` +
        `Kindly renew today to ensure continuous, uninterrupted service.`
      );
    }
    if (daysLeft <= 7) {
      return (
        `Important: Your Hisaar360 subscription package will expire in ${daysLeft} days, on ${dateLabel}. ` +
        `Please renew at your earliest convenience to avoid any interruption to hospital services.`
      );
    }
    return (
      `Your Hisaar360 subscription package is approaching renewal. ` +
      `It will expire in ${daysLeft} days, on ${dateLabel}. ` +
      `We recommend renewing in advance so your hospital operations continue without interruption.`
    );
  }

  private calendarDayKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private dismissStorageKey(reminderId: string): string {
    const today = this.calendarDayKey(new Date());
    return `hms.packageReminder.dismissed.${reminderId}.${today}`;
  }

  private wasLocalDismissedToday(reminderId: string): boolean {
    try {
      return sessionStorage.getItem(this.dismissStorageKey(reminderId)) === '1';
    } catch {
      return false;
    }
  }

  private markLocalDismissed(reminder: PackageReminderPayload): void {
    if (!reminder.reminderId.startsWith(LOCAL_REMINDER_PREFIX)) {
      return;
    }
    try {
      sessionStorage.setItem(this.dismissStorageKey(reminder.reminderId), '1');
    } catch {
      /* ignore quota / private mode */
    }
  }
}
