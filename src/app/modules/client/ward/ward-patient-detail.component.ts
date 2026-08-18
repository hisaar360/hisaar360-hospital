import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WardDataService } from './services/ward-data.service';
import { WardPatient } from './ward-patient-list.models';
import { WARD_PATIENT_SHIFT_OPTIONS } from './ward-patient-list.mock';
import { WardModuleRow } from './ward-module.models';
import { forkJoin } from 'rxjs';

interface PatientDetailTab {
  key: string;
  label: string;
}

@Component({
  selector: 'app-ward-patient-detail',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ward-patient-detail.component.html',
  styleUrl: './ward-patient-detail.component.scss',
})
export class WardPatientDetailComponent implements OnInit {
  loading = false;
  patient: WardPatient | null = null;
  activeTab = 'overview';
  vitalsRows: WardModuleRow[] = [];
  marRows: WardModuleRow[] = [];
  dripRows: WardModuleRow[] = [];
  nursingRows: WardModuleRow[] = [];
  orderRows: WardModuleRow[] = [];
  ioRows: WardModuleRow[] = [];
  handoverRows: WardModuleRow[] = [];

  wardOptions: string[] = [];
  readonly shiftOptions = WARD_PATIENT_SHIFT_OPTIONS;
  readonly tabs: PatientDetailTab[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'vitals', label: 'Vitals' },
    { key: 'nursing', label: 'Nursing Notes' },
    { key: 'mar', label: 'Medication / MAR' },
    { key: 'drips', label: 'IV / Drips' },
    { key: 'io', label: 'I/O' },
    { key: 'orders', label: 'Doctor Orders' },
    { key: 'lab', label: 'Lab / Services' },
    { key: 'care', label: 'Care Plan' },
    { key: 'handover', label: 'Handover' },
    { key: 'timeline', label: 'Activity Timeline' },
  ];

  ward = '';
  date = new Date().toISOString().slice(0, 10);
  shift = 'Day Shift';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private wardData: WardDataService
  ) {}

  ngOnInit(): void {
    const admissionId = this.route.snapshot.paramMap.get('admissionId') || '';
    this.loading = true;
    const filters = { admissionId, patientId: this.patient?.patientId || '' };
    forkJoin({
      patient: this.wardData.loadPatientByAdmission(admissionId),
      vitals: this.wardData.loadModuleRows('vitals', 'all', '', filters),
      mar: this.wardData.loadModuleRows('mar', 'all', '', filters),
      drips: this.wardData.loadModuleRows('drips-iv', 'all', '', filters),
      nursing: this.wardData.loadModuleRows('nursing-care', 'all', '', filters),
      orders: this.wardData.loadModuleRows('orders-services', 'all', '', filters),
      io: this.wardData.loadModuleRows('io-chart', 'all', '', filters),
      handover: this.wardData.loadModuleRows('shift-handover', 'all', '', filters),
    }).subscribe({
      next: (data) => {
        this.patient = data.patient;
        this.vitalsRows = data.vitals;
        this.marRows = data.mar;
        this.dripRows = data.drips;
        this.nursingRows = data.nursing;
        this.orderRows = data.orders;
        this.ioRows = data.io;
        this.handoverRows = data.handover;
        if (data.patient) {
          this.ward = data.patient.wardName;
          this.wardOptions = [data.patient.wardName];
        }
        this.loading = false;
        if (!data.patient) {
          this.toastr.warning('Patient admission not found.', 'Patient Detail');
        }
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Failed to load patient details.', 'Patient Detail');
      },
    });
  }

  setTab(tab: string): void {
    this.activeTab = tab;
  }

  statusLabel(status: WardPatient['status']): string {
    const labels: Record<WardPatient['status'], string> = {
      stable: 'Stable',
      watch: 'Watch',
      critical: 'Critical',
      dischargePlanned: 'Discharge Planned',
      pendingAssignment: 'Pending Assignment',
    };
    return labels[status];
  }

  statusClass(status: WardPatient['status']): string {
    return `ward-badge ward-badge--${status}`;
  }

  rowTitle(row: WardModuleRow): string {
    return String(
      row.cells['task'] ||
        row.cells['medicine'] ||
        row.cells['fluid'] ||
        row.cells['order'] ||
        row.cells['patient'] ||
        row.cells['bp'] ||
        'Record'
    );
  }

  rowStatus(row: WardModuleRow): string {
    return String(row.cells['status'] || row.cells['dueTime'] || row.cells['recordedAt'] || row.cells['updatedAt'] || '');
  }

  get carePlanRows(): WardModuleRow[] {
    return this.nursingRows.filter((row) =>
      /care plan/i.test(`${row.cells['task'] || ''} ${row.cells['type'] || ''} ${this.rowTitle(row)}`)
    );
  }

  get labRows(): WardModuleRow[] {
    return this.orderRows.filter((row) => /lab/i.test(`${row.cells['order'] || ''} ${this.rowTitle(row)}`));
  }

  get timelineRows(): WardModuleRow[] {
    return [
      ...this.vitalsRows,
      ...this.marRows,
      ...this.dripRows,
      ...this.nursingRows,
      ...this.orderRows,
      ...this.ioRows,
      ...this.handoverRows,
    ].slice(0, 40);
  }

  navigate(path: string): void {
    if (!this.patient) {
      return;
    }

    void this.router.navigate([path], {
      queryParams: {
        admissionId: this.patient.admissionId,
        patientId: this.patient.patientId,
        patientName: this.patient.patientName,
        wardName: this.patient.wardName,
      },
    });
  }
}
