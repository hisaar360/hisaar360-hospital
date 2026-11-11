import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import {
  Doctor,
  Hospital,
  Patient,
  PrescriptionTemplate,
  User,
} from '../../../shared/models/hospital.model';
import {
  DEFAULT_PRESCRIPTION_LAYOUT,
  DEFAULT_PRESCRIPTION_STYLE,
  PRESCRIPTION_LAYOUT_LABELS,
  THEME_COLOR_PRESETS,
  PrescriptionCustomSection,
  PrescriptionLayoutSection,
  PrescriptionLayoutSectionKey,
  PrescriptionStyleSettings,
  createPrescriptionCustomSection,
  normalizePrescriptionCustomSections,
  normalizePrescriptionLayout,
  normalizePrescriptionStyle,
  prescriptionStyleToCssVars,
  splitPrescriptionNoteLines,
} from './prescription-style';
import {
  ANTEPARTUM_DEFAULT_NOTE_TO_PATIENT,
  normalizeGynaeConsultMode,
  resolveGynaeConsultationStripRows,
  resolveGynaePrintRows,
  splitGynaePrintRows,
} from './gynae-prescription-data';
import { buildClinicalRxPrintPages } from './clinical-rx-print-pages';
import { PrescriptionPrintPreviewData } from './prescription-print-data.model';
import { PrescriptionPrintSheetComponent } from './prescription-print-sheet.component';
import {
  DEFAULT_PRESCRIPTION_PRINT_COPY,
  normalizePrescriptionPrintCopy,
  PrescriptionPrintCopy,
  resolvePrintCopyValue,
} from './prescription-print-copy';
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
  formatMedicineDurationForPrint,
  toPrescriptionUrduText,
} from './prescription-print-urdu';
import { transliterateLatinToUrdu } from '../../../shared/utils/urdu-transliteration';
import { resolveAssetUrl } from '../../../core/utils/asset.util';

type DragTarget =
  | 'english-left'
  | 'english-right'
  | 'urdu-left'
  | 'urdu-right'
  | 'logo-x'
  | 'logo-y'
  | 'header-y'
  | 'meta-y'
  | 'patient-y'
  | 'body-y'
  | 'notes-y'
  | 'footer-y'
  | 'line-gap'
  | 'section-gap'
  | null;

type DesignerEditBlock =
  | 'header'
  | 'meta'
  | 'patient'
  | 'medicines'
  | 'instructions'
  | 'footer'
  | 'logo'
  | 'custom';

@Component({
  selector: 'app-prescription-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PrescriptionPrintSheetComponent],
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
  customSections: PrescriptionCustomSection[] = [];
  printCopy: PrescriptionPrintCopy = { ...DEFAULT_PRESCRIPTION_PRINT_COPY };
  selectedEditBlock: DesignerEditBlock = 'header';

  readonly templates: Array<{ id: PrescriptionTemplate; name: string; description: string }> = [
    { id: 'classic', name: 'Classic', description: 'Traditional bilingual A4' },
    { id: 'clinical-blue', name: 'Clinical Blue', description: 'Detailed hospital style' },
    {
      id: 'gynae-clinical',
      name: 'Gynae Theme 1 · Clinical Teal',
      description: 'Professional teal gynae prescription layout',
    },
    {
      id: 'gynae-womens-health',
      name: "Gynae Theme 2 · Women's Health",
      description: "Bilingual women's health clinic layout",
    },
    {
      id: 'gynae-modern',
      name: 'Gynae Theme 3 · Modern Purple',
      description: "Premium pink and purple women's health layout",
    },
    { id: 'minimal-teal', name: 'Structure B · Green', description: 'Stacked card layout' },
    { id: 'compact-mono', name: 'Structure C · Purple', description: 'Sectioned blocks' },
  ];

  get isGynaeTemplateSelected(): boolean {
    return (
      this.selectedTemplate === 'gynae-clinical' ||
      this.selectedTemplate === 'gynae-womens-health' ||
      this.selectedTemplate === 'gynae-modern'
    );
  }

  get usesInteractiveClassicPreview(): boolean {
    return this.selectedTemplate === 'classic';
  }

  get selectedTemplateLabel(): string {
    return this.templates.find((template) => template.id === this.selectedTemplate)?.name || 'Classic';
  }

  get selectedEditBlockLabel(): string {
    const labels: Record<DesignerEditBlock, string> = {
      header: 'Header / Doctor name',
      meta: 'Meta / Prescription No',
      patient: 'Patient block',
      medicines: 'Medicines',
      instructions: 'Notes / Instructions',
      footer: 'Footer',
      logo: 'Logo',
      custom: 'Custom sections',
    };
    return labels[this.selectedEditBlock] || 'Header';
  }

  selectEditBlock(block: DesignerEditBlock): void {
    this.selectedEditBlock = block;
  }

  addCustomSection(): void {
    this.customSections = [
      ...this.customSections,
      createPrescriptionCustomSection({
        title: `Custom Section ${this.customSections.length + 1}`,
        body: 'Write patient notes or clinic instructions here.',
      }),
    ];
    this.selectedEditBlock = 'custom';
  }

  removeCustomSection(index: number): void {
    this.customSections = this.customSections.filter((_, itemIndex) => itemIndex !== index);
  }

  trackCustomSection(_index: number, section: PrescriptionCustomSection): string {
    return section.id;
  }

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
    return formatEnglishDoctorName(
      resolvePrintCopyValue(this.printCopy.doctorDisplayName, this.doctor?.user?.name || 'Doctor')
    );
  }

  get doctorNameUr(): string {
    return formatUrduDoctorName(
      resolvePrintCopyValue(this.printCopy.doctorDisplayName, this.doctor?.user?.name),
      this.doctor?.nameUrdu
    );
  }

  get qualificationEn(): string {
    return resolvePrintCopyValue(this.printCopy.qualification, this.doctor?.qualification || 'MBBS, FCPS');
  }

  get qualificationUr(): string {
    return formatUrduQualification(this.qualificationEn);
  }

  get specialtyEn(): string {
    return resolvePrintCopyValue(
      this.printCopy.specialtyTitle,
      this.doctor?.specialization || 'Consultant'
    );
  }

  get specialtyUr(): string {
    return formatUrduDoctorTitle(this.specialtyEn);
  }

  get hospitalNameEn(): string {
    return (
      resolvePrintCopyValue(
        this.printCopy.hospitalLine,
        formatEnglishOrganizationName(this.hospital?.name) || this.hospital?.name || 'Hospital'
      ) || 'Hospital'
    );
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

  get hospitalLogoSrc(): string {
    const hospital = this.hospital as
      | (Hospital & { logo?: string; logoPath?: string; hospitalLogo?: string; logoURL?: string })
      | null;
    const raw =
      String(hospital?.logoUrl || '').trim() ||
      String(hospital?.logo || '').trim() ||
      String(hospital?.logoPath || '').trim() ||
      String(hospital?.hospitalLogo || '').trim() ||
      String(hospital?.logoURL || '').trim();
    return resolveAssetUrl(raw);
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

  get samplePatientNoteLines(): string[] {
    return splitPrescriptionNoteLines(this.samplePatientNote);
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

  get designerPrintPreview(): PrescriptionPrintPreviewData {
    const patient = this.samplePatient;
    const gynaeSplit = this.sampleGynaePrintSplit;
    const isGynae = this.specialtyKey === 'gynae';
    const medicines = this.sampleMedicinesForSpecialty.map((med) => ({
      name: med.name,
      medicineName: med.name,
      duration: med.duration,
      afterMeal: Boolean(med.after),
      beforeMeal: Boolean(med.before),
      morningDose: med.morning || '',
      eveningDose: med.evening || '',
      nightDose: med.night || '',
      morning: Boolean(med.morning),
      evening: Boolean(med.evening),
      night: Boolean(med.night),
      frequency: med.morning && med.night ? 'BD' : med.morning && med.evening ? 'BD' : 'OD',
    }));
    const gynaeConsultationRows = isGynae
      ? resolveGynaeConsultationStripRows({
          chiefComplaint: patient.disease,
          history: this.sampleConsultationRows.find((row) => row.label === 'History')?.value || '',
          examination:
            this.sampleConsultationRows.find((row) => row.label === 'Examination')?.value || '',
        })
      : [];
    const vitals = { bp: '110/70', weight: '62', pulse: '78', temperature: '98.4', spo2: '98' };
    const patientStub = {
      _id: 'sample-patient',
      hospitalId: this.hospital?._id || '',
      patientNo: patient.fileNo,
      assignedDoctorId: this.doctor?._id || '',
      firstName: patient.name,
      lastName: '',
      phone: patient.phone,
      gender: patient.sex.toLowerCase().startsWith('f') ? 'female' : 'male',
      dateOfBirth: null,
      address: patient.address,
      bloodGroup: patient.bloodGroup || null,
      allergies: [],
      chronicDiseases: [],
      currentMedications: [],
      status: 'active',
    } as Patient;
    const hospitalName = this.hospitalNameEn;
    const hospitalAddress = this.hospitalAddressEn;
    const logoUrl = this.hospitalLogoSrc;
    const footerLine = resolvePrintCopyValue(
      this.printCopy.clinicTagline,
      this.hospital?.prescriptionSettings?.contactLine || ''
    );
    const contactPhone = resolvePrintCopyValue(this.printCopy.contactPhone, '');
    const contactEmail = resolvePrintCopyValue(this.printCopy.contactEmail, '');
    const rxTitle = resolvePrintCopyValue(this.printCopy.rxTitle, 'PRESCRIPTION', 'PRESCRIPTION');

    return {
      template: this.selectedTemplate,
      patient: patientStub,
      patientName: patient.name,
      patientAge: patient.age,
      patientGender: patient.sex.charAt(0).toUpperCase(),
      patientNo: patient.fileNo,
      patientPhone: patient.phone,
      patientAddress: patient.address,
      doctorName: this.doctorNameEn,
      doctorNamePlain: resolvePrintCopyValue(
        this.printCopy.doctorDisplayName,
        this.doctor?.user?.name || 'Doctor'
      ),
      doctorNameUrdu: this.doctorNameUr,
      doctorQualification: this.qualificationEn,
      doctorQualificationUrdu: this.qualificationUr,
      doctorTitleEnglish: this.specialtyEn,
      doctorTitleUrdu: this.specialtyUr,
      doctorSpecialty: this.specialtyEn,
      clinicTagline: footerLine,
      contactPhone,
      contactEmail,
      rxTitle,
      visitType: 'OPD',
      hospitalName,
      hospitalNameUrdu: this.hospitalNameUr,
      hospitalAddress: resolvePrintCopyValue(this.printCopy.hospitalLine, hospitalAddress) || hospitalAddress,
      hospitalAddressUrdu: this.hospitalAddressUr || hospitalAddress,
      hospitalLogoUrl: logoUrl,
      showHospitalLogo: Boolean(logoUrl),
      hospitalLogoScale: this.style.logoScale || 100,
      prescriptionRevisionNote:
        this.hospital?.prescriptionSettings?.revisionNote || '* Rx to be revised after Reports.',
      prescriptionFollowUpLine:
        this.hospital?.prescriptionSettings?.followUpLine ||
        `For appointment and follow up, contact ${hospitalName}.`,
      prescriptionFooterLines: footerLine ? [footerLine] : [],
      date: this.today.replace(/\//g, '-').toUpperCase(),
      prescriptionNo: 'RX-SAMPLE',
      disease: patient.disease,
      vitals,
      vitalRows: [
        { label: 'BP', value: vitals.bp },
        { label: 'Weight', value: vitals.weight },
        { label: 'Pulse', value: vitals.pulse },
      ],
      labTests: [{ name: 'CBC', category: 'Pathology' }],
      ivFluids: [],
      medicines,
      followUpDate: this.sampleFollowUpDate,
      patientNote: this.samplePatientNote,
      consultation: '',
      admissionOrderLines: [],
      consultationRows: this.sampleConsultationRows.map((row) => ({ ...row })),
      specialtyTitle: isGynae ? 'Obstetrics & Gynaecology' : this.specialtyLabel,
      specialtySection: this.specialtyKey,
      specialtyRows: isGynae ? gynaeSplit.sidebar : this.sampleSpecialtySidebar,
      gynaeConsultationRows,
      gynaeSidebarRows: gynaeSplit.sidebar,
      gynaeExtendedRows: gynaeSplit.extended,
      gynaeSummaryRows: gynaeSplit.sidebar.map((row) => ({ label: row.label, value: row.value })),
      ultrasoundRows: [],
      gynaeMode: normalizeGynaeConsultMode(this.sampleGynaeSpecialtyData['gynaeMode']),
      patientBloodGroup: patient.bloodGroup || '-',
      clinicalPages: buildClinicalRxPrintPages({
        medicines,
        specialtySection: this.specialtyKey,
        prescriptionTemplate: this.selectedTemplate,
        gynaeConsultationRows,
        gynaeSidebarRows: gynaeSplit.sidebar,
        gynaeExtendedRows: gynaeSplit.extended,
        ivFluids: [],
        labTests: [{ name: 'CBC' }],
        patientNote: this.samplePatientNote,
      }),
      styleCssVars: this.cssVars,
      layout: this.layout,
      customSections: this.customSections,
    };
  }

  printDurationParts(value: unknown): { en: string; ur: string } {
    return formatMedicineDurationForPrint(value == null ? '' : String(value));
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
                }

                // Always refresh hospital from API so logoUrl / settings are current.
                const hospitalId = doctor.hospitalId || user.hospitalId || nestedHospital?._id;
                if (hospitalId) {
                  this.backend.getHospital(hospitalId).subscribe({
                    next: (hospital) => {
                      this.hospital = hospital;
                      this.applyDoctorSettings(doctor, hospital);
                    },
                    error: () => {
                      /* keep nested hospital / defaults */
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
        error: (error) => {
          const status = Number(error?.status || 0);
          if (status === 0) {
            this.errorMessage =
              'API server (localhost:3001) reachable nahi hai. Backend start karke Refresh dabayein.';
          } else if (status === 401 || status === 403) {
            this.errorMessage =
              'Doctor login required. Dr account se login karke designer kholen.';
          } else {
            this.errorMessage =
              error?.error?.message ||
              'Unable to load designer. Login as a doctor to customize your prescription.';
          }
          this.loading = false;
        },
      })
    );
  }

  retryLoad(): void {
    this.loadDesigner();
  }

  onTemplateSelect(templateId: string): void {
    if (this.templates.some((template) => template.id === templateId)) {
      this.selectedTemplate = templateId as PrescriptionTemplate;
    }
  }

  applyDoctorSettings(doctor: Doctor, hospital: Hospital | null): void {
    this.selectedTemplate = (doctor.prescriptionTemplate as PrescriptionTemplate) || 'classic';
    this.layout = normalizePrescriptionLayout(doctor.prescriptionLayout as PrescriptionLayoutSection[]);
    this.customSections = normalizePrescriptionCustomSections(doctor.prescriptionCustomSections || []);
    this.printCopy = normalizePrescriptionPrintCopy(doctor.prescriptionPrintCopy || null);
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
    this.customSections = [];
    this.printCopy = { ...DEFAULT_PRESCRIPTION_PRINT_COPY };
    this.selectedEditBlock = 'header';
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
    const normalizedStyle = normalizePrescriptionStyle(this.style);
    this.style = normalizedStyle;
    const payload = {
      prescriptionTemplate: this.selectedTemplate,
      prescriptionLayout: this.layout,
      prescriptionStyle: normalizedStyle as unknown as Record<string, number | string | boolean>,
      prescriptionCustomSections: normalizePrescriptionCustomSections(this.customSections),
      prescriptionPrintCopy: normalizePrescriptionPrintCopy(this.printCopy),
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
          const details = Array.isArray(error?.error?.details)
            ? error.error.details.map((item: { message?: string }) => item?.message).filter(Boolean).join(' · ')
            : '';
          this.toastr.error(
            details || error?.error?.message || 'Failed to save prescription design. Backend restart ke baad dubara Save karein.'
          );
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
      case 'header-y':
        this.dragStartValue = this.style.offsetHeaderY;
        break;
      case 'meta-y':
        this.dragStartValue = this.style.offsetDateY;
        break;
      case 'patient-y':
        this.dragStartValue = this.style.offsetPatientY;
        break;
      case 'body-y':
        this.dragStartValue = this.style.offsetBodyY;
        break;
      case 'notes-y':
        this.dragStartValue = this.style.offsetNotesY;
        break;
      case 'footer-y':
        this.dragStartValue = this.style.offsetFooterY;
        break;
      case 'line-gap':
        this.dragStartValue = this.style.lineGap;
        break;
      case 'section-gap':
        this.dragStartValue = this.style.sectionGap;
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
      case 'header-y':
        this.style.offsetHeaderY = this.clamp(this.dragStartValue + dyMm, -20, 40);
        break;
      case 'meta-y':
        this.style.offsetDateY = this.clamp(this.dragStartValue + dyMm, -20, 40);
        break;
      case 'patient-y':
        this.style.offsetPatientY = this.clamp(this.dragStartValue + dyMm, -20, 40);
        break;
      case 'body-y':
        this.style.offsetBodyY = this.clamp(this.dragStartValue + dyMm, -20, 40);
        break;
      case 'notes-y':
        this.style.offsetNotesY = this.clamp(this.dragStartValue + dyMm, -20, 40);
        break;
      case 'footer-y':
        this.style.offsetFooterY = this.clamp(this.dragStartValue + dyMm, -20, 40);
        break;
      case 'line-gap':
        this.style.lineGap = this.clamp(this.dragStartValue + dyMm, 0, 12);
        break;
      case 'section-gap':
        this.style.sectionGap = this.clamp(this.dragStartValue + dyMm, 0, 16);
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
