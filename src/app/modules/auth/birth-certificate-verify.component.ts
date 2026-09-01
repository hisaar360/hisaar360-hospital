import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { BackendService } from '../../core/services/backend.service';
import { BirthCertificateVerificationResult } from '../../shared/models/birth-records.model';

@Component({
  selector: 'app-birth-certificate-verify',
  imports: [CommonModule],
  templateUrl: './birth-certificate-verify.component.html',
  styleUrl: './birth-certificate-verify.component.scss',
})
export class BirthCertificateVerifyComponent implements OnInit {
  loading = true;
  code = '';
  result: BirthCertificateVerificationResult | null = null;

  constructor(private route: ActivatedRoute, private backend: BackendService) {}

  ngOnInit(): void {
    this.code = String(this.route.snapshot.paramMap.get('code') || '').trim();
    if (!this.code) {
      this.loading = false;
      return;
    }
    this.backend
      .verifyBirthCertificatePublic(this.code)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.result = data;
        },
        error: () => {
          this.result = { found: false };
        },
      });
  }

  statusLabel(): string {
    if (!this.result?.found) return 'Certificate Not Found';
    const status = this.result.status || '';
    if (status === 'VALID') return 'Verified / Valid';
    if (status === 'REVOKED') return 'Certificate Revoked';
    if (status === 'SUPERSEDED') return 'Certificate Superseded';
    return status;
  }

  statusClass(): string {
    if (!this.result?.found) return 'is-invalid';
    const status = this.result.status || '';
    if (status === 'VALID') return 'is-valid';
    if (status === 'REVOKED') return 'is-revoked';
    return 'is-superseded';
  }
}
