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
      });
  }

  dismiss(): void {
    const current = this.activeReminder();
    if (!current?.reminderId) {
      this.activeReminder.set(null);
      return;
    }

    this.activeReminder.set(null);
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
}
