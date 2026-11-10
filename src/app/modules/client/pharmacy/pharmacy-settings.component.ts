import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { PharmacyDiscountSettingsCacheService } from '../../../core/services/pharmacy-discount-settings-cache.service';
import { hasRouteAccess, readStoredPermissions } from '../../auth/access-control';
import {
  CompanyProfile,
  PharmacyDiscountSettings,
} from '../../../shared/models/company.model';

@Component({
  selector: 'app-pharmacy-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pharmacy-settings.component.html',
  styleUrl: './pharmacy-settings.component.scss',
})
export class PharmacySettingsComponent implements OnInit {
  private readonly backend = inject(BackendService);
  private readonly toastr = inject(ToastrService);
  private readonly discountCache = inject(PharmacyDiscountSettingsCacheService);

  loading = false;
  saving = false;
  company: CompanyProfile | null = null;

  form: PharmacyDiscountSettings = {
    allowDiscountAnyMedicine: false,
  };

  readonly canEdit = hasRouteAccess(
    { any: ['company.manage', '*'] },
    readStoredPermissions(),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.backend
      .getMyCompany()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (company) => {
          this.company = company;
          this.discountCache.write(company);
          this.form = {
            allowDiscountAnyMedicine: Boolean(
              company.pharmacyDiscountSettings?.allowDiscountAnyMedicine,
            ),
          };
        },
        error: (err) =>
          this.toastr.error(err?.error?.message || 'Unable to load pharmacy settings'),
      });
  }

  save(): void {
    if (!this.canEdit || this.saving) {
      return;
    }

    this.saving = true;
    this.backend
      .updateMyCompany({
        pharmacyDiscountSettings: {
          allowDiscountAnyMedicine: Boolean(this.form.allowDiscountAnyMedicine),
        },
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res) => {
          const company = res.data || this.company;
          if (company) {
            this.company = {
              ...company,
              pharmacyDiscountSettings: {
                allowDiscountAnyMedicine: Boolean(this.form.allowDiscountAnyMedicine),
              },
            };
            this.discountCache.write(this.company);
          }
          this.toastr.success('Pharmacy discount settings saved.');
        },
        error: (err) =>
          this.toastr.error(err?.error?.message || 'Unable to save pharmacy settings'),
      });
  }
}
