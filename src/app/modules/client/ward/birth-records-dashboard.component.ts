import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, TimeoutError, finalize, takeUntil, timeout } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { HmsDocumentService } from '../../../core/services/hms-document.service';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import { HmsPatientSearchComponent } from '../../../shared/components/hms-patient-search/hms-patient-search.component';
import {
  BirthCertificateDetail,
  BirthRecordMotherContext,
} from '../../../shared/models/birth-records.model';
import { Patient } from '../../../shared/models/hospital.model';
import { BirthRecordItem, BirthCertificateRecord, buildBirthCertificatePrintHtml, resolveBirthCertificateVerificationBaseUrl } from './birth-certificate-print.builder';

const CERTIFICATE_FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-birth-records-dashboard',
  imports: [CommonModule, FormsModule, RouterLink, HmsPatientSearchComponent, HmsDocumentToolbarComponent],
  templateUrl: './birth-records-dashboard.component.html',
  styleUrl: './birth-records-dashboard.component.scss',
})
export class BirthRecordsDashboardComponent implements OnInit, OnDestroy {
  loading = false;
  saving = false;
  certificateLoading = false;
  kpis = { birthsToday: 0, pendingVerification: 0, certificatesPending: 0, certificatesIssued: 0 };
  records: BirthRecordItem[] = [];
  recordOpen = false;
  motherContext: BirthRecordMotherContext | null = null;
  selectedRecord: BirthRecordItem | null = null;
  certificateDetail: BirthCertificateDetail | null = null;
  certificateActionsOpen = false;
  filters = { search: '', status: '' };

  private readonly destroy$ = new Subject<void>();
  private certificateRequestSeq = 0;

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
    private route: ActivatedRoute,
    private docs: HmsDocumentService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('record') === '1') {
        this.openRecordBirth();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  private resolveCertificateId(record: BirthRecordItem): string {
    const cert = record.activeCertificate as (BirthCertificateRecord & { id?: string }) | null | undefined;
    return String(cert?._id || cert?.id || '').trim();
  }

  private isValidCertificateDetail(detail: unknown): detail is BirthCertificateDetail {
    if (!detail || typeof detail !== 'object') return false;
    const record = detail as Record<string, unknown>;
    const id = String(record['_id'] || record['id'] || '').trim();
    const certificateNo = String(record['certificateNo'] || '').trim();
    return Boolean(id && certificateNo);
  }

  /** Instant summary from list row so View Record is never blocked on a slow API. */
  private provisionalCertificateDetail(record: BirthRecordItem): BirthCertificateDetail | null {
    const cert = record.activeCertificate as (BirthCertificateRecord & {
      id?: string;
      snapshot?: BirthCertificateDetail['snapshot'];
      issuedAt?: string | Date;
      status?: string;
      version?: number;
    }) | null;
    const certificateId = this.resolveCertificateId(record);
    if (!certificateId || !cert?.certificateNo) return null;
    return {
      _id: certificateId,
      certificateNo: cert.certificateNo,
      status: cert.status || 'ACTIVE',
      version: Number(cert.version || 1),
      issuedAt: cert.issuedAt || new Date().toISOString(),
      snapshot: cert.snapshot || {
        baby: {
          name:
            String(record.babyPatient?.['firstName'] || record.babyPatient?.['name'] || '').trim() ||
            `Baby of ${record.motherNameSnapshot || 'Mother'}`,
          mrNo: String(record.babyPatient?.['patientNo'] || ''),
        },
        mother: {
          name: record.motherNameSnapshot || '—',
          mrNo: record.motherMRNoSnapshot || '',
        },
        hospital: { name: '' },
        delivery: {},
        signatory: {},
      },
      verificationDisplayCode: (cert as { verificationDisplayCode?: string }).verificationDisplayCode || '',
      publicVerificationCode: '',
      verificationBaseUrl: resolveBirthCertificateVerificationBaseUrl(),
    } as BirthCertificateDetail;
  }

  private certificateFetchErrorMessage(err: unknown): string {
    if (err instanceof TimeoutError) {
      return 'Certificate request timed out. Check network/API and try again.';
    }
    const message = (err as { error?: { message?: string } })?.error?.message;
    return message || 'Unable to load certificate.';
  }

  private fetchCertificateDetail(
    certificateId: string,
    onSuccess: (detail: BirthCertificateDetail) => void,
    options?: { showBlockingLoader?: boolean }
  ): void {
    const requestId = ++this.certificateRequestSeq;
    const showBlockingLoader = options?.showBlockingLoader === true;
    if (showBlockingLoader) {
      this.certificateLoading = true;
    }
    this.backend
      .getBirthCertificate(certificateId)
      .pipe(
        timeout(CERTIFICATE_FETCH_TIMEOUT_MS),
        takeUntil(this.destroy$),
        finalize(() => {
          if (requestId === this.certificateRequestSeq) {
            this.certificateLoading = false;
          }
        })
      )
      .subscribe({
        next: (detail) => {
          if (requestId !== this.certificateRequestSeq) return;
          if (!this.isValidCertificateDetail(detail)) {
            if (!this.certificateDetail) {
              this.toastr.error('Certificate response was empty. Check permissions and try again.');
            }
            return;
          }
          // Always use hospital-app verify URL so QR scans open this SPA's verify page.
          detail.verificationBaseUrl = resolveBirthCertificateVerificationBaseUrl(
            detail.verificationBaseUrl
          );
          onSuccess(detail);
        },
        error: (err) => {
          if (requestId !== this.certificateRequestSeq) return;
          if (!this.certificateDetail) {
            this.toastr.error(this.certificateFetchErrorMessage(err));
          } else {
            this.toastr.warning('Could not refresh certificate details. Showing saved summary.');
          }
        },
      });
  }

  openCertificate(record: BirthRecordItem): void {
    const certificateId = this.resolveCertificateId(record);
    if (!certificateId) {
      this.toastr.error('Certificate id missing. Refresh and try again.');
      return;
    }
    this.selectedRecord = record;
    this.fetchCertificateDetail(
      certificateId,
      (detail) => {
        try {
          const html = buildBirthCertificatePrintHtml({
            certificate: detail,
            verificationCode: detail.publicVerificationCode || '',
            verificationBaseUrl: resolveBirthCertificateVerificationBaseUrl(
              detail.verificationBaseUrl
            ),
          });
          if (!html.trim()) {
            this.toastr.error('Unable to render certificate preview.');
            return;
          }
          if (!detail.publicVerificationCode) {
            this.toastr.warning(
              'Verification code missing — re-issue or re-print after fixing JWT/settings if QR must work.'
            );
          }
          this.docs.openPreview({
            title: 'Hospital Birth Certificate',
            filename: `${detail.certificateNo || 'birth-certificate'}.pdf`,
            html,
            orientation: 'portrait',
          });
        } catch {
          this.toastr.error('Unable to render certificate preview.');
        }
      },
      { showBlockingLoader: true }
    );
  }

  openCertificateSummary(record: BirthRecordItem): void {
    const certificateId = this.resolveCertificateId(record);
    if (!certificateId) {
      this.toastr.error('Certificate id missing. Refresh and try again.');
      return;
    }

    this.selectedRecord = record;
    this.certificateActionsOpen = false;
    // Never block the UI on the detail API — open from list data immediately.
    const provisional = this.provisionalCertificateDetail(record);
    if (provisional) {
      this.certificateDetail = provisional;
      this.certificateLoading = false;
      this.fetchCertificateDetail(
        certificateId,
        (detail) => {
          this.certificateDetail = detail;
        },
        { showBlockingLoader: false }
      );
      return;
    }

    this.certificateDetail = null;
    this.fetchCertificateDetail(
      certificateId,
      (detail) => {
        this.certificateDetail = detail;
      },
      { showBlockingLoader: true }
    );
  }

  /** Cancel in-flight certificate fetch / dismiss stuck loader. */
  certificateRequestCancel(): void {
    this.certificateRequestSeq += 1;
    this.certificateLoading = false;
  }

  closeCertificateSummary(): void {
    this.certificateRequestCancel();
    this.certificateActionsOpen = false;
    this.certificateDetail = null;
    this.selectedRecord = null;
  }

  previewCertificateDetail(): void {
    const detail = this.certificateDetail;
    if (!detail) {
      this.toastr.error('Certificate details are not loaded.');
      return;
    }
    const html = this.buildBirthCertificateDocumentHtml();
    if (!html.trim()) {
      this.toastr.error('Unable to render certificate preview.');
      return;
    }
    this.docs.openPreview({
      title: 'Hospital Birth Certificate',
      filename: `${detail.certificateNo || 'birth-certificate'}.pdf`,
      html,
      orientation: 'portrait',
    });
  }

  printCertificateDetail(): void {
    const detail = this.certificateDetail;
    if (!detail) return;
    const html = this.buildBirthCertificateDocumentHtml();
    if (!html.trim()) {
      this.toastr.error('Unable to render certificate.');
      return;
    }
    this.docs.printHtml(html, 'Hospital Birth Certificate');
    this.onBirthCertificatePrinted();
  }

  buildBirthCertificateDocumentHtml = (): string => {
    const cert = this.certificateDetail;
    if (!cert) return '';
    return buildBirthCertificatePrintHtml({
      certificate: cert,
      verificationCode: cert.publicVerificationCode || '',
      verificationBaseUrl: resolveBirthCertificateVerificationBaseUrl(cert.verificationBaseUrl),
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

  certificateMotherMr(): string {
    return this.certificateDetail?.snapshot?.mother?.mrNo || this.selectedRecord?.motherMRNoSnapshot || '—';
  }

  certificateMotherAge(): string {
    const mother = this.selectedRecord?.motherPatient as Record<string, unknown> | undefined;
    const explicitAge = mother?.['age'];
    if (explicitAge !== undefined && explicitAge !== null && String(explicitAge).trim()) {
      return String(explicitAge);
    }
    const dateOfBirth = mother?.['dateOfBirth'];
    if (!dateOfBirth) return '—';
    const birthDate = new Date(String(dateOfBirth));
    if (Number.isNaN(birthDate.getTime())) return '—';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age -= 1;
    return age >= 0 ? `${age} years` : '—';
  }

  certificateMotherContact(): string {
    const mother = this.selectedRecord?.motherPatient as Record<string, unknown> | undefined;
    return this.displayRecordValue(mother?.['phone'] || mother?.['mobile'] || mother?.['contact']);
  }

  certificateMotherAddress(): string {
    const snapshotAddress = this.certificateDetail?.snapshot?.mother?.address;
    const mother = this.selectedRecord?.motherPatient as Record<string, unknown> | undefined;
    return this.displayRecordValue(snapshotAddress || mother?.['address']);
  }

  certificateBabyGender(): string {
    const value = this.certificateDetail?.snapshot?.baby?.sex || this.selectedRecord?.sexAtBirth;
    const gender = String(value || '').trim();
    return gender ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase() : '—';
  }

  certificateBirthDateTime(): string {
    const baby = this.certificateDetail?.snapshot?.baby;
    const dateValue = baby?.dateOfBirth || this.selectedRecord?.dateOfBirth;
    const timeValue = baby?.timeOfBirth || this.selectedRecord?.timeOfBirth;
    if (!dateValue) return '—';

    const rawDate = String(dateValue);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && timeValue
      ? new Date(`${rawDate}T${timeValue}`)
      : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';
    const hasTime = Boolean(timeValue) || /T\d{2}:\d{2}/.test(rawDate);
    return hasTime
      ? date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' })
      : date.toLocaleDateString('en-US', { dateStyle: 'medium' });
  }

  certificateBirthWeight(): string {
    const weight = this.certificateDetail?.snapshot?.baby?.birthWeightGrams ?? this.selectedRecord?.birthWeightGrams;
    return weight !== undefined && weight !== null && Number(weight) > 0 ? `${weight} g` : '—';
  }

  certificateVerificationCode(): string {
    return this.certificateDetail?.verificationDisplayCode || '—';
  }

  certificateVerifiedOn(): string | Date {
    const record = this.selectedRecord as unknown as Record<string, unknown> | null;
    return this.asDateValue(record?.['verifiedAt'] || record?.['verificationDate'] || this.certificateDetail?.issuedAt);
  }

  certificateVerifiedBy(): string {
    const record = this.selectedRecord as unknown as Record<string, unknown> | null;
    return this.displayActor(record?.['verifiedBy'] || record?.['verifiedByUser'] || record?.['verifiedByUserId'], 'System');
  }

  certificateIssuedBy(): string {
    const detail = this.certificateDetail as unknown as Record<string, unknown> | null;
    return this.displayActor(detail?.['issuedBy'] || detail?.['issuedByUser'] || detail?.['issuedByUserId']);
  }

  certificateCreatedBy(): string {
    const detail = this.certificateDetail as unknown as Record<string, unknown> | null;
    const record = this.selectedRecord as unknown as Record<string, unknown> | null;
    return this.displayActor(detail?.['createdBy'] || detail?.['createdByUser'] || record?.['createdBy']);
  }

  certificateCreatedOn(): string | Date {
    const detail = this.certificateDetail as unknown as Record<string, unknown> | null;
    return this.asDateValue(detail?.['createdAt'] || this.certificateDetail?.issuedAt);
  }

  certificateUpdatedOn(): string | Date {
    const detail = this.certificateDetail as unknown as Record<string, unknown> | null;
    return this.asDateValue(detail?.['updatedAt'] || detail?.['createdAt'] || this.certificateDetail?.issuedAt);
  }

  certificateStatusLabel(): string {
    const status = String(this.certificateDetail?.status || '').toUpperCase();
    if (status === 'ACTIVE') return 'Issued';
    return status ? this.statusLabel(status) : 'Not Issued';
  }

  private asDateValue(value: unknown): string | Date {
    if (value instanceof Date) return value;
    const text = String(value || '').trim();
    return text || new Date(0);
  }

  private displayRecordValue(value: unknown, fallback = '—'): string {
    const text = String(value ?? '').trim();
    return text && !/^not\s*provided$/i.test(text) ? text : fallback;
  }

  private displayActor(value: unknown, fallback = '—'): string {
    if (!value) return fallback;
    if (typeof value === 'string') return this.displayRecordValue(value, fallback);
    if (typeof value !== 'object') return this.displayRecordValue(value, fallback);
    const actor = value as Record<string, unknown>;
    const fullName = `${actor['firstName'] || ''} ${actor['lastName'] || ''}`.trim();
    return this.displayRecordValue(fullName || actor['name'] || actor['email'] || actor['username'], fallback);
  }
}
