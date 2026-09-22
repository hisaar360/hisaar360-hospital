import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SidebarVitalItem } from '../prescription/vitals-analytics';

@Component({
  selector: 'app-clinical-visit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './clinical-visit.component.html',
  styleUrl: './clinical-visit.component.scss',
})
export class ClinicalVisitComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  @Input() isGynaeDoctor = false;
  @Input() chiefComplaintPlaceholder = 'Dry cough, mild fever, weakness';
  @Input() historyPlaceholder = 'Cough for 3 days, no breathlessness...';
  @Input() gynaeAdviceTemplates: Array<{ label: string; text: string }> = [];
  @Input() sidebarVitalItems: SidebarVitalItem[] = [];
  @Input() hasRecordedVitals = false;
  @Input() patientAllergies = '';
  @Input() patientCurrentMedicines = '';
  @Input() patientChronicIllness = '';
  @Input() showAdvancedHistory = false;

  @Output() toggleAdvancedHistory = new EventEmitter<void>();
  @Output() openVitals = new EventEmitter<void>();
  @Output() openVitalsTrends = new EventEmitter<void>();
  @Output() applyAdviceTemplate = new EventEmitter<string>();
  @Output() chaperoneChange = new EventEmitter<boolean>();
  @Output() consentChange = new EventEmitter<boolean>();
  @Output() pelvicExamChange = new EventEmitter<boolean>();

  readonly followUpQuickOptions = [
    { label: '1 Week', days: 7 },
    { label: '2 Weeks', days: 14 },
    { label: '1 Month', days: 30 },
    { label: '3 Months', days: 90 },
  ];

  diagnosisDraft = '';
  diagnosisTags: string[] = [];
  bmiDisplay = '—';
  private formSubs = new Subscription();

  get specialtyDataGroup(): FormGroup | null {
    const group = this.form?.get('specialtyData');
    return group instanceof FormGroup ? group : null;
  }

  get vitalsGroup(): FormGroup | null {
    const group = this.form?.get('vitals');
    return group instanceof FormGroup ? group : null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form']) {
      this.bindFormStreams();
    }
    if (changes['form'] || changes['isGynaeDoctor']) {
      this.syncDiagnosisTagsFromForm();
      this.refreshBmi();
    }
  }

  ngOnDestroy(): void {
    this.formSubs.unsubscribe();
  }

  isYes(controlName: string): boolean {
    return String(this.specialtyDataGroup?.get(controlName)?.value || '').trim() === 'Yes';
  }

  isPelvicDone(): boolean {
    return String(this.specialtyDataGroup?.get('pelvicExamDone')?.value || '').trim() === 'Done';
  }

  addDiagnosisTag(): void {
    const next = String(this.diagnosisDraft || '').trim();
    if (!next) {
      return;
    }
    if (!this.diagnosisTags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      this.diagnosisTags = [...this.diagnosisTags, next];
      this.writeDiagnosisTagsToForm();
    }
    this.diagnosisDraft = '';
  }

  removeDiagnosisTag(index: number): void {
    this.diagnosisTags = this.diagnosisTags.filter((_, i) => i !== index);
    this.writeDiagnosisTagsToForm();
  }

  applyFollowUpQuick(days: number): void {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    const iso = date.toISOString().slice(0, 10);
    this.form.get('followUpDate')?.setValue(iso);
  }

  refreshBmi(): void {
    const vitals = this.vitalsGroup?.getRawValue() as Record<string, string> | undefined;
    const weight = Number(String(vitals?.['weight'] || '').replace(/[^\d.]/g, ''));
    const heightCm = Number(String(vitals?.['height'] || '').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) {
      this.bmiDisplay = '—';
      return;
    }
    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    this.bmiDisplay = Number.isFinite(bmi) ? bmi.toFixed(1) : '—';
  }

  private bindFormStreams(): void {
    this.formSubs.unsubscribe();
    this.formSubs = new Subscription();
    if (!this.form) {
      return;
    }
    this.formSubs.add(
      this.form.get('diagnosis')?.valueChanges.subscribe(() => this.syncDiagnosisTagsFromForm())
    );
    this.formSubs.add(
      this.vitalsGroup?.valueChanges.subscribe(() => this.refreshBmi())
    );
  }

  private syncDiagnosisTagsFromForm(): void {
    const raw = String(this.form?.get('diagnosis')?.value || '');
    const next = raw
      .split(/[;|]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (next.join('; ') !== this.diagnosisTags.join('; ')) {
      this.diagnosisTags = next;
    }
  }

  private writeDiagnosisTagsToForm(): void {
    this.form.get('diagnosis')?.setValue(this.diagnosisTags.join('; '));
  }
}
