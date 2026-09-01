import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import { HmsPatientSearchComponent } from '../../../shared/components/hms-patient-search/hms-patient-search.component';
import {
  BirthCertificateDetail,
  BirthRecordMotherContext,
} from '../../../shared/models/birth-records.model';
import { Patient } from '../../../shared/models/hospital.model';
import { BirthRecordItem } from './birth-certificate-print.builder';
import {
  buildBirthCertificatePrintHtml,
} from './birth-certificate-print.builder';

@Component({
  selector: 'app-birth-records-dashboard',
  imports: [CommonModule, FormsModule, RouterLink, HmsPatientSearchComponent, HmsDocumentToolbarComponent],
  templateUrl: './birth-records-dashboard.component.html',
  styleUrl: './birth-records-dashboard.component.scss',
})
export class BirthRecordsDashboardComponent implements OnInit {
  loading = false;
  saving = false;
  kpis = { birthsToday: 0, pendingVerification: 0, certificatesPending: 0, certificatesIssued: 0 };
  records: BirthRecordItem[] = [];
  recordOpen = false;
  motherContext: BirthRecordMotherContext | null = null;
  selectedRecord: BirthRecordItem | null = null;
  certificateDetail: BirthCertificateDetail | null = null;
  filters = { search: '', status: '' };

  readonly kpiCards = [
    { key: 'birthsToday', label: 'Births Today', icon: 'fa-child' },
    { key: 'pendingVerification', label: 'Pending Verification', icon: 'fa-clock-o' },
    { key: 'certificatesIssued', label: 'Certificates Issued', icon: 'fa-certificate' },
    { key: 'certificatesPending', label: 'Certificates Pending', icon: 'fa-file-text-o' },
  ] as const;

  recordErrors: Record<string, string> = {};
  selectedMother: Patient | null = null;

  recordForm = {
    motherPatientId: '',
    provisionalName: '',
    dateOfBirth: '',
    timeOfBirth: '',
    sexAtBirth: 'female',
    birthWeightGrams: '',
    modeOfDelivery: '',
    deliveredByDoctorId: '',
    plurality: 'singleton',
    birthOrder: 1,
    fatherName: '',
    notes: '',
    createNewbornPatient: true,
  };

  correctionForm = { correctionReason: '', babyName: '' };
  revokeForm = { revocationReason: '' };

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('record') === '1') {
        this.openRecordBirth();
      }
    });
  }

  loadDashboard(): void {
    this.loading = true;
    this.backend
      .getBirthRecordsDashboard(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const incoming = (result['kpis'] as typeof this.kpis) || this.kpis;
          this.kpis = {
            birthsToday: Number(incoming.birthsToday || 0),
            pendingVerification: Number(incoming.pendingVerification || 0),
            certificatesPending: Number(incoming.certificatesPending || 0),
            certificatesIssued: Number(incoming.certificatesIssued || 0),
          };
          this.records = (result['records'] as BirthRecordItem[]) || [];
        },
        error: () => this.toastr.error('Unable to load birth records.'),
      });
  }

  resetFilters(): void {
    this.filters = { search: '', status: '' };
    this.loadDashboard();
  }

  kpiValue(key: (typeof this.kpiCards)[number]['key']): number {
    return Number(this.kpis[key] || 0);
  }

  statusLabel(status: string): string {
    return String(status || '').replace(/_/g, ' ');
  }

  canVerify(record: BirthRecordItem): boolean {
    return record.status === 'RECORDED' || record.status === 'PENDING_VERIFICATION';
  }

  canIssue(record: BirthRecordItem): boolean {
    return record.status === 'VERIFIED' && !record.activeCertificate;
  }

  openRecordBirth(): void {
    this.recordOpen = true;
    this.recordErrors = {};
    this.motherContext = null;
    this.selectedMother = null;
    this.recordForm = {
      motherPatientId: '',
      provisionalName: '',
      dateOfBirth: new Date().toISOString().slice(0, 10),
      timeOfBirth: new Date().toTimeString().slice(0, 5),
      sexAtBirth: 'female',
      birthWeightGrams: '',
      modeOfDelivery: '',
      deliveredByDoctorId: '',
      plurality: 'singleton',
      birthOrder: 1,
      fatherName: '',
      notes: '',
      createNewbornPatient: true,
    };
  }

  onMotherSelected(patient: Patient | null): void {
    this.selectedMother = patient;
    this.recordForm.motherPatientId = patient?._id || '';
    if (patient) {
      const motherName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
      this.recordForm.provisionalName = motherName ? `Baby of ${motherName}` : '';
    } else {
      this.recordForm.provisionalName = '';
    }
    this.clearRecordError('motherPatientId');
  }

  onMotherContext(context: BirthRecordMotherContext | null): void {
    this.motherContext = context;
  }

  validateRecordForm(): boolean {
    this.recordErrors = {};
    if (!this.recordForm.motherPatientId.trim()) {
      this.recordErrors['motherPatientId'] = 'Select a mother patient to continue.';
    }
    if (!this.recordForm.dateOfBirth) {
      this.recordErrors['dateOfBirth'] = 'Date of birth is required.';
    }
    if (this.recordForm.birthWeightGrams && Number.isNaN(Number(this.recordForm.birthWeightGrams))) {
      this.recordErrors['birthWeightGrams'] = 'Birth weight must be a number.';
    }
    return Object.keys(this.recordErrors).length === 0;
  }

  clearRecordError(key: string): void {
    delete this.recordErrors[key];
  }

  saveBirthRecord(): void {
    if (!this.validateRecordForm()) {
      this.toastr.error('Please complete the required fields.');
      return;
    }
    this.saving = true;
    this.backend
      .createBirthRecord({
        motherPatientId: this.recordForm.motherPatientId.trim(),
        dateOfBirth: this.recordForm.dateOfBirth,
        timeOfBirth: this.recordForm.timeOfBirth,
        sexAtBirth: this.recordForm.sexAtBirth,
        birthWeightGrams: this.recordForm.birthWeightGrams ? Number(this.recordForm.birthWeightGrams) : undefined,
        modeOfDelivery: this.recordForm.modeOfDelivery,
        deliveredByDoctorId: this.recordForm.deliveredByDoctorId || undefined,
        plurality: this.recordForm.plurality,
        birthOrder: Number(this.recordForm.birthOrder) || 1,
        fatherName: this.recordForm.fatherName,
        notes: this.recordForm.notes,
        createNewbornPatient: this.recordForm.createNewbornPatient,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Birth record saved.');
          this.recordOpen = false;
          this.loadDashboard();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save birth record.'),
      });
  }

  verifyRecord(record: BirthRecordItem): void {
    this.backend.verifyBirthRecord(record._id).subscribe({
      next: () => {
        this.toastr.success('Birth record verified.');
        this.loadDashboard();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to verify birth record.'),
    });
  }

  issueCertificate(record: BirthRecordItem): void {
    this.backend.issueBirthCertificate(record._id).subscribe({
      next: (result) => {
        this.toastr.success(`Certificate ${result.certificate.certificateNo} issued.`);
        (result.warnings || []).forEach((warning) => this.toastr.warning(warning));
        this.loadDashboard();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to issue certificate.'),
    });
  }

  openCertificate(record: BirthRecordItem): void {
    const cert = record.activeCertificate;
    if (!cert?._id) return;
    this.backend.getBirthCertificate(cert._id).subscribe({
      next: (detail) => {
        this.selectedRecord = record;
        this.certificateDetail = detail;
      },
      error: () => this.toastr.error('Unable to load certificate.'),
    });
  }

  buildBirthCertificateDocumentHtml = (): string => {
    const cert = this.certificateDetail;
    if (!cert) return '';
    return buildBirthCertificatePrintHtml({
      certificate: cert,
      verificationCode: cert.publicVerificationCode || '',
      verificationBaseUrl: cert.verificationBaseUrl || 'https://www.hisaar360.com/verify/birth',
    });
  };

  onBirthCertificatePrinted(): void {
    const cert = this.certificateDetail;
    if (!cert?._id) return;
    this.backend.recordBirthCertificatePrint(cert._id).subscribe();
  }

  correctCertificate(): void {
    const cert = this.certificateDetail;
    if (!cert || !this.correctionForm.correctionReason.trim()) {
      this.toastr.error('Correction reason is required.');
      return;
    }
    this.backend
      .correctBirthCertificate(cert._id, {
        correctionReason: this.correctionForm.correctionReason.trim(),
        babyName: this.correctionForm.babyName.trim() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.toastr.success('Certificate corrected.');
          this.certificateDetail = result.certificate;
          this.loadDashboard();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to correct certificate.'),
      });
  }

  revokeCertificate(): void {
    const cert = this.certificateDetail;
    if (!cert || !this.revokeForm.revocationReason.trim()) {
      this.toastr.error('Revocation reason is required.');
      return;
    }
    this.backend
      .revokeBirthCertificate(cert._id, {
        revocationReason: this.revokeForm.revocationReason.trim(),
      })
      .subscribe({
        next: () => {
          this.toastr.success('Certificate revoked.');
          this.certificateDetail = null;
          this.loadDashboard();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to revoke certificate.'),
      });
  }

  babyLabel(record: BirthRecordItem): string {
    const baby = record.babyPatient;
    if (!baby) return '—';
    const provisional = String(baby['provisionalLabel'] || '').trim();
    if (provisional) return provisional;
    return `${baby['firstName'] || ''} ${baby['lastName'] || ''}`.trim() || '—';
  }

  babyMr(record: BirthRecordItem): string {
    return String(record.babyPatient?.['patientNo'] || '—');
  }

  motherLabel(record: BirthRecordItem): string {
    return record.motherNameSnapshot || String(record.motherPatient?.['firstName'] || '—');
  }

  statusClass(status: string): string {
    return `birth-status birth-status--${status.toLowerCase().replace(/_/g, '-')}`;
  }

  motherContextName(): string {
    const mother = this.motherContext?.mother;
    if (!mother) return '—';
    return `${mother.firstName || ''} ${mother.lastName || ''}`.trim() || '—';
  }

  motherContextMr(): string {
    return this.motherContext?.mother?.patientNo || '—';
  }

  motherAdmissionNo(): string {
    return this.motherContext?.admission?.admissionNo || '—';
  }

  motherContextRoomBed(): string {
    const admission = this.motherContext?.admission;
    if (!admission) return 'Not admitted';
    const room = admission.room?.name || admission.room?.roomNo || '—';
    const bed = admission.bed?.bedNo || admission.bed?.name || '—';
    return `${room} / ${bed}`;
  }

  certificateBabyName(): string {
    return this.certificateDetail?.snapshot?.baby?.name || '—';
  }

  certificateBabyMr(): string {
    return this.certificateDetail?.snapshot?.baby?.mrNo || '—';
  }

  certificateMotherName(): string {
    return this.certificateDetail?.snapshot?.mother?.name || '—';
  }

  certificateVerificationCode(): string {
    return this.certificateDetail?.verificationDisplayCode || '—';
  }
}
