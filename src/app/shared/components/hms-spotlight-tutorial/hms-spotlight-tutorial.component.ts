import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  HmsSpotlightTutorialRect,
  HmsSpotlightTutorialStep,
} from './hms-spotlight-tutorial.models';

@Component({
  selector: 'app-hms-spotlight-tutorial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hms-spotlight-tutorial.component.html',
  styleUrl: './hms-spotlight-tutorial.component.scss',
})
export class HmsSpotlightTutorialComponent implements AfterViewInit, OnDestroy {
  /** Spotlight steps (data-tour targets on the host page). */
  @Input({ required: true }) steps: HmsSpotlightTutorialStep[] = [];
  /** localStorage key so first-visit offer only shows once. */
  @Input({ required: true }) storageKey = '';
  @Input() offerTitle = 'Take a quick tour?';
  @Input() offerText =
    'A short walkthrough of this screen. You can replay anytime from the Tutorial button.';
  /** When true, ?tutorial=1 starts the tour and clears the query param. */
  @Input() listenQueryParam = true;
  /** Delay before auto-start so the page can render anchors. */
  @Input() autoStartDelayMs = 350;

  tutorialActive = false;
  tutorialOffer = false;
  tutorialStep = 0;
  tutorialRect: HmsSpotlightTutorialRect | null = null;
  tutorialCardStyle: Record<string, string> = {};

  private autoStartTimer: ReturnType<typeof setTimeout> | null = null;
  private bootstrapped = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngAfterViewInit(): void {
    // AfterViewInit so @Input storageKey from the parent is reliably bound.
    this.bootstrapFromQueryOrOffer();
  }

  ngOnDestroy(): void {
    if (this.autoStartTimer) {
      clearTimeout(this.autoStartTimer);
      this.autoStartTimer = null;
    }
  }

  get activeStep(): HmsSpotlightTutorialStep | null {
    return this.steps[this.tutorialStep] || null;
  }

  get progressLabel(): string {
    return `Step ${this.tutorialStep + 1} of ${this.steps.length}`;
  }

  /** Call from a page “Tutorial” button — always allowed (replay). */
  start(): void {
    this.startTutorial();
  }

  startTutorial(): void {
    if (!this.steps.length) {
      return;
    }
    this.tutorialOffer = false;
    this.tutorialActive = true;
    this.tutorialStep = 0;
    // First-visit auto-offer should never return after the user engages.
    this.markSeen();
    this.positionTutorial();
  }

  dismissOffer(): void {
    this.tutorialOffer = false;
    this.markSeen();
  }

  skip(): void {
    this.finish(true);
  }

  next(): void {
    if (this.tutorialStep >= this.steps.length - 1) {
      this.finish(true);
      return;
    }
    this.tutorialStep += 1;
    this.positionTutorial();
  }

  prev(): void {
    if (this.tutorialStep <= 0) {
      return;
    }
    this.tutorialStep -= 1;
    this.positionTutorial();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.tutorialActive) {
      this.positionTutorial();
    }
  }

  private bootstrapFromQueryOrOffer(): void {
    if (this.bootstrapped) {
      return;
    }
    this.bootstrapped = true;

    if (this.listenQueryParam) {
      const tutorialRequested = this.route.snapshot.queryParamMap.get('tutorial') === '1';
      if (tutorialRequested) {
        this.tutorialOffer = false;
        this.markSeen();
        if (this.autoStartTimer) {
          clearTimeout(this.autoStartTimer);
        }
        this.autoStartTimer = setTimeout(() => this.startTutorial(), this.autoStartDelayMs);
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { tutorial: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return;
      }
    }

    // First visit only: show offer once, then persist so login / reopen never re-prompts.
    if (!this.hasSeen()) {
      this.tutorialOffer = true;
      this.markSeen();
    }
  }

  private finish(markSeen: boolean): void {
    this.tutorialActive = false;
    this.tutorialOffer = false;
    this.clearLayout();
    if (markSeen) {
      this.markSeen();
    }
  }

  private hasSeen(): boolean {
    return Boolean(
      typeof localStorage !== 'undefined' && this.storageKey && localStorage.getItem(this.storageKey)
    );
  }

  private markSeen(): void {
    if (typeof localStorage !== 'undefined' && this.storageKey) {
      localStorage.setItem(this.storageKey, '1');
    }
  }

  private positionTutorial(): void {
    const step = this.steps[this.tutorialStep];
    if (!step || typeof document === 'undefined') {
      this.clearLayout();
      return;
    }

    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
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
        step.place === 'below' || (step.place !== 'above' && rect.top < window.innerHeight / 2);
      const cardTop = placeBelow
        ? Math.min(rect.bottom + 12, window.innerHeight - 200)
        : Math.max(12, rect.top - 180);
      const cardLeft = Math.min(Math.max(12, rect.left), window.innerWidth - 372);
      this.tutorialCardStyle = {
        top: `${cardTop}px`,
        left: `${cardLeft}px`,
        width: 'min(360px, calc(100vw - 24px))',
        transform: 'none',
      };
    });
  }

  private clearLayout(): void {
    this.tutorialRect = null;
    this.tutorialCardStyle = {};
  }
}
