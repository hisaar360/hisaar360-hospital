import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { BackendService } from '../../../core/services/backend.service';
import { readStoredHospitalId } from '../../auth/hospital-scope';
import {
  BirthCertificateSettings,
  Department,
  HospitalWard,
} from '../../../shared/models/hospital.model';

type SetupTab = 'departments' | 'wards' | 'rooms-beds' | 'birth-certificates';
type DepartmentSortKey = 'name' | 'code' | 'category' | 'doctors' | 'status';
type SortDir = 'asc' | 'desc';

type WardOverview = HospitalWard & {
  roomsCount?: number;
  bedsCount?: number;
  occupiedBeds?: number;
  availableBeds?: number;
  inactiveBeds?: number;
};

const DEPARTMENT_CATEGORIES = [
  'GENERAL',
  'WOMEN_CHILDREN',
  'SURGICAL',
  'CRITICAL',
  'OPTIONAL',
  'OTHER',
] as const;

const WARD_TYPES = [
  'general',
  'medical',
  'surgical',
  'obstetric',
  'maternity',
  'postnatal',
  'pediatric',
  'nursery',
  'emergency_observation',
  'icu',
  'hdu',
  'private',
  'semi_private',
  'isolation',
  'other',
] as const;

const WARD_GENDER_POLICIES = [
  'male',
  'female',
  'mixed',
  'mother_baby',
  'pediatric',
  'neonatal',
  'not_applicable',
] as const;

const WARD_AGE_GROUPS = ['adult', 'pediatric', 'neonatal', 'all'] as const;
const WARD_CARE_LEVELS = ['general', 'observation', 'private', 'hdu', 'icu', 'isolation', 'nursery'] as const;

@Component({
  selector: 'app-hospital-setup',
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './hospital-setup.component.html',
  styleUrl: './hospital-setup.component.scss',
})
export class HospitalSetupComponent implements OnInit {
  loading = false;
  syncing = false;
  activeTab: SetupTab = 'departments';
  showMoreMenu = false;
  showDepartmentModal = false;
  showWardModal = false;

  departments: Department[] = [];
  wards: WardOverview[] = [];
  doctorCountByDepartment: Record<string, number> = {};
  hospitalId = '';

  departmentSearch = '';
  departmentStatusFilter = '';
  departmentSortKey: DepartmentSortKey = 'name';
  departmentSortDir: SortDir = 'asc';
  editingDepartmentId: string | null = null;
  savingDepartment = false;
  departmentForm: FormGroup;

  wardSearch = '';
  wardStatusFilter = '';
  editingWardId: string | null = null;
  savingWard = false;
  wardForm: FormGroup;

  birthSettings: BirthCertificateSettings = {
    enabled: true,
    documentTitle: 'Hospital Birth Certificate',
    certificatePrefix: 'HBC',
    birthRecordPrefix: 'BR',
    legalDisclaimer:
      'This document certifies the birth recorded by the issuing hospital. Civil birth registration and government-issued birth documentation must be obtained from the competent civil registration authority.',
    showBirthWeight: true,
    showQrCode: true,
    verificationBaseUrl: 'https://www.hisaar360.com/verify/birth',
  };
  savingBirthSettings = false;
  birthAccordion: Record<string, boolean> = {
    basic: true,
    branding: false,
    signatory: false,
    qr: false,
    privacy: false,
    display: false,
    legal: false,
  };

  readonly departmentCategories = DEPARTMENT_CATEGORIES;
  readonly wardTypes = WARD_TYPES;
  readonly wardGenderPolicies = WARD_GENDER_POLICIES;
  readonly wardAgeGroups = WARD_AGE_GROUPS;
  readonly wardCareLevels = WARD_CARE_LEVELS;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private dialog: AppDialogService,
    private fb: FormBuilder
  ) {
    this.departmentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      code: [''],
      category: ['OTHER', Validators.required],
      description: [''],
      status: ['active', Validators.required],
    });

    this.wardForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      code: [''],
      type: ['general', Validators.required],
      departmentMode: ['GENERAL', Validators.required],
      departmentIds: [[] as string[]],
      genderPolicy: ['mixed', Validators.required],
      ageGroup: ['all', Validators.required],
      careLevel: ['general', Validators.required],
      description: [''],
      status: ['active', Validators.required],
    });
  }

  ngOnInit(): void {
    this.hospitalId = readStoredHospitalId();
    this.loadOverview();
    if (this.hospitalId) {
      this.loadBirthCertificateSettings();
    }
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  get canManageDepartments(): boolean {
    return this.can('departments.create') || this.can('departments.update') || this.can('*');
  }

  get canManageWards(): boolean {
    return this.can('ward.create') || this.can('ward.update') || this.can('*');
  }

  setTab(tab: SetupTab): void {
    this.activeTab = tab;
    this.showMoreMenu = false;
  }

  toggleMoreMenu(): void {
    this.showMoreMenu = !this.showMoreMenu;
  }

  toggleBirthSection(key: string): void {
    this.birthAccordion[key] = !this.birthAccordion[key];
  }

  loadOverview(): void {
    this.loading = true;
    this.backend
      .getHospitalMasterDataOverview()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result: Record<string, unknown>) => {
          this.departments = (result['departments'] as Department[]) || [];
          this.wards = (result['wards'] as WardOverview[]) || [];
          this.loadDoctorCounts();
        },
        error: () => this.toastr.error('Unable to load hospital configuration.'),
      });
  }

  private loadDoctorCounts(): void {
    if (!this.can('doctors.read')) {
      this.doctorCountByDepartment = {};
      return;
    }

    this.backend.getDoctors({ limit: 500, page: 1 }).subscribe({
      next: (result) => {
        const counts: Record<string, number> = {};
        for (const doctor of result.items || []) {
          const deptId = String(doctor.departmentId || '');
          if (!deptId) continue;
          counts[deptId] = (counts[deptId] || 0) + 1;
        }
        this.doctorCountByDepartment = counts;
      },
      error: () => {
        this.doctorCountByDepartment = {};
      },
    });
  }

  get filteredDepartments(): Department[] {
    let items = [...this.departments];
    const search = this.departmentSearch.trim().toLowerCase();

    if (search) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          String(item.code || '').toLowerCase().includes(search) ||
          String(item.category || '').toLowerCase().includes(search)
      );
    }

    if (this.departmentStatusFilter) {
      items = items.filter((item) => item.status === this.departmentStatusFilter);
    }

    const dir = this.departmentSortDir === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      switch (this.departmentSortKey) {
        case 'code':
          return String(a.code || '').localeCompare(String(b.code || '')) * dir;
        case 'category':
          return String(a.category || '').localeCompare(String(b.category || '')) * dir;
        case 'doctors':
          return (
            ((this.doctorCountByDepartment[a._id] || 0) - (this.doctorCountByDepartment[b._id] || 0)) * dir
          );
        case 'status':
          return String(a.status).localeCompare(String(b.status)) * dir;
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });

    return items;
  }

  get filteredWards(): WardOverview[] {
    let items = [...this.wards];
    const search = this.wardSearch.trim().toLowerCase();

    if (search) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          String(item.code || '').toLowerCase().includes(search) ||
          String(item.type || '').toLowerCase().includes(search)
      );
    }

    if (this.wardStatusFilter) {
      items = items.filter((item) => item.status === this.wardStatusFilter);
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  setDepartmentSort(key: DepartmentSortKey): void {
    if (this.departmentSortKey === key) {
      this.departmentSortDir = this.departmentSortDir === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.departmentSortKey = key;
    this.departmentSortDir = 'asc';
  }

  sortIndicator(key: DepartmentSortKey): string {
    if (this.departmentSortKey !== key) return '';
    return this.departmentSortDir === 'asc' ? '▲' : '▼';
  }

  openDepartmentModal(department?: Department): void {
    if (department) {
      if (!this.can('departments.update')) return;
      this.editingDepartmentId = department._id;
      this.departmentForm.reset({
        name: department.name,
        code: department.code || '',
        category: department.category || 'OTHER',
        description: department.description || '',
        status: department.status,
      });
    } else {
      if (!this.can('departments.create')) return;
      this.editingDepartmentId = null;
      this.departmentForm.reset({
        name: '',
        code: '',
        category: 'OTHER',
        description: '',
        status: 'active',
      });
    }
    this.showDepartmentModal = true;
  }

  closeDepartmentModal(): void {
    this.showDepartmentModal = false;
    this.editingDepartmentId = null;
  }

  saveDepartment(): void {
    if (this.departmentForm.invalid) {
      this.departmentForm.markAllAsTouched();
      return;
    }

    const value = this.departmentForm.value;
    const payload: Partial<Department> = {
      name: String(value.name || '').trim(),
      code: String(value.code || '').trim(),
      category: value.category,
      description: value.description || '',
      status: value.status,
    };

    if (!this.editingDepartmentId) {
      payload.hospitalId = this.hospitalId;
    }

    this.savingDepartment = true;
    const request$ = this.editingDepartmentId
      ? this.backend.updateDepartment(this.editingDepartmentId, payload)
      : this.backend.createDepartment(payload);

    request$.pipe(finalize(() => (this.savingDepartment = false))).subscribe({
      next: () => {
        this.toastr.success(this.editingDepartmentId ? 'Department updated.' : 'Department added.');
        this.closeDepartmentModal();
        this.loadOverview();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to save department.'),
    });
  }

  toggleDepartmentStatus(item: Department): void {
    if (!this.can('departments.update')) return;
    const status = item.status === 'active' ? 'inactive' : 'active';
    this.backend.updateDepartment(item._id, { status }).subscribe({
      next: () => {
        item.status = status;
        this.toastr.success(`Department ${status === 'active' ? 'activated' : 'deactivated'}.`);
      },
      error: () => this.toastr.error('Unable to update department.'),
    });
  }

  openWardModal(ward?: WardOverview): void {
    if (ward) {
      if (!this.can('ward.update')) return;
      this.editingWardId = ward._id;
      this.wardForm.reset({
        name: ward.name,
        code: ward.code || '',
        type: ward.type || 'general',
        departmentMode: ward.departmentMode || 'GENERAL',
        departmentIds: [...(ward.departmentIds || [])],
        genderPolicy: ward.genderPolicy || 'mixed',
        ageGroup: ward.ageGroup || 'all',
        careLevel: ward.careLevel || 'general',
        description: ward.description || '',
        status: ward.status,
      });
    } else {
      if (!this.can('ward.create')) return;
      this.editingWardId = null;
      this.wardForm.reset({
        name: '',
        code: '',
        type: 'general',
        departmentMode: 'GENERAL',
        departmentIds: [],
        genderPolicy: 'mixed',
        ageGroup: 'all',
        careLevel: 'general',
        description: '',
        status: 'active',
      });
    }
    this.showWardModal = true;
  }

  closeWardModal(): void {
    this.showWardModal = false;
    this.editingWardId = null;
  }

  saveWard(): void {
    if (this.wardForm.invalid) {
      this.wardForm.markAllAsTouched();
      return;
    }

    const value = this.wardForm.value;
    const payload: Record<string, unknown> = {
      name: String(value.name || '').trim(),
      code: String(value.code || '').trim(),
      type: value.type,
      departmentMode: value.departmentMode,
      departmentIds: value.departmentMode === 'DEPARTMENT_SPECIFIC' ? value.departmentIds || [] : [],
      genderPolicy: value.genderPolicy,
      ageGroup: value.ageGroup,
      careLevel: value.careLevel,
      description: value.description || '',
      status: value.status,
    };

    if (!this.editingWardId) {
      payload['hospitalId'] = this.hospitalId;
    }

    this.savingWard = true;
    const request$ = this.editingWardId
      ? this.backend.updateHospitalWard(this.editingWardId, payload)
      : this.backend.createHospitalWard(payload);

    request$.pipe(finalize(() => (this.savingWard = false))).subscribe({
      next: () => {
        this.toastr.success(this.editingWardId ? 'Ward updated.' : 'Ward added.');
        this.closeWardModal();
        this.loadOverview();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to save ward.'),
    });
  }

  toggleWardStatus(item: WardOverview): void {
    if (!this.can('ward.update')) return;
    const status = item.status === 'active' ? 'inactive' : 'active';
    this.backend.updateHospitalWard(item._id, { status }).subscribe({
      next: () => {
        item.status = status;
        this.toastr.success(`Ward ${status === 'active' ? 'activated' : 'deactivated'}.`);
      },
      error: () => this.toastr.error('Unable to update ward.'),
    });
  }

  wardDepartmentLabels(ward: WardOverview): string {
    if (ward.departmentMode !== 'DEPARTMENT_SPECIFIC' || !ward.departmentIds?.length) {
      return 'General';
    }
    const names = ward.departmentIds
      .map((id) => this.departments.find((dept) => dept._id === id)?.name)
      .filter(Boolean);
    return names.length ? names.join(', ') : '—';
  }

  toggleWardDepartment(deptId: string, checked: boolean): void {
    const current = [...(this.wardForm.get('departmentIds')?.value || [])] as string[];
    const next = checked ? [...new Set([...current, deptId])] : current.filter((id) => id !== deptId);
    this.wardForm.patchValue({ departmentIds: next });
  }

  isWardDepartmentSelected(deptId: string): boolean {
    const ids = (this.wardForm.get('departmentIds')?.value || []) as string[];
    return ids.includes(deptId);
  }

  async confirmAddDefaults(): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'Add Default Hospital Setup?',
      message:
        'This will add any missing standard departments and wards.\nYour existing setup will not be changed.',
      confirmText: 'Add Defaults',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    this.runAddDefaults();
  }

  runAddDefaults(): void {
    this.syncing = true;
    this.backend
      .syncHospitalMasterDataTemplates({ activateDefaults: false })
      .pipe(finalize(() => (this.syncing = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Default departments and wards added where missing.');
          this.loadOverview();
        },
        error: () => this.toastr.error('Unable to add default setup.'),
      });
  }

  loadBirthCertificateSettings(): void {
    if (!this.hospitalId) return;
    this.backend.getHospital(this.hospitalId).subscribe({
      next: (hospital) => {
        this.birthSettings = {
          ...this.birthSettings,
          ...(hospital.birthCertificateSettings || {}),
        };
      },
      error: () => this.toastr.error('Unable to load birth certificate settings.'),
    });
  }

  saveBirthCertificateSettings(): void {
    if (!this.hospitalId) {
      this.toastr.error('Hospital context not found.');
      return;
    }
    this.savingBirthSettings = true;
    this.backend
      .updateHospital(this.hospitalId, { birthCertificateSettings: this.birthSettings })
      .pipe(finalize(() => (this.savingBirthSettings = false)))
      .subscribe({
        next: () => this.toastr.success('Birth certificate settings saved.'),
        error: () => this.toastr.error('Unable to save birth certificate settings.'),
      });
  }

  formatLabel(value: string): string {
    return String(value || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
