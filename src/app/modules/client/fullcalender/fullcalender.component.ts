import { Component, OnInit, ViewChild } from '@angular/core';
import { Calendar, CalendarOptions, DatesSetArg, EventInput } from '@fullcalendar/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid'; // Month view
import timeGridPlugin from '@fullcalendar/timegrid'; // Week/Day views
import interactionPlugin from '@fullcalendar/interaction'; // For click/drag
import { BackendService } from '../../../core/services/backend.service';
import { Appointment } from '../../../shared/models/hospital.model';
import { toCalendarYmd } from '../../../core/utils/calendar-date';

@Component({
  selector: 'app-fullcalender',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './fullcalender.component.html',
  styleUrls: ['./fullcalender.component.scss']
})
export class FullcalenderComponent implements OnInit {
  currentDate: Date = new Date();
  @ViewChild('calendar') calendar!: { getApi: () => Calendar };

  constructor(private backend: BackendService) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  changeDate(days: number): void {
    const newDate = new Date(this.currentDate);
    newDate.setDate(newDate.getDate() + days);
    this.currentDate = newDate;
    this.calendarApi.gotoDate(this.currentDate);
  }
  get calendarApi(): Calendar {
    return this.calendar.getApi();
  }

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'today',
    },
    footerToolbar: {
      center: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    buttonText: {
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day',
    },
    titleFormat: { year: 'numeric', month: 'short' },
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    events: [],
    editable: false,
    selectable: false,
    dayMaxEvents: true,
    eventTextColor: '#ffffff',
    eventColor: '#0f766e',
    eventDisplay: 'block',
    eventTimeFormat: {
      hour: 'numeric',
      minute: '2-digit',
      meridiem: 'short',
    },
    displayEventTime: true,
    datesSet: (arg) => this.onDatesSet(arg),
  };

  onDatesSet(arg: DatesSetArg): void {
    this.loadAppointments(arg.startStr.slice(0, 10), arg.endStr.slice(0, 10));
  }

  loadAppointments(dateFrom?: string, dateTo?: string): void {
    if (!this.backend.hasPermission('appointments.read')) {
      this.calendarOptions = {
        ...this.calendarOptions,
        events: [],
      };
      return;
    }

    const monthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const monthEnd = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

    this.backend
      .getAppointmentCalendar({
        dateFrom: dateFrom || monthStart.toISOString().slice(0, 10),
        dateTo: dateTo || monthEnd.toISOString().slice(0, 10),
      })
      .subscribe({
        next: (appointments) => {
          this.calendarOptions = {
            ...this.calendarOptions,
            events: appointments.map((appointment) => this.toEventInput(appointment)),
          };
        },
        error: () => {
          this.calendarOptions = {
            ...this.calendarOptions,
            events: [],
          };
        },
      });
  }

  toEventInput(appointment: Appointment): EventInput {
    const day = toCalendarYmd(appointment.appointmentDate);
    const patientName = appointment.patient
      ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
      : 'Patient';
    const startTime = String(appointment.startTime || '').slice(0, 5);
    const endTime = String(appointment.endTime || '').slice(0, 5);

    return {
      id: appointment._id,
      title: patientName,
      start: startTime ? `${day}T${startTime}:00` : day,
      end: endTime ? `${day}T${endTime}:00` : undefined,
      backgroundColor: appointment.status === 'completed' ? '#0f766e' : '#0f766e',
      borderColor: '#0f766e',
      textColor: '#ffffff',
      extendedProps: {
        status: appointment.status,
        reason: appointment.reason,
      },
    };
  }
}
