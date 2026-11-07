import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { BackendService } from '../../../core/services/backend.service';
import { AuthService } from '../../../core/services/auth.service';
import { PackageReminderService } from '../../../core/services/package-reminder.service';
import { HospitalNotificationService, HospitalNotificationItem } from '../../../core/services/hospital-notification.service';
import { NotificationSoundService } from '../../../core/services/notification-sound.service';
import { resolveAssetUrl } from '../../../core/utils/asset.util';
import {
  groupNotificationsByDay,
  NotificationDayGroup,
} from '../../../core/services/notification-day-groups.util';
import { User } from '../../../shared/models/hospital.model';
import { readStoredPermissions, resolveDefaultRoute } from '../../auth/access-control';
import { isPharmacyModuleEnabled } from '../../auth/hospital-modules';
import { isCurrentLaboratoryEdition } from '../../auth/product-edition';
import { GlobalSearchComponent } from './global-search.component';

@Component({
  selector: 'app-header',
  imports: [CommonModule, NgIf, NgFor, NgClass, RouterLink, GlobalSearchComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  isFullScreen!: boolean;
  drawerOpen = false;
  profileMenuOpen = false;
  unreadCount = 0;
  notificationItems: HospitalNotificationItem[] = [];
  notificationGroups: NotificationDayGroup[] = [];
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
    public notificationSound: NotificationSoundService,
    public packageReminders: PackageReminderService
  ) {}

  ngOnInit(): void {
    if (this.notifications.canSeeNotifications()) {
      this.notifications.startPolling();
      this.notifications.items$.subscribe((items) => {
        this.notificationItems = items.slice(0, 20);
        this.notificationGroups = groupNotificationsByDay(this.notificationItems);
      });
      this.notifications.unreadCount$.subscribe((count) => (this.unreadCount = count));
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

  toggleNotificationDrawer(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      void this.router.navigate(['/notifications']);
      return;
    }
    this.closeProfileMenu();
    this.drawerOpen = !this.drawerOpen;
  }

  closeNotificationDrawer(): void {
    this.drawerOpen = false;
  }

  openNotification(item: HospitalNotificationItem): void {
    if (!item.isRead) {
      this.notifications.markReadLocal(item._id);
      void this.notifications.markRead(item._id).subscribe();
    }
    if (item.actionRoute) {
      void this.router.navigateByUrl(item.actionRoute);
    }
    this.drawerOpen = false;
  }

  markAllRead(): void {
    if (!this.unreadCount) return;
    this.notifications.markAllReadLocal();
    void this.notifications.markAllRead().subscribe();
  }

  toggleMute(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.notificationSound.toggleMute();
  }

  get canOpenPos(): boolean {
    if (isCurrentLaboratoryEdition() || !isPharmacyModuleEnabled()) {
      return false;
    }
    return this.posPermissions.every((permission) => this.backend.hasPermission(permission));
  }

  get currentUser(): User | null {
    return (this.authService.currentUser() as User | null) || this.getStoredUser();
  }

  get displayName(): string {
    return String(this.currentUser?.name || this.currentUser?.email || 'User').trim();
  }

  get emailAddress(): string {
    return String(this.currentUser?.email || '').trim();
  }

  get roleLabel(): string {
    return String(this.currentUser?.role?.name || localStorage.getItem('role') || 'Staff').trim();
  }

  get photoUrl(): string {
    return resolveAssetUrl(this.currentUser?.photoUrl);
  }

  get initials(): string {
    const words = this.displayName.split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('') || 'U';
  }

  toggleProfileMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.drawerOpen = false;
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  closeProfileMenu(): void {
    this.profileMenuOpen = false;
  }

  openProfileSettings(): void {
    this.closeProfileMenu();
    void this.router.navigate(['/settings'], { queryParams: { tab: 'profile' } });
  }

  openPasswordSettings(): void {
    this.closeProfileMenu();
    void this.router.navigate(['/change-password']);
  }

  @HostListener('document:click')
  closeProfileMenuOnOutsideClick(): void {
    this.closeProfileMenu();
  }

  @HostListener('document:keydown.escape')
  closeProfileMenuOnEscape(): void {
    this.closeProfileMenu();
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
    this.closeProfileMenu();
    this.authService.logout();
  }
}
