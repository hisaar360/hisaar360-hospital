import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { initialsFromName, resolveAssetUrl } from '../../../core/utils/asset.util';
import { BackendService } from '../../../core/services/backend.service';
import { HmsPatientSearchComponent } from '../../../shared/components/hms-patient-search/hms-patient-search.component';
import { BirthRecordMotherContext } from '../../../shared/models/birth-records.model';
import { Patient } from '../../../shared/models/hospital.model';

interface NurseryKpis {
  activeNewborns: number;
  availableBeds: number;
  occupiedBeds: number;
  dischargesToday: number;
  pendingCertificates: number;
  totalBeds: number;
}

interface NurseryFeedingRow {
  _id: string;
  recordedAt?: string | Date;
  feedingType?: string;
  amount?: string;
  babyLabel?: string;
}

interface NurseryPendingCertRow {
  _id: string;
  birthRecordNo?: string;
  status?: string;
  babyLabel?: string;
  motherLabel?: string;
  dateOfBirth?: string | Date;
}

interface NurseryNewbornRow {
  _id: string;
  status: string;
  birthAt?: string | Date;
  birthWeightGrams?: number | null;
  gestationalAgeWeeks?: number | null;
  modeOfDelivery?: string;
  birthRecord?: { birthRecordNo?: string; status?: string } | null;
  certificate?: { certificateNo?: string; status?: string } | null;
  babyPatient?: Record<string, unknown>;
  motherPatient?: Record<string, unknown>;
  motherRoomLabel?: string;
  motherBedLabel?: string;
  nurseryBedLabel?: string;
  nurseryWardLabel?: string;
  consultantLabel?: string;
  feedings?: NurseryFeedingRow[];
}

@Component({
  selector: 'app-nursery-dashboard',
  imports: [CommonModule, FormsModule, RouterLink, HmsPatientSearchComponent],
  templateUrl: './nursery-dashboard.component.html',
  styleUrl: './nursery-dashboard.component.scss',
})
export class NurseryDashboardComponent implements OnInit {
  loading = false;
  saving = false;
  registerOpen = false;
  menuOpenId = '';

  kpis: NurseryKpis = {
    activeNewborns: 0,
    availableBeds: 0,
    occupiedBeds: 0,
    dischargesToday: 0,
    pendingCertificates: 0,
    totalBeds: 0,
  };

  newborns: NurseryNewbornRow[] = [];
  filteredNewborns: NurseryNewbornRow[] = [];
  selectedNewborn: NurseryNewbornRow | null = null;
  recentFeedings: NurseryFeedingRow[] = [];
  pendingCertificates: NurseryPendingCertRow[] = [];
  medicationDue: Array<Record<string, unknown>> = [];

  filters = {
    search: '',
    status: '',
    ward: '',
    bed: '',
    date: '',
  };

  registerForm = {
    motherPatientId: '',
    provisionalName: '',
    gender: 'female',
    birthWeightGrams: '',
    birthOrder: 'Singleton',
    plurality: 'singleton',
    dateOfBirth: '',
    timeOfBirth: '',
    notes: '',
  };

  registerErrors: Record<string, string> = {};
  selectedMother: Patient | null = null;
  motherContext: BirthRecordMotherContext | null = null;

  readonly kpiCards = [
    { key: 'activeNewborns', label: 'Newborns Admitted', support: 'Currently admitted', icon: 'fa-child', tone: 'blue' },
    { key: 'availableBeds', label: 'Available Cots / Beds', support: 'of total capacity', icon: 'fa-bed', tone: 'teal' },
    { key: 'occupiedBeds', label: 'Occupied Beds', support: 'In nursery', icon: 'fa-hospital-o', tone: 'green' },
    { key: 'dischargesToday', label: 'Discharges Today', support: "Today's count", icon: 'fa-sign-out', tone: 'amber' },
    { key: 'pendingCertificates', label: 'Pending Certificates', support: 'Require verification', icon: 'fa-file-text-o', tone: 'rose' },
  ] as const;

  readonly quickActions = [
    { label: 'Vitals & Obs.', icon: 'fa-heartbeat', route: '/ward/vitals' },
    { label: 'Feeding Record', icon: 'fa-cutlery', action: 'feeding' as const },
    { label: 'Medicines', icon: 'fa-medkit', route: '/ward/mar' },
    { label: 'MAR', icon: 'fa-list-alt', route: '/ward/mar' },
    { label: 'Birth Certificate', icon: 'fa-certificate', route: '/ward/nursery/birth-records' },
    { label: 'Mother Profile', icon: 'fa-female', action: 'mother' as const },
  ];

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.backend
      .getNurseryDashboard()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.kpis = { ...this.kpis, ...(result['kpis'] as NurseryKpis) };
          this.newborns = (result['newborns'] as NurseryNewbornRow[]) || [];
          this.recentFeedings = (result['recentFeedings'] as NurseryFeedingRow[]) || [];
          this.pendingCertificates = (result['pendingCertificates'] as NurseryPendingCertRow[]) || [];
          this.medicationDue = (result['medicationDue'] as Array<Record<string, unknown>>) || [];
          this.applyFilters();
        },
        error: () => this.toastr.error('Unable to load nursery dashboard.'),
      });
  }

  applyFilters(): void {
    const term = this.filters.search.trim().toLowerCase();
    this.filteredNewborns = this.newborns.filter((item) => {
      if (term) {
        const haystack = [
          this.babyLabel(item),
          this.babyMr(item),
          this.motherLabel(item),
          String(item.motherPatient?.['patientNo'] || ''),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (this.filters.status && item.status !== this.filters.status) return false;
      if (this.filters.ward && item.nurseryWardLabel !== this.filters.ward) return false;
      if (this.filters.bed && item.nurseryBedLabel !== this.filters.bed) return false;
      if (this.filters.date) {
        const dob = item.birthAt || item.babyPatient?.['dateOfBirth'];
        if (!dob) return false;
        const date = new Date(String(dob));
        const filterDate = new Date(this.filters.date);
        if (
          date.getFullYear() !== filterDate.getFullYear() ||
          date.getMonth() !== filterDate.getMonth() ||
          date.getDate() !== filterDate.getDate()
        ) {
          return false;
        }
      }
      return true;
    });

    if (!this.filteredNewborns.length) {
      this.selectedNewborn = null;
      return;
    }

    const stillSelected = this.selectedNewborn
      ? this.filteredNewborns.find((item) => item._id === this.selectedNewborn?._id)
      : null;
    this.selectedNewborn = stillSelected || this.filteredNewborns[0];
  }

  resetFilters(): void {
    this.filters = { search: '', status: '', ward: '', bed: '', date: '' };
    this.applyFilters();
  }

  kpiValue(key: (typeof this.kpiCards)[number]['key']): number {
    return Number(this.kpis[key] || 0);
  }

  kpiSupport(key: (typeof this.kpiCards)[number]['key']): string {
    if (key === 'availableBeds') {
      const total = this.kpis.totalBeds || this.kpis.availableBeds + this.kpis.occupiedBeds;
      return total ? `of ${total} total` : 'of total capacity';
    }
    return this.kpiCards.find((card) => card.key === key)?.support || '';
  }

  selectNewborn(item: NurseryNewbornRow): void {
    this.selectedNewborn = item;
    this.menuOpenId = '';
  }

  toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.menuOpenId = this.menuOpenId === id ? '' : id;
  }

  closeMenus(): void {
    this.menuOpenId = '';
  }

  openRegister(): void {
    this.registerOpen = true;
    this.registerErrors = {};
    this.selectedMother = null;
    this.motherContext = null;
    this.registerForm = {
      motherPatientId: '',
      provisionalName: '',
      gender: 'female',
      birthWeightGrams: '',
      birthOrder: 'Singleton',
      plurality: 'singleton',
      dateOfBirth: new Date().toISOString().slice(0, 10),
      timeOfBirth: new Date().toTimeString().slice(0, 5),
      notes: '',
    };
  }

  openRecordBirth(): void {
    void this.router.navigate(['/ward/nursery/birth-records'], { queryParams: { record: '1' } });
  }

  onMotherSelected(patient: Patient | null): void {
    this.selectedMother = patient;
    this.registerForm.motherPatientId = patient?._id || '';
    if (patient) {
      const motherName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
      this.registerForm.provisionalName = motherName ? `Baby of ${motherName}` : '';
    } else {
      this.registerForm.provisionalName = '';
    }
    this.clearRegisterError('motherPatientId');
  }

  onMotherContext(context: BirthRecordMotherContext | null): void {
    this.motherContext = context;
  }

  validateRegisterForm(): boolean {
    this.registerErrors = {};
    if (!this.registerForm.motherPatientId.trim()) {
      this.registerErrors['motherPatientId'] = 'Select a mother patient to continue.';
    }
    if (!this.registerForm.gender) {
      this.registerErrors['gender'] = 'Sex is required.';
    }
    if (this.registerForm.birthWeightGrams && Number.isNaN(Number(this.registerForm.birthWeightGrams))) {
      this.registerErrors['birthWeightGrams'] = 'Birth weight must be a number.';
    }
    return Object.keys(this.registerErrors).length === 0;
  }

  clearRegisterError(key: string): void {
    delete this.registerErrors[key];
  }

  registerNewborn(): void {
    if (!this.validateRegisterForm()) {
      this.toastr.error('Please complete the required fields.');
      return;
    }
    this.saving = true;
    const birthAt = this.combineDateTime(this.registerForm.dateOfBirth, this.registerForm.timeOfBirth);
    const motherName = this.selectedMother
      ? `${this.selectedMother.firstName || ''} ${this.selectedMother.lastName || ''}`.trim()
      : '';
    this.backend
      .registerNurseryNewborn({
        motherPatientId: this.registerForm.motherPatientId.trim(),
        gender: this.registerForm.gender,
        birthOrder: this.registerForm.birthOrder,
        birthWeightGrams: this.registerForm.birthWeightGrams ? Number(this.registerForm.birthWeightGrams) : undefined,
        birthAt: birthAt || undefined,
        babyFirstName: 'Baby of',
        babyLastName: motherName || 'Mother',
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Newborn registered.');
          this.registerOpen = false;
          this.loadDashboard();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to register newborn.'),
      });
  }

  combineDateTime(date: string, time: string): string | null {
    if (!date) return null;
    const value = time ? `${date}T${time}` : `${date}T00:00`;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  openProfile(item: NurseryNewbornRow): void {
    void this.router.navigate(['/ward/nursery', item._id]);
  }

  openMotherProfile(item: NurseryNewbornRow): void {
    const motherId = String(item.motherPatient?.['_id'] || '');
    if (!motherId) {
      this.toastr.info('Mother patient link not available.');
      return;
    }
    void this.router.navigate(['/patients/all-patients'], { queryParams: { patientId: motherId } });
  }

  runQuickAction(action: (typeof this.quickActions)[number]): void {
    if (!this.selectedNewborn) return;
    if (action.action === 'mother') {
      this.openMotherProfile(this.selectedNewborn);
      return;
    }
    if (action.action === 'feeding') {
      this.openProfile(this.selectedNewborn);
      return;
    }
    if (action.route) {
      void this.router.navigate([action.route]);
    }
  }

  babyLabel(item: NurseryNewbornRow): string {
    const baby = item.babyPatient;
    if (!baby) return '—';
    const provisional = String(baby['provisionalLabel'] || '').trim();
    if (provisional) return provisional;
    return `${baby['firstName'] || ''} ${baby['lastName'] || ''}`.trim() || '—';
  }

  babyMr(item: NurseryNewbornRow): string {
    return String(item.babyPatient?.['patientNo'] || '—');
  }

  motherLabel(item: NurseryNewbornRow): string {
    const mother = item.motherPatient;
    if (!mother) return '—';
    return `${mother['firstName'] || ''} ${mother['lastName'] || ''}`.trim() || '—';
  }

  babyPhoto(item?: NurseryNewbornRow | null): string {
    return resolveAssetUrl(String(item?.babyPatient?.['photoUrl'] || ''));
  }

  babyInitials(item?: NurseryNewbornRow | null): string {
    return initialsFromName(this.babyLabel(item || ({} as NurseryNewbornRow)));
  }

  babyGender(item?: NurseryNewbornRow | null): string {
    return String(item?.babyPatient?.['gender'] || '—');
  }

  babyAge(item?: NurseryNewbornRow | null): string {
    const dob = item?.babyPatient?.['dateOfBirth'] || item?.birthAt;
    if (!dob) return '—';
    const date = new Date(String(dob));
    if (Number.isNaN(date.getTime())) return '—';
    const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000));
    if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  birthWeightLabel(item?: NurseryNewbornRow | null): string {
    const grams = item?.birthWeightGrams;
    if (!grams && grams !== 0) return 'Not recorded';
    return `${(Number(grams) / 1000).toFixed(3)} kg`;
  }

  statusLabel(item: NurseryNewbornRow): string {
    if (item.status === 'discharged') return 'Discharged';
    if (item.status === 'cancelled') return 'Cancelled';
    return 'Admitted';
  }

  statusClass(item: NurseryNewbornRow): string {
    if (item.status === 'discharged') return 'ward-badge ward-badge--draft';
    if (item.status === 'cancelled') return 'ward-badge ward-badge--critical';
    return 'ward-badge ward-badge--active';
  }

  certificateStatus(item?: NurseryNewbornRow | null): string {
    if (item?.certificate?.certificateNo) return item.certificate.certificateNo;
    if (item?.birthRecord?.status) return item.birthRecord.status.replace(/_/g, ' ');
    return 'Not recorded';
  }

  feedingTypeLabel(value?: string): string {
    return String(value || 'other').replace(/_/g, ' ');
  }

  timeAgo(value?: string | Date): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    return date.toLocaleDateString();
  }

  bornOnLabel(item?: NurseryNewbornRow | null): string {
    const raw = item?.birthAt || item?.babyPatient?.['dateOfBirth'];
    if (!raw) return 'Not recorded';
    const date = new Date(String(raw));
    return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
  }

  wardOptions(): string[] {
    return [...new Set(this.newborns.map((item) => item.nurseryWardLabel || '').filter(Boolean))];
  }
}
