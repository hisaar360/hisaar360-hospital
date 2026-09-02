import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { HospitalNotificationItem, HospitalNotificationService } from '../../../core/services/hospital-notification.service';
import { NotificationSoundService } from '../../../core/services/notification-sound.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent implements OnInit {
  private notifications = inject(HospitalNotificationService);
  private router = inject(Router);
  sound = inject(NotificationSoundService);

  loading = false;
  filter: 'all' | 'unread' = 'all';
  items: HospitalNotificationItem[] = [];
  unreadCount = 0;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.notifications
      .fetchAll(this.filter === 'unread')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(({ items, unreadCount }) => {
        this.items = items;
        this.unreadCount = unreadCount;
      });
  }

  setFilter(filter: 'all' | 'unread'): void {
    this.filter = filter;
    this.load();
  }

  openNotification(item: HospitalNotificationItem): void {
    if (!item.isRead) {
      this.notifications.markReadLocal(item._id);
      void this.notifications.markRead(item._id).subscribe();
    }
    if (item.actionRoute) {
      void this.router.navigateByUrl(item.actionRoute);
    }
  }

  markAllRead(): void {
    if (!this.unreadCount) return;
    this.notifications.markAllReadLocal();
    void this.notifications.markAllRead().subscribe(() => this.load());
  }

  toggleMute(): void {
    this.sound.toggleMute();
  }
}
