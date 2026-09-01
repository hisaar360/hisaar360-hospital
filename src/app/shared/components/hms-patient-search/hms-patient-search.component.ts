import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import { BirthRecordMotherContext } from '../../models/birth-records.model';
import { Patient } from '../../models/hospital.model';

@Component({
  selector: 'hms-patient-search',
  imports: [CommonModule, FormsModule],
  templateUrl: './hms-patient-search.component.html',
  styleUrl: './hms-patient-search.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => HmsPatientSearchComponent),
      multi: true,
    },
  ],
})
export class HmsPatientSearchComponent implements ControlValueAccessor, OnDestroy {
  @Input() label = 'Search Patient';
  @Input() hint = 'Search by name or MR number';
  @Input() placeholder = 'Name or MR number…';
  @Input() required = false;
  @Input() disabled = false;
  @Input() loadAdmissionContext = true;
  @Input() preferFemale = false;
  @Output() patientChange = new EventEmitter<Patient | null>();
  @Output() contextChange = new EventEmitter<BirthRecordMotherContext | null>();

  query = '';
  value = '';
  open = false;
  loading = false;
  contextLoading = false;
  results: Patient[] = [];
  selectedPatient: Patient | null = null;
  motherContext: BirthRecordMotherContext | null = null;
  touched = false;

  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private backend: BackendService) {
    this.searchSub = this.search$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((term) => {
          const trimmed = term.trim();
          if (trimmed.length < 2) {
            this.loading = false;
            this.results = [];
            return of({ items: [] as Patient[] });
          }
          this.loading = true;
          return this.backend.getPatients({ limit: 8, status: 'active', search: trimmed }).pipe(
            finalize(() => (this.loading = false))
          );
        })
      )
      .subscribe({
        next: (result) => {
          if (!result || !('items' in (result as object))) return;
          let items = ((result as { items: Patient[] }).items || []) as Patient[];
          if (this.preferFemale) {
            items = items.filter((item) => item.gender === 'female' || !item.gender);
          }
          this.results = items;
          this.open = true;
        },
        error: () => {
          this.results = [];
        },
      });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  writeValue(value: string | null): void {
    this.value = String(value || '');
    if (!this.value) {
      this.selectedPatient = null;
      this.motherContext = null;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onQueryInput(): void {
    if (this.selectedPatient) {
      this.clearSelection();
    }
    this.search$.next(this.query);
  }

  onQueryFocus(): void {
    if (this.results.length) {
      this.open = true;
    }
  }

  closePanel(): void {
    this.open = false;
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.value = patient._id;
    this.query = this.displayName(patient);
    this.onChange(this.value);
    this.onTouched();
    this.touched = true;
    this.open = false;
    this.patientChange.emit(patient);
    if (this.loadAdmissionContext) {
      this.loadContext(patient._id);
    }
  }

  clearSelection(): void {
    this.selectedPatient = null;
    this.motherContext = null;
    this.value = '';
    this.query = '';
    this.results = [];
    this.onChange('');
    this.contextChange.emit(null);
    this.patientChange.emit(null);
  }

  loadContext(patientId: string): void {
    this.contextLoading = true;
    this.backend
      .getBirthRecordMotherContext(patientId)
      .pipe(finalize(() => (this.contextLoading = false)))
      .subscribe({
        next: (context) => {
          this.motherContext = context;
          this.contextChange.emit(context);
        },
        error: () => {
          this.motherContext = null;
          this.contextChange.emit(null);
        },
      });
  }

  displayName(patient?: Patient | null): string {
    if (!patient) return '—';
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.patientNo || '—';
  }

  patientMr(patient?: Patient | null): string {
    return patient?.patientNo || '—';
  }

  patientMeta(patient?: Patient | null): string {
    if (!patient) return '';
    const parts = [
      patient.patientNo,
      patient.gender ? String(patient.gender) : '',
      patient.phone || '',
    ].filter(Boolean);
    return parts.join(' · ');
  }

  motherRoomBed(): string {
    const admission = this.motherContext?.admission;
    if (!admission) return 'Not admitted';
    const room = admission.room?.name || admission.room?.roomNo || '—';
    const bed = admission.bed?.bedNo || admission.bed?.name || '—';
    return `${room} / ${bed}`;
  }

  motherAdmissionNo(): string {
    return this.motherContext?.admission?.admissionNo || '—';
  }
}
