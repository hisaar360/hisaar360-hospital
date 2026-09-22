import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import { ListResult, OperationSchedule } from '../../../shared/models/hospital.model';

interface MonthCell {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  count: number;
  items: OperationSchedule[];
}

@Component({
  selector: 'app-operation-doctor-schedule-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './operation-doctor-schedule-preview.component.html',
  styleUrl: './operation-doctor-schedule-preview.component.scss',
})
export class OperationDoctorSchedulePreviewComponent implements OnChanges, OnDestroy {
  /** DoctorProfile `_id` or userId — backend resolves both. */
  @Input() doctorId = '';
  @Input() doctorLabel = '';
  @Output() readonly pickDateTime = new EventEmitter<string>();

  loading = false;
  error = '';
  monthCursor = this.startOfMonth(new Date());
  selectedDate = '';
  items: OperationSchedule[] = [];
  cells: MonthCell[] = [];
  selectedDayItems: OperationSchedule[] = [];

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly quickTimes = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

  private readonly backend = inject(BackendService);
  private loadSub: Subscription | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['doctorId']) {
      this.reload();
    }
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  get monthLabel(): string {
    return this.monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  get hasDoctor(): boolean {
    return Boolean(String(this.doctorId || '').trim());
  }

  shiftMonth(delta: number): void {
    const next = new Date(this.monthCursor);
    next.setMonth(next.getMonth() + delta);
    this.monthCursor = this.startOfMonth(next);
    this.reload();
  }

  selectDay(cell: MonthCell): void {
    if (!cell.inMonth) {
      return;
    }
    this.selectedDate = cell.date;
    this.selectedDayItems = cell.items;
    this.rebuildCells();
  }

  useTime(timeHhMm: string): void {
    if (!this.selectedDate) {
      return;
    }
    this.pickDateTime.emit(`${this.selectedDate}T${timeHhMm}`);
  }

  useFirstFreeMorning(): void {
    if (!this.selectedDate) {
      return;
    }
    const taken = new Set(
      this.selectedDayItems
        .map((item) => this.timeKey(item.scheduledStart))
        .filter(Boolean)
    );
    const free = this.quickTimes.find((slot) => !taken.has(slot)) || '09:00';
    this.useTime(free);
  }

  statusLabel(status: string | undefined): string {
    return String(status || 'scheduled').replace(/_/g, ' ');
  }

  procedureLabel(item: OperationSchedule): string {
    const catalog = item.treatmentCatalog;
    if (catalog && typeof catalog === 'object' && 'name' in catalog) {
      return String((catalog as { name?: string }).name || 'Procedure');
    }
    return 'Procedure';
  }

  patientLabel(item: OperationSchedule): string {
    const patient = item.patient;
    if (patient && typeof patient === 'object' && 'name' in patient) {
      return String((patient as { name?: string }).name || 'Patient');
    }
    return 'Patient';
  }

  timeRange(item: OperationSchedule): string {
    const start = this.formatTime(item.scheduledStart);
    const end = this.formatTime(item.scheduledEnd);
    if (start && end) {
      return `${start} – ${end}`;
    }
    return start || 'Time TBD';
  }

  private reload(): void {
    this.loadSub?.unsubscribe();
    this.items = [];
    this.selectedDayItems = [];
    this.error = '';

    if (!this.hasDoctor) {
      this.rebuildCells();
      return;
    }

    const from = this.toYmd(this.monthCursor);
    const toDate = new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth() + 1, 0);
    const to = this.toYmd(toDate);

    this.loading = true;
    this.loadSub = this.backend
      .getOperationSchedules({
        limit: 200,
        doctorId: this.doctorId,
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
      })
      .subscribe({
        next: (result: ListResult<OperationSchedule>) => {
          this.loading = false;
          this.items = (result.items || []).filter(
            (item: OperationSchedule) => !['cancelled'].includes(String(item.status || ''))
          );
          if (!this.selectedDate || !this.selectedDate.startsWith(from.slice(0, 7))) {
            this.selectedDate = this.toYmd(new Date());
            if (!this.selectedDate.startsWith(from.slice(0, 7))) {
              this.selectedDate = from;
            }
          }
          this.rebuildCells();
        },
        error: () => {
          this.loading = false;
          this.error = 'Unable to load this doctor\'s OT schedule.';
          this.rebuildCells();
        },
      });
  }

  private rebuildCells(): void {
    const year = this.monthCursor.getFullYear();
    const month = this.monthCursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = this.toYmd(new Date());
    const byDate = new Map<string, OperationSchedule[]>();

    for (const item of this.items) {
      const key = this.dateKey(item.scheduledStart);
      if (!key) {
        continue;
      }
      const list = byDate.get(key) || [];
      list.push(item);
      byDate.set(key, list);
    }

    const cells: MonthCell[] = [];
    for (let i = 0; i < startPad; i += 1) {
      cells.push({
        date: '',
        day: 0,
        inMonth: false,
        isToday: false,
        isSelected: false,
        count: 0,
        items: [],
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = this.toYmd(new Date(year, month, day));
      const dayItems = (byDate.get(date) || []).slice().sort((a, b) =>
        String(a.scheduledStart || '').localeCompare(String(b.scheduledStart || ''))
      );
      cells.push({
        date,
        day,
        inMonth: true,
        isToday: date === today,
        isSelected: date === this.selectedDate,
        count: dayItems.length,
        items: dayItems,
      });
    }

    this.cells = cells;
    this.selectedDayItems =
      cells.find((cell) => cell.date === this.selectedDate)?.items || [];
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private toYmd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private dateKey(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 10);
    }
    return this.toYmd(date);
  }

  private timeKey(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      const match = String(value).match(/T(\d{2}:\d{2})/);
      return match?.[1] || '';
    }
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private formatTime(value: string | null | undefined): string {
    const key = this.timeKey(value);
    if (!key) {
      return '';
    }
    const [hh, mm] = key.split(':').map(Number);
    const date = new Date();
    date.setHours(hh, mm, 0, 0);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
}
