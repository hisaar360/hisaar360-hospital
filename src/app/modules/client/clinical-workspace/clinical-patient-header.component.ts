import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClinicalPatientHeaderModel } from './clinical-workspace.types';

@Component({
  selector: 'app-clinical-patient-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './clinical-patient-header.component.html',
  styleUrl: './clinical-patient-header.component.scss',
})
export class ClinicalPatientHeaderComponent {
  @Input() model: ClinicalPatientHeaderModel | null = null;
  @Input() emptyMessage = 'Select a patient from Today\'s Appointments to begin the consultation.';
}
