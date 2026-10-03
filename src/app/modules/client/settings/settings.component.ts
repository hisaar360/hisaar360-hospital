import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, catchError, finalize, of } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  CurrencyService,
  DEFAULT_CURRENCY,
  HMS_CURRENCY_OPTIONS,
} from '../../../core/services/currency.service';
import { HospitalNotificationService } from '../../../core/services/hospital-notification.service';
import { NotificationSoundService } from '../../../core/services/notification-sound.service';
import { ToastrService } from 'ngx-toastr';
import { Doctor, Hospital, PrescriptionPrintSettings, Store, User } from '../../../shared/models/hospital.model';
import { CompanyProfile } from '../../../shared/models/company.model';
import { resolveAssetUrl } from '../../../core/utils/asset.util';
import { ProfilePhotoFieldComponent } from '../../../shared/components/profile-photo-field/profile-photo-field.component';
import { ImageViewerModalComponent } from '../../../shared/components/image-viewer-modal/image-viewer-modal.component';
import { isDoctorRole } from '../../auth/access-control';
import {
  isClinicalModuleEnabled,
  isLaboratoryModuleEnabled,
  isPharmacyModuleEnabled,
  isWardModuleEnabled,
} from '../../auth/hospital-modules';

type SettingsTab = 'profile' | 'password' | 'hospital' | 'notifications';

interface SettingsTabMeta {
  id: SettingsTab;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  requiresHospitalRead?: boolean;
}

interface NotificationChannelInfo {
  id: string;
  title: string;
  description: string;
  module: string;
  enabled: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProfilePhotoFieldComponent, ImageViewerModalComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(HospitalNotificationService);
  readonly notificationSound = inject(NotificationSoundService);

  readonly tabs: SettingsTabMeta[] = [
    {
      id: 'profile',
      label: 'My Profile',
      shortLabel: 'Profile',
      icon: 'fa-user',
      description: 'Update your personal information and profile photo.',
    },
    {
      id: 'password',
      label: 'Security',
      shortLabel: 'Security',
      icon: 'fa-lock',
      description: 'Change your password and keep your account secure.',
    },
    {
      id: 'hospital',
      label: 'Hospital Settings',
      shortLabel: 'Hospital',
      icon: 'fa-hospital-o',
      description: 'Update hospital identity and prescription print defaults.',
      requiresHospitalRead: true,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      shortLabel: 'Alerts',
      icon: 'fa-bell',
      description: 'Sound, desktop alerts, and hospital notification preferences.',
    },
  ];

  activeTab: SettingsTab = 'profile';
  currentUser: User | null = null;
  companyProfile: CompanyProfile | null = null;
  profileLoading = false;
  profileSaving = false;
  profileName = '';
  profileEmail = '';
  profilePhone = '';
  selectedStoreId = '';
  stores: Store[] = [];
  storesLoading = false;
  storesError = '';
  canChangePosStore = false;
  role = localStorage.getItem('role') || 'ADMIN';
  permissions: string[] = [];

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
  hospitalCurrency = DEFAULT_CURRENCY;
  hospitalLogoUrl = '';
  readonly currencyOptions = HMS_CURRENCY_OPTIONS;
  prescriptionShowLogo = true;
  prescriptionLogoScale = 100;
  prescriptionRevisionNote = '* Rx to be revised after Reports.';
  prescriptionFollowUpLine = '';
  prescriptionContactLine = '';
  prescriptionFooterLines = '';
  hospitalLogoFileLabel = '';
  readonly hospitalSectionOpen: Record<'info' | 'header' | 'logo' | 'revision' | 'preview', boolean> = {
    info: true,
    header: false,
    logo: false,
    revision: false,
    preview: false,
  };
  doctorProfile: Doctor | null = null;
  photoUploading = false;
  photoViewerOpen = false;

  soundMuted = false;
  desktopAlertsEnabled = false;
  desktopPermission: NotificationPermission | 'unsupported' = 'unsupported';
  notificationUnread = 0;
  markingNotificationsRead = false;
  requestingDesktopPermission = false;

  readonly dateFormatDisplay = 'DD/MM/YYYY';
  private unreadSub: Subscription | null = null;

  constructor(
    private backend: BackendService,
    private authService: AuthService,
    private currencyService: CurrencyService,
    private toaster: ToastrService
  ) {
    this.permissions = this.readPermissionsSafe();
  }

  ngOnInit(): void {
    this.loadStoredUser();
    this.refreshCurrentUser();
    this.loadCompanyProfile();
    this.syncNotificationPrefsFromStorage();
    this.unreadSub = this.notificationService.unreadCount$.subscribe(
      (count) => (this.notificationUnread = count)
    );
    if (this.notificationService.canSeeNotifications()) {
      this.notificationService.startPolling();
    }

    const tab = String(this.route.snapshot.queryParamMap.get('tab') || '').trim().toLowerCase();
    if (tab === 'notifications' || tab === 'alerts') {
      this.setTab('notifications');
    } else if (tab === 'hospital') {
      this.setTab('hospital');
    } else if (tab === 'password' || tab === 'security') {
      this.setTab('password');
    }
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
  }

  get visibleTabs(): SettingsTabMeta[] {
    return this.tabs.filter((tab) => !tab.requiresHospitalRead || this.canReadHospitalSettings);
  }

  get activeTabMeta(): SettingsTabMeta | undefined {
    return this.tabs.find((tab) => tab.id === this.activeTab);
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

  /** Matches PATCH /companies/me/currency — company.manage or hospitals.update. */
  get canManageCurrency(): boolean {
    return (
      this.permissions.includes('*') ||
      this.permissions.includes('hospitals.update') ||
      this.permissions.includes('company.manage')
    );
  }

  get currencyDisplayLabel(): string {
    const match = this.currencyOptions.find((option) => option.code === this.hospitalCurrency);
    return match?.label || this.hospitalCurrency || DEFAULT_CURRENCY;
  }

  get roleDisplayName(): string {
    return this.currentUser?.role?.name || this.role || 'User';
  }

  get hospitalDisplayName(): string {
    return this.currentUser?.hospital?.name || this.hospitalName || 'Not assigned';
  }

  get profileUsername(): string {
    const email = (this.profileEmail || this.currentUser?.email || '').trim();
    if (!email) {
      return '—';
    }
    const at = email.indexOf('@');
    return at > 0 ? email.slice(0, at) : email;
  }

  get isAccountActive(): boolean {
    const status = String(this.currentUser?.status || 'active').toLowerCase();
    return status === 'active';
  }

  get accountStatusLabel(): string {
    return this.isAccountActive ? 'Active' : 'Inactive';
  }

  get timezoneDisplay(): string {
    const tz = this.companyProfile?.timezone?.trim();
    if (tz) {
      return tz;
    }
    try {
      const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return resolved || 'GMT+05:00 Islamabad';
    } catch {
      return 'GMT+05:00 Islamabad';
    }
  }

  get accessHighlights(): Array<{ icon: string; label: string }> {
    const items: Array<{ icon: string; label: string }> = [];
    if (this.permissions.includes('*')) {
      items.push({ icon: 'fa-check-circle', label: 'Full system access' });
      items.push({ icon: 'fa-user-secret', label: 'Administrator' });
      return items;
    }

    if (this.canManageHospitalSettings) {
      items.push({ icon: 'fa-check-circle', label: 'Hospital management' });
    }
    if (this.permissions.includes('users.read') || this.permissions.includes('users.manage')) {
      items.push({ icon: 'fa-users', label: 'User management' });
    }
    if (!items.length) {
      items.push({ icon: 'fa-user', label: 'Standard hospital access' });
    }
    return items.slice(0, 3);
  }

  get canUseNotifications(): boolean {
    return this.notificationService.canSeeNotifications();
  }

  get notificationChannels(): NotificationChannelInfo[] {
    const wildcard = this.permissions.includes('*');
    const has = (permission: string) => wildcard || this.permissions.includes(permission);

    return [
      {
        id: 'ADMISSION_RECOMMENDED',
        title: 'Admission recommended',
        description: 'Doctor recommended inpatient admission — open room allotment.',
        module: 'Ward',
        enabled: isWardModuleEnabled() && (has('room_allotments.create') || has('ward.read')),
      },
      {
        id: 'MEDICINE_REQUEST_CREATED',
        title: 'Ward medicine request',
        description: 'Nursing requested pharmacy issue for a ward patient.',
        module: 'Pharmacy',
        enabled: isPharmacyModuleEnabled() && has('pharmacy.ward_requests.read'),
      },
      {
        id: 'LAB_ORDER_CREATED',
        title: 'Lab order placed',
        description: 'New laboratory order waiting for sample or processing.',
        module: 'Laboratory',
        enabled: isLaboratoryModuleEnabled() && has('lab_orders.read'),
      },
      {
        id: 'IMAGING_ORDER_CREATED',
        title: 'Imaging order',
        description: 'Imaging / radiology order created from clinical or ward flow.',
        module: 'Ward',
        enabled: isWardModuleEnabled() && has('ward.read'),
      },
      {
        id: 'MEDICINE_ISSUED',
        title: 'Medicine issued',
        description: 'Pharmacy fulfilled a ward medicine request.',
        module: 'Ward',
        enabled:
          isWardModuleEnabled() && (has('ward.read') || has('ward.medicine_requests.read')),
      },
      {
        id: 'LAB_RESULT_VERIFIED',
        title: 'Lab result verified',
        description: 'Verified lab results are ready for clinical review.',
        module: 'Clinical',
        enabled:
          (isClinicalModuleEnabled() || isWardModuleEnabled()) &&
          (has('ward.read') || has('prescriptions.read')),
      },
    ];
  }

  get enabledNotificationChannels(): NotificationChannelInfo[] {
    return this.notificationChannels.filter((channel) => channel.enabled);
  }

  get desktopPermissionLabel(): string {
    switch (this.desktopPermission) {
      case 'granted':
        return 'Allowed';
      case 'denied':
        return 'Blocked in browser';
      case 'default':
        return 'Not requested yet';
      default:
        return 'Not supported in this browser';
    }
  }

  setTab(tab: SettingsTab): void {
    if (tab === 'hospital' && !this.canReadHospitalSettings) {
      return;
    }
    this.activeTab = tab;
    if (tab === 'notifications') {
      this.syncNotificationPrefsFromStorage();
    }
  }

  setSoundMuted(muted: boolean): void {
    this.notificationSound.setMuted(muted);
    this.soundMuted = muted;
    this.toaster.success(muted ? 'Alert sounds muted.' : 'Alert sounds enabled.');
  }

  playTestSound(): void {
    this.notificationSound.playPreview();
    this.toaster.info('Playing a short test tone.');
  }

  async toggleDesktopAlerts(enabled: boolean): Promise<void> {
    if (!enabled) {
      this.notificationSound.setDesktopEnabled(false);
      this.desktopAlertsEnabled = false;
      this.toaster.success('Desktop alerts turned off.');
      return;
    }

    this.requestingDesktopPermission = true;
    try {
      const permission = await this.notificationSound.requestDesktopPermission();
      this.desktopPermission = permission;
      this.desktopAlertsEnabled =
        permission === 'granted' && this.notificationSound.desktopEnabled;
      if (permission === 'granted') {
        this.toaster.success('Desktop alerts enabled for actionable hospital events.');
        this.notificationSound.showDesktopToast('Desktop alerts ready', {
          body: 'You will see a browser toast for new actionable hospital notifications.',
          tag: 'hms-desktop-test',
        });
      } else if (permission === 'denied') {
        this.toaster.error(
          'Browser blocked notifications. Allow them in site settings, then try again.'
        );
      } else if (permission === 'unsupported') {
        this.toaster.warning('Desktop notifications are not supported in this browser.');
      } else {
        this.toaster.info('Permission was not granted. You can try again anytime.');
      }
    } finally {
      this.requestingDesktopPermission = false;
    }
  }

  markAllNotificationsRead(): void {
    if (!this.notificationUnread || this.markingNotificationsRead) {
      return;
    }
    this.markingNotificationsRead = true;
    this.notificationService.markAllReadLocal();
    this.notificationService
      .markAllRead()
      .pipe(finalize(() => (this.markingNotificationsRead = false)))
      .subscribe({
        next: () => this.toaster.success('All notifications marked as read.'),
        error: () => this.toaster.error('Unable to mark notifications as read.'),
      });
  }

  private syncNotificationPrefsFromStorage(): void {
    this.soundMuted = this.notificationSound.muted;
    this.desktopAlertsEnabled = this.notificationSound.desktopEnabled;
    this.desktopPermission = this.notificationSound.desktopPermission;
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
    if (!this.canManageHospitalSettings && !this.canManageCurrency) {
      this.toaster.error('You do not have permission to update hospital settings.');
      return;
    }

    if (!this.canManageHospitalSettings && this.canManageCurrency) {
      this.saveCurrencyOnly();
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
          this.persistCurrencyAfterHospitalSave();
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to update hospital settings.');
        },
      });
  }

  private saveCurrencyOnly(): void {
    const next = (this.hospitalCurrency || DEFAULT_CURRENCY).trim().toUpperCase();
    if (!next || next === this.currencyService.code) {
      this.toaster.info('Currency is already set to ' + (next || DEFAULT_CURRENCY) + '.');
      return;
    }

    this.hospitalSaving = true;
    this.currencyService
      .saveCurrency(next)
      .pipe(finalize(() => (this.hospitalSaving = false)))
      .subscribe({
        next: () => {
          this.hospitalCurrency = this.currencyService.code;
          this.toaster.success('Currency updated successfully.');
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to update currency.');
        },
      });
  }

  private persistCurrencyAfterHospitalSave(): void {
    const next = (this.hospitalCurrency || DEFAULT_CURRENCY).trim().toUpperCase();
    if (!next || next === this.currencyService.code) {
      this.toaster.success('Hospital settings updated successfully.');
      return;
    }

    this.currencyService.saveCurrency(next).subscribe({
      next: () => {
        this.toaster.success('Hospital settings and currency updated successfully.');
      },
      error: (error) => {
        this.toaster.warning(
          error?.error?.message ||
            'Hospital saved, but currency could not be updated. Check company.manage / hospitals.update permission.'
        );
      },
    });
  }

  onHospitalLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.hospitalLogoFileLabel = file.name;

    if (!file.type.startsWith('image/')) {
      this.toaster.error('Please select an image file.');
      this.hospitalLogoFileLabel = '';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toaster.error('Logo image must be 5 MB or smaller.');
      this.hospitalLogoFileLabel = '';
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
    this.hospitalLogoFileLabel = '';
  }

  toggleHospitalSection(section: 'info' | 'header' | 'logo' | 'revision' | 'preview'): void {
    this.hospitalSectionOpen[section] = !this.hospitalSectionOpen[section];
  }

  get prescriptionLogoScaleTrack(): number {
    const scale = this.normalizePrescriptionLogoScale(this.prescriptionLogoScale);
    return Math.round(((scale - 50) / 150) * 100);
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
    const storedUser = this.readJsonSafe<User | null>(localStorage.getItem('user'), null);
    this.applyCurrentUser(storedUser);
  }

  private readPermissionsSafe(): string[] {
    const parsed = this.readJsonSafe<unknown>(localStorage.getItem('permissions'), []);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  }

  private readJsonSafe<T>(raw: string | null, fallback: T): T {
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
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
          this.loadStores();
        },
        error: (error) => {
          this.toaster.error(error?.error?.message || 'Unable to load profile.');
        },
      });
  }

  private loadCompanyProfile(): void {
    this.backend
      .getMyCompany()
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (company) => {
          this.companyProfile = company;
          this.currencyService.applyCompany(company);
          this.hospitalCurrency = this.currencyService.code;
        },
      });
  }

  private loadStores(): void {
    this.canChangePosStore = false;
    this.storesLoading = true;
    this.storesError = '';

    this.backend
      .getStores({
        limit: 100,
        isActive: true,
        hospitalId: this.currentHospitalId || undefined,
      })
      .pipe(finalize(() => (this.storesLoading = false)))
      .subscribe({
        next: (result) => {
          this.stores = result.items || [];
          this.ensureSelectedStorePresent();
        },
        error: (err) => {
          this.stores = [];
          this.storesError = err?.error?.message || 'Unable to load POS stores.';
        },
      });
  }

  private ensureSelectedStorePresent(): void {
    if (!this.selectedStoreId) {
      return;
    }
    if (this.stores.some((store) => store._id === this.selectedStoreId)) {
      return;
    }
    this.stores = [
      {
        _id: this.selectedStoreId,
        companyId: '',
        name: 'Assigned POS store',
        code: '',
        isActive: true,
      },
      ...this.stores,
    ];
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
    this.selectedStoreId = user.storeId || '';
    this.role = user.role?.name || this.role;
    this.permissions = Array.isArray(user.role?.permissions)
      ? user.role.permissions.map(String)
      : this.permissions;
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

    const storedUser = this.readJsonSafe<User | null>(localStorage.getItem('user'), null);
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
