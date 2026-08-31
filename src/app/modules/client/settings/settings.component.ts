import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Doctor, Hospital, PrescriptionPrintSettings, User } from '../../../shared/models/hospital.model';
import { resolveAssetUrl } from '../../../core/utils/asset.util';
import { ProfilePhotoFieldComponent } from '../../../shared/components/profile-photo-field/profile-photo-field.component';
import { ImageViewerModalComponent } from '../../../shared/components/image-viewer-modal/image-viewer-modal.component';
import { isDoctorRole } from '../../auth/access-control';

type SettingsTab = 'profile' | 'password' | 'hospital';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProfilePhotoFieldComponent, ImageViewerModalComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  activeTab: SettingsTab = 'profile';
  currentUser: User | null = null;
  profileLoading = false;
  profileSaving = false;
  profileName = '';
  profileEmail = '';
  profilePhone = '';
  role = localStorage.getItem('role') || 'ADMIN';
  permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];

  hospitalProfile: Hospital | null = null;
  hospitalLoading = false;
  hospitalSaving = false;
  currentHospitalId = '';
  hospitalName = '';
  hospitalPhone = '';
  hospitalEmail = '';
  hospitalAddress = '';
  hospitalCity = '';
  hospitalCountry = '';
  hospitalLogoUrl = '';
  prescriptionShowLogo = true;
  prescriptionLogoScale = 100;
  prescriptionRevisionNote = '* Rx to be revised after Reports.';
  prescriptionFollowUpLine = '';
  prescriptionContactLine = '';
  prescriptionFooterLines = '';
  doctorProfile: Doctor | null = null;
  photoUploading = false;
  photoViewerOpen = false;

  constructor(
    private backend: BackendService,
    private authService: AuthService,
    private toaster: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadStoredUser();
    this.refreshCurrentUser();
  }

  setTab(tab: SettingsTab): void {
    if (tab === 'hospital' && !this.canReadHospitalSettings) {
      return;
    }
    this.activeTab = tab;
  }

  get profilePhotoUrl(): string {
    return resolveAssetUrl(this.doctorProfile?.photoUrl || this.currentUser?.photoUrl);
  }

  get canReadHospitalSettings(): boolean {
    return this.canManageHospitalSettings || this.permissions.includes('hospitals.read');
  }

  get canManageHospitalSettings(): boolean {
    return this.permissions.includes('*') || this.permissions.includes('hospitals.update');
  }

  saveProfile(): void {
    if (!this.profileName.trim()) {
      this.toaster.error('Name is required.');
      return;
    }

    if (!this.profileEmail.trim()) {
      this.toaster.error('Email is required.');
      return;
    }

    const payload = {
      name: this.profileName.trim(),
      email: this.profileEmail.trim(),
      phone: this.profilePhone.trim() || undefined,
    };

    this.profileSaving = true;
    this.backend
      .updateMe(payload)
      .pipe(finalize(() => (this.profileSaving = false)))
      .subscribe({
        next: (response) => {
          this.applyCurrentUser(response.data);
          this.toaster.success(response.message || 'Profile updated successfully.');
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to update profile.');
        },
      });
  }

  hospitalPrescriptionPreview(): PrescriptionPrintSettings & {
    hospitalName: string;
    hospitalAddress: string;
    hospitalContactLine: string;
    logoUrl: string;
  } {
    return {
      showLogo: this.prescriptionShowLogo,
      logoScale: this.normalizePrescriptionLogoScale(this.prescriptionLogoScale),
      revisionNote: this.prescriptionRevisionNote.trim() || '* Rx to be revised after Reports.',
      followUpLine: this.prescriptionFollowUpLine.trim() || this.defaultPrescriptionFollowUpLine(),
      contactLine: this.prescriptionContactLine.trim() || this.defaultHospitalContactLine(),
      footerLines: this.textareaToLines(this.prescriptionFooterLines),
      hospitalName: this.hospitalName.trim() || 'MediLink City Care Hospital',
      hospitalAddress: this.hospitalAddressLine(),
      hospitalContactLine: this.prescriptionContactLine.trim() || this.defaultHospitalContactLine(),
      logoUrl: this.hospitalLogoUrl.trim(),
    };
  }

  saveHospitalSettings(): void {
    if (!this.canManageHospitalSettings) {
      this.toaster.error('You do not have permission to update hospital settings.');
      return;
    }

    if (!this.currentHospitalId) {
      this.toaster.error('No hospital is assigned to this user.');
      return;
    }

    if (!this.hospitalName.trim()) {
      this.toaster.error('Hospital name is required.');
      return;
    }

    const payload: Record<string, unknown> = {
      name: this.hospitalName.trim(),
      phone: this.hospitalPhone.trim(),
      email: this.hospitalEmail.trim(),
      address: this.hospitalAddress.trim(),
      city: this.hospitalCity.trim(),
      country: this.hospitalCountry.trim(),
      logoUrl: this.hospitalLogoUrl.trim(),
      prescriptionSettings: {
        showLogo: this.prescriptionShowLogo,
        logoScale: this.normalizePrescriptionLogoScale(this.prescriptionLogoScale),
        revisionNote: this.prescriptionRevisionNote.trim(),
        followUpLine: this.prescriptionFollowUpLine.trim(),
        contactLine: this.prescriptionContactLine.trim(),
        footerLines: this.textareaToLines(this.prescriptionFooterLines),
      },
    };

    this.hospitalSaving = true;
    this.backend
      .updateHospital(this.currentHospitalId, payload)
      .pipe(finalize(() => (this.hospitalSaving = false)))
      .subscribe({
        next: (response) => {
          this.applyHospitalProfile(response.data);
          this.toaster.success('Hospital settings updated successfully.');
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to update hospital settings.');
        },
      });
  }

  onHospitalLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toaster.error('Please select an image file.');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toaster.error('Logo image must be 5 MB or smaller.');
      input.value = '';
      return;
    }

    void this.prepareHospitalLogo(file)
      .then((dataUrl) => {
        this.hospitalLogoUrl = dataUrl;
        this.prescriptionShowLogo = true;
      })
      .catch(() => this.toaster.error('Unable to read selected logo.'))
      .finally(() => {
        input.value = '';
      });
  }

  clearHospitalLogo(): void {
    this.hospitalLogoUrl = '';
  }

  onProfilePhotoSelected(file: File | null): void {
    if (!file) {
      return;
    }

    this.photoUploading = true;

    if (this.doctorProfile) {
      this.backend
        .uploadMyDoctorPhoto(file)
        .pipe(finalize(() => (this.photoUploading = false)))
        .subscribe({
          next: (response) => {
            if (response.data) {
              this.doctorProfile = response.data;
            }
            this.toaster.success(response.message || 'Photo updated.');
            this.refreshCurrentUser();
          },
          error: (error: { error?: { message?: string } }) => {
            this.toaster.error(error?.error?.message || 'Unable to upload photo.');
          },
        });
      return;
    }

    this.backend
      .uploadMyPhoto(file)
      .pipe(finalize(() => (this.photoUploading = false)))
      .subscribe({
        next: (response) => {
          this.toaster.success(response.message || 'Photo updated.');
          this.refreshCurrentUser();
        },
        error: (error: { error?: { message?: string } }) => {
          this.toaster.error(error?.error?.message || 'Unable to upload photo.');
        },
      });
  }

  removeProfilePhoto(): void {
    this.photoUploading = true;

    if (this.doctorProfile) {
      this.backend
        .deleteMyDoctorPhoto()
        .pipe(finalize(() => (this.photoUploading = false)))
        .subscribe({
          next: (response) => {
            this.doctorProfile = {
              ...this.doctorProfile!,
              photoUrl: null,
              photoKey: null,
            };
            this.toaster.success(response.message || 'Photo removed.');
            this.refreshCurrentUser();
          },
          error: (error: { error?: { message?: string } }) => {
            this.toaster.error(error?.error?.message || 'Unable to remove photo.');
          },
        });
      return;
    }

    this.backend
      .deleteMyPhoto()
      .pipe(finalize(() => (this.photoUploading = false)))
      .subscribe({
        next: (response) => {
          this.toaster.success(response.message || 'Photo removed.');
          this.refreshCurrentUser();
        },
        error: (error: { error?: { message?: string } }) => {
          this.toaster.error(error?.error?.message || 'Unable to remove photo.');
        },
      });
  }

  private loadStoredUser(): void {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    this.applyCurrentUser(storedUser);
  }

  private refreshCurrentUser(): void {
    this.profileLoading = true;
    this.authService
      .me({ force: true })
      .pipe(finalize(() => (this.profileLoading = false)))
      .subscribe({
        next: (user) => {
          this.applyCurrentUser(user);
          if (this.isDoctorUser()) {
            this.loadDoctorProfile();
          } else {
            this.doctorProfile = null;
          }
          if (this.canReadHospitalSettings && this.currentHospitalId && !user.hospital) {
            this.loadHospitalSettings();
          }
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to load profile.');
        },
      });
  }

  private loadDoctorProfile(): void {
    this.backend
      .getMyDoctorProfile()
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (doctor) => {
          this.doctorProfile = doctor;
        },
      });
  }

  private isDoctorUser(): boolean {
    return isDoctorRole(this.currentUser?.role?.name || this.role);
  }

  private applyCurrentUser(user: User | null): void {
    if (!user) {
      return;
    }

    this.currentUser = user;
    this.profileName = user.name || '';
    this.profileEmail = user.email || '';
    this.profilePhone = user.phone || '';
    this.role = user.role?.name || this.role;
    this.permissions = user.role?.permissions || this.permissions;
    this.currentHospitalId = user.hospitalId || user.hospital?._id || this.currentHospitalId;

    if (user.hospital) {
      this.applyHospitalProfile(user.hospital);
    }

    this.authService.setCurrentUser(user);
    if (this.activeTab === 'hospital' && !this.canReadHospitalSettings) {
      this.activeTab = 'profile';
    }
  }

  private loadHospitalSettings(): void {
    this.hospitalLoading = true;
    this.backend
      .getHospital(this.currentHospitalId)
      .pipe(finalize(() => (this.hospitalLoading = false)))
      .subscribe({
        next: (hospital) => this.applyHospitalProfile(hospital),
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to load hospital settings.');
        },
      });
  }

  private applyHospitalProfile(hospital: Hospital | null): void {
    this.hospitalProfile = hospital;
    this.currentHospitalId = hospital?._id || this.currentHospitalId;
    this.hospitalName = hospital?.name || '';
    this.hospitalPhone = hospital?.phone || '';
    this.hospitalEmail = hospital?.email || '';
    this.hospitalAddress = hospital?.address || '';
    this.hospitalCity = hospital?.city || '';
    this.hospitalCountry = hospital?.country || '';
    this.hospitalLogoUrl = resolveAssetUrl(hospital?.logoUrl || '');

    const settings = hospital?.prescriptionSettings;
    this.prescriptionShowLogo = settings?.showLogo !== false;
    this.prescriptionLogoScale = this.normalizePrescriptionLogoScale(settings?.logoScale);
    this.prescriptionRevisionNote = settings?.revisionNote || '* Rx to be revised after Reports.';
    this.prescriptionFollowUpLine = settings?.followUpLine || this.defaultPrescriptionFollowUpLine();
    this.prescriptionContactLine = settings?.contactLine || this.defaultHospitalContactLine();
    this.prescriptionFooterLines = this.linesToTextarea(settings?.footerLines);
    this.updateStoredUserHospital(hospital);
  }

  private updateStoredUserHospital(hospital: Hospital | null): void {
    if (!hospital) {
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    if (!storedUser) {
      return;
    }

    localStorage.setItem(
      'user',
      JSON.stringify({
        ...storedUser,
        hospitalId: hospital._id,
        hospital,
      })
    );
  }

  private defaultPrescriptionFollowUpLine(): string {
    return `For appointment and follow up, contact ${this.hospitalName.trim() || 'MediLink City Care Hospital'}.`;
  }

  private defaultHospitalContactLine(): string {
    const parts = [
      this.hospitalEmail.trim() ? `Email: ${this.hospitalEmail.trim()}` : '',
      this.hospitalPhone.trim() ? `Phone: ${this.hospitalPhone.trim()}` : '',
    ].filter(Boolean);

    return parts.join(' | ') || 'Email: info@medilink.local | Phone: 0300-0000000';
  }

  private hospitalAddressLine(): string {
    return [this.hospitalAddress, this.hospitalCity, this.hospitalCountry]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
  }

  private textareaToLines(value: string | null | undefined): string[] {
    return String(value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private linesToTextarea(lines: string[] | null | undefined): string {
    return Array.isArray(lines) ? lines.join('\n') : '';
  }

  private normalizePrescriptionLogoScale(value: unknown): number {
    const scale = Number(value);
    return Number.isFinite(scale) ? Math.min(200, Math.max(50, Math.round(scale))) : 100;
  }

  private async prepareHospitalLogo(file: File): Promise<string> {
    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height, 1));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        bitmap.close();
        return this.readFileAsDataUrl(file);
      }

      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      const preserveTransparency = file.type === 'image/png' || file.type === 'image/webp';
      return preserveTransparency
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', 0.92);
    } catch {
      return this.readFileAsDataUrl(file);
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
  }
}
