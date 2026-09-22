import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, of, Subject, switchMap, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import {
  AUTO_PRESCRIPTION_SPECIALTY,
  PRESCRIPTION_SPECIALTY_OPTIONS,
  specialtyTemplateLabel,
} from '../../../../shared/catalogs/doctor-specialization.catalog';
import {
  CLINICAL_DEPARTMENTS,
  CUSTOM_VALUE,
  DOCTOR_DEPARTMENTS,
  DOCTOR_DESIGNATIONS,
  DOCTOR_QUALIFICATIONS,
  DoctorDepartmentOption,
  clinicalDepartmentLabel,
  filterOptions,
  findDepartmentByKey,
  inferDepartmentFromSpecialization,
  joinMulti,
  mapSpecialtyKeyToPrescriptionTemplate,
  resolveDoctorSpecialtyKey,
  specializationsForDepartment,
  splitMulti,
} from '../../../../shared/catalogs/doctor-master-data.catalog';
import {
  Department,
  Doctor,
  Hospital,
  PrescriptionSpecialtyTemplate,
  PrescriptionTemplate,
  User,
} from '../../../../shared/models/hospital.model';
import { transliterateDoctorNameToUrdu } from '../../../../shared/utils/urdu-transliteration';
import { ProfilePhotoFieldComponent } from '../../../../shared/components/profile-photo-field/profile-photo-field.component';
import { ImageViewerModalComponent } from '../../../../shared/components/image-viewer-modal/image-viewer-modal.component';
import { resolveAssetUrl } from '../../../../core/utils/asset.util';

@Component({
  selector: 'app-add-doctors',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ProfilePhotoFieldComponent, ImageViewerModalComponent],
  templateUrl: './add-doctors.component.html',
  styleUrl: './add-doctors.component.scss',
})
export class AddDoctorsComponent implements OnInit, OnDestroy {
  doctorForm: FormGroup;
  editingDoctor: Doctor | null = null;

  departments: Department[] = [];
  hospitals: Hospital[] = [];

  currentUser: User | null = null;
  currentHospitalId: string | null = null;
  canSelectHospital = false;

  saving = false;
  autoUrduName = true;
  pendingPhoto: File | null = null;

  get currencyLabel(): string {
    return this.currency.label;
  }
  pendingPreviewUrl: string | null = null;
  removeExistingPhoto = false;
  photoUploadFailed = false;
  viewerOpen = false;
  departmentSearch = '';
  designationSearch = '';
  specializationSearch = '';
  qualificationSearch = '';
  departmentDropdownOpen = false;
  designationDropdownOpen = false;
  specializationDropdownOpen = false;
  qualificationDropdownOpen = false;
  filteredDepartmentOptions: DoctorDepartmentOption[] = [];
  filteredDesignationOptions: string[] = [];
  filteredSpecializationOptions: string[] = [];
  filteredQualificationOptions: string[] = [];
  selectedSpecializations: string[] = [];
  selectedQualifications: string[] = [];
  specializationCustomDraft = '';
  qualificationCustomDraft = '';
  clinicalMultiTouched = false;
  autoPrescriptionSpecialtyLabelText = 'Auto by specialization';
  private lastAutoUrduName = '';
  private readonly destroy$ = new Subject<void>();

  readonly doctorDepartments = DOCTOR_DEPARTMENTS;
  readonly doctorQualificationCatalog = DOCTOR_QUALIFICATIONS.filter(
    (item) => item !== 'Other / Custom'
  );
  readonly doctorDesignationCatalog = DOCTOR_DESIGNATIONS.filter((item) => item !== 'Other');
  readonly prescriptionSpecialtyOptions = PRESCRIPTION_SPECIALTY_OPTIONS;
  readonly customCatalogValue = CUSTOM_VALUE;
  readonly autoPrescriptionSpecialty = AUTO_PRESCRIPTION_SPECIALTY;

  days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  selectedDays: string[] = [];
  dayHours: Record<string, { startTime: string; endTime: string }> = {};
  readonly prescriptionTemplates: Array<{
    id: PrescriptionTemplate;
    name: string;
    description: string;
  }> = [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional bilingual prescription layout.',
    },
    {
      id: 'clinical-blue',
      name: 'Clinical Blue',
      description: 'Detailed blue hospital layout based on the reference design.',
    },
    {
      id: 'gynae-clinical',
      name: "Gynae Theme 1 · Clinical Teal",
      description: 'Professional teal gynae prescription layout.',
    },
    {
      id: 'gynae-womens-health',
      name: "Gynae Theme 2 · Women's Health",
      description: 'Bilingual women\'s health clinic layout.',
    },
    {
      id: 'gynae-modern',
      name: 'Gynae Theme 3 · Modern Purple',
      description: 'Premium pink and purple women\'s health layout.',
    },
    {
      id: 'minimal-teal',
      name: 'Minimal Teal',
      description: 'Clean modern layout with light teal accents.',
    },
    {
      id: 'compact-mono',
      name: 'Compact Mono',
      description: 'Space-efficient black and white clinical print.',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router,
    private currency: CurrencyService
  ) {
    this.doctorForm = this.fb.group({
      hospitalId: ['', Validators.required],
      name: ['', Validators.required],
      nameUrdu: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      phone: [''],
      departmentId: [''],
      clinicalDepartment: ['', Validators.required],
      designation: ['', Validators.required],
      designationCustom: [''],
      experienceYears: [0],
      consultationFee: [0, [Validators.required, Validators.min(0)]],
      followUpFeeEnabled: [false],
      followUpWithinDays: [7, [Validators.min(1), Validators.max(90)]],
      followUpFeeType: ['half' as 'half' | 'fixed' | 'percent'],
      followUpFeeAmount: [0, [Validators.min(0)]],
      slotDurationMinutes: [15, Validators.required],
      prescriptionSpecialtyMode: [AUTO_PRESCRIPTION_SPECIALTY, Validators.required],
      prescriptionSpecialtyTemplate: ['general' as PrescriptionSpecialtyTemplate],
      prescriptionTemplate: ['classic' as PrescriptionTemplate, Validators.required],
      status: ['active', Validators.required],
    });
  }

  ngOnInit(): void {
    this.editingDoctor = history.state?.doctor || null;
    this.setLoggedInUser();
    this.applyEditingState();
    this.setupNameTranslation();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.revokePendingPreview();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get displayPhotoUrl(): string | null {
    return this.removeExistingPhoto ? null : this.editingDoctor?.photoUrl || null;
  }

  get viewerSrc(): string {
    return this.pendingPreviewUrl || resolveAssetUrl(this.displayPhotoUrl);
  }

  onPhotoSelected(file: File | null): void {
    this.revokePendingPreview();
    this.pendingPhoto = file;
    this.pendingPreviewUrl = file ? URL.createObjectURL(file) : null;
    this.removeExistingPhoto = false;
    this.photoUploadFailed = false;
  }

  onRemoveCurrentPhoto(): void {
    this.revokePendingPreview();
    this.pendingPhoto = null;
    this.removeExistingPhoto = true;
    this.photoUploadFailed = false;
  }

  retryPhotoUpload(): void {
    const doctorId = this.editingDoctor?._id;
    if (!doctorId || !this.pendingPhoto) {
      return;
    }

    this.saving = true;
    this.backend
      .uploadDoctorPhoto(doctorId, this.pendingPhoto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.photoUploadFailed = false;
          this.pendingPhoto = null;
          this.revokePendingPreview();
          this.editingDoctor = response.data || this.editingDoctor;
          this.toastr.success(response.message || 'Doctor photo uploaded successfully');
          this.router.navigateByUrl('/all-doctors');
        },
        error: (err) => {
          this.photoUploadFailed = true;
          this.toastr.error(
            err?.error?.message ||
              'Doctor created successfully, but profile image upload failed. You can upload it from Edit Doctor.'
          );
        },
      });
  }

  private revokePendingPreview(): void {
    if (this.pendingPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.pendingPreviewUrl);
    }
    this.pendingPreviewUrl = null;
  }

  get showCustomDesignation(): boolean {
    return this.doctorForm.get('designation')?.value === CUSTOM_VALUE;
  }

  get isManualPrescriptionSpecialty(): boolean {
    return this.doctorForm.get('prescriptionSpecialtyMode')?.value !== AUTO_PRESCRIPTION_SPECIALTY;
  }

  selectedClinicalDepartment(): string {
    return String(this.doctorForm.get('clinicalDepartment')?.value || '');
  }

  selectedDepartmentLabel(): string {
    const key = this.selectedClinicalDepartment();
    if (!key) {
      return 'Select department';
    }
    return clinicalDepartmentLabel(key);
  }

  selectedDesignationLabel(): string {
    const value = String(this.doctorForm.get('designation')?.value || '');
    if (!value || value === CUSTOM_VALUE) {
      return this.doctorForm.get('designationCustom')?.value || 'Select designation';
    }
    return value;
  }

  specializationChipSummary(): string {
    if (!this.selectedSpecializations.length) {
      return this.selectedClinicalDepartment() ? 'Add specialization' : 'Select department first';
    }
    return `${this.selectedSpecializations.length} selected`;
  }

  qualificationChipSummary(): string {
    return this.selectedQualifications.length
      ? `${this.selectedQualifications.length} selected`
      : 'Add qualification';
  }

  isSpecializationSelected(value: string): boolean {
    return this.selectedSpecializations.some(
      (item) => item.trim().toLowerCase() === value.trim().toLowerCase()
    );
  }

  isQualificationSelected(value: string): boolean {
    return this.selectedQualifications.some(
      (item) => item.trim().toLowerCase() === value.trim().toLowerCase()
    );
  }

  setLoggedInUser(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;

    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];

    this.canSelectHospital = permissions.includes('*');

    this.currentHospitalId = this.currentUser?.hospitalId || null;

    if (this.currentHospitalId) {
      this.doctorForm.patchValue({
        hospitalId: this.currentHospitalId,
      });
    }
  }

  loadInitialData(): void {
    if (this.canSelectHospital) {
      this.backend.getHospitals().subscribe({
        next: (result) => {
          this.hospitals = result.items || [];

          if (!this.currentHospitalId && this.hospitals.length > 0) {
            this.doctorForm.patchValue({
              hospitalId: this.hospitals[0]._id,
            });
          }

          this.loadDepartments();
        },
        error: () => {
          this.hospitals = [];
          this.loadDepartments();
        },
      });

      return;
    }

    this.loadDepartments();
  }

  loadDepartments(): void {
    if (!this.backend.hasPermission('departments.read')) {
      this.departments = [];
      return;
    }

    const hospitalId = this.doctorForm.value.hospitalId || this.currentHospitalId || this.editingDoctor?.hospitalId;

    this.backend
      .getDepartments({
        limit: 100,
        status: 'active',
        hospitalId,
      })
      .subscribe({
        next: (result) => {
          this.departments = result.items || [];
        },
        error: () => {
          this.departments = [];
        },
      });
  }

  onHospitalChange(): void {
    this.doctorForm.patchValue({
      departmentId: '',
    });

    this.loadDepartments();
  }

  onClinicalDepartmentChange(): void {
    this.specializationSearch = '';
    this.specializationCustomDraft = '';
    this.selectedSpecializations = [];
    this.closeCatalogDropdowns();
    this.refreshSpecializationOptions();
    this.applyAutoPrescriptionSpecialty();
  }

  toggleDepartmentDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.designationDropdownOpen = false;
    this.specializationDropdownOpen = false;
    this.qualificationDropdownOpen = false;
    this.departmentDropdownOpen = !this.departmentDropdownOpen;

    if (this.departmentDropdownOpen) {
      this.refreshDepartmentOptions();
    }
  }

  toggleDesignationDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.departmentDropdownOpen = false;
    this.specializationDropdownOpen = false;
    this.qualificationDropdownOpen = false;
    this.designationDropdownOpen = !this.designationDropdownOpen;

    if (this.designationDropdownOpen) {
      this.refreshDesignationOptions();
    }
  }

  onDepartmentSearchInput(event: Event): void {
    this.departmentSearch = (event.target as HTMLInputElement).value;
    this.refreshDepartmentOptions();
  }

  onDesignationSearchInput(event: Event): void {
    this.designationSearch = (event.target as HTMLInputElement).value;
    this.refreshDesignationOptions();
  }

  selectDepartment(option: DoctorDepartmentOption): void {
    this.doctorForm.patchValue({ clinicalDepartment: option.key });
    this.departmentSearch = '';
    this.departmentDropdownOpen = false;
    this.onClinicalDepartmentChange();
  }

  selectDesignation(value: string | typeof CUSTOM_VALUE): void {
    if (value === CUSTOM_VALUE) {
      this.doctorForm.patchValue({
        designation: CUSTOM_VALUE,
        designationCustom: '',
      });
    } else {
      this.doctorForm.patchValue({
        designation: value,
        designationCustom: '',
      });
    }

    this.designationSearch = '';
    this.designationDropdownOpen = false;
    this.syncDesignationValidators();
    this.refreshDesignationOptions();
  }

  toggleSpecializationDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.selectedClinicalDepartment()) {
      return;
    }

    this.departmentDropdownOpen = false;
    this.designationDropdownOpen = false;
    this.qualificationDropdownOpen = false;
    this.specializationDropdownOpen = !this.specializationDropdownOpen;

    if (this.specializationDropdownOpen) {
      this.refreshSpecializationOptions();
    }
  }

  toggleQualificationDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.departmentDropdownOpen = false;
    this.designationDropdownOpen = false;
    this.specializationDropdownOpen = false;
    this.qualificationDropdownOpen = !this.qualificationDropdownOpen;

    if (this.qualificationDropdownOpen) {
      this.refreshQualificationOptions();
    }
  }

  onSpecializationSearchInput(event: Event): void {
    this.specializationSearch = (event.target as HTMLInputElement).value;
    this.refreshSpecializationOptions();
  }

  onQualificationSearchInput(event: Event): void {
    this.qualificationSearch = (event.target as HTMLInputElement).value;
    this.refreshQualificationOptions();
  }

  closeCatalogDropdowns(): void {
    this.departmentDropdownOpen = false;
    this.designationDropdownOpen = false;
    this.specializationDropdownOpen = false;
    this.qualificationDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.catalog-select')) {
      return;
    }

    this.closeCatalogDropdowns();
  }

  trackDepartmentOption(_index: number, option: DoctorDepartmentOption): string {
    return option.key;
  }

  trackStringOption(_index: number, option: string): string {
    return option;
  }

  toggleSpecializationOption(value: string): void {
    if (this.isSpecializationSelected(value)) {
      this.removeSpecialization(value);
      return;
    }

    this.selectedSpecializations = [...this.selectedSpecializations, value];
    this.applyAutoPrescriptionSpecialty();
  }

  removeSpecialization(value: string): void {
    const normalized = value.trim().toLowerCase();
    this.selectedSpecializations = this.selectedSpecializations.filter(
      (item) => item.trim().toLowerCase() !== normalized
    );
    this.applyAutoPrescriptionSpecialty();
  }

  confirmCustomSpecialization(): void {
    const text = this.specializationCustomDraft.trim();
    if (!text) {
      return;
    }

    if (!this.isSpecializationSelected(text)) {
      this.selectedSpecializations = [...this.selectedSpecializations, text];
      this.applyAutoPrescriptionSpecialty();
    }

    this.specializationCustomDraft = '';
  }

  toggleQualificationOption(value: string): void {
    if (this.isQualificationSelected(value)) {
      this.removeQualification(value);
      return;
    }

    this.selectedQualifications = [...this.selectedQualifications, value];
  }

  removeQualification(value: string): void {
    const normalized = value.trim().toLowerCase();
    this.selectedQualifications = this.selectedQualifications.filter(
      (item) => item.trim().toLowerCase() !== normalized
    );
  }

  confirmCustomQualification(): void {
    const text = this.qualificationCustomDraft.trim();
    if (!text) {
      return;
    }

    if (!this.isQualificationSelected(text)) {
      this.selectedQualifications = [...this.selectedQualifications, text];
    }

    this.qualificationCustomDraft = '';
  }

  onPrescriptionSpecialtyModeChange(): void {
    const manual = this.isManualPrescriptionSpecialty;
    const control = this.doctorForm.get('prescriptionSpecialtyTemplate');
    if (manual) {
      control?.setValidators([Validators.required]);
    } else {
      control?.clearValidators();
      this.applyAutoPrescriptionSpecialty();
    }
    control?.updateValueAndValidity();
  }

  toggleDay(day: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    const nextDays = checked
      ? [...this.selectedDays, day]
      : this.selectedDays.filter((item) => item !== day);

    this.selectedDays = this.normalizeDays(nextDays);
    if (checked && !this.dayHours[day]) {
      this.dayHours[day] = this.defaultDayHours();
    }
  }

  dayStart(day: string): string {
    return this.dayHours[day]?.startTime || '09:00';
  }

  dayEnd(day: string): string {
    return this.dayHours[day]?.endTime || '17:00';
  }

  setDayStart(day: string, event: Event): void {
    const startTime = (event.target as HTMLInputElement).value || '09:00';
    this.dayHours[day] = {
      startTime,
      endTime: this.dayEnd(day),
    };
  }

  setDayEnd(day: string, event: Event): void {
    const endTime = (event.target as HTMLInputElement).value || '17:00';
    this.dayHours[day] = {
      startTime: this.dayStart(day),
      endTime,
    };
  }

  private defaultDayHours(): { startTime: string; endTime: string } {
    return { startTime: '09:00', endTime: '17:00' };
  }

  private buildAvailableSlots(): Array<{ day: string; startTime: string; endTime: string }> {
    return this.normalizeDays(this.selectedDays).map((day) => ({
      day,
      startTime: this.dayStart(day),
      endTime: this.dayEnd(day),
    }));
  }

  isDaySelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  onUrduNameInput(): void {
    const currentValue = String(this.doctorForm.get('nameUrdu')?.value || '').trim();
    this.autoUrduName = !currentValue || currentValue === this.lastAutoUrduName;
  }

  autoFillUrduName(): void {
    this.applyUrduNameTranslation(true);
  }

  submitDoctor(): void {
    if (!this.editingDoctor && !this.can('doctors.create')) {
      return;
    }

    if (this.editingDoctor && !this.can('doctors.update')) {
      return;
    }

    this.syncDesignationValidators();
    this.clinicalMultiTouched = true;

    if (
      this.doctorForm.invalid ||
      this.selectedSpecializations.length === 0 ||
      this.selectedQualifications.length === 0
    ) {
      this.doctorForm.markAllAsTouched();
      return;
    }

    const invalidSlot = this.buildAvailableSlots().find((slot) => slot.startTime >= slot.endTime);
    if (invalidSlot) {
      this.toastr.error(`End time must be after start time on ${invalidSlot.day}.`);
      return;
    }

    const value = this.doctorForm.value;
    const hospitalId = value.hospitalId || this.currentHospitalId;
    const specialization = this.resolvedSpecialization();
    const qualification = this.resolvedQualification();

    const payload: Record<string, unknown> = {
      name: value.name,
      nameUrdu: value.nameUrdu?.trim() || '',
      email: value.email,
      phone: value.phone || undefined,
      departmentId: value.departmentId || undefined,
      clinicalDepartment: value.clinicalDepartment,
      designation: this.resolvedDesignation(),
      specialization,
      qualification,
      experienceYears: Number(value.experienceYears || 0),
      consultationFee: Number(value.consultationFee || 0),
      followUpFeeEnabled: Boolean(value.followUpFeeEnabled),
      followUpWithinDays: Number(value.followUpWithinDays || 7),
      followUpFeeType: value.followUpFeeType || 'half',
      followUpFeeAmount: Number(value.followUpFeeAmount || 0),
      slotDurationMinutes: Number(value.slotDurationMinutes || 15),
      prescriptionTemplate: value.prescriptionTemplate || 'classic',
      prescriptionSpecialtyTemplate: this.resolvedPrescriptionSpecialtyTemplate(),
      availableDays: this.normalizeDays(this.selectedDays),
      availableSlots: this.buildAvailableSlots(),
      status: value.status,
    };

    if (!this.editingDoctor) {
      payload['hospitalId'] = hospitalId;
      payload['password'] = value.password;
    }

    this.saving = true;
    const wasCreate = !this.editingDoctor;

    const request$ = this.editingDoctor
      ? this.backend.updateDoctor(this.editingDoctor._id, payload)
      : this.backend.createDoctor(payload);

    request$
      .pipe(
        switchMap((response) => {
          const doctor = response.data;
          if (doctor) {
            this.editingDoctor = doctor;
          }

          if (this.pendingPhoto && doctor?._id) {
            return this.backend.uploadDoctorPhoto(doctor._id, this.pendingPhoto).pipe(
              switchMap((photoResponse) => of({ response, photoOk: true as const, photoResponse })),
              catchError((photoErr) =>
                of({
                  response,
                  photoOk: false as const,
                  photoErr,
                })
              )
            );
          }

          if (this.removeExistingPhoto && doctor?._id) {
            return this.backend.deleteDoctorPhoto(doctor._id).pipe(
              switchMap((photoResponse) => of({ response, photoOk: true as const, photoResponse })),
              catchError(() => of({ response, photoOk: false as const }))
            );
          }

          return of({ response, photoOk: true as const });
        }),
        finalize(() => (this.saving = false))
      )
      .subscribe({
        next: (result) => {
          if (!result.photoOk && this.pendingPhoto) {
            this.photoUploadFailed = true;
            this.toastr.success(result.response.message || 'Doctor saved successfully');
            this.toastr.error(
              wasCreate
                ? 'Doctor created successfully, but profile image upload failed. You can upload it from Edit Doctor.'
                : 'Doctor updated, but profile image upload failed. You can retry from this page.'
            );
            return;
          }

          this.toastr.success(result.response.message);
          this.router.navigateByUrl('/all-doctors');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }

  private applyEditingState(): void {
    if (!this.editingDoctor) {
      return;
    }

    this.selectedDays = this.normalizeDays(this.editingDoctor.availableDays || []);
    this.dayHours = {};
    (this.editingDoctor.availableSlots || []).forEach((slot) => {
      const day = String(slot.day || '').toLowerCase();
      if (!day) {
        return;
      }
      this.dayHours[day] = {
        startTime: slot.startTime || '09:00',
        endTime: slot.endTime || '17:00',
      };
    });
    this.selectedDays.forEach((day) => {
      if (!this.dayHours[day]) {
        this.dayHours[day] = this.defaultDayHours();
      }
    });
    const specialization = String(this.editingDoctor.specialization || '').trim();
    const qualification = String(this.editingDoctor.qualification || '').trim();
    this.selectedSpecializations = this.parseStoredMulti(specialization);
    this.selectedQualifications = this.parseStoredMulti(qualification);

    let clinicalDepartment = String(this.editingDoctor.clinicalDepartment || '').trim();
    if (!clinicalDepartment) {
      const firstSpec = this.selectedSpecializations[0] || specialization;
      clinicalDepartment = inferDepartmentFromSpecialization(firstSpec) || '';
    }

    const designationRaw = String(this.editingDoctor.designation || '').trim();
    const designationMatch = this.doctorDesignationCatalog.find(
      (item) => item.toLowerCase() === designationRaw.toLowerCase()
    );

    const autoTemplate = mapSpecialtyKeyToPrescriptionTemplate(
      resolveDoctorSpecialtyKey(clinicalDepartment, this.selectedSpecializations)
    );
    const storedTemplate = this.editingDoctor.prescriptionSpecialtyTemplate || autoTemplate;
    const manualPrescriptionSpecialty = storedTemplate !== autoTemplate;

    this.doctorForm.patchValue({
      hospitalId: this.editingDoctor.hospitalId || this.currentHospitalId || '',
      name: this.editingDoctor.user?.name || '',
      nameUrdu: this.editingDoctor.nameUrdu || '',
      email: this.editingDoctor.user?.email || '',
      password: '',
      phone: this.editingDoctor.user?.phone || '',
      departmentId: this.editingDoctor.departmentId || '',
      clinicalDepartment,
      designation: designationMatch
        ? designationMatch
        : designationRaw
          ? CUSTOM_VALUE
          : '',
      designationCustom: designationMatch ? '' : designationRaw,
      experienceYears: this.editingDoctor.experienceYears || 0,
      consultationFee: this.editingDoctor.consultationFee || 0,
      followUpFeeEnabled: Boolean(this.editingDoctor.followUpFeeEnabled),
      followUpWithinDays: this.editingDoctor.followUpWithinDays || 7,
      followUpFeeType: this.editingDoctor.followUpFeeType || 'half',
      followUpFeeAmount: this.editingDoctor.followUpFeeAmount || 0,
      slotDurationMinutes: this.editingDoctor.slotDurationMinutes || 15,
      prescriptionSpecialtyMode: manualPrescriptionSpecialty ? 'manual' : AUTO_PRESCRIPTION_SPECIALTY,
      prescriptionSpecialtyTemplate: storedTemplate,
      prescriptionTemplate: this.editingDoctor.prescriptionTemplate || 'classic',
      status: this.editingDoctor.status || 'active',
    });

    this.doctorForm.get('password')?.clearValidators();
    this.doctorForm.get('password')?.updateValueAndValidity();
    this.syncDesignationValidators();
    this.refreshDepartmentOptions();
    this.refreshDesignationOptions();
    this.refreshSpecializationOptions();
    this.refreshQualificationOptions();
    this.updateAutoPrescriptionSpecialtyLabel();
    this.autoUrduName = true;
  }

  private setupNameTranslation(): void {
    this.doctorForm
      .get('name')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyUrduNameTranslation());

    if (!this.doctorForm.get('nameUrdu')?.value) {
      this.applyUrduNameTranslation();
    }
  }

  private applyUrduNameTranslation(force = false): void {
    const englishName = String(this.doctorForm.get('name')?.value || '').trim();
    const urduControl = this.doctorForm.get('nameUrdu');
    const currentUrduName = String(urduControl?.value || '').trim();
    const canAutoFill =
      force ||
      this.autoUrduName ||
      !currentUrduName ||
      currentUrduName === this.lastAutoUrduName;

    if (!canAutoFill) {
      return;
    }

    const translatedName = transliterateDoctorNameToUrdu(englishName);
    urduControl?.setValue(translatedName, { emitEvent: false });
    this.lastAutoUrduName = translatedName;
    this.autoUrduName = true;
  }

  private parseStoredMulti(value: string): string[] {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.includes('|')) {
      return splitMulti(trimmed);
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private resolvedSpecialization(): string {
    return joinMulti(this.selectedSpecializations);
  }

  private resolvedQualification(): string {
    return joinMulti(this.selectedQualifications);
  }

  private resolvedDesignation(): string {
    const selected = String(this.doctorForm.get('designation')?.value || '').trim();
    if (selected === CUSTOM_VALUE) {
      return String(this.doctorForm.get('designationCustom')?.value || '').trim();
    }
    return selected;
  }

  private resolvedPrescriptionSpecialtyTemplate(): PrescriptionSpecialtyTemplate {
    if (this.isManualPrescriptionSpecialty) {
      return (this.doctorForm.get('prescriptionSpecialtyTemplate')?.value ||
        'general') as PrescriptionSpecialtyTemplate;
    }

    const specialtyKey = resolveDoctorSpecialtyKey(
      this.selectedClinicalDepartment(),
      this.selectedSpecializations
    );
    return mapSpecialtyKeyToPrescriptionTemplate(specialtyKey) as PrescriptionSpecialtyTemplate;
  }

  private applyAutoPrescriptionSpecialty(): void {
    if (this.isManualPrescriptionSpecialty) {
      this.updateAutoPrescriptionSpecialtyLabel();
      return;
    }

    const template = this.resolvedPrescriptionSpecialtyTemplate();
    this.doctorForm.patchValue(
      {
        prescriptionSpecialtyTemplate: template,
      },
      { emitEvent: false }
    );
    this.updateAutoPrescriptionSpecialtyLabel();
  }

  private legacyDepartmentOption(): DoctorDepartmentOption | null {
    const key = this.selectedClinicalDepartment();
    if (!key || findDepartmentByKey(key)) {
      return null;
    }

    const legacy = CLINICAL_DEPARTMENTS.find((item) => item.key === key);
    if (legacy) {
      return {
        key: legacy.key,
        label: `${legacy.label} (legacy)`,
        specialtyKey: 'OTHER',
      };
    }

    return {
      key,
      label: clinicalDepartmentLabel(key),
      specialtyKey: 'OTHER',
    };
  }

  private refreshDepartmentOptions(): void {
    const query = this.departmentSearch.trim().toLowerCase();
    let options = this.doctorDepartments.filter(
      (item) => !query || item.label.toLowerCase().includes(query)
    );

    const legacy = this.legacyDepartmentOption();
    if (legacy && (!query || legacy.label.toLowerCase().includes(query))) {
      if (!options.some((item) => item.key === legacy.key)) {
        options = [legacy, ...options];
      }
    }

    this.filteredDepartmentOptions = options;
  }

  private refreshDesignationOptions(): void {
    this.filteredDesignationOptions = filterOptions(
      [...this.doctorDesignationCatalog],
      this.designationSearch
    );
  }

  private refreshSpecializationOptions(): void {
    const department = this.selectedClinicalDepartment();
    this.filteredSpecializationOptions = filterOptions(
      specializationsForDepartment(department),
      this.specializationSearch
    );
  }

  private refreshQualificationOptions(): void {
    this.filteredQualificationOptions = filterOptions(
      [...this.doctorQualificationCatalog],
      this.qualificationSearch
    );
  }

  private updateAutoPrescriptionSpecialtyLabel(): void {
    if (!this.selectedSpecializations.length) {
      this.autoPrescriptionSpecialtyLabelText = 'Auto by specialization';
      return;
    }

    const template = this.resolvedPrescriptionSpecialtyTemplate();
    this.autoPrescriptionSpecialtyLabelText = specialtyTemplateLabel(template);
  }

  private syncDesignationValidators(): void {
    const customControl = this.doctorForm.get('designationCustom');
    if (this.showCustomDesignation) {
      customControl?.setValidators([Validators.required, Validators.maxLength(150)]);
    } else {
      customControl?.clearValidators();
      customControl?.setValue('', { emitEvent: false });
    }
    customControl?.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeDays(days: string[]): string[] {
    const selected = new Set(days);
    return this.days.filter((day) => selected.has(day));
  }
}
