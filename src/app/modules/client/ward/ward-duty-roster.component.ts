import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Calendar, CalendarOptions, DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { toCalendarYmd } from '../../../core/utils/calendar-date';

@Component({
  selector: 'app-ward-duty-roster',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule],
  templateUrl: './ward-duty-roster.component.html',
  styleUrl: './ward-duty-roster.component.scss',
})
export class WardDutyRosterComponent implements OnInit {
  @ViewChild('calendar') calendar!: { getApi: () => Calendar };

  loading = false;
  mobileListMode = false;
  items: Array<Record<string, unknown>> = [];
  selectedDayItems: Array<Record<string, unknown>> = [];
  selectedDay = new Date().toISOString().slice(0, 10);
  wardLabel = '';
  staffUserId = '';
  staffRole = '';
  shift = '';
  showForm = false;
  editingId = '';
  form = {
    staffUserId: '',
    staffRole: 'Nurse',
    wardLabel: '',
    rosterDate: new Date().toISOString().slice(0, 10),
    startTime: '08:00',
    endTime: '14:00',
    shift: 'morning',
    notes: '',
  };

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    events: [],
    editable: false,
    selectable: true,
    dateClick: (info) => this.onDateClick(info.dateStr),
    eventClick: (info) => this.onEventClick(info),
    datesSet: (arg) => this.onDatesSet(arg),
  };

  constructor(private backend: BackendService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.load(new Date().toISOString().slice(0, 10), this.addDays(new Date(), 42).toISOString().slice(0, 10));
  }

  get calendarApi(): Calendar {
    return this.calendar.getApi();
  }

  onDatesSet(arg: DatesSetArg): void {
    this.load(arg.startStr.slice(0, 10), arg.endStr.slice(0, 10));
  }

  onDateClick(dateStr: string): void {
    this.selectedDay = dateStr;
    this.form.rosterDate = dateStr;
    this.showForm = true;
    this.editingId = '';
    this.refreshSelectedDayList();
  }

  onEventClick(info: EventClickArg): void {
    const row = info.event.extendedProps['row'] as Record<string, unknown>;
    if (!row) return;
    this.editingId = String(row['_id'] || '');
    const staffRef = row['staffUserId'];
    const staffObj = staffRef && typeof staffRef === 'object' ? (staffRef as Record<string, unknown>) : null;
    this.form = {
      staffUserId: String(staffObj?.['_id'] || staffRef || ''),
      staffRole: String(row['staffRole'] || 'Nurse'),
      wardLabel: String(row['wardLabel'] || ''),
      rosterDate: toCalendarYmd(row['rosterDate'] as string | Date),
      startTime: String(row['startTime'] || '08:00'),
      endTime: String(row['endTime'] || '14:00'),
      shift: String(row['shift'] || 'morning'),
      notes: String(row['notes'] || ''),
    };
    this.showForm = true;
  }

  load(from?: string, to?: string): void {
    this.loading = true;
    const params: Record<string, unknown> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    if (this.wardLabel) params['wardLabel'] = this.wardLabel;
    if (this.staffUserId) params['staffUserId'] = this.staffUserId;

    this.backend.listWardRoster(params).subscribe({
      next: (items) => {
        this.items = (items || []).filter((row) => {
          if (this.staffRole && String(row['staffRole'] || '') !== this.staffRole) return false;
          if (this.shift && String(row['shift'] || '') !== this.shift) return false;
          return true;
        });
        this.calendarOptions = {
          ...this.calendarOptions,
          events: this.items.map((row) => this.toEvent(row)),
        };
        this.refreshSelectedDayList();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Unable to load roster');
      },
    });
  }

  refreshSelectedDayList(): void {
    this.selectedDayItems = this.items.filter(
      (row) => toCalendarYmd(row['rosterDate'] as string | Date) === this.selectedDay
    );
  }

  toEvent(row: Record<string, unknown>): EventInput {
    const day = toCalendarYmd(row['rosterDate'] as string | Date);
    const staff = row['staffUserId'] as Record<string, unknown> | null;
    const staffName = staff?.['name'] ? String(staff['name']) : String(row['staffUserId'] || 'Staff');
    const start = `${day}T${String(row['startTime'] || '08:00').slice(0, 5)}:00`;
    const end = `${day}T${String(row['endTime'] || '14:00').slice(0, 5)}:00`;
    return {
      id: String(row['_id'] || ''),
      title: `${staffName} · ${row['staffRole'] || 'Staff'} · ${row['shift'] || ''}`,
      start,
      end,
      backgroundColor: '#0f766e',
      borderColor: '#0f766e',
      extendedProps: { row },
    };
  }

  saveShift(): void {
    if (!this.form.staffUserId) {
      this.toastr.warning('Staff user ID is required');
      return;
    }
    const request$ = this.editingId
      ? this.backend.updateWardRosterShift(this.editingId, this.form)
      : this.backend.createWardRosterShift(this.form);

    request$.subscribe({
      next: () => {
        this.toastr.success(this.editingId ? 'Shift updated' : 'Shift created');
        this.showForm = false;
        this.editingId = '';
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to save shift'),
    });
  }

  staffName(row: Record<string, unknown>): string {
    const staff = row['staffUserId'] as Record<string, unknown> | null;
    return staff?.['name'] ? String(staff['name']) : String(row['staffUserId'] || '—');
  }

  addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  toggleMobileList(): void {
    this.mobileListMode = !this.mobileListMode;
  }
}
