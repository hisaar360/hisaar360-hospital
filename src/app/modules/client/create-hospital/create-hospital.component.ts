import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';

import { BackendService } from '../../../core/services/backend.service';
import {
  Hospital,
  HospitalEnabledModules,
} from '../../../shared/models/hospital.model';
import {
  modulesForSubscriptionPlan,
  normalizeHospitalModules,
} from '../../auth/hospital-modules';

@Component({
  selector: 'app-create-hospital',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-hospital.component.html',
  styleUrl: './create-hospital.component.scss',
})
export class CreateHospitalComponent implements OnInit, OnDestroy {
  hospitalForm!: FormGroup;
  saving = false;
  editingHospital: Hospital | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private toast: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.editingHospital = history.state?.hospital || null;
    this.initForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    const plan = this.editingHospital?.subscriptionPlan || 'basic';
    const modules = normalizeHospitalModules(
      this.editingHospital?.enabledModules,
      { subscriptionPlan: plan }
    );

    this.hospitalForm = this.fb.group({
      name: [this.editingHospital?.name || '', Validators.required],
      code: [this.editingHospital?.code || '', Validators.required],
      email: [this.editingHospital?.email || '', [Validators.email]],
      phone: [this.editingHospital?.phone || ''],
      address: [this.editingHospital?.address || ''],
      city: [this.editingHospital?.city || ''],
      country: [this.editingHospital?.country || 'Pakistan'],
      logoUrl: [this.editingHospital?.logoUrl || ''],
      subscriptionPlan: [plan],
      status: [this.editingHospital?.status || 'active', Validators.required],
      enabledModules: this.fb.group({
        pharmacy: [modules.pharmacy],
        laboratory: [modules.laboratory],
        ward: [modules.ward],
        clinical: [modules.clinical],
      }),
    });

    this.hospitalForm
      .get('subscriptionPlan')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.applyPlanModuleDefaults(String(value || '')));
  }

  can(permission: string): boolean {
    return this.backend.hasPermission(permission);
  }

  get enabledModulesGroup(): FormGroup {
    return this.hospitalForm.get('enabledModules') as FormGroup;
  }

  private applyPlanModuleDefaults(plan: string): void {
    const modules = modulesForSubscriptionPlan(plan);
    this.enabledModulesGroup.patchValue(modules, { emitEvent: false });
  }

  submitForm(): void {
    if (!this.editingHospital && !this.can('hospitals.create')) {
      return;
    }

    if (this.editingHospital && !this.can('hospitals.update')) {
      return;
    }

    if (this.hospitalForm.invalid) {
      this.hospitalForm.markAllAsTouched();
      return;
    }

    const value = this.hospitalForm.value;
    const enabledModules: HospitalEnabledModules = {
      pharmacy: Boolean(value.enabledModules?.pharmacy),
      laboratory: Boolean(value.enabledModules?.laboratory),
      ward: Boolean(value.enabledModules?.ward),
      clinical: Boolean(value.enabledModules?.clinical),
    };

    if (
      !enabledModules.pharmacy &&
      !enabledModules.laboratory &&
      !enabledModules.ward &&
      !enabledModules.clinical
    ) {
      this.toast.error(
        'Enable at least one module: Pharmacy, Laboratory, Ward, or Appointments / Prescriptions / Doctors.'
      );
      return;
    }

    const payload: Record<string, unknown> = {
      name: value.name,
      code: value.code,
      email: value.email || undefined,
      phone: value.phone || undefined,
      address: value.address || undefined,
      city: value.city || undefined,
      country: value.country || undefined,
      logoUrl: value.logoUrl || undefined,
      subscriptionPlan: value.subscriptionPlan || undefined,
      status: value.status,
      enabledModules,
    };

    this.saving = true;

    const request$ = this.editingHospital
      ? this.backend.updateHospital(this.editingHospital._id, payload)
      : this.backend.createHospital(payload);

    request$.subscribe({
      next: (resp: any) => {
        this.saving = false;
        this.toast.success(
          resp?.message ||
            (this.editingHospital
              ? 'Hospital updated successfully'
              : 'Hospital created successfully')
        );
        this.router.navigateByUrl('/hospitals');
      },
      error: (err: any) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Unable to save hospital.');
      },
    });
  }
}
