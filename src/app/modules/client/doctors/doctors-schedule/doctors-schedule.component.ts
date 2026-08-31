import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Appointment, Doctor, User } from '../../../../shared/models/hospital.model';
import { isDoctorRole } from '../../../auth/access-control';
import { FullcalenderComponent } from '../../fullcalender/fullcalender.component';

type DayHours = { enabled: boolean; startTime: string; endTime: string };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FullcalenderComponent],
  selector: 'app-doctors-schedule',
  templateUrl: './doctors-schedule.component.html',
  styleUrls: ['./doctors-schedule.component.scss'],
})
export class DoctorsScheduleComponent implements OnInit {
  readonly weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  doctors: Doctor[] = [];
  selectedDoctorId = '';
  selectedDoctor: Doctor | null = null;
  appointments: Appointment[] = [];
  loading = false;
  saving = false;
  ownDoctor: Doctor | null = null;
  dayHours: Record<string, DayHours> = DoctorsScheduleComponent.defaultDayHours();
  unavailableDates: string[] = [];
  leaveDate = '';
  slotDurationMinutes = 15;
  readonly slotDurationOptions = [5, 10, 15, 20, 30];

  constructor(
    private backend: BackendService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadSchedule();
  }

  get currentUser(): User | null {
    return (this.authService.currentUser() as User | null) || null;
  }

  get isDoctorUser(): boolean {
    return isDoctorRole(this.currentUser?.role?.name || localStorage.getItem('role') || '');
  }

  get canReadDirectory(): boolean {
    return this.backend.hasPermission('doctors.read');
  }

  get canManageAllSchedules(): boolean {
    return this.backend.hasPermission('doctors.update');
  }

  get canPickDoctor(): boolean {
    return this.canReadDirectory && this.doctors.length > 1;
  }

  get canEditSelected(): boolean {
    if (!this.selectedDoctor) {
      return false;
    }
    if (this.canManageAllSchedules) {
      return true;
    }
    return this.isOwnDoctor(this.selectedDoctor);
  }

  get showAllDoctorsLink(): boolean {
    return this.canReadDirectory;
  }

  loadSchedule(): void {
    this.loading = true;
    if (this.canReadDirectory) {
      this.backend
        .getDoctors({ limit: 100 })
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (result) => {
            this.doctors = result.items;
            this.selectInitialDoctor();
          },
          error: (err) => {
            this.toastr.error(err?.error?.message || 'Unable to load doctors');
            this.loadOwnDoctor();
          },
        });
      return;
    }

    this.loadOwnDoctor();
  }

  onDoctorChange(): void {
    this.selectedDoctor = this.doctors.find((item) => item._id === this.selectedDoctorId) || null;
    this.applyDoctorToEditor(this.selectedDoctor);
    if (!this.selectedDoctorId) {
      this.appointments = [];
      return;
    }

    this.backend.getAppointments({
      doctorId: this.selectedDoctor?.userId || this.selectedDoctorId,
      limit: 50,
    }).subscribe({
      next: (result) => (this.appointments = result.items),
      error: () => (this.appointments = []),
    });
  }

  days(doctor: Doctor | null): string {
    const days = doctor?.availableDays || [];
    return days.length ? days.map((day) => this.titleCase(day)).join(', ') : 'Not configured';
  }

  slots(doctor: Doctor | null): string {
    const slots = doctor?.availableSlots || [];
    if (!slots.length) {
      return 'No weekly slots';
    }
    return slots
      .map((slot) => `${this.titleCase(slot.day || '')} ${slot.startTime || ''}-${slot.endTime || ''}`.trim())
      .join(' · ');
  }

  saveSchedule(): void {
    if (!this.canEditSelected || !this.selectedDoctor) {
      return;
    }

    const availableDays = this.weekDays.filter((day) => this.dayHours[day]?.enabled);
    const availableSlots = availableDays.map((day) => ({
      day,
      startTime: this.dayHours[day].startTime,
      endTime: this.dayHours[day].endTime,
    }));
    const invalid = availableSlots.find((slot) => !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime);
    if (invalid) {
      this.toastr.error(`End time must be after start time on ${this.titleCase(invalid.day)}.`);
      return;
    }

    const payload = {
      availableDays,
      availableSlots,
      unavailableDates: this.unavailableDates,
      slotDurationMinutes: this.slotDurationMinutes,
    };

    this.saving = true;
    const request$ =
      this.isOwnDoctor(this.selectedDoctor) && !this.canManageAllSchedules
        ? this.backend.updateMyDoctorSchedule(payload)
        : this.backend.updateDoctor(this.selectedDoctor._id, payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (response) => {
        const doctor = response.data;
        if (doctor) {
          this.replaceDoctor(doctor);
        }
        this.toastr.success(response.message || 'Schedule saved.');
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Unable to save schedule');
      },
    });
  }

  addLeaveDate(): void {
    const ymd = String(this.leaveDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      this.toastr.error('Select a date to mark unavailable.');
      return;
    }
    if (this.unavailableDates.includes(ymd)) {
      this.leaveDate = '';
      return;
    }
    this.unavailableDates = [...this.unavailableDates, ymd].sort();
    this.leaveDate = '';
  }

  removeLeaveDate(ymd: string): void {
    this.unavailableDates = this.unavailableDates.filter((item) => item !== ymd);
  }

  private loadOwnDoctor(): void {
    this.backend
      .getMyDoctorProfile()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (doctor) => {
          this.ownDoctor = doctor;
          this.doctors = [doctor];
          this.selectedDoctorId = doctor._id;
          this.onDoctorChange();
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to load your schedule');
        },
      });
  }

  private selectInitialDoctor(): void {
    const currentUserId = String(this.currentUser?._id || '');
    const own =
      this.doctors.find((doctor) => String(doctor.userId) === currentUserId) ||
      this.ownDoctor ||
      this.doctors[0] ||
      null;
    this.ownDoctor = this.doctors.find((doctor) => String(doctor.userId) === currentUserId) || this.ownDoctor;
    this.selectedDoctorId = own?._id || '';
    this.onDoctorChange();
  }

  private applyDoctorToEditor(doctor: Doctor | null): void {
    this.resetDayHours();
    this.slotDurationMinutes = Number(doctor?.slotDurationMinutes || 15);
    this.unavailableDates = (doctor?.unavailableDates || [])
      .map((item) => String(item || '').slice(0, 10))
      .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));

    if (!doctor) {
      return;
    }

    const selectedDays = new Set((doctor.availableDays || []).map((day) => String(day).toLowerCase()));
    (doctor.availableSlots || []).forEach((slot) => {
      const day = String(slot.day || '').toLowerCase();
      if (!this.dayHours[day]) {
        return;
      }
      this.dayHours[day] = {
        enabled: true,
        startTime: slot.startTime || '09:00',
        endTime: slot.endTime || '17:00',
      };
      selectedDays.add(day);
    });
    selectedDays.forEach((day) => {
      if (!this.dayHours[day]) {
        return;
      }
      this.dayHours[day] = {
        ...this.dayHours[day],
        enabled: true,
      };
    });
  }

  private resetDayHours(): void {
    this.dayHours = DoctorsScheduleComponent.defaultDayHours();
  }

  private static defaultDayHours(): Record<string, DayHours> {
    return {
      monday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      tuesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      wednesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      thursday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      friday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      sunday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    };
  }

  private replaceDoctor(doctor: Doctor): void {
    this.doctors = this.doctors.map((item) => (item._id === doctor._id ? doctor : item));
    if (!this.doctors.some((item) => item._id === doctor._id)) {
      this.doctors = [...this.doctors, doctor];
    }
    this.selectedDoctor = doctor;
    this.selectedDoctorId = doctor._id;
    if (this.isOwnDoctor(doctor)) {
      this.ownDoctor = doctor;
    }
    this.applyDoctorToEditor(doctor);
  }

  private isOwnDoctor(doctor: Doctor | null): boolean {
    if (!doctor) {
      return false;
    }
    return String(doctor.userId) === String(this.currentUser?._id || '');
  }

  private titleCase(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  }
}
