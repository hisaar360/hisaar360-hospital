import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { Appointment, Doctor, Patient } from '../../../shared/models/hospital.model';
import { hasPermission, readStoredPermissions } from '../../auth/access-control';

interface GlobalSearchResult {
  kind: 'patient' | 'appointment' | 'doctor';
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  route: string[];
}

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.scss',
})
export class GlobalSearchComponent implements OnDestroy {
  private backend = inject(BackendService);
  private router = inject(Router);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  query = '';
  loading = false;
  open = false;
  groups: Array<{ label: string; items: GlobalSearchResult[] }> = [];

  private readonly search$ = new Subject<string>();
  private readonly permissions = readStoredPermissions();

  constructor() {
    this.search$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        tap(() => (this.loading = true)),
        switchMap((term) => this.runSearch(term)),
        tap(() => (this.loading = false))
      )
      .subscribe((groups) => {
        this.groups = groups;
        this.open = Boolean(this.query.trim()) && groups.some((group) => group.items.length);
      });
  }

  ngOnDestroy(): void {
    this.search$.complete();
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalShortcut(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
      this.open = Boolean(this.query.trim());
    }
    if (event.key === 'Escape') {
      this.closePanel();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.hms-global-search')) {
      this.open = false;
    }
  }

  onInput(value: string): void {
    this.query = value;
    const trimmed = value.trim();
    if (!trimmed) {
      this.groups = [];
      this.open = false;
      this.loading = false;
      return;
    }
    this.search$.next(trimmed);
  }

  openResult(item: GlobalSearchResult): void {
    this.closePanel();
    void this.router.navigate(item.route);
  }

  closePanel(): void {
    this.open = false;
  }

  private runSearch(term: string) {
    const patient$ = this.canSearchPatients()
      ? this.backend.getPatients({ search: term, limit: 5, page: 1 }).pipe(
          catchError(() => of({ items: [] as Patient[], pagination: { page: 1, limit: 5, total: 0, pages: 0 } }))
        )
      : of(null);
    const appointment$ = this.canSearchAppointments()
      ? this.backend.getAppointments({ search: term, limit: 5, page: 1 }).pipe(
          catchError(() => of({ items: [] as Appointment[], pagination: { page: 1, limit: 5, total: 0, pages: 0 } }))
        )
      : of(null);
    const doctor$ = this.canSearchDoctors()
      ? this.backend.getDoctors({ search: term, limit: 5, page: 1 }).pipe(
          catchError(() => of({ items: [] as Doctor[], pagination: { page: 1, limit: 5, total: 0, pages: 0 } }))
        )
      : of(null);

    return forkJoin({ patients: patient$, appointments: appointment$, doctors: doctor$ }).pipe(
      switchMap(({ patients, appointments, doctors }) => {
        const groups: Array<{ label: string; items: GlobalSearchResult[] }> = [];
        if (patients?.items?.length) {
          groups.push({ label: 'Patients', items: this.mapResults('patient', patients.items) });
        }
        if (appointments?.items?.length) {
          groups.push({ label: 'Appointments', items: this.mapResults('appointment', appointments.items) });
        }
        if (doctors?.items?.length) {
          groups.push({ label: 'Doctors', items: this.mapResults('doctor', doctors.items) });
        }
        return of(groups);
      })
    );
  }

  private mapResults(kind: 'patient' | 'appointment' | 'doctor', items: Patient[] | Appointment[] | Doctor[]): GlobalSearchResult[] {
    if (kind === 'patient') {
      return (items as Patient[]).map((patient) => ({
        kind,
        id: patient._id,
        title: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
        subtitle: patient.patientNo || 'MR unavailable',
        meta: patient.phone || '',
        route: ['/patients/patient-profile', patient._id],
      }));
    }

    if (kind === 'appointment') {
      return (items as Appointment[]).map((appointment) => ({
        kind,
        id: appointment._id,
        title: appointment.appointmentNo || 'Appointment',
        subtitle: appointment.patient
          ? `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim()
          : 'Patient',
        meta: appointment.doctor?.name || '',
        route: ['/appointments'],
      }));
    }

    return (items as Doctor[]).map((doctor) => ({
      kind,
      id: doctor._id,
      title: doctor.user?.name || doctor.specialization || 'Doctor',
      subtitle: doctor.specialization || doctor.qualification || 'Doctor',
      meta: doctor.user?.phone || doctor.user?.email || '',
      route: ['/doctors-profile', doctor._id],
    }));
  }

  private groupLabel(kind: 'patient' | 'appointment' | 'doctor'): string {
    if (kind === 'patient') return 'Patients';
    if (kind === 'appointment') return 'Appointments';
    return 'Doctors';
  }

  private canSearchPatients(): boolean {
    return this.permissions.includes('*') || hasPermission('patients.read', this.permissions);
  }

  private canSearchAppointments(): boolean {
    return this.permissions.includes('*') || hasPermission('appointments.read', this.permissions);
  }

  private canSearchDoctors(): boolean {
    return this.permissions.includes('*') || hasPermission('doctors.read', this.permissions);
  }
}
