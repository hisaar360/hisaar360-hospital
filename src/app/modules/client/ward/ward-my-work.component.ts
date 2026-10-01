import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { WardDataService } from './services/ward-data.service';
import {
  classifyWardWorkItem,
  countWardWorkKinds,
  EMPTY_WARD_WORK_COUNTS,
  filterWardWorkByKind,
  flattenWardWorkItems,
  formatWorkDueLabel,
  patientInitials,
  WardMyWork,
  WardWorkFilterKind,
  WardWorkItem,
  WardWorkKind,
  workItemChartTab,
  workItemTypeLabel,
} from './ward-home.util';

interface WardWorkSection {
  key: 'overdue' | 'dueNow' | 'upcoming';
  label: string;
  icon: string;
  emptyTitle: string;
  emptyMessage: string;
  actionLabel?: string;
  items: WardWorkItem[];
}

interface WorkFilterPill {
  key: WardWorkFilterKind;
  label: string;
  shortLabel: string;
  count: number;
}

interface WorkStatTile {
  key: WardWorkFilterKind;
  label: string;
  shortLabel: string;
  value: number;
  icon: string;
  tone: 'red' | 'green' | 'blue' | 'amber' | 'purple';
}

@Component({
  selector: 'app-ward-my-work',
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './ward-my-work.component.html',
  styleUrl: './ward-my-work.component.scss',
})
export class WardMyWorkComponent implements OnInit {
  loading = false;
  error = false;
  activeFilter: WardWorkFilterKind = 'all';
  selectedShift: 'day' | 'evening' | 'night' = 'day';
  selectedDate = '';

  work: WardMyWork = {
    overdue: [],
    dueNow: [],
    upcoming: [],
    counts: EMPTY_WARD_WORK_COUNTS,
  };

  readonly skeletonRows = [1, 2, 3, 4];
  readonly shiftOptions: Array<{ key: 'day' | 'evening' | 'night'; label: string; icon: string }> = [
    { key: 'day', label: 'Day Shift', icon: 'fa-sun-o' },
    { key: 'evening', label: 'Evening Shift', icon: 'fa-cloud' },
    { key: 'night', label: 'Night Shift', icon: 'fa-moon-o' },
  ];

  constructor(
    private wardData: WardDataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.selectedDate = this.toDateInputValue(new Date());
    this.selectedShift = this.resolveShift(new Date());
    this.load();
  }

  get allItems(): WardWorkItem[] {
    return flattenWardWorkItems(this.work);
  }

  get kindCounts(): Record<WardWorkFilterKind, number> {
    return countWardWorkKinds(this.allItems);
  }

  get filterPills(): WorkFilterPill[] {
    const counts = this.kindCounts;
    return [
      { key: 'all', label: 'All', shortLabel: 'All', count: counts.all },
      { key: 'medication', label: 'Medications', shortLabel: 'Meds', count: counts.medication },
      { key: 'vitals', label: 'Vitals', shortLabel: 'Vitals', count: counts.vitals },
      { key: 'drip', label: 'Drips', shortLabel: 'Drips', count: counts.drip },
      { key: 'order', label: 'Orders', shortLabel: 'Orders', count: counts.order },
      { key: 'task', label: 'Tasks', shortLabel: 'Tasks', count: counts.task },
      { key: 'handover', label: 'Handover', shortLabel: 'Handover', count: counts.handover },
    ];
  }

  get statTiles(): WorkStatTile[] {
    const counts = this.kindCounts;
    return [
      {
        key: 'medication',
        label: 'Medications due',
        shortLabel: 'Meds',
        value: this.work.counts.medicationsDue || counts.medication,
        icon: 'fa-medkit',
        tone: 'red',
      },
      {
        key: 'vitals',
        label: 'Vitals due',
        shortLabel: 'Vitals',
        value: this.work.counts.vitalsDue || counts.vitals,
        icon: 'fa-heartbeat',
        tone: 'green',
      },
      {
        key: 'drip',
        label: 'Active drips',
        shortLabel: 'Drips',
        value: this.work.counts.activeDrips || counts.drip,
        icon: 'fa-tint',
        tone: 'blue',
      },
      {
        key: 'order',
        label: 'Pending orders',
        shortLabel: 'Orders',
        value: this.work.counts.newOrders || counts.order,
        icon: 'fa-list-alt',
        tone: 'amber',
      },
      {
        key: 'task',
        label: 'Total tasks',
        shortLabel: 'Tasks',
        value: counts.task,
        icon: 'fa-check-square-o',
        tone: 'purple',
      },
    ];
  }

  get sections(): WardWorkSection[] {
    return [
      {
        key: 'overdue',
        label: 'Overdue',
        icon: 'fa-exclamation-circle',
        emptyTitle: 'Nothing overdue',
        emptyMessage: 'Great — no overdue work for this filter.',
        actionLabel: 'View all overdue',
        items: filterWardWorkByKind(this.work.overdue, this.activeFilter),
      },
      {
        key: 'dueNow',
        label: 'Due Now',
        icon: 'fa-clock-o',
        emptyTitle: 'No items due right now',
        emptyMessage: "You're all caught up. Great job!",
        items: filterWardWorkByKind(this.work.dueNow, this.activeFilter),
      },
      {
        key: 'upcoming',
        label: 'Upcoming',
        icon: 'fa-calendar',
        emptyTitle: 'Nothing upcoming',
        emptyMessage: 'No upcoming items for this filter.',
        actionLabel: 'View calendar',
        items: filterWardWorkByKind(this.work.upcoming, this.activeFilter),
      },
    ];
  }

  get selectedShiftLabel(): string {
    return this.shiftOptions.find((option) => option.key === this.selectedShift)?.label || 'Day Shift';
  }

  get selectedShiftIcon(): string {
    return this.shiftOptions.find((option) => option.key === this.selectedShift)?.icon || 'fa-sun-o';
  }

  get selectedDateLabel(): string {
    if (!this.selectedDate) {
      return 'Today';
    }
    const date = new Date(`${this.selectedDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) {
      return this.selectedDate;
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.wardData
      .loadMyWork()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (work) => (this.work = work),
        error: () => {
          this.work = { overdue: [], dueNow: [], upcoming: [], counts: EMPTY_WARD_WORK_COUNTS };
          this.error = true;
        },
      });
  }

  setFilter(kind: WardWorkFilterKind): void {
    this.activeFilter = kind;
  }

  itemKind(item: WardWorkItem): WardWorkKind {
    return classifyWardWorkItem(item);
  }

  typeLabel(item: WardWorkItem): string {
    return workItemTypeLabel(classifyWardWorkItem(item));
  }

  initials(name: string): string {
    return patientInitials(name);
  }

  dueLabel(item: WardWorkItem): string {
    return formatWorkDueLabel(item.scheduledAt);
  }

  bedDisplay(item: WardWorkItem): string {
    if (!item.bedLabel) {
      return 'Bed —';
    }
    return item.bedLabel.toLowerCase().startsWith('bed') || item.bedLabel.toLowerCase().startsWith('room')
      ? item.bedLabel
      : `Bed ${item.bedLabel}`;
  }

  openItem(item: WardWorkItem, event?: Event): void {
    event?.stopPropagation();
    if (!item.admissionId) {
      return;
    }
    this.router.navigate(['/ward/patient-detail', item.admissionId], {
      queryParams: { tab: workItemChartTab(item) },
    });
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resolveShift(now: Date): 'day' | 'evening' | 'night' {
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (minutes >= 8 * 60 && minutes < 14 * 60) {
      return 'day';
    }
    if (minutes >= 14 * 60 && minutes < 20 * 60) {
      return 'evening';
    }
    return 'night';
  }
}
