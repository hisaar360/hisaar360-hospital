import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PrescriptionTemplate } from '../../../shared/models/hospital.model';
import {
  buildClinicalRxPrintPages,
  ClinicalRxPrintPage,
} from './clinical-rx-print-pages';
import { GynaeClinicalPrintPageComponent } from './gynae-clinical-print-page.component';
import {
  usesGynaeClinicalPrint,
  usesGynaeModernPrint,
  usesGynaeWomensHealthPrint,
} from './gynae-print-routing';
import { GynaePrintPreview } from './gynae-print-preview.model';
import { GynaeWomensHealthPrintPageComponent } from './gynae-womens-health-print-page.component';
import {
  resolveMealFoodLabel,
  resolvePrintInstructionLabel,
  resolvePrintSlotDose,
} from './medicine-instruction-formatter';
import {
  PrescriptionPrintDoseSlot,
  PrescriptionPrintPreviewData,
} from './prescription-print-data.model';
import { formatMedicineDurationForPrint } from './prescription-print-urdu';
import { PrescriptionTemplateGynaeModernComponent } from './prescription-template-gynae-modern.component';
import { SpecialtyTemplateKey } from './prescription-specialty-print';
import {
  isPrescriptionLayoutSectionVisible,
  PrescriptionCustomSection,
  PrescriptionLayoutSectionKey,
  splitPrescriptionNoteLines,
} from './prescription-style';

@Component({
  selector: 'app-prescription-print-sheet',
  standalone: true,
  imports: [
    CommonModule,
    GynaeClinicalPrintPageComponent,
    GynaeWomensHealthPrintPageComponent,
    PrescriptionTemplateGynaeModernComponent,
  ],
  templateUrl: './prescription-print-sheet.component.html',
})
export class PrescriptionPrintSheetComponent {
  @ViewChild('printContent', { static: false }) printContent?: ElementRef<HTMLElement>;

  @Input() preview: PrescriptionPrintPreviewData | null = null;
  @Input() template: PrescriptionTemplate = 'classic';

  usesGynaeClinicalPrint(): boolean {
    return usesGynaeClinicalPrint(
      (this.preview?.specialtySection || '') as SpecialtyTemplateKey | '',
      this.template
    );
  }

  usesGynaeWomensHealthPrint(): boolean {
    return usesGynaeWomensHealthPrint(
      (this.preview?.specialtySection || '') as SpecialtyTemplateKey | '',
      this.template
    );
  }

  usesGynaeModernPrint(): boolean {
    return usesGynaeModernPrint(
      (this.preview?.specialtySection || '') as SpecialtyTemplateKey | '',
      this.template
    );
  }

  usesAnyGynaePrint(): boolean {
    return (
      this.usesGynaeClinicalPrint() ||
      this.usesGynaeWomensHealthPrint() ||
      this.usesGynaeModernPrint()
    );
  }

  clinicalPages(): ClinicalRxPrintPage[] {
    if (this.preview?.clinicalPages?.length) {
      return this.preview.clinicalPages;
    }

    if (!this.preview) {
      return [];
    }

    return buildClinicalRxPrintPages({
      medicines: this.preview.medicines || [],
      specialtySection: this.preview.specialtySection || '',
      prescriptionTemplate: this.template,
      gynaeConsultationRows: this.preview.gynaeConsultationRows || [],
      gynaeSidebarRows: this.preview.gynaeSidebarRows || [],
      gynaeExtendedRows: this.preview.gynaeExtendedRows || [],
      ivFluids: this.preview.ivFluids || [],
      labTests: this.preview.labTests || [],
      patientNote: this.preview.patientNote || '',
    });
  }

  styleCssVars(): Record<string, string> {
    return this.preview?.styleCssVars || {};
  }

  sectionVisible(key: PrescriptionLayoutSectionKey): boolean {
    return isPrescriptionLayoutSectionVisible(this.preview?.layout, key);
  }

  visibleCustomSections(): PrescriptionCustomSection[] {
    return (this.preview?.customSections || []).filter((section) => section.visible !== false);
  }

  gynaePreview(): GynaePrintPreview | null {
    if (!this.preview) {
      return null;
    }

    return {
      doctorName: this.preview.doctorName,
      doctorNamePlain: this.preview.doctorNamePlain,
      doctorNameUrdu: this.preview.doctorNameUrdu,
      doctorQualification: this.preview.doctorQualification,
      doctorQualificationUrdu: this.preview.doctorQualificationUrdu,
      doctorTitleEnglish: this.preview.doctorTitleEnglish,
      doctorTitleUrdu: this.preview.doctorTitleUrdu,
      doctorSpecialty: this.preview.doctorSpecialty,
      hospitalName: this.preview.hospitalName,
      hospitalNameUrdu: this.preview.hospitalNameUrdu,
      hospitalAddress: this.preview.hospitalAddress,
      hospitalAddressUrdu: this.preview.hospitalAddressUrdu,
      hospitalLogoUrl: this.preview.hospitalLogoUrl,
      showHospitalLogo: this.preview.showHospitalLogo,
      hospitalLogoScale: this.preview.hospitalLogoScale,
      clinicTagline: this.preview.clinicTagline,
      contactPhone: this.preview.contactPhone,
      contactEmail: this.preview.contactEmail,
      rxTitle: this.preview.rxTitle,
      visitType: this.preview.visitType,
      prescriptionNo: this.preview.prescriptionNo,
      patientNo: this.preview.patientNo,
      date: this.preview.date,
      patientName: this.preview.patientName,
      patientAge: this.preview.patientAge,
      patientGender: this.preview.patientGender,
      patientPhone: this.preview.patientPhone,
      patientAddress: this.preview.patientAddress,
      patientBloodGroup: this.preview.patientBloodGroup || this.preview.patient?.bloodGroup || '-',
      disease: this.preview.disease,
      vitals: this.preview.vitals,
      labTests: this.preview.labTests,
      ivFluids: this.preview.ivFluids,
      medicines: this.preview.medicines,
      specialtyTitle: this.preview.specialtyTitle || 'Obstetrics & Gynaecology',
      specialtyRows: this.preview.specialtyRows || [],
      gynaeConsultationRows: this.preview.gynaeConsultationRows || [],
      consultationRows: this.preview.consultationRows,
      gynaeSidebarRows: this.preview.gynaeSidebarRows || [],
      gynaeExtendedRows: this.preview.gynaeExtendedRows || [],
      patientNote: this.preview.patientNote,
      prescriptionRevisionNote: this.preview.prescriptionRevisionNote,
      prescriptionFollowUpLine: this.preview.prescriptionFollowUpLine,
      prescriptionFooterLines: this.preview.prescriptionFooterLines,
      followUpDate: this.preview.followUpDate,
      gynaeMode: this.preview.gynaeMode || 'antenatal',
      styleCssVars: this.preview.styleCssVars,
      layout: this.preview.layout,
      customSections: this.preview.customSections,
    };
  }

  trackClinicalPage(_index: number, page: ClinicalRxPrintPage): string {
    return `${page.pageNumber}-${page.medicineOffset}-${page.medicines.length}`;
  }

  slotDose(
    medicine: Record<string, unknown> | null | undefined,
    slot: PrescriptionPrintDoseSlot
  ): string {
    return resolvePrintSlotDose(medicine, slot);
  }

  printDurationParts(value: unknown): { en: string; ur: string } {
    return formatMedicineDurationForPrint(value == null ? '' : String(value));
  }

  patientNoteLines(note: string | null | undefined): string[] {
    return splitPrescriptionNoteLines(note || '');
  }

  printMedicineDensityClass(medicineCount: number): string {
    if (medicineCount >= 14) {
      return 'medicine-density-ultra';
    }
    if (medicineCount >= 10) {
      return 'medicine-density-dense';
    }
    if (medicineCount >= 7) {
      return 'medicine-density-compact';
    }
    return 'medicine-density-normal';
  }

  mealFoodLabel(medicine: Record<string, unknown> | null | undefined): { en: string; ur: string } {
    return resolveMealFoodLabel(medicine);
  }

  instructionLabel(medicine: Record<string, unknown> | null | undefined): { en: string; ur: string } {
    return resolvePrintInstructionLabel(medicine);
  }
}
