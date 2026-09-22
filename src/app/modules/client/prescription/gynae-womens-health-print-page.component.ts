import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import {
  GYNAE_CONSULT_MODE_TABS,
  GynaeConsultMode,
} from './gynae-prescription-data';
import {
  bilingualAdviceLine,
  buildGynaeWhMedicineRow,
  ClinicalRxPrintPage,
  displayPrintValue,
  findGynaePrintRowValue,
  GynaePrintPreview,
  GynaeWhBilingualLine,
  GynaeWhMedicineRow,
  GynaeWhMetric,
  GynaeWhNoteCard,
  hasPrintDisplayValue,
  resolveGynaePrintContactEmail,
  resolveGynaePrintContactPhone,
  urduForLabel,
} from './gynae-print-preview.model';

type GynaePrintRow = { label: string; labelUr: string; value: string; wide?: boolean };

const METRIC_LABEL_HINTS = [
  'lmp',
  'edd',
  'gestational',
  'gravida',
  'para',
  'abortion',
  'living',
  'blood group',
  'weight',
  'bp',
  'blood pressure',
  'pulse',
  'temp',
  'spo2',
  'consult mode',
];

@Component({
  selector: 'app-gynae-womens-health-print-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gynae-womens-health-print-page.component.html',
  styleUrl: './gynae-womens-health-print-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GynaeWomensHealthPrintPageComponent implements OnChanges {
  @Input({ required: true }) preview!: GynaePrintPreview;
  @Input({ required: true }) page!: ClinicalRxPrintPage;

  readonly consultTabs = GYNAE_CONSULT_MODE_TABS;

  activeMode: GynaeConsultMode = 'antenatal';
  contactPhoneValue = '';
  contactEmailValue = '';
  doctorSpecialtyLabel = '';
  doctorTitleLabel = '';
  clinicTagline = '';
  visitTypeLabel = 'OPD';
  instructionLines: GynaeWhBilingualLine[] = [];
  warningLines: GynaeWhBilingualLine[] = [];
  metrics: GynaeWhMetric[] = [];
  noteCards: GynaeWhNoteCard[] = [];
  obsRows: GynaePrintRow[] = [];
  medicineRows: GynaeWhMedicineRow[] = [];
  showFollowUp = false;
  showInstructions = false;
  showWarnings = false;
  showTests = false;
  showIvDrips = false;
  showObs = false;
  showMedicines = false;
  showNextVisit = false;
  showFooterExtras = false;

  ngOnChanges(): void {
    this.activeMode = this.preview.gynaeMode || 'antenatal';
    this.contactPhoneValue = resolveGynaePrintContactPhone(this.preview.prescriptionFooterLines);
    this.contactEmailValue = resolveGynaePrintContactEmail(this.preview.prescriptionFooterLines);
    this.doctorSpecialtyLabel = String(this.preview.doctorSpecialty || '').trim();
    this.doctorTitleLabel = String(
      this.preview.doctorTitleEnglish || this.doctorSpecialtyLabel || ''
    ).trim();
    this.clinicTagline = String(this.preview.clinicTagline || '').trim();
    this.visitTypeLabel = String(this.preview.visitType || 'OPD').trim().toUpperCase() || 'OPD';

    this.instructionLines = this.buildInstructionLines();
    this.warningLines = this.buildWarningLines();
    this.metrics = this.buildMetrics();
    this.noteCards = this.buildNoteCards();
    this.obsRows = this.buildObsRows();
    this.medicineRows = (this.page.medicines || []).map((medicine) => buildGynaeWhMedicineRow(medicine));

    this.showFollowUp = hasPrintDisplayValue(this.preview.followUpDate);
    this.showInstructions = this.instructionLines.length > 0;
    this.showWarnings = this.warningLines.length > 0;
    this.showTests = this.page.isLastPage && (this.preview.labTests || []).length > 0;
    this.showIvDrips = this.page.isFirstPage && (this.preview.ivFluids || []).length > 0;
    this.showObs = this.obsRows.length > 0;
    this.showMedicines = this.medicineRows.length > 0 || this.page.isFirstPage;
    this.showNextVisit = this.page.isLastPage && this.showFollowUp;
    this.showFooterExtras = this.page.isLastPage;
  }

  isActiveTab(key: GynaeConsultMode): boolean {
    return this.activeMode === key;
  }

  isDangerRow(label: string): boolean {
    return /danger|red flag|warning/i.test(label);
  }

  trackObsRow(_index: number, row: GynaePrintRow): string {
    return row.label;
  }

  trackMedicine(index: number, row: GynaeWhMedicineRow): string {
    return `${index}-${row.name}`;
  }

  trackDrip(_index: number, drip: { name: string }): string {
    return drip.name;
  }

  trackLabTest(_index: number, test: { name: string }): string {
    return test.name;
  }

  trackInstruction(index: number, line: GynaeWhBilingualLine): string {
    return `${index}-${line.en || line.ur}`;
  }

  trackMetric(_index: number, metric: GynaeWhMetric): string {
    return metric.label;
  }

  trackNoteCard(_index: number, card: GynaeWhNoteCard): string {
    return card.key;
  }

  display(value: unknown): string {
    return displayPrintValue(value);
  }

  private buildMetrics(): GynaeWhMetric[] {
    if (!this.page.isFirstPage) {
      return [];
    }

    const vitals = this.preview.vitals || {};
    const candidates: GynaeWhMetric[] = [
      { label: 'LMP', labelUr: urduForLabel('LMP'), value: findGynaePrintRowValue(this.preview, ['lmp', 'last menstrual']) },
      { label: 'EDD', labelUr: urduForLabel('EDD'), value: findGynaePrintRowValue(this.preview, ['edd', 'estimated due']) },
      {
        label: 'Gestational Age',
        labelUr: urduForLabel('Gestational Age'),
        value: findGynaePrintRowValue(this.preview, ['gestational', 'ga at visit']),
      },
      { label: 'Gravida / Para', labelUr: urduForLabel('Gravida / Para'), value: this.buildGravidaPara() },
      { label: 'Blood Group', labelUr: urduForLabel('Blood Group'), value: String(this.preview.patientBloodGroup || '').trim() },
      {
        label: 'Weight',
        labelUr: urduForLabel('Weight'),
        value: String(vitals['weight'] || '').trim(),
        unit: hasPrintDisplayValue(vitals['weight']) ? 'Kg' : undefined,
      },
      {
        label: 'BP',
        labelUr: urduForLabel('BP'),
        value: String(vitals['bp'] || vitals['bloodPressure'] || '').trim(),
        unit: hasPrintDisplayValue(vitals['bp'] || vitals['bloodPressure']) ? 'mmHg' : undefined,
      },
      {
        label: 'Pulse',
        labelUr: urduForLabel('Pulse'),
        value: String(vitals['pulse'] || '').trim(),
        unit: hasPrintDisplayValue(vitals['pulse']) ? '/min' : undefined,
      },
      {
        label: 'Temp',
        labelUr: urduForLabel('Temp'),
        value: String(vitals['temperature'] || '').trim(),
      },
      {
        label: 'SpO2',
        labelUr: urduForLabel('SpO2'),
        value: String(vitals['spo2'] || '').trim(),
        unit: hasPrintDisplayValue(vitals['spo2']) ? '%' : undefined,
      },
    ];

    return candidates.filter((item) => hasPrintDisplayValue(item.value));
  }

  private buildGravidaPara(): string {
    const gravida = findGynaePrintRowValue(this.preview, ['gravida']);
    const para = findGynaePrintRowValue(this.preview, ['para']);
    if (!hasPrintDisplayValue(gravida) && !hasPrintDisplayValue(para)) {
      return '';
    }

    return `G${hasPrintDisplayValue(gravida) ? gravida : '0'} / P${hasPrintDisplayValue(para) ? para : '0'}`;
  }

  private buildNoteCards(): GynaeWhNoteCard[] {
    if (!this.page.isFirstPage) {
      return [];
    }

    const cards: GynaeWhNoteCard[] = [
      {
        key: 'diagnosis',
        titleEn: 'Diagnosis',
        titleUr: 'تشخیص',
        icon: 'fa-stethoscope',
        value: String(this.preview.disease || '').trim(),
      },
      {
        key: 'chief',
        titleEn: 'Chief Complaint',
        titleUr: 'بنیادی شکایت',
        icon: 'fa-commenting-o',
        value: this.readConsultationValue('Chief Complaint'),
      },
      {
        key: 'history',
        titleEn: 'History',
        titleUr: 'سابقہ تاریخ',
        icon: 'fa-history',
        value: this.readConsultationValue('History'),
      },
      {
        key: 'exam',
        titleEn: 'Examination',
        titleUr: 'معائنہ',
        icon: 'fa-user-md',
        value: this.readConsultationValue('Examination'),
      },
    ];

    return cards.filter((card) => hasPrintDisplayValue(card.value));
  }

  private readConsultationValue(label: string): string {
    const row = this.preview.gynaeConsultationRows.find((item) => item.label === label);
    if (row?.value?.trim()) {
      return row.value.trim();
    }

    const fallback = this.preview.consultationRows?.find((item) => item.label === label);
    return fallback?.value?.trim() || '';
  }

  private buildWarningLines(): GynaeWhBilingualLine[] {
    const row = [...this.page.gynaeExtendedRows, ...this.preview.gynaeSidebarRows, ...this.preview.gynaeExtendedRows].find(
      (item) => /danger|warning|red flag/i.test(item.label)
    );
    if (!row?.value?.trim()) {
      return [];
    }

    return String(row.value)
      .split(/[\n,;•]+/)
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter((line) => hasPrintDisplayValue(line))
      .map((line) => bilingualAdviceLine(line));
  }

  private buildInstructionLines(): GynaeWhBilingualLine[] {
    return String(this.preview.patientNote || '')
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((line) => hasPrintDisplayValue(line))
      .map((line) => bilingualAdviceLine(line));
  }

  private buildObsRows(): GynaePrintRow[] {
    const sourceRows = !this.page.isFirstPage
      ? this.page.gynaeExtendedRows
      : [...this.preview.gynaeSidebarRows, ...this.page.gynaeExtendedRows];

    const seen = new Set<string>();
    const rows: GynaePrintRow[] = [];

    sourceRows.forEach((row) => {
      const label = String(row.label || '').trim();
      const value = String(row.value || '').trim();
      if (!label || !hasPrintDisplayValue(value)) {
        return;
      }

      const key = label.toLowerCase();
      if (seen.has(key) || this.isMetricLabel(label) || this.isDangerRow(label)) {
        return;
      }

      seen.add(key);
      rows.push({ label, labelUr: urduForLabel(label), value, wide: row.wide });
    });

    return rows;
  }

  private isMetricLabel(label: string): boolean {
    const normalized = label.toLowerCase();
    return METRIC_LABEL_HINTS.some((hint) => normalized.includes(hint));
  }
}
