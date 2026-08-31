import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { Bill, Patient } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-patient-invoices',
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-invoices.component.html',
  styleUrl: './patient-invoices.component.scss',
})
export class PatientInvoicesComponent implements OnInit {
  bills: Bill[] = [];
  patient: Patient | null = null;
  loading = false;
  patientId = '';

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    if (this.patientId) {
      this.loadPatient();
      this.loadBills();
    }
  }

  patientName(): string {
    if (!this.patient) {
      return '';
    }
    return `${this.patient.firstName || ''} ${this.patient.lastName || ''}`.trim();
  }

  loadPatient(): void {
    this.backend.getPatientProfile(this.patientId).subscribe({
      next: (patient) => (this.patient = patient),
      error: () => (this.patient = null),
    });
  }

  loadBills(): void {
    this.loading = true;
    this.backend
      .getPatientBills(this.patientId, { limit: 100 })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => (this.bills = result.items),
        error: (err) => {
          this.bills = [];
          this.toastr.error(err?.error?.message || 'Something went wrong');
        },
      });
  }
}
