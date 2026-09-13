import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter, map, shareReplay, startWith } from 'rxjs';
import { LeftmenuComponent } from '../modules/client/leftmenu/leftmenu.component';
import { HeaderComponent } from '../modules/client/header/header.component';

const PRODUCT_HELP_OFFER_STORAGE = 'hms-product-help-offer-seen';
const PRODUCT_TOUR_STORAGE = 'hms-product-shell-tutorial-seen';

type ProductTourStep = {
  target: string;
  title: string;
  text: string;
  place?: 'above' | 'below';
};

const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  {
    target: 'shell-brand',
    title: 'Your hospital workspace',
    text: 'This sidebar is your home base. Menus only show modules enabled for your hospital and role.',
    place: 'below',
  },
  {
    target: 'shell-dashboard',
    title: 'Dashboard',
    text: 'Start here for a quick overview of today’s activity for your role.',
    place: 'below',
  },
  {
    target: 'shell-patients',
    title: 'Patients',
    text: 'Register patients, open profiles, and jump to invoices from this menu.',
    place: 'below',
  },
  {
    target: 'shell-ward',
    title: 'Ward & Nursing',
    text: 'Admit patients, manage beds, and open the inpatient chart (MAR, vitals, drips) from Patients.',
    place: 'below',
  },
  {
    target: 'shell-pharmacy',
    title: 'Pharmacy',
    text: 'Catalog, inventory, sales, and Pharmacy POS live under Pharmacy when that module is enabled.',
    place: 'below',
  },
  {
    target: 'shell-laboratory',
    title: 'Laboratory',
    text: 'Create lab orders and review reports from Laboratory when Lab is enabled.',
    place: 'below',
  },
  {
    target: 'shell-doctors',
    title: 'Doctors',
    text: 'Browse doctors and schedules. Appointment reception often starts from here or Appointment.',
    place: 'below',
  },
  {
    target: 'shell-search',
    title: 'Global search',
    text: 'Search patients and common records from the top bar without leaving the page.',
    place: 'below',
  },
  {
    target: 'shell-notifications',
    title: 'Notifications',
    text: 'Bell alerts surface important hospital updates. Open the drawer anytime to catch up.',
    place: 'below',
  },
  {
    target: 'shell-help',
    title: 'Help Center',
    text: 'Step-by-step guides and module tutorials live here. Some screens also have their own interactive tours (POS, Duty Roster, Bulk Import).',
    place: 'above',
  },
];

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet, LeftmenuComponent, HeaderComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly routerSubscription: Subscription;

  showProductHelpOffer = false;
  tutorialActive = false;
  tutorialStep = 0;
  activeTourSteps: ProductTourStep[] = PRODUCT_TOUR_STEPS;
  tutorialRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null = null;
  tutorialCardStyle: Record<string, string> = {};

  readonly hideShell$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.router.url.startsWith('/pharmacy/pos')),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor() {
    this.syncPosRouteClass(this.router.url);
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncPosRouteClass(event.urlAfterRedirects);
        this.maybeStartTourFromQuery(event.urlAfterRedirects);
      });
  }

  ngOnInit(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const hasUser = Boolean(localStorage.getItem('user'));
    const alreadySeen = Boolean(localStorage.getItem(PRODUCT_HELP_OFFER_STORAGE));
    const onPos = this.router.url.startsWith('/pharmacy/pos');
    if (hasUser && !alreadySeen && !onPos) {
      this.showProductHelpOffer = true;
    }
    this.maybeStartTourFromQuery(this.router.url);
  }

  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
    document.body.classList.remove('pos-route-active', 'overflow-hidden');
    document.documentElement.classList.remove('pos-route-active');
    this.clearTutorialLayout();
  }

  get activeTutorialStep(): ProductTourStep | null {
    return this.activeTourSteps[this.tutorialStep] || null;
  }

  get tutorialProgressLabel(): string {
    return `Step ${this.tutorialStep + 1} of ${this.activeTourSteps.length}`;
  }

  startProductTutorial(): void {
    this.dismissProductHelpOffer();
    if (this.router.url.startsWith('/pharmacy/pos')) {
      return;
    }
    this.startShellTour();
  }

  dismissProductHelpOffer(): void {
    this.showProductHelpOffer = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PRODUCT_HELP_OFFER_STORAGE, '1');
    }
  }

  skipTutorial(): void {
    this.finishTutorial(true);
  }

  nextTutorial(): void {
    if (this.tutorialStep >= this.activeTourSteps.length - 1) {
      this.finishTutorial(true);
      return;
    }
    this.tutorialStep += 1;
    this.positionTutorial();
  }

  prevTutorial(): void {
    if (this.tutorialStep <= 0) return;
    this.tutorialStep -= 1;
    this.positionTutorial();
  }

  finishTutorial(markSeen: boolean): void {
    this.tutorialActive = false;
    this.clearTutorialLayout();
    if (markSeen && typeof localStorage !== 'undefined') {
      localStorage.setItem(PRODUCT_TOUR_STORAGE, '1');
      localStorage.setItem(PRODUCT_HELP_OFFER_STORAGE, '1');
    }
  }

  @HostListener('window:resize')
  handleWindowResize(): void {
    if (this.tutorialActive) this.positionTutorial();
  }

  private startShellTour(): void {
    this.showProductHelpOffer = false;
    this.activeTourSteps = PRODUCT_TOUR_STEPS.filter((step) =>
      Boolean(document.querySelector(`[data-tour="${step.target}"]`)),
    );
    if (!this.activeTourSteps.length) {
      this.activeTourSteps = PRODUCT_TOUR_STEPS.slice(0, 1);
    }
    this.tutorialActive = true;
    this.tutorialStep = 0;
    setTimeout(() => this.positionTutorial(), 50);
  }

  private maybeStartTourFromQuery(url: string): void {
    if (this.tutorialActive || url.startsWith('/pharmacy/pos')) {
      return;
    }
    const tutorialParam = this.router.parseUrl(url).queryParamMap.get('tutorial');
    if (tutorialParam !== '1') {
      return;
    }
    // Clear flag so refresh / back doesn't restart forever.
    void this.router.navigate([], {
      queryParams: { tutorial: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.dismissProductHelpOffer();
    setTimeout(() => this.startShellTour(), 200);
  }

  private positionTutorial(): void {
    const step = this.activeTourSteps[this.tutorialStep];
    if (!step || typeof document === 'undefined') {
      this.clearTutorialLayout();
      return;
    }

    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-tour="${step.target}"]`,
      ) as HTMLElement | null;
      if (!el) {
        this.tutorialRect = null;
        this.tutorialCardStyle = {
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(360px, calc(100vw - 24px))',
        };
        return;
      }

      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const rect = el.getBoundingClientRect();
      this.tutorialRect = {
        top: rect.top - 4,
        left: rect.left - 4,
        width: Math.max(rect.width + 8, 40),
        height: Math.max(rect.height + 8, 40),
      };

      const placeBelow =
        step.place === 'below' ||
        (step.place !== 'above' && rect.top < window.innerHeight / 2);
      const cardTop = placeBelow
        ? Math.min(rect.bottom + 12, window.innerHeight - 200)
        : Math.max(12, rect.top - 180);
      const cardLeft = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - 372,
      );
      this.tutorialCardStyle = {
        top: `${cardTop}px`,
        left: `${cardLeft}px`,
        width: 'min(360px, calc(100vw - 24px))',
        transform: 'none',
      };
    });
  }

  private clearTutorialLayout(): void {
    this.tutorialRect = null;
    this.tutorialCardStyle = {};
  }

  private syncPosRouteClass(url: string): void {
    const posRouteActive = url.startsWith('/pharmacy/pos');
    document.documentElement.classList.toggle('pos-route-active', posRouteActive);
    document.body.classList.toggle('pos-route-active', posRouteActive);
    document.body.classList.toggle('overflow-hidden', posRouteActive);
  }
}
