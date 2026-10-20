import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { resolveAssetUrl } from '../../../core/utils/asset.util';
import { hasRouteAccess, readStoredPermissions } from '../../auth/access-control';
import {
  CompanyProfile,
  ReceiptLetterheadSettings,
} from '../../../shared/models/company.model';

const DEFAULT_RECEIPT_TERMS = [
  '۱۔ فریج آئٹم واپس نہیں ہوگی۔',
  '۲۔ کھلی ہوئی دوا واپس نہیں ہوگی۔',
  '۳۔ خریدی ہوئی دوا بل کے ساتھ ۷ دن کے اندر واپس کی جا سکتی ہے۔',
].join('\n');

const LEGACY_DEFAULT_RECEIPT_TERMS = [
  '1. No return or exchange on medicines.',
  '2. Keep your invoice for warranty claims.',
  '3. Prices are subject to change without notice.',
].join('\n');

function resolveReceiptTermsText(value?: string | null): string {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === LEGACY_DEFAULT_RECEIPT_TERMS) {
    return DEFAULT_RECEIPT_TERMS;
  }
  return trimmed;
}

@Component({
  selector: 'app-pharmacy-invoice-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pharmacy-invoice-settings.component.html',
  styleUrl: './pharmacy-invoice-settings.component.scss',
})
export class PharmacyInvoiceSettingsComponent implements OnInit {
  private backend = inject(BackendService);
  private toastr = inject(ToastrService);
  private sanitizer = inject(DomSanitizer);

  loading = false;
  saving = false;
  uploadingLogo = false;
  company: CompanyProfile | null = null;
  previewUrl: SafeResourceUrl | null = null;
  previewMode: 'receipt' | 'a4' = 'receipt';
  footerLinesText = '';
  extraHeaderText = '';
  logoFileLabel = '';
  private previewObjectUrl: string | null = null;

  form: ReceiptLetterheadSettings = this.emptyForm();

  readonly canEdit = hasRouteAccess(
    { any: ['company.manage', '*'] },
    readStoredPermissions()
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.backend
      .getMyCompany()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (company) => {
          this.company = company;
          this.form = this.fromCompany(company);
          this.footerLinesText = (this.form.footerLines || []).join('\n');
          this.extraHeaderText = (this.form.extraHeaderLines || []).join('\n');
          this.refreshPreview();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to load company profile'),
      });
  }

  onFormChange(): void {
    this.refreshPreview();
  }

  setPreviewMode(mode: 'receipt' | 'a4'): void {
    this.previewMode = mode;
    this.refreshPreview();
  }

  setPaperWidth(mm: 58 | 80): void {
    if (!this.canEdit) {
      return;
    }
    this.form.paperWidthMm = mm;
    this.onFormChange();
  }

  onLogoSelected(event: Event): void {
    if (!this.canEdit) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.logoFileLabel = file.name;

    if (!file.type.startsWith('image/')) {
      this.toastr.error('Please select a PNG, JPG, or SVG image.');
      this.logoFileLabel = '';
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.toastr.error('Logo must be 2 MB or smaller.');
      this.logoFileLabel = '';
      input.value = '';
      return;
    }

    this.uploadingLogo = true;
    void this.readFileAsDataUrl(file)
      .then((dataUrl) => {
        this.form.logoUrl = dataUrl;
        this.form.showLogo = true;
        this.refreshPreview();
      })
      .catch(() => this.toastr.error('Unable to read selected logo.'))
      .finally(() => {
        this.uploadingLogo = false;
        input.value = '';
      });
  }

  clearLogo(): void {
    if (!this.canEdit) {
      return;
    }
    this.form.logoUrl = '';
    this.logoFileLabel = '';
    this.refreshPreview();
  }

  save(): void {
    if (!this.canEdit) {
      this.toastr.warning('Only company managers can update invoice settings');
      return;
    }
    this.saving = true;
    const payload = {
      receiptLetterhead: {
        ...this.form,
        enabled: true,
        footerLines: this.splitLines(this.footerLinesText),
        extraHeaderLines: this.splitLines(this.extraHeaderText),
        brandTitle: this.form.brandTitle?.trim() || this.company?.name || 'Pharmacy',
        brandSubtitle: this.form.brandSubtitle?.trim() || '',
        headerNote: this.form.headerNote?.trim() || '',
        contactLine: this.form.contactLine?.trim() || '',
        footerTitle: this.form.footerTitle?.trim() || '',
        termsText: resolveReceiptTermsText(this.form.termsText),
        logoUrl: this.form.logoUrl?.trim() || '',
      },
    };
    this.backend
      .updateMyCompany(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res) => {
          this.company = res.data || this.company;
          if (res.data) {
            this.form = this.fromCompany(res.data);
            this.footerLinesText = (this.form.footerLines || []).join('\n');
            this.extraHeaderText = (this.form.extraHeaderLines || []).join('\n');
            this.logoFileLabel = '';
          }
          this.refreshPreview();
          this.toastr.success('Invoice / Print Bill settings saved');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save settings'),
      });
  }

  get logoPreviewUrl(): string {
    return resolveAssetUrl(this.form.logoUrl || '');
  }

  private emptyForm(): ReceiptLetterheadSettings {
    return {
      enabled: true,
      showLogo: true,
      logoUrl: '',
      brandTitle: 'Pharmacy',
      brandSubtitle: 'Quality Medicines for a Healthier Life',
      headerNote: '',
      contactLine: '',
      extraHeaderLines: [],
      footerTitle: 'Thank you',
      footerLines: ['Visit Again'],
      termsText: DEFAULT_RECEIPT_TERMS,
      paperWidthMm: 80,
      borderStyle: 'dashed',
      logoScale: 1,
      fontSizeHeader: 18,
      fontSizeBody: 11,
      fontSizeFooter: 10,
      fontSizeMedicine: 11,
      fontSizeAmount: 13,
      lineGap: 2,
      fontWeightHeader: 'bold',
      fontWeightBody: 'normal',
      fontWeightFooter: 'normal',
      fontWeightMedicine: 'bold',
      fontWeightAmount: 'bold',
    };
  }

  private fromCompany(company: CompanyProfile): ReceiptLetterheadSettings {
    const lh = company.receiptLetterhead;
    const defaults = this.emptyForm();
    return {
      enabled: lh?.enabled !== false,
      showLogo: lh?.showLogo !== false,
      logoUrl: resolveAssetUrl(lh?.logoUrl || company.logoUrl || ''),
      brandTitle: lh?.brandTitle || company.name || defaults.brandTitle,
      brandSubtitle: lh?.brandSubtitle || defaults.brandSubtitle,
      headerNote:
        lh?.headerNote ||
        [company.address, company.city].filter(Boolean).join(', ') ||
        '',
      contactLine:
        lh?.contactLine ||
        [company.phone, company.email].filter(Boolean).join(' · ') ||
        '',
      extraHeaderLines: lh?.extraHeaderLines?.length
        ? lh.extraHeaderLines
        : defaults.extraHeaderLines,
      footerTitle: lh ? String(lh.footerTitle || '') : defaults.footerTitle || '',
      footerLines: lh && Array.isArray(lh.footerLines) ? lh.footerLines : defaults.footerLines,
      termsText: resolveReceiptTermsText(lh?.termsText),
      paperWidthMm: lh?.paperWidthMm || 80,
      borderStyle: lh?.borderStyle || 'dashed',
      logoScale: lh?.logoScale || 1,
      fontSizeHeader: lh?.fontSizeHeader || 18,
      fontSizeBody: lh?.fontSizeBody || 11,
      fontSizeFooter: lh?.fontSizeFooter || 10,
      fontSizeMedicine: lh?.fontSizeMedicine || lh?.fontSizeBody || 11,
      fontSizeAmount: lh?.fontSizeAmount || (Number(lh?.fontSizeBody) || 11) + 2,
      lineGap: Number.isFinite(Number(lh?.lineGap)) ? Number(lh?.lineGap) : 2,
      fontWeightHeader: lh?.fontWeightHeader === 'normal' ? 'normal' : 'bold',
      fontWeightBody: lh?.fontWeightBody === 'bold' ? 'bold' : 'normal',
      fontWeightFooter: lh?.fontWeightFooter === 'bold' ? 'bold' : 'normal',
      fontWeightMedicine: lh?.fontWeightMedicine === 'normal' ? 'normal' : 'bold',
      fontWeightAmount: lh?.fontWeightAmount === 'normal' ? 'normal' : 'bold',
    };
  }

  private splitLines(text: string): string[] {
    return String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private refreshPreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    const html = this.buildPreviewHtml();
    const blob = new Blob([html], { type: 'text/html' });
    this.previewObjectUrl = URL.createObjectURL(blob);
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl);
  }

  private buildPreviewHtml(): string {
    const f = this.form;
    const isA4 = this.previewMode === 'a4';
    const width = isA4 ? 210 : Number(f.paperWidthMm) || 80;
    const border =
      f.borderStyle === 'none'
        ? 'none'
        : `1px ${f.borderStyle || 'dashed'} #9ca3af`;
    const logoPx = Math.round((isA4 ? 72 : 58) * (Number(f.logoScale) || 1));
    const headerSize = Number(f.fontSizeHeader) || 18;
    const bodySize = Number(f.fontSizeBody) || 11;
    const footerSize = Number(f.fontSizeFooter) || 10;
    const medicineSize = Number(f.fontSizeMedicine) || bodySize;
    const amountSize = Number(f.fontSizeAmount) || bodySize + 2;
    const gap = Number.isFinite(Number(f.lineGap)) ? Number(f.lineGap) : 2;
    const headerWeight = f.fontWeightHeader === 'normal' ? 'normal' : 'bold';
    const bodyWeight = f.fontWeightBody === 'bold' ? 'bold' : 'normal';
    const footerWeight = f.fontWeightFooter === 'bold' ? 'bold' : 'normal';
    const medicineWeight = f.fontWeightMedicine === 'normal' ? 'normal' : 'bold';
    const amountWeight = f.fontWeightAmount === 'normal' ? 'normal' : 'bold';
    const brand = f.brandTitle || this.company?.name || 'Pharmacy';
    const logo = f.showLogo && f.logoUrl ? resolveAssetUrl(f.logoUrl) : '';
    const headerLines = [
      f.brandSubtitle,
      f.headerNote,
      f.contactLine,
      ...this.splitLines(this.extraHeaderText),
    ].filter(Boolean);
    const footerTitle = String(f.footerTitle || '').trim();
    const footerLines = this.splitLines(this.footerLinesText);
    const terms = resolveReceiptTermsText(f.termsText);
    const maxWidth = isA4 ? 640 : Math.round(width * 3.78);

    return `<!doctype html><html><head><meta charset="utf-8"/><style>
@page{margin:0;size:auto}
*{box-sizing:border-box}
body{margin:0;color:#111827;font-family:Arial,"Noto Nastaliq Urdu","Segoe UI",sans-serif;font-size:${bodySize}px;font-weight:${bodyWeight};background:#eef2f7}
.wrap{padding:18px 12px 28px}
.receipt{margin:0 auto;max-width:${maxWidth}px;background:#fff;padding:${isA4 ? '22px 28px' : '12px 10px 18px'};box-shadow:0 10px 28px rgba(15,23,42,.12);position:relative;border-radius:2px}
.receipt:after{content:"";position:absolute;left:0;right:0;bottom:-10px;height:12px;background:
  linear-gradient(135deg,#fff 33%,transparent 33%) -6px 0/12px 12px,
  linear-gradient(225deg,#fff 33%,transparent 33%) -6px 0/12px 12px;background-color:transparent}
.center{text-align:center}
.logo{display:block;height:${logoPx}px;margin:0 auto ${gap * 2}px;max-width:${Math.max(logoPx, 120)}px;object-fit:contain}
h1{font-size:${headerSize}px;font-weight:${headerWeight};margin:0 0 ${gap}px;letter-spacing:-.02em}
p{margin:${gap}px 0}
.meta{border-bottom:${border};border-top:${border};margin:${gap * 3}px 0;padding:${gap * 2}px 0}
.meta div,.totals div{display:flex;justify-content:space-between;gap:10px}
table{border-collapse:collapse;table-layout:fixed;width:100%}
th,td{border-bottom:1px solid #e5e7eb;font-size:${Math.max(7, bodySize - 1)}px;padding:${gap}px 1px;text-align:left;vertical-align:top;word-break:break-word}
.item-name{font-size:${medicineSize}px;font-weight:${medicineWeight};line-height:1.15}
th:first-child,td:first-child{width:34%}
th:nth-child(2),td:nth-child(2){width:10%;text-align:center}
th:nth-child(3),td:nth-child(3),th:nth-child(4),td:nth-child(4),th:nth-child(5),td:nth-child(5){width:18%;text-align:right}
.totals{border-top:${border};margin-top:${gap * 2}px;padding-top:${gap * 2}px;font-size:${amountSize}px;font-weight:${amountWeight}}
.grand{font-size:${amountSize}px;font-weight:${amountWeight}}
.foot{border-top:${border};margin-top:${gap * 3}px;padding-top:${gap * 2}px;text-align:center;font-size:${footerSize}px;font-weight:${footerWeight}}
.terms{margin-top:${gap * 2}px;text-align:right;font-size:${footerSize}px;font-weight:${footerWeight};white-space:pre-wrap;unicode-bidi:plaintext;direction:rtl;line-height:1.35}
</style></head><body><div class="wrap"><section class="receipt"><div class="center">
${logo ? `<img class="logo" src="${this.escAttr(logo)}" alt=""/>` : ''}
<h1>${this.esc(brand)}</h1>
${headerLines.map((l) => `<p>${this.esc(String(l))}</p>`).join('')}
<p>Bill / Receipt</p></div>
<div class="meta">
<div><span>Invoice</span><strong>PREVIEW-001</strong></div>
<div><span>Date</span><strong>${new Date().toLocaleString()}</strong></div>
<div><span>Customer</span><strong>Walk-in</strong></div>
</div>
<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Discount</th><th>Total</th></tr></thead>
<tbody>
<tr><td><strong class="item-name">Sample Medicine</strong><br/><small>SKU-001</small></td><td>2</td><td>Rs. 120</td><td>Rs. 20</td><td>Rs. 220</td></tr>
<tr><td><strong class="item-name">Vitamin Syrup</strong><br/><small>SKU-014</small></td><td>1</td><td>Rs. 350</td><td>Rs. 0</td><td>Rs. 350</td></tr>
</tbody></table>
<div class="totals">
<div><span>Subtotal</span><strong>Rs. 590</strong></div>
<div><span>Total Discount</span><strong>Rs. 20</strong></div>
<div class="grand"><span>Total</span><strong>Rs. 570</strong></div>
</div>
<div class="foot">${footerTitle ? `<p><strong>${this.esc(footerTitle)}</strong></p>` : ''}
${footerLines.map((l) => `<p>${this.esc(l)}</p>`).join('')}
<div class="terms" dir="rtl" lang="ur">${this.esc(terms)}</div>
</div></section></div></body></html>`;
  }

  private esc(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escAttr(value: string): string {
    return this.esc(value).replace(/'/g, '&#39;');
  }
}
