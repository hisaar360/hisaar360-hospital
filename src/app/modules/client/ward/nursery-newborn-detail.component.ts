import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { initialsFromName, resolveAssetUrl } from '../../../core/utils/asset.util';

interface NurseryFeedingRow {
  _id: string;
  recordedAt?: string | Date;
  feedingType?: string;
  amount?: string;
  durationMinutes?: number | null;
  toleranceNotes?: string;
  recordedByName?: string;
}

interface NurseryNewbornDetail {
  _id: string;
  status: string;
  birthAt?: string | Date;
  birthWeightGrams?: number | null;
  gestationalAgeWeeks?: number | null;
  modeOfDelivery?: string;
  babyPatient?: Record<string, unknown>;
  motherPatient?: Record<string, unknown>;
  nurseryWard?: Record<string, unknown>;
  nurseryBed?: Record<string, unknown>;
  motherRoomAllotment?: Record<string, unknown>;
  consultantDoctorId?: Record<string, unknown>;
  feedings?: NurseryFeedingRow[];
  birthRecord?: Record<string, unknown> | null;
  certificate?: Record<string, unknown> | null;
}

@Component({
  selector: 'app-nursery-newborn-detail',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './nursery-newborn-detail.component.html',
  styleUrl: './nursery-newborn-detail.component.scss',
})
export class NurseryNewbornDetailComponent implements OnInit {
  loading = false;
  saving = false;
  detail: NurseryNewbornDetail | null = null;
  activeTab = 'overview';

  feedingForm = {
    feedingType: 'breastfeeding',
    amount: '',
    durationMinutes: '',
    toleranceNotes: '',
  };

  readonly tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'mother', label: 'Mother Link' },
    { key: 'vitals', label: 'Vitals' },
    { key: 'feeding', label: 'Feeding' },
    { key: 'medications', label: 'Medications' },
    { key: 'birth', label: 'Birth Record' },
    { key: 'discharge', label: 'Discharge' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) return;
      this.loadDetail(id);
    });
  }

  loadDetail(id: string): void {
    this.loading = true;
    this.backend
      .getNurseryNewborn(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.detail = result as unknown as NurseryNewbornDetail;
        },
        error: () => this.toastr.error('Unable to load newborn profile.'),
      });
  }

  setTab(key: string): void {
    this.activeTab = key;
  }

  babyLabel(): string {
    const baby = this.detail?.babyPatient;
    if (!baby) return '—';
    const provisional = String(baby['provisionalLabel'] || '').trim();
    if (provisional) return provisional;
    return `${baby['firstName'] || ''} ${baby['lastName'] || ''}`.trim() || '—';
  }

  babyMr(): string {
    return String(this.detail?.babyPatient?.['patientNo'] || '—');
  }

  babyPhoto(): string {
    return resolveAssetUrl(String(this.detail?.babyPatient?.['photoUrl'] || ''));
  }

  babyInitials(): string {
    return initialsFromName(this.babyLabel());
  }

  babyGender(): string {
    return String(this.detail?.babyPatient?.['gender'] || '—');
  }

  babyDob(): string {
    const dob = this.detail?.babyPatient?.['dateOfBirth'] || this.detail?.birthAt;
    if (!dob) return 'Not recorded';
    const date = new Date(String(dob));
    return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
  }

  babyAge(): string {
    const dob = this.detail?.babyPatient?.['dateOfBirth'] || this.detail?.birthAt;
    if (!dob) return '—';
    const date = new Date(String(dob));
    if (Number.isNaN(date.getTime())) return '—';
    const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000));
    if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  birthWeightLabel(): string {
    const grams = this.detail?.birthWeightGrams;
    if (grams === null || grams === undefined) return 'Not recorded';
    return `${(Number(grams) / 1000).toFixed(3)} kg`;
  }

  motherLabel(): string {
    const mother = this.detail?.motherPatient;
    if (!mother) return '—';
    return `${mother['firstName'] || ''} ${mother['lastName'] || ''}`.trim() || '—';
  }

  motherMr(): string {
    return String(this.detail?.motherPatient?.['patientNo'] || '—');
  }

  nurseryBedLabel(): string {
    const bed = this.detail?.nurseryBed;
    return String(bed?.['bedNo'] || bed?.['name'] || '—');
  }

  nurseryWardLabel(): string {
    return String(this.detail?.nurseryWard?.['name'] || '—');
  }

  motherRoomBedLabel(): string {
    const allotment = this.detail?.motherRoomAllotment as Record<string, unknown> | undefined;
    const room = allotment?.['roomId'] as Record<string, unknown> | undefined;
    const bed = allotment?.['bedId'] as Record<string, unknown> | undefined;
    const roomLabel = String(room?.['name'] || room?.['roomNo'] || '—');
    const bedLabel = String(bed?.['bedNo'] || bed?.['name'] || '—');
    return `${roomLabel} / ${bedLabel}`;
  }

  consultantLabel(): string {
    const doctor = this.detail?.consultantDoctorId as Record<string, unknown> | undefined;
    const user = doctor?.['userId'] as Record<string, unknown> | undefined;
    return String(user?.['name'] || doctor?.['specialization'] || '—');
  }

  statusLabel(): string {
    if (this.detail?.status === 'discharged') return 'Discharged';
    if (this.detail?.status === 'cancelled') return 'Cancelled';
    return 'Admitted';
  }

  statusClass(): string {
    if (this.detail?.status === 'discharged') return 'ward-badge ward-badge--draft';
    if (this.detail?.status === 'cancelled') return 'ward-badge ward-badge--critical';
    return 'ward-badge ward-badge--active';
  }

  feedingTypeLabel(value?: string): string {
    return String(value || 'other').replace(/_/g, ' ');
  }

  openMotherProfile(): void {
    const motherId = String(this.detail?.motherPatient?.['_id'] || '');
    if (!motherId) {
      this.toastr.info('Mother patient link not available.');
      return;
    }
    void this.router.navigate(['/patients/all-patients'], { queryParams: { patientId: motherId } });
  }

  saveFeeding(): void {
    if (!this.detail?._id) return;
    this.saving = true;
    this.backend
      .createNurseryFeeding(this.detail._id, {
        feedingType: this.feedingForm.feedingType,
        amount: this.feedingForm.amount || undefined,
        durationMinutes: this.feedingForm.durationMinutes ? Number(this.feedingForm.durationMinutes) : undefined,
        toleranceNotes: this.feedingForm.toleranceNotes || undefined,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Feeding record saved.');
          this.feedingForm = { feedingType: 'breastfeeding', amount: '', durationMinutes: '', toleranceNotes: '' };
          this.loadDetail(this.detail!._id);
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save feeding record.'),
      });
  }

  navigateWard(path: string): void {
    void this.router.navigate([path]);
  }
}
