import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import { Doctor, Hospital, PrescriptionTemplate, User } from '../../../shared/models/hospital.model';
import {
  DEFAULT_PRESCRIPTION_LAYOUT,
  DEFAULT_PRESCRIPTION_STYLE,
  PRESCRIPTION_LAYOUT_LABELS,
  THEME_COLOR_PRESETS,
  PrescriptionLayoutSection,
  PrescriptionLayoutSectionKey,
  PrescriptionStyleSettings,
  normalizePrescriptionLayout,
  normalizePrescriptionStyle,
  prescriptionStyleToCssVars,
} from './prescription-style';
import {
  ANTEPARTUM_DEFAULT_NOTE_TO_PATIENT,
  resolveGynaePrintRows,
  splitGynaePrintRows,
} from './gynae-prescription-data';
import { inferSpecialtyTemplateKey, SpecialtyTemplateKey } from './prescription-specialty-print';
import {
  formatEnglishAddress,
  formatEnglishDoctorName,
  formatEnglishOrganizationName,
  formatUrduAddress,
  formatUrduDoctorName,
  formatUrduDoctorTitle,
  formatUrduOrganizationName,
  formatUrduQualification,
  toPrescriptionUrduText,
} from './prescription-print-urdu';
import { transliterateLatinToUrdu } from '../../../shared/utils/urdu-transliteration';

type DragTarget =
  | 'english-left'
  | 'english-right'
  | 'urdu-left'
  | 'urdu-right'
  | 'logo-x'
  | 'logo-y'
  | null;

@Component({
  selector: 'app-prescription-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './prescription-designer.component.html',
  styleUrl: './prescription-designer.component.scss',
})
export class PrescriptionDesignerComponent implements OnInit, OnDestroy {
  loading = true;
  saving = false;
  doctor: Doctor | null = null;
  hospital: Hospital | null = null;
  errorMessage = '';

  selectedTemplate: PrescriptionTemplate = 'classic';
  style: PrescriptionStyleSettings = { ...DEFAULT_PRESCRIPTION_STYLE };
  layout: PrescriptionLayoutSection[] = DEFAULT_PRESCRIPTION_LAYOUT.map((item) => ({ ...item }));

  readonly templates: Array<{ id: PrescriptionTemplate; name: string; description: string }> = [
    { id: 'classic', name: 'Classic', description: 'Traditional bilingual A4' },
    { id: 'clinical-blue', name: 'Clinical Blue', description: 'Detailed hospital style' },
    { id: 'minimal-teal', name: 'Structure B · Green', description: 'Stacked card layout' },
    { id: 'compact-mono', name: 'Structure C · Purple', description: 'Sectioned blocks' },
  ];

  readonly layoutLabels = PRESCRIPTION_LAYOUT_LABELS;
  readonly logoPositions: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
  readonly themePresets = THEME_COLOR_PRESETS;

  private dragTarget: DragTarget = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartValue = 0;
  private dragStartLogoY = 0;
  private subscriptions = new Subscription();

  sampleMedicines = [
    { name: 'tablet Paracetamol', duration: '5 Days', after: true, morning: '1', night: '1' },
    { name: 'capsule Omeprazole', duration: '14 Days', before: true, morning: '1' },
    { name: 'syrup Iron', duration: '1 Month', after: true, morning: '1', evening: '1' },
  ];

  readonly today = new Date().toLocaleDateString('en-GB');

  constructor(
    private readonly backend: BackendService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadDesigner();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get cssVars(): Record<string, string> {
    return prescriptionStyleToCssVars(this.style);
  }

  get previewLogoScale(): number {
    return this.style.logoScale / 100;
  }

  get specialtyKey(): SpecialtyTemplateKey {
    return inferSpecialtyTemplateKey(this.doctor);
  }

  get specialtyLabel(): string {
    const labels: Record<SpecialtyTemplateKey, string> = {
      general: 'General',
      gynae: 'Gynae / OBS',
      eye: 'Eye',
      dental: 'Dental',
      physiotherapy: 'Physiotherapy',
      ultrasound: 'Ultrasound',
      radiology: 'Radiology',
      lab: 'Lab',
    };
    return labels[this.specialtyKey] || 'General';
  }

  get doctorNameEn(): string {
    return formatEnglishDoctorName(this.doctor?.user?.name || 'Doctor');
  }

  get doctorNameUr(): string {
    return formatUrduDoctorName(this.doctor?.user?.name, this.doctor?.nameUrdu);
  }

  get qualificationEn(): string {
    return this.doctor?.qualification || 'MBBS, FCPS';
  }

  get qualificationUr(): string {
    return formatUrduQualification(this.qualificationEn);
  }

  get specialtyEn(): string {
    return this.doctor?.specialization || 'Consultant';
  }

  get specialtyUr(): string {
    return formatUrduDoctorTitle(this.specialtyEn);
  }

  get hospitalNameEn(): string {
    return formatEnglishOrganizationName(this.hospital?.name) || this.hospital?.name || 'Hospital';
  }

  get hospitalNameUr(): string {
    return (
      formatUrduOrganizationName(this.hospital?.name, this.hospital?.nameUrdu) ||
      transliterateLatinToUrdu(this.hospital?.name || '') ||
      'ہسپتال'
    );
  }

  get hospitalAddressEn(): string {
    return formatEnglishAddress(this.hospital?.address) || this.hospital?.address || '';
  }

  get hospitalAddressUr(): string {
    return formatUrduAddress(this.hospital?.address) || toPrescriptionUrduText(this.hospital?.address);
  }

  get samplePatient(): {
    name: string;
    age: string;
    sex: string;
    fileNo: string;
    address: string;
    phone: string;
    disease: string;
    bloodGroup?: string;
  } {
    if (this.specialtyKey === 'gynae') {
      return {
        name: 'Sample Patient',
        age: '28 Y',
        sex: 'Female',
        fileNo: 'P-1001',
        address: 'Sample address',
        phone: '0300-0000000',
        disease: 'ANC follow-up',
        bloodGroup: 'AB+',
      };
    }
    if (this.specialtyKey === 'eye') {
      return {
        name: 'Sample Patient',
        age: '45 Y',
        sex: 'Male',
        fileNo: 'P-1001',
        address: 'Sample address',
        phone: '0300-0000000',
        disease: 'Decreased vision OD',
      };
    }
    if (this.specialtyKey === 'dental') {
      return {
        name: 'Sample Patient',
        age: '32 Y',
        sex: 'Male',
        fileNo: 'P-1001',
        address: 'Sample address',
        phone: '0300-0000000',
        disease: 'Toothache / caries',
      };
    }
    if (this.specialtyKey === 'physiotherapy') {
      return {
        name: 'Sample Patient',
        age: '40 Y',
        sex: 'Female',
        fileNo: 'P-1001',
        address: 'Sample address',
        phone: '0300-0000000',
        disease: 'Low back pain',
      };
    }
    return {
      name: 'Sample Patient',
      age: '35 Y',
      sex: 'Male',
      fileNo: 'P-1001',
      address: 'Sample address',
      phone: '0300-0000000',
      disease: 'OPD follow-up',
    };
  }

  get sampleConsultationRows(): Array<{ label: string; value: string }> {
    if (this.specialtyKey === 'gynae') {
      return [
        { label: 'History', value: 'LMP 01/09/2026 · GA 12w 3d · G2 P1 A0 L1' },
        { label: 'Examination', value: 'Pelvic examination not done' },
      ];
    }
    if (this.specialtyKey === 'eye') {
      return [
        { label: 'Complaint', value: 'Blurred vision OD for 2 weeks' },
        { label: 'Examination', value: 'VA OD 6/18 · OS 6/9' },
      ];
    }
    return [{ label: 'Complaint', value: 'Routine OPD visit' }];
  }

  get sampleGynaeSpecialtyData(): Record<string, unknown> {
    // Mirrors real antenatal print payload (same fields as consultation Print Preview).
    return {
      gynaeMode: 'antenatal',
      lmp: '2026-09-01',
      edd: '2027-06-08',
      gestationalAge: '12w 3d',
      gravida: '2',
      para: '1',
      abortion: '0',
      living: '1',
      previousCSection: 'No',
      fetalMovement: 'Present',
      fundalHeight: '21',
      fetalHeartRate: '140',
      presentation: 'Cephalic',
      urineAlbumin: 'Nil',
      urineSugar: 'Nil',
      edema: 'No',
      pregnancyEpisodeNumber: '1',
      visitGestationalAge: '12w 4d',
      pregnancyEddDisplay: '08 Jun 2027',
      pregnancyEddLabel: 'Estimated EDD',
      pvExamination: 'Abdomen soft. Examination findings as documented.',
      antenatalOtherNotes: 'Routine ANC. Follow investigations as advised.',
      antenatalDangerFeverCounselled: 'Yes',
      pelvicExamDone: 'Not Done',
      gynaeNoteToPatient: ANTEPARTUM_DEFAULT_NOTE_TO_PATIENT,
    };
  }

  private get sampleGynaePrintSplit(): {
    sidebar: Array<{ label: string; value: string; wide?: boolean }>;
    extended: Array<{ label: string; value: string; wide?: boolean }>;
  } {
    if (this.specialtyKey !== 'gynae') {
      return { sidebar: [], extended: [] };
    }
    const rows = resolveGynaePrintRows(this.sampleGynaeSpecialtyData);
    return splitGynaePrintRows(rows, 'antenatal');
  }

  get sampleGynaeMetrics(): Array<{ label: string; value: string }> {
    // Real Classic print uses the same sidebar rows in the top metrics strip.
    return this.sampleGynaePrintSplit.sidebar.map((row) => ({
      label: row.label,
      value: row.value,
    }));
  }

  get sampleSpecialtySidebar(): Array<{ label: string; value: string }> {
    if (this.specialtyKey === 'gynae') {
      return this.sampleGynaePrintSplit.sidebar.map((row) => ({
        label: row.label,
        value: row.value,
      }));
    }
    if (this.specialtyKey === 'eye') {
      return [
        { label: 'VA OD', value: '6/18' },
        { label: 'VA OS', value: '6/9' },
        { label: 'IOP OD', value: '14' },
      ];
    }
    if (this.specialtyKey === 'dental') {
      return [
        { label: 'Tooth', value: '36' },
        { label: 'Finding', value: 'Deep caries' },
      ];
    }
    if (this.specialtyKey === 'physiotherapy') {
      return [
        { label: 'Region', value: 'Lumbar' },
        { label: 'Pain', value: '6/10' },
      ];
    }
    return [];
  }

  get sampleGynaeExtended(): Array<{ label: string; value: string; wide?: boolean }> {
    return this.sampleGynaePrintSplit.extended;
  }

  get samplePatientNote(): string {
    if (this.specialtyKey === 'gynae') {
      return String(this.sampleGynaeSpecialtyData['gynaeNoteToPatient'] || ANTEPARTUM_DEFAULT_NOTE_TO_PATIENT);
    }
    return 'Take medicines as advised. Follow up after 2 weeks.';
  }

  get sampleFollowUpDate(): string {
    if (this.specialtyKey === 'gynae') {
      return 'Oct 6, 2026';
    }
    return 'After 2 weeks';
  }

  get sampleMedicinesForSpecialty(): Array<{
    name: string;
    duration: string;
    after?: boolean;
    before?: boolean;
    morning?: string;
    evening?: string;
    night?: string;
  }> {
    if (this.specialtyKey === 'gynae') {
      return [
        { name: 'tablet Folic Acid', duration: '1 Month', after: true, morning: '1' },
        { name: 'capsule Iron + Folate', duration: '1 Month', after: true, night: '1' },
        { name: 'tablet Calcium', duration: '1 Month', after: true, morning: '1', night: '1' },
      ];
    }
    if (this.specialtyKey === 'eye') {
      return [
        { name: 'drops Moxifloxacin', duration: '7 Days', after: true, morning: '1', evening: '1', night: '1' },
        { name: 'drops Artificial Tears', duration: '14 Days', after: true, morning: '1', evening: '1' },
      ];
    }
    return this.sampleMedicines;
  }

  sectionVisible(key: PrescriptionLayoutSectionKey): boolean {
    return this.layout.find((item) => item.key === key)?.visible !== false;
  }

  loadDesigner(): void {
    this.loading = true;
    this.errorMessage = '';

    this.subscriptions.add(
      this.backend.getMyDoctorProfile().subscribe({
        next: (doctor) => {
          if (!doctor?._id) {
            this.errorMessage =
              'Doctor profile not found. Only doctors can customize prescription design.';
            this.loading = false;
            return;
          }

          this.doctor = doctor;
          this.applyDoctorSettings(doctor, null);
          this.loading = false;

          this.subscriptions.add(
            this.backend.getMe().subscribe({
              next: (user) => {
                const nestedHospital = (user as User & { hospital?: Hospital | null })?.hospital || null;
                if (nestedHospital) {
                  this.hospital = nestedHospital;
                  this.applyDoctorSettings(doctor, nestedHospital);
                  return;
                }

                const hospitalId = doctor.hospitalId || user.hospitalId;
                if (hospitalId) {
                  this.backend.getHospital(hospitalId).subscribe({
                    next: (hospital) => {
                      this.hospital = hospital;
                      this.applyDoctorSettings(doctor, hospital);
                    },
                    error: () => {
                      /* keep defaults */
                    },
                  });
                }
              },
              error: () => {
                /* keep defaults */
              },
            })
          );
        },
        error: () => {
          this.errorMessage =
            'Unable to load designer. Login as a doctor to customize your prescription.';
          this.loading = false;
        },
      })
    );
  }

  applyDoctorSettings(doctor: Doctor, hospital: Hospital | null): void {
    this.selectedTemplate = (doctor.prescriptionTemplate as PrescriptionTemplate) || 'classic';
    this.layout = normalizePrescriptionLayout(doctor.prescriptionLayout as PrescriptionLayoutSection[]);
    const hospitalLogoScale = Number(hospital?.prescriptionSettings?.logoScale) || 100;
    this.style = normalizePrescriptionStyle({
      ...DEFAULT_PRESCRIPTION_STYLE,
      logoScale: hospitalLogoScale,
      ...(doctor.prescriptionStyle || {}),
    });
  }

  resetToDefaults(): void {
    const hospitalLogoScale = Number(this.hospital?.prescriptionSettings?.logoScale) || 100;
    this.selectedTemplate = 'classic';
    this.layout = DEFAULT_PRESCRIPTION_LAYOUT.map((item) => ({ ...item }));
    this.style = normalizePrescriptionStyle({
      ...DEFAULT_PRESCRIPTION_STYLE,
      logoScale: hospitalLogoScale,
    });
    this.toastr.info('Defaults restored locally. Click Save to apply for your profile.');
  }

  applyThemePreset(presetId: string): void {
    const preset = this.themePresets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    this.style = normalizePrescriptionStyle({
      ...this.style,
      accentColor: preset.accentColor,
      tableHeaderBg: preset.tableHeaderBg,
      tableBorderColor: preset.tableBorderColor,
      metaBarBg: preset.metaBarBg,
      metaBarText: preset.metaBarText,
      sectionTitleColor: preset.sectionTitleColor,
      enNameColor: preset.accentColor,
      urNameColor: preset.accentColor,
    });
  }

  save(): void {
    if (!this.doctor?._id) {
      this.toastr.error('Doctor profile missing');
      return;
    }

    this.saving = true;
    const payload = {
      prescriptionTemplate: this.selectedTemplate,
      prescriptionLayout: this.layout,
      prescriptionStyle: this.style as unknown as Record<string, number | string | boolean>,
    };

    this.subscriptions.add(
      this.backend.updateMyPrescriptionTemplate(payload).subscribe({
        next: (response) => {
          const saved = response?.data || null;
          if (saved) {
            this.doctor = saved;
            this.applyDoctorSettings(saved, this.hospital);
          }
          this.saving = false;
          this.toastr.success('Prescription design saved for your doctor profile.');
        },
        error: (error) => {
          this.saving = false;
          this.toastr.error(error?.error?.message || 'Failed to save prescription design');
        },
      })
    );
  }

  startMarginDrag(target: DragTarget, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragTarget = target;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    switch (target) {
      case 'english-left':
        this.dragStartValue = this.style.englishHeadingMarginLeft;
        break;
      case 'english-right':
        this.dragStartValue = this.style.englishHeadingMarginRight;
        break;
      case 'urdu-left':
        this.dragStartValue = this.style.urduHeadingMarginLeft;
        break;
      case 'urdu-right':
        this.dragStartValue = this.style.urduHeadingMarginRight;
        break;
      case 'logo-x':
        this.dragStartValue = this.style.logoOffsetX;
        this.dragStartLogoY = this.style.logoOffsetY;
        break;
      case 'logo-y':
        this.dragStartValue = this.style.logoOffsetY;
        break;
      default:
        this.dragStartValue = 0;
    }
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.dragTarget) {
      return;
    }

    const dxMm = (event.clientX - this.dragStartX) / 3.78;
    const dyMm = (event.clientY - this.dragStartY) / 3.78;

    switch (this.dragTarget) {
      case 'english-left':
        this.style.englishHeadingMarginLeft = this.clamp(this.dragStartValue + dxMm, -40, 80);
        break;
      case 'english-right':
        this.style.englishHeadingMarginRight = this.clamp(this.dragStartValue - dxMm, -40, 80);
        break;
      case 'urdu-left':
        this.style.urduHeadingMarginLeft = this.clamp(this.dragStartValue + dxMm, -40, 80);
        break;
      case 'urdu-right':
        this.style.urduHeadingMarginRight = this.clamp(this.dragStartValue - dxMm, -40, 80);
        break;
      case 'logo-x':
        this.style.logoOffsetX = this.clamp(this.dragStartValue + dxMm, -60, 60);
        this.style.logoOffsetY = this.clamp(this.dragStartLogoY + dyMm, -40, 40);
        break;
      case 'logo-y':
        this.style.logoOffsetY = this.clamp(this.dragStartValue + dyMm, -40, 40);
        break;
    }
  }

  @HostListener('window:pointerup')
  onPointerUp(): void {
    this.dragTarget = null;
  }

  moveLayout(index: number, direction: -1 | 1): void {
    const next = index + direction;
    if (next < 0 || next >= this.layout.length) {
      return;
    }
    const copy = [...this.layout];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    this.layout = copy;
  }

  trackLayout(_index: number, item: PrescriptionLayoutSection): string {
    return item.key;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.round(Math.min(max, Math.max(min, value)) * 10) / 10;
  }
}
