import { AfterViewInit, Component, HostListener, OnInit, inject } from '@angular/core';
import {
  Router,
  RouterOutlet,
  NavigationEnd,
  ActivatedRoute,
} from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AppDialogComponent } from './shared/components/app-dialog/app-dialog.component';
import { HmsDocumentPreviewComponent } from './shared/components/hms-document-preview/hms-document-preview.component';
import { PyramidLoaderComponent } from './shared/components/pyramid-loader/pyramid-loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, AppDialogComponent, HmsDocumentPreviewComponent, PyramidLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'Hisaar360 Hospital Management System';
  overLay:boolean = false
  private observer!: MutationObserver;
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private titleService = inject(Title);

  ngOnInit(): void {
    document.body.classList.remove('catalog-modal-open');
    document.body.style.overflow = '';

    sessionStorage.setItem('Sidebar', 'light_active');
    sessionStorage.setItem('GradientColor', 'gradient');

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd
        )
      )
      .subscribe(() => {
        const rt = this.getChild(this.activatedRoute);
        rt.data.subscribe((data: any) => {
          if (data && data.title) {
            this.titleService.setTitle(data.title);
          }
        });
      });

  }

  ngAfterViewInit(): void {
    this.checkOverlayState();

    // Create a MutationObserver to watch for changes in the DOM
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          this.checkOverlayState();
        }
      });
    });

    // Start observing the document body for attribute changes
    this.observer.observe(document.body, {
      attributes: true, // Watch for attribute changes
      subtree: true    // Watch all descendants as well
    });
  }

  private checkOverlayState(): void {
    const getClass = document.querySelector('.offcanvas-active');
    this.overLay = document.body.contains(getClass);
  }


  private getChild(activatedRoute: ActivatedRoute): ActivatedRoute {
    return activatedRoute.firstChild
      ? this.getChild(activatedRoute.firstChild)
      : activatedRoute;
  }

  closeMenu(): void {
    document.getElementById('rightbar')?.classList.remove('open');
    document.querySelector('.overlay')?.classList.remove('open');
    document.body.classList.remove('offcanvas-active');
  }

  @HostListener('document:click', ['$event'])
  focusFormGroupControlFromLabel(event: MouseEvent): void {
    const label = (event.target as HTMLElement | null)?.closest('label');
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
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
    );

    if (!control) {
      return;
    }

    control.focus();
  }
}
