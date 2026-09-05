import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { BackendService } from '../../core/services/backend.service';
import { BirthCertificateVerificationResult } from '../../shared/models/birth-records.model';

const MODE_OF_DELIVERY_LABELS: Record<string, string> = {
  normal_vaginal: 'Normal vaginal delivery',
  vaginal: 'Vaginal delivery',
  spontaneous_vaginal: 'Spontaneous vaginal delivery',
  assisted_vaginal: 'Assisted vaginal delivery',
  forceps: 'Forceps delivery',
  vacuum: 'Vacuum-assisted delivery',
  caesarean: 'Caesarean section',
  cesarean: 'Caesarean section',
  c_section: 'Caesarean section',
  elective_caesarean: 'Elective caesarean section',
  emergency_caesarean: 'Emergency caesarean section',
};

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
  verifiedAt = new Date();
  readonly watermarkTiles = Array.from({ length: 64 });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backend: BackendService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.code = String(params.get('code') || '').trim();
      this.loadVerification();
    });
  }

  private loadVerification(): void {
    this.loading = true;
    this.result = null;
    if (!this.code) {
      this.loading = false;
      this.result = { found: false };
      return;
    }
    this.backend
      .verifyBirthCertificatePublic(this.code)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.result = data;
          this.verifiedAt = new Date();
        },
        error: () => {
          this.result = { found: false };
        },
      });
  }

  statusLabel(): string {
    if (!this.result?.found) return 'Certificate Not Found';
    const status = this.result.status || '';
    if (status === 'VALID') return 'Certificate Verified / Valid';
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

  statusSummary(): string {
    if (!this.result?.found) {
      return 'This verification code does not match any issued hospital birth certificate.';
    }
    if (this.result.status === 'VALID') {
      return 'This certificate is genuine and matches our hospital records.';
    }
    if (this.result.status === 'SUPERSEDED') {
      return (
        this.result.supersededMessage ||
        'A corrected certificate has been issued for this birth record.'
      );
    }
    if (this.result.status === 'REVOKED') {
      return 'This certificate has been revoked and is no longer valid.';
    }
    return 'Verification completed.';
  }

  stampShortLabel(): string {
    if (!this.result?.found) return 'Not found';
    const status = this.result.status || '';
    if (status === 'VALID') return 'Verified';
    if (status === 'REVOKED') return 'Revoked';
    if (status === 'SUPERSEDED') return 'Superseded';
    return status || 'Unknown';
  }

  hospitalMetaLine(): string {
    const r = this.result;
    if (!r?.found) return '';
    return [r.hospitalAddress, r.hospitalCity]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .join(', ');
  }

  hospitalContactLine(): string {
    const r = this.result;
    if (!r?.found) return '';
    return [
      r.hospitalPhone ? `Phone: ${r.hospitalPhone}` : '',
      r.hospitalEmail || '',
      r.hospitalWebsite || '',
    ]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .join(' | ');
  }

  formatModeOfDelivery(value?: string | null): string {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const key = raw.toLowerCase().replace(/[\s-]+/g, '_');
    if (MODE_OF_DELIVERY_LABELS[key]) return MODE_OF_DELIVERY_LABELS[key];
    return raw
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatSex(value?: string | null): string {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '—';
    if (raw === 'm' || raw === 'male') return 'Male';
    if (raw === 'f' || raw === 'female') return 'Female';
    return raw.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  qrImageUrl(): string {
    if (typeof window === 'undefined') return '';
    const url = window.location.href;
    return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&ecc=M&margin=6&data=${encodeURIComponent(url)}`;
  }

  sealHospitalName(): string {
    const name = String(this.result?.hospitalName || 'Hospital').trim();
    if (name.length <= 22) return name;
    return `${name.slice(0, 20)}…`;
  }

  verifyAnother(): void {
    const next = String(window.prompt('Enter verification code') || '').trim();
    if (!next) return;
    this.router.navigate(['/verify/birth', next]);
  }
}
