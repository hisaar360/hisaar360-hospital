import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { WardDataService } from './services/ward-data.service';
import {
  EMPTY_WARD_WORK_COUNTS,
  uniquePatientsFromWork,
  WardMyPatientCard,
  WardMyWork,
  WardWorkItem,
  workItemChartTab,
} from './ward-home.util';

interface WardWorkSection {
  key: 'overdue' | 'dueNow' | 'upcoming';
  label: string;
  badge: string;
  icon: string;
  emptyMessage: string;
  items: WardWorkItem[];
}

@Component({
  selector: 'app-ward-my-work',
  imports: [CommonModule, RouterLink],
  templateUrl: './ward-my-work.component.html',
  styleUrl: './ward-my-work.component.scss',
})
export class WardMyWorkComponent implements OnInit {
  loading = false;
  error = false;

  work: WardMyWork = {
    overdue: [],
    dueNow: [],
    upcoming: [],
    counts: EMPTY_WARD_WORK_COUNTS,
  };

  readonly skeletonRows = [1, 2, 3, 4];

  constructor(
    private wardData: WardDataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get sections(): WardWorkSection[] {
    return [
      {
        key: 'overdue',
        label: 'Overdue',
        badge: 'OVERDUE',
        icon: 'fa-exclamation-circle',
        emptyMessage: 'Nothing is overdue.',
        items: this.work.overdue,
      },
      {
        key: 'dueNow',
        label: 'Due Now',
        badge: 'DUE NOW',
        icon: 'fa-clock-o',
        emptyMessage: 'No medications due right now.',
        items: this.work.dueNow,
      },
      {
        key: 'upcoming',
        label: 'Upcoming',
        badge: 'UPCOMING',
        icon: 'fa-calendar-o',
        emptyMessage: 'Nothing scheduled ahead.',
        items: this.work.upcoming,
      },
    ];
  }

  get myPatients(): WardMyPatientCard[] {
    return uniquePatientsFromWork(this.work);
  }

  get countTiles(): Array<{ key: string; label: string; value: number; icon: string }> {
    return [
      { key: 'medicationsDue', label: 'Medications Due', value: this.work.counts.medicationsDue, icon: 'fa-medkit' },
      { key: 'vitalsDue', label: 'Vitals Due', value: this.work.counts.vitalsDue, icon: 'fa-heartbeat' },
      { key: 'activeDrips', label: 'Active Drips', value: this.work.counts.activeDrips, icon: 'fa-tint' },
      { key: 'pendingIo', label: 'Pending I/O', value: this.work.counts.pendingIo, icon: 'fa-exchange' },
      { key: 'newOrders', label: 'New Orders', value: this.work.counts.newOrders, icon: 'fa-list' },
      { key: 'handoverItems', label: 'Handover Items', value: this.work.counts.handoverItems, icon: 'fa-users' },
    ];
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

  /** Canonical stat/urgent priorities are passed through; no derived scoring. */
  isEscalatedPriority(item: WardWorkItem): boolean {
    return item.priority === 'stat' || item.priority === 'urgent';
  }

  openItem(item: WardWorkItem): void {
    if (!item.admissionId) {
      return;
    }
    this.router.navigate(['/ward/patient-detail', item.admissionId], {
      queryParams: { tab: workItemChartTab(item) },
    });
  }

  openPatient(card: WardMyPatientCard): void {
    this.router.navigate(['/ward/patient-detail', card.admissionId]);
  }
}
