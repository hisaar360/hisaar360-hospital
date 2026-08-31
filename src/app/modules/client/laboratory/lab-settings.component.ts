import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { LabSettingsResponse, LaboratoryPrintSettings, LabReportSignatory } from '../../../shared/models/hospital.model';
import {
  resolveLabPrintDetails,
  normalizeLabReportHexColor,
  DEFAULT_LAB_SIGNATORIES,
  DEFAULT_LAB_REPORT_DISCLAIMER,
  DEFAULT_LAB_SYSTEM_GENERATED_LINE,
} from './lab-print-details';

@Component({
  selector: 'app-lab-settings',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lab-settings.component.html',
  styleUrl: './lab-settings.component.scss',
})
export class LabSettingsComponent implements OnInit {
  loading = false;
  saving = false;
  settingsResponse: LabSettingsResponse | null = null;
  form: LaboratoryPrintSettings = this.emptyForm();

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.backend
      .getLabSettings()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.settingsResponse = response;
          this.form = {
            useCustomDetails: response.laboratorySettings?.useCustomDetails === true,
            name: response.laboratorySettings?.name || '',
            phone: response.laboratorySettings?.phone || '',
            email: response.laboratorySettings?.email || '',
            address: response.laboratorySettings?.address || '',
            city: response.laboratorySettings?.city || '',
            tagline: response.laboratorySettings?.tagline || 'Pathology & Diagnostic Laboratory',
            reportNameColor: normalizeLabReportHexColor(response.laboratorySettings?.reportNameColor),
            reportBorderColor: normalizeLabReportHexColor(
              response.laboratorySettings?.reportBorderColor,
              '#c92a2a'
            ),
            reportDisclaimer:
              response.laboratorySettings?.reportDisclaimer || DEFAULT_LAB_REPORT_DISCLAIMER,
            systemGeneratedLine:
              response.laboratorySettings?.systemGeneratedLine || DEFAULT_LAB_SYSTEM_GENERATED_LINE,
            reportSignatories: this.cloneSignatories(
              response.laboratorySettings?.reportSignatories || DEFAULT_LAB_SIGNATORIES
            ),
          };
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to load laboratory settings.'),
      });
  }

  saveSettings(): void {
    this.saving = true;
    this.backend
      .updateLabSettings({
        useCustomDetails: this.form.useCustomDetails === true,
        name: this.form.name?.trim() || '',
        phone: this.form.phone?.trim() || '',
        email: this.form.email?.trim() || '',
        address: this.form.address?.trim() || '',
        city: this.form.city?.trim() || '',
        tagline: this.form.tagline?.trim() || 'Pathology & Diagnostic Laboratory',
        reportNameColor: normalizeLabReportHexColor(this.form.reportNameColor),
        reportBorderColor: normalizeLabReportHexColor(this.form.reportBorderColor, '#c92a2a'),
        reportDisclaimer: this.form.reportDisclaimer?.trim() || DEFAULT_LAB_REPORT_DISCLAIMER,
        systemGeneratedLine:
          this.form.systemGeneratedLine?.trim() || DEFAULT_LAB_SYSTEM_GENERATED_LINE,
        reportSignatories: this.normalizedSignatories(),
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.settingsResponse = response.data || this.settingsResponse;
          if (response.data?.laboratorySettings) {
            this.form = {
              ...this.form,
              ...response.data.laboratorySettings,
              reportNameColor: normalizeLabReportHexColor(
                response.data.laboratorySettings.reportNameColor
              ),
              reportBorderColor: normalizeLabReportHexColor(
                response.data.laboratorySettings.reportBorderColor,
                '#c92a2a'
              ),
              reportDisclaimer:
                response.data.laboratorySettings.reportDisclaimer || DEFAULT_LAB_REPORT_DISCLAIMER,
              systemGeneratedLine:
                response.data.laboratorySettings.systemGeneratedLine ||
                DEFAULT_LAB_SYSTEM_GENERATED_LINE,
              reportSignatories: this.cloneSignatories(
                response.data.laboratorySettings.reportSignatories || []
              ),
            };
          }
          this.toastr.success(response.message || 'Laboratory settings saved.');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save laboratory settings.'),
      });
  }

  hospitalPreviewLine(): string {
    const hospital = this.settingsResponse?.hospital;
    if (!hospital) {
      return 'Hospital details not loaded.';
    }

    return [hospital.name, hospital.phone, [hospital.address, hospital.city].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(' · ');
  }

  reportPreviewName(): string {
    if (!this.settingsResponse) {
      return 'Laboratory';
    }

    const hospital = {
      _id: '',
      name: this.settingsResponse.hospital.name,
      code: '',
      status: 'active' as const,
      phone: this.settingsResponse.hospital.phone,
      email: this.settingsResponse.hospital.email,
      address: this.settingsResponse.hospital.address,
      city: this.settingsResponse.hospital.city,
      laboratorySettings: this.form,
    };

    return resolveLabPrintDetails(hospital, { mode: 'receipt' }).name;
  }

  reportUsesLabDetails(): boolean {
    return this.form.useCustomDetails === true;
  }

  previewNameColor(): string {
    return normalizeLabReportHexColor(this.form.reportNameColor);
  }

  previewBorderColor(): string {
    return normalizeLabReportHexColor(this.form.reportBorderColor, '#c92a2a');
  }

  addSignatory(): void {
    this.form.reportSignatories = [
      ...(this.form.reportSignatories || []),
      { name: '', credentials: '', title: '' },
    ];
  }

  removeSignatory(index: number): void {
    this.form.reportSignatories = (this.form.reportSignatories || []).filter((_, i) => i !== index);
  }

  private cloneSignatories(items: LabReportSignatory[]): LabReportSignatory[] {
    return (items || []).map((item) => ({
      name: item.name || '',
      credentials: item.credentials || '',
      title: item.title || '',
    }));
  }

  private normalizedSignatories(): LabReportSignatory[] {
    return this.cloneSignatories(this.form.reportSignatories || []).filter((item) => item.name.trim());
  }

  private emptyForm(): LaboratoryPrintSettings {
    return {
      useCustomDetails: false,
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      tagline: 'Pathology & Diagnostic Laboratory',
      reportNameColor: '#c92a2a',
      reportBorderColor: '#c92a2a',
      reportDisclaimer: DEFAULT_LAB_REPORT_DISCLAIMER,
      systemGeneratedLine: DEFAULT_LAB_SYSTEM_GENERATED_LINE,
      reportSignatories: this.cloneSignatories(DEFAULT_LAB_SIGNATORIES),
    };
  }
}
