import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import {
  resolveMealFoodLabel,
  resolvePrintInstructionLabel,
  resolvePrintSlotDose,
} from './medicine-instruction-formatter';
import {
  ClinicalRxPrintPage,
  GynaePrintPreview,
  resolveGynaePrintContactEmail,
  resolveGynaePrintContactPhone,
} from './gynae-print-preview.model';
import {
  isPrescriptionLayoutSectionVisible,
  PrescriptionCustomSection,
  PrescriptionLayoutSectionKey,
} from './prescription-style';

type DoseSlot = 'morning' | 'noon' | 'evening' | 'night';

@Component({
  selector: 'app-prescription-template-gynae-modern',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prescription-template-gynae-modern.component.html',
  styleUrl: './prescription-template-gynae-modern.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionTemplateGynaeModernComponent implements OnChanges {
  @Input({ required: true }) preview!: GynaePrintPreview;
  @Input({ required: true }) page!: ClinicalRxPrintPage;
  @Input() medicineDensityClass = '';

  contactPhoneValue = '-';
  contactEmailValue = '-';
  patientNoteLinesList: string[] = [];
  visibleCustomSections: PrescriptionCustomSection[] = [];

  ngOnChanges(): void {
    this.contactPhoneValue =
      String(this.preview?.contactPhone || '').trim() ||
      resolveGynaePrintContactPhone(this.preview?.prescriptionFooterLines || []);
    this.contactEmailValue =
      String(this.preview?.contactEmail || '').trim() ||
      resolveGynaePrintContactEmail(this.preview?.prescriptionFooterLines || []);
    this.patientNoteLinesList = this.buildPatientNoteLines(this.preview?.patientNote || '');
    this.visibleCustomSections = (this.preview?.customSections || []).filter(
      (section) => section.visible !== false
    );
  }

  sectionVisible(key: PrescriptionLayoutSectionKey): boolean {
    return isPrescriptionLayoutSectionVisible(this.preview?.layout, key);
  }

  slotDose(medicine: Record<string, unknown> | null | undefined, slot: DoseSlot): string {
    return resolvePrintSlotDose(medicine, slot);
  }

  foodLabel(medicine: Record<string, unknown> | null | undefined): { en: string; ur: string } {
    return resolveMealFoodLabel(medicine);
  }

  instructionLabel(medicine: Record<string, unknown> | null | undefined): { en: string; ur: string } {
    return resolvePrintInstructionLabel(medicine);
  }

  isDangerRow(label: string): boolean {
    return /danger|red flag|warning/i.test(label);
  }

  consultationValue(label: string): string {
    const row = this.preview.gynaeConsultationRows.find((item) => item.label === label);
    if (row?.value?.trim()) {
      return row.value.trim();
    }

    const fallback = this.preview.consultationRows?.find((item) => item.label === label);
    return fallback?.value?.trim() || '-';
  }

  dripLine(fluid: { name?: string; rate?: string; quantity?: string; route?: string }): string {
    const name = String(fluid.name || '').trim();
    const rate = String(fluid.rate || '').trim();
    if (name && rate) {
      return `${name} — ${rate}`;
    }
    return name || rate || '-';
  }

  private buildPatientNoteLines(note: string): string[] {
    return String(note || '')
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
  }
}
