import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { hasRouteAccess, readStoredPermissions } from '../../auth/access-control';
import { LoadingService } from '../../../core/services/loading.service';
import { HmsSpotlightTutorialComponent } from '../../../shared/components/hms-spotlight-tutorial/hms-spotlight-tutorial.component';
import { WardDataService } from './services/ward-data.service';
import {
  buildWardHomeSummaryTiles,
  EMPTY_WARD_HOME_SUMMARY,
  filterWardBedCards,
  groupWardBedCards,
  WardBedCard,
  WardBedGroup,
  WardHomeFilter,
  WardHomeSummary,
  WardHomeSummaryTile,
} from './ward-home.util';
import {
  WARD_HOME_TUTORIAL_STEPS,
  WARD_HOME_TUTORIAL_STORAGE,
} from './ward-tutorials.data';

@Component({
  selector: 'app-ward-home',
  imports: [CommonModule, RouterLink, HmsSpotlightTutorialComponent],
  templateUrl: './ward-home.component.html',
  styleUrl: './ward-home.component.scss',
})
export class WardHomeComponent implements OnInit {
  @ViewChild(HmsSpotlightTutorialComponent) tutorial?: HmsSpotlightTutorialComponent;

  summary: WardHomeSummary = EMPTY_WARD_HOME_SUMMARY;
  summaryLoading = false;
  summaryError = false;

  boardLoading = false;
  boardError = false;

  activeFilter: WardHomeFilter = 'all';
  myWard = '';

  private allCards: WardBedCard[] = [];
  groups: WardBedGroup[] = [];

  readonly filters: Array<{ key: WardHomeFilter; label: string }> = [
    { key: 'my-ward', label: 'My Ward' },
    { key: 'all', label: 'All' },
    { key: 'occupied', label: 'Occupied' },
    { key: 'available', label: 'Available' },
    { key: 'attention', label: 'Needs Attention' },
  ];

  readonly canAssignBed = hasRouteAccess(
    { any: ['room_allotments.create', 'ward.admissions.create'] },
    readStoredPermissions()
  );

  readonly skeletonRows = [1, 2, 3, 4, 5, 6];
  private pageLoaderActive = false;

  readonly tutorialSteps = WARD_HOME_TUTORIAL_STEPS;
  readonly tutorialStorageKey = WARD_HOME_TUTORIAL_STORAGE;

  constructor(
    private wardData: WardDataService,
    private router: Router,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.pageLoaderActive = true;
    this.loadingService.show({
      title: 'Loading Ward Home…',
      message: 'Fetching beds and care reminders',
    });
    this.loadSummary();
    this.loadBoard();
  }

  startTutorial(): void {
    this.tutorial?.start();
  }

  private maybeHidePageLoader(): void {
    if (!this.pageLoaderActive) {
      return;
    }
    if (this.summaryLoading || this.boardLoading) {
      return;
    }
    this.pageLoaderActive = false;
    this.loadingService.hide();
  }

  get summaryTiles(): WardHomeSummaryTile[] {
    return buildWardHomeSummaryTiles(this.summary);
  }

  get wardOptions(): string[] {
    return [...new Set(this.allCards.map((card) => card.wardName))].sort();
  }

  get visibleCardCount(): number {
    return this.groups.reduce((total, group) => total + group.cards.length, 0);
  }

  loadSummary(): void {
    this.summaryLoading = true;
    this.summaryError = false;
    this.wardData
      .loadWardHomeSummary()
      .pipe(
        finalize(() => {
          this.summaryLoading = false;
          this.maybeHidePageLoader();
        })
      )
      .subscribe({
        next: (summary) => (this.summary = summary),
        error: () => {
          this.summary = EMPTY_WARD_HOME_SUMMARY;
          this.summaryError = true;
        },
      });
  }

  loadBoard(): void {
    this.boardLoading = true;
    this.boardError = false;
    this.wardData
      .loadWardBedBoard()
      .pipe(
        finalize(() => {
          this.boardLoading = false;
          this.maybeHidePageLoader();
        })
      )
      .subscribe({
        next: (cards) => {
          this.allCards = cards;
          if (!this.myWard) {
            this.myWard = this.wardOptions[0] || '';
          }
          this.applyFilter();
        },
        error: () => {
          this.allCards = [];
          this.groups = [];
          this.boardError = true;
        },
      });
  }

  setFilter(filter: WardHomeFilter): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  openCard(card: WardBedCard): void {
    if (card.statusKey !== 'occupied' || !card.admissionId) {
      return;
    }
    this.router.navigate(['/ward/patient-detail', card.admissionId]);
  }

  openMissing(item: { admissionId?: string }): void {
    if (!item.admissionId) {
      return;
    }
    this.router.navigate(['/ward/patient-detail', item.admissionId], {
      queryParams: { tab: 'medicines' },
    });
  }

  emptyBoardMessage(): string {
    switch (this.activeFilter) {
      case 'available':
        return 'All beds occupied.';
      case 'occupied':
        return 'No occupied beds right now.';
      case 'attention':
        return 'Nothing needs attention right now.';
      case 'my-ward':
        return 'No beds in this ward yet.';
      default:
        return 'No beds configured yet.';
    }
  }

  private applyFilter(): void {
    this.groups = groupWardBedCards(filterWardBedCards(this.allCards, this.activeFilter, this.myWard));
  }
}
