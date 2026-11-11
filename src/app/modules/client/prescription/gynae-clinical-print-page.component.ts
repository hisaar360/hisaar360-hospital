import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
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

type DoseSlot = 'morning' | 'noon' | 'evening' | 'night';

@Component({
  selector: 'app-gynae-clinical-print-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gynae-clinical-print-page.component.html',
  styleUrl: './gynae-clinical-print-page.component.scss',
})
export class GynaeClinicalPrintPageComponent {
  @Input({ required: true }) preview!: GynaePrintPreview;
  @Input({ required: true }) page!: ClinicalRxPrintPage;
  @Input() medicineDensityClass = '';

  slotDose(medicine: Record<string, unknown> | null | undefined, slot: DoseSlot): string {
    return resolvePrintSlotDose(medicine, slot);
  }

  patientNoteLines(note = ''): string[] {
    return String(note || '')
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
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

  foodLabel(medicine: Record<string, unknown> | null | undefined): { en: string; ur: string } {
    return resolveMealFoodLabel(medicine);
  }

  instructionLabel(medicine: Record<string, unknown> | null | undefined): { en: string; ur: string } {
    return resolvePrintInstructionLabel(medicine);
  }

  contactPhone(): string {
    const override = String(this.preview?.contactPhone || '').trim();
    if (override) {
      return override;
    }
    return resolveGynaePrintContactPhone(this.preview.prescriptionFooterLines);
  }

  contactEmail(): string {
    const override = String(this.preview?.contactEmail || '').trim();
    if (override) {
      return override;
    }
    return resolveGynaePrintContactEmail(this.preview.prescriptionFooterLines);
  }
}
