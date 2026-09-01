import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { BackendService } from '../../../core/services/backend.service';
import { AuthService } from '../../../core/services/auth.service';
import { HospitalNotificationService, HospitalNotificationItem } from '../../../core/services/hospital-notification.service';
import { NotificationSoundService } from '../../../core/services/notification-sound.service';
import { User } from '../../../shared/models/hospital.model';
import { readStoredPermissions, resolveDefaultRoute } from '../../auth/access-control';

@Component({
  selector: 'app-header',
  imports: [CommonModule, NgIf, NgFor, NgClass, AsyncPipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  isFullScreen!: boolean;
  menuOpen = false;
  private readonly posPermissions = [
    'sales.create',
    'sales.read',
    'products.read',
    'register_sessions.open',
    'register_sessions.read',
    'register_sessions.close',
  ];

  constructor(
    private router: Router,
    private backend: BackendService,
    private authService: AuthService,
    public notifications: HospitalNotificationService,
    public notificationSound: NotificationSoundService
  ) {}

  ngOnInit(): void {
    if (this.notifications.canSeeNotifications()) {
      this.notifications.startPolling();
    }
  }

  openfullScreen() {
    const elem = document.documentElement;
    const methodToBeInvoked =
      elem.requestFullscreen ||
      (elem as HTMLElement & { mozRequestFullScreen?: () => void }).mozRequestFullScreen ||
      (elem as HTMLElement & { msRequestFullscreen?: () => void }).msRequestFullscreen;
    if (methodToBeInvoked) methodToBeInvoked.call(elem);
    this.isFullScreen = true;
  }

  closeFullScreen() {
    const doc = document as Document & {
      mozCancelFullScreen?: () => Promise<void>;
      webkitExitFullscreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    };
    if (doc.exitFullscreen) doc.exitFullscreen();
    else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    else if (doc.msExitFullscreen) doc.msExitFullscreen();
    this.isFullScreen = false;
  }

  mToggoleMenu() {
    document.getElementsByTagName('body')[0].classList.toggle('offcanvas-active');
    document.getElementsByClassName('overlay')[0].classList.toggle('open');
  }

  toggleNotificationMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  openNotification(item: HospitalNotificationItem): void {
    void this.notifications.markRead(item._id).subscribe();
    if (item.actionRoute) {
      void this.router.navigateByUrl(item.actionRoute);
    }
    this.menuOpen = false;
  }

  toggleMute(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.notificationSound.toggleMute();
  }

  get canOpenPos(): boolean {
    return this.posPermissions.every((permission) => this.backend.hasPermission(permission));
  }

  openPos(): void {
    if (!this.canOpenPos) return;
    const currentUser = this.getStoredUser();
    const queryParams: Record<string, string> = {};
    if (currentUser?.storeId) queryParams['storeId'] = currentUser.storeId;
    this.router.navigate(['/pharmacy/pos'], { queryParams });
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  goHome(): void {
    this.router.navigateByUrl(resolveDefaultRoute(readStoredPermissions()));
  }

  private getStoredUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
