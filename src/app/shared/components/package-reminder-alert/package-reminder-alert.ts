import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { PackageReminderService } from '../../../core/services/package-reminder.service';

@Component({
  selector: 'app-package-reminder-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (reminders.activeReminder(); as row) {
      <div class="package-reminder-overlay" role="presentation" (click)="reminders.dismiss()">
        <aside
          class="package-reminder-modal"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="package-reminder-title"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            class="package-reminder-modal__close"
            aria-label="Close"
            (click)="reminders.dismiss()"
          >
            <i class="fa fa-times" aria-hidden="true"></i>
          </button>

          <div class="package-reminder-modal__hero" aria-hidden="true">
            <div class="package-reminder-modal__hero-glow"></div>
            <div class="package-reminder-modal__art">
              <div class="package-reminder-modal__calendar">
                <span class="package-reminder-modal__calendar-top"></span>
                <span class="package-reminder-modal__calendar-grid"></span>
              </div>
              <div class="package-reminder-modal__bell">
                <i class="fa fa-bell"></i>
              </div>
            </div>
          </div>

          <div class="package-reminder-modal__content">
            <h2 id="package-reminder-title">Subscription Renewal Notice</h2>
            <p>{{ row.message }}</p>

            @if (reminders.packageExpiryLabel() || expiryLabel(row.expiryDate); as dateLabel) {
              <div
                class="package-reminder-modal__expiry"
                [class.is-expired]="reminders.isPackageExpired()"
              >
                <span class="package-reminder-modal__expiry-icon" aria-hidden="true">
                  <i class="fa fa-calendar"></i>
                </span>
                <span class="package-reminder-modal__expiry-copy">
                  <small>Expiry Date</small>
                  <strong>{{ dateLabel }}</strong>
                </span>
              </div>
            }

            <button type="button" class="package-reminder-modal__done" (click)="reminders.dismiss()">
              <span class="package-reminder-modal__done-check" aria-hidden="true">
                <i class="fa fa-check"></i>
              </span>
              Acknowledge
            </button>
          </div>
        </aside>
      </div>
    }
  `,
  styles: [
    `
      .package-reminder-overlay {
        position: fixed;
        inset: 0;
        z-index: 1300;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgb(0 62 134 / 0.42);
        backdrop-filter: blur(2px);
        animation: package-reminder-fade 180ms ease;
      }

      .package-reminder-modal {
        position: relative;
        width: min(420px, calc(100vw - 1.5rem));
        overflow: hidden;
        border-radius: 1.35rem;
        background: #fff;
        box-shadow: 0 28px 70px rgb(0 62 134 / 0.28);
        animation: package-reminder-pop 220ms ease;
      }

      @keyframes package-reminder-fade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes package-reminder-pop {
        from {
          opacity: 0;
          transform: translateY(14px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .package-reminder-modal__close {
        position: absolute;
        top: 0.85rem;
        right: 0.85rem;
        z-index: 2;
        display: grid;
        width: 32px;
        height: 32px;
        place-items: center;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        background: #fff;
        color: #64748b;
        cursor: pointer;
        box-shadow: 0 4px 12px rgb(15 23 42 / 0.08);
      }

      .package-reminder-modal__hero {
        position: relative;
        display: grid;
        place-items: center;
        min-height: 168px;
        padding: 1.6rem 1rem 0.75rem;
        background:
          radial-gradient(circle at 50% 20%, rgb(1 156 157 / 0.18), transparent 55%),
          linear-gradient(180deg, #e6f7f7 0%, #f3fafb 70%, #fff 100%);
      }

      .package-reminder-modal__hero-glow {
        position: absolute;
        inset: auto 12% 18% 12%;
        height: 42px;
        border-radius: 999px;
        background: rgb(1 156 157 / 0.14);
        filter: blur(10px);
      }

      .package-reminder-modal__art {
        position: relative;
        width: 112px;
        height: 112px;
      }

      .package-reminder-modal__calendar {
        position: absolute;
        left: 10px;
        bottom: 8px;
        width: 78px;
        height: 78px;
        border-radius: 16px;
        background: linear-gradient(160deg, #02b3b4, #019c9d 55%, #018789);
        box-shadow: 0 16px 28px rgb(1 156 157 / 0.35);
        overflow: hidden;
      }

      .package-reminder-modal__calendar-top {
        display: block;
        height: 18px;
        background: rgb(255 255 255 / 0.22);
      }

      .package-reminder-modal__calendar-grid {
        display: block;
        margin: 12px auto 0;
        width: 42px;
        height: 34px;
        border-radius: 6px;
        background:
          linear-gradient(#fff 0 0) 0 0 / 100% 2px,
          linear-gradient(#fff 0 0) 0 50% / 100% 2px,
          linear-gradient(#fff 0 0) 0 100% / 100% 2px,
          linear-gradient(#fff 0 0) 0 0 / 2px 100%,
          linear-gradient(#fff 0 0) 50% 0 / 2px 100%,
          linear-gradient(#fff 0 0) 100% 0 / 2px 100%;
        background-repeat: no-repeat;
        opacity: 0.9;
      }

      .package-reminder-modal__bell {
        position: absolute;
        right: 4px;
        top: 10px;
        display: grid;
        width: 46px;
        height: 46px;
        place-items: center;
        border-radius: 999px;
        background: linear-gradient(160deg, #1a5fad, #003e86);
        color: #fff;
        font-size: 1.15rem;
        box-shadow: 0 12px 22px rgb(0 62 134 / 0.4);
        animation: package-reminder-ring 1.8s ease-in-out infinite;
      }

      @keyframes package-reminder-ring {
        0%,
        100% {
          transform: rotate(0deg);
        }
        15% {
          transform: rotate(12deg);
        }
        30% {
          transform: rotate(-10deg);
        }
        45% {
          transform: rotate(6deg);
        }
        60% {
          transform: rotate(0deg);
        }
      }

      .package-reminder-modal__content {
        display: grid;
        gap: 0.85rem;
        padding: 0.35rem 1.35rem 1.35rem;
        text-align: center;
      }

      .package-reminder-modal__content h2 {
        margin: 0;
        color: #003e86;
        font-size: 1.35rem;
        font-weight: 800;
        letter-spacing: -0.02em;
      }

      .package-reminder-modal__content > p {
        margin: 0;
        color: #64748b;
        font-size: 0.92rem;
        line-height: 1.5;
        white-space: pre-wrap;
      }

      .package-reminder-modal__expiry {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-height: 58px;
        padding: 0.7rem 0.9rem;
        border: 1px solid rgb(1 156 157 / 0.2);
        border-radius: 0.95rem;
        background: #e6f7f7;
        text-align: left;
      }

      .package-reminder-modal__expiry-icon {
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border-radius: 0.75rem;
        background: #fff;
        color: #018789;
        box-shadow: 0 4px 10px rgb(15 23 42 / 0.06);
      }

      .package-reminder-modal__expiry-copy {
        display: grid;
        gap: 0.1rem;
        min-width: 0;
      }

      .package-reminder-modal__expiry-copy small {
        color: #64748b;
        font-size: 0.72rem;
        font-weight: 600;
      }

      .package-reminder-modal__expiry-copy strong {
        color: #018789;
        font-size: 1rem;
        font-weight: 800;
      }

      .package-reminder-modal__expiry.is-expired {
        border-color: rgb(220 38 38 / 0.22);
        background: #fef2f2;
      }

      .package-reminder-modal__expiry.is-expired .package-reminder-modal__expiry-icon,
      .package-reminder-modal__expiry.is-expired .package-reminder-modal__expiry-copy strong {
        color: #dc2626;
      }

      .package-reminder-modal__done {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.55rem;
        width: 100%;
        min-height: 48px;
        margin-top: 0.15rem;
        border: 0;
        border-radius: 0.95rem;
        background: linear-gradient(180deg, #02b3b4, #019c9d);
        color: #fff;
        font: inherit;
        font-size: 0.95rem;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 12px 24px rgb(1 156 157 / 0.28);
      }

      .package-reminder-modal__done:hover {
        filter: brightness(1.04);
      }

      .package-reminder-modal__done-check {
        display: grid;
        width: 22px;
        height: 22px;
        place-items: center;
        border-radius: 999px;
        background: rgb(255 255 255 / 0.2);
        font-size: 0.7rem;
      }
    `,
  ],
})
export class PackageReminderAlertComponent {
  readonly reminders = inject(PackageReminderService);

  expiryLabel(value: string | null | undefined): string {
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
  }
}
