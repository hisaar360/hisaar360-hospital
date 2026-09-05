import {
  AfterViewInit,
  Component,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  Router,
  RouterOutlet,
  NavigationEnd,
  NavigationStart,
  ActivatedRoute,
} from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AppDialogComponent } from './shared/components/app-dialog/app-dialog.component';
import { HmsDocumentPreviewComponent } from './shared/components/hms-document-preview/hms-document-preview.component';
import { PyramidLoaderComponent } from './shared/components/pyramid-loader/pyramid-loader.component';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, AppDialogComponent, HmsDocumentPreviewComponent, PyramidLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'Hisaar360 Hospital Management System';
  overLay = false;
  private observer: MutationObserver | null = null;
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private titleService = inject(Title);
  private loadingService = inject(LoadingService);
  private zone = inject(NgZone);

  ngOnInit(): void {
    document.body.classList.remove('catalog-modal-open', 'offcanvas-active', 'overflow-hidden');
    document.body.style.overflow = '';
    this.forceCloseOverlay();

    sessionStorage.setItem('Sidebar', 'light_active');
    sessionStorage.setItem('GradientColor', 'gradient');

    this.router.events
      .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe(() => {
        // Stuck full-screen loader / mobile overlay both block route rendering & clicks.
        this.loadingService.reset();
        this.forceCloseOverlay();
      });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.forceCloseOverlay();
        const rt = this.getChild(this.activatedRoute);
        rt.data.subscribe((data: { title?: string }) => {
          if (data?.title) {
            this.titleService.setTitle(data.title);
          }
        });
      });
  }

  ngAfterViewInit(): void {
    this.syncOverlayFromBody();

    // ONLY watch body class — never subtree. Chart/SVG class churn was freezing the app.
    this.observer = new MutationObserver(() => {
      this.zone.run(() => this.syncOverlayFromBody());
    });
    this.observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: false,
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private syncOverlayFromBody(): void {
    const next = document.body.classList.contains('offcanvas-active');
    if (this.overLay !== next) {
      this.overLay = next;
    }
  }

  private forceCloseOverlay(): void {
    document.body.classList.remove('offcanvas-active');
    document.getElementById('rightbar')?.classList.remove('open');
    document.querySelector('.overlay')?.classList.remove('open');
    if (this.overLay) {
      this.overLay = false;
    }
  }

  private getChild(activatedRoute: ActivatedRoute): ActivatedRoute {
    return activatedRoute.firstChild
      ? this.getChild(activatedRoute.firstChild)
      : activatedRoute;
  }

  closeMenu(): void {
    this.forceCloseOverlay();
  }

  @HostListener('document:click', ['$event'])
  focusFormGroupControlFromLabel(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    // Never interfere with native / programmatic file pickers.
    if (
      target?.closest(
        'input[type="file"], button.birth-upload__pick-btn, .birth-upload__picker, .profile-photo-field'
      )
    ) {
      return;
    }

    const label = target?.closest('label');
    if (!label) {
      return;
    }

    if (label.htmlFor || label.querySelector('input, textarea, select')) {
      return;
    }

    const formGroup = label.closest('.form-group');
    if (!formGroup) {
      return;
    }

    const control = formGroup.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]):not([type="file"]), textarea:not([disabled]), select:not([disabled])'
    );

    if (!control) {
      return;
    }

    control.focus();
  }
}
