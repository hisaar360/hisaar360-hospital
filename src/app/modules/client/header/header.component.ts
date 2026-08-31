import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BackendService } from '../../../core/services/backend.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/hospital.model';
import { readStoredPermissions, resolveDefaultRoute } from '../../auth/access-control';
import { isPharmacyModuleEnabled } from '../../auth/hospital-modules';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  isFullScreen!: boolean;
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
    private authService: AuthService
  ) {}

  mToggoleMenu() {
    document
      .getElementsByTagName('body')[0]
      .classList.toggle('offcanvas-active');
    document.getElementsByClassName('overlay')[0].classList.toggle('open');
  }

  openfullScreen() {
    let elem = document.documentElement;
    let methodToBeInvoked =
      elem.requestFullscreen ||
      elem.requestFullscreen ||
      (elem as any['mozRequestFullscreen']) ||
      (elem as any['msRequestFullscreen']);
    if (methodToBeInvoked) {
      methodToBeInvoked.call(elem);
    }
    this.isFullScreen = true;
  }

  closeFullScreen() {
    const docWithBrowsersExitFunctions = document as Document & {
      mozCancelFullScreen(): Promise<void>;
      webkitExitFullscreen(): Promise<void>;
      msExitFullscreen(): Promise<void>;
    };
    if (docWithBrowsersExitFunctions.exitFullscreen) {
      docWithBrowsersExitFunctions.exitFullscreen();
    } else if (docWithBrowsersExitFunctions.mozCancelFullScreen) {
      /* Firefox */
      docWithBrowsersExitFunctions.mozCancelFullScreen();
    } else if (docWithBrowsersExitFunctions.webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      docWithBrowsersExitFunctions.webkitExitFullscreen();
    } else if (docWithBrowsersExitFunctions.msExitFullscreen) {
      /* IE/Edge */
      docWithBrowsersExitFunctions.msExitFullscreen();
    }
    this.isFullScreen = false;
  }

  get canOpenPos(): boolean {
    if (!isPharmacyModuleEnabled()) {
      return false;
    }

    return this.posPermissions.every((permission) => this.backend.hasPermission(permission));
  }

  openPos(): void {
    if (!this.canOpenPos) {
      return;
    }

    const currentUser = this.getStoredUser();
    const queryParams: Record<string, string> = {};

    if (currentUser?.storeId) {
      queryParams['storeId'] = currentUser.storeId;
    }

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
