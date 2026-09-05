import { resolveAssetUrl } from '../../../core/utils/asset.util';

export interface BirthCertificateSnapshot {
  documentTitle?: string;
  certificateNo?: string;
  birthRecordNo?: string;
  version?: number;
  issuedAt?: string;
  hospital?: {
    name?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };
  baby?: {
    name?: string;
    mrNo?: string;
    sex?: string;
    dateOfBirth?: string | Date;
    timeOfBirth?: string;
    placeOfBirth?: string;
    birthWeightGrams?: number | null;
    pluralityLabel?: string;
  };
  mother?: {
    name?: string;
    mrNo?: string;
    cnic?: string;
    address?: string;
  };
  father?: {
    name?: string;
    cnic?: string;
  };
  guardian?: {
    name?: string;
    cnic?: string;
  };
  delivery?: {
    modeOfDelivery?: string;
    deliveredBy?: string;
  };
  signatory?: {
    name?: string;
    designation?: string;
    signatureUrl?: string;
    stampUrl?: string;
  };
  printOptions?: {
    showFatherCnic?: boolean;
    showMotherCnic?: boolean;
    showBirthWeight?: boolean;
    showDeliveryMode?: boolean;
    showQrCode?: boolean;
  };
  footerText?: string;
  legalDisclaimer?: string;
}

export interface BirthCertificateRecord {
  _id: string;
  certificateNo: string;
  version: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'REVOKED';
  issuedAt: string | Date;
  snapshot: BirthCertificateSnapshot;
  verificationDisplayCode?: string;
  publicVerificationCode?: string;
  documentHash?: string;
  /** Embedded QR from certificate API — avoids external QR HTTP call. */
  qrCodeDataUrl?: string;
}

export interface BirthRecordItem {
  _id: string;
  birthRecordNo: string;
  status: string;
  dateOfBirth: string | Date;
  timeOfBirth?: string;
  sexAtBirth?: string;
  birthWeightGrams?: number | null;
  modeOfDelivery?: string;
  plurality?: string;
  birthOrder?: number;
  motherNameSnapshot?: string;
  motherMRNoSnapshot?: string;
  babyPatient?: Record<string, unknown>;
  motherPatient?: Record<string, unknown>;
  activeCertificate?: BirthCertificateRecord | null;
  certificates?: BirthCertificateRecord[];
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Hide internal placeholders like "Not Provided" on printed certificates. */
function displayValue(value?: unknown, fallback = '—'): string {
  const text = String(value ?? '').trim();
  if (!text || /^not\s*provided$/i.test(text)) return fallback;
  return text;
}

function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSex(value?: unknown): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '—';
  if (raw === 'm' || raw === 'male') return 'Male';
  if (raw === 'f' || raw === 'female') return 'Female';
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatModeOfDelivery(value?: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const labels: Record<string, string> = {
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
  const key = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (labels[key]) return labels[key];
  return raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDeliveredBy(value?: unknown): string {
  const name = displayValue(value);
  if (name === '—') return name;
  if (/^(dr\.?|doctor)\b/i.test(name)) return name;
  return `Dr. ${name}`;
}

function fieldRow(label: string, value: string): string {
  return `<div class="row"><span class="label">${esc(label)}</span><span class="value">${esc(value)}</span></div>`;
}

function buildWatermarkHtml(hospitalName: string): string {
  const name = displayValue(hospitalName, 'Hisaar360 Hospital');
  // Dense tile set so the pattern covers a full A4 sheet (not only the header).
  const tiles = Array.from({ length: 160 }, () => `<span>${esc(name)}</span>`).join('');
  return `<div class="watermark" aria-hidden="true"><div class="watermark-grid">${tiles}</div></div>`;
}

/** Public portal form page /verify/birth — live: hisaar360.com, local: localhost:4200. */
export function resolveBirthCertificateVerificationBaseUrl(configured?: string | null): string {
  const trimmed = String(configured || '')
    .trim()
    .replace(/\/$/, '')
    .replace(/\/:code$/i, '');

  const isBrowserLocal =
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(window.location.hostname);

  // Local hospital / landing always verify on local portal (:4200), even if
  // hospital settings still store the live hisaar360.com URL.
  if (isBrowserLocal) {
    const isLivePortal =
      !trimmed ||
      /\/\/(www\.)?hisaar360\.com(\/verify\/birth)?$/i.test(trimmed);
    if (isLivePortal) {
      return 'http://localhost:4200/verify/birth';
    }
    return trimmed;
  }

  if (trimmed) {
    return trimmed;
  }

  return 'https://hisaar360.com/verify/birth';
}

/** QR / link target: form page with certificate number prefilled (not direct auto-open). */
export function buildBirthCertificateVerificationUrl(
  certificateNo: string,
  baseUrl?: string | null
): string {
  const normalizedBase = resolveBirthCertificateVerificationBaseUrl(baseUrl);
  const cert = String(certificateNo || '').trim();
  if (!cert) {
    return normalizedBase;
  }
  const joiner = normalizedBase.includes('?') ? '&' : '?';
  return `${normalizedBase}${joiner}certificateNo=${encodeURIComponent(cert)}`;
}

function buildQrImageUrl(verifyUrl: string): string {
  // Fallback only — preferred path is qrCodeDataUrl from the certificate API.
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&ecc=M&margin=8&data=${encodeURIComponent(verifyUrl)}`;
}

function resolvePrintImageUrl(url: string | null | undefined): string {
  return resolveAssetUrl(String(url || '').trim());
}

export function buildBirthCertificatePrintHtml(options: {
  certificate: BirthCertificateRecord;
  verificationCode?: string;
  verificationBaseUrl?: string;
}): string {
  const { certificate, verificationCode, verificationBaseUrl } = options;
  const snap = certificate.snapshot || {};
  const hospital = snap.hospital || {};
  const baby = snap.baby || {};
  const mother = snap.mother || {};
  const father = snap.father || {};
  const signatory = snap.signatory || {};
  const printOptions = snap.printOptions || {};
  const certNo = String(certificate.certificateNo || '').trim();
  const verifyUrl = certNo
    ? buildBirthCertificateVerificationUrl(certNo, verificationBaseUrl)
    : '';
  const qrImg =
    verifyUrl && printOptions.showQrCode !== false
      ? String(certificate.qrCodeDataUrl || '').trim() || buildQrImageUrl(verifyUrl)
      : '';

  const motherCnic = displayValue(mother.cnic, '');
  const fatherCnic = displayValue(father.cnic, '');
  const motherCnicRow =
    printOptions.showMotherCnic && motherCnic ? fieldRow('Mother CNIC', motherCnic) : '';
  const fatherCnicRow =
    printOptions.showFatherCnic && fatherCnic ? fieldRow('Father CNIC', fatherCnic) : '';
  const weightRow =
    printOptions.showBirthWeight !== false && baby.birthWeightGrams
      ? fieldRow('Birth Weight', `${baby.birthWeightGrams} g`)
      : '';
  const deliveryMode = formatModeOfDelivery(snap.delivery?.modeOfDelivery);
  const deliveryRow =
    printOptions.showDeliveryMode && deliveryMode ? fieldRow('Mode of Delivery', deliveryMode) : '';

  const deliveredBy = formatDeliveredBy(snap.delivery?.deliveredBy);
  const signatoryName = displayValue(signatory.name, 'Hospital Medical Director');
  const signatoryDesignation = displayValue(signatory.designation, 'Authorized Signatory');
  const signatureUrl = resolvePrintImageUrl(signatory.signatureUrl);
  const stampUrl = resolvePrintImageUrl(signatory.stampUrl);
  const hospitalLogoUrl = resolvePrintImageUrl(hospital.logoUrl);
  const hospitalName = displayValue(hospital.name, 'Hospital');
  const tagline = displayValue(snap.footerText, 'Care today for a brighter tomorrow');
  const sealLabel =
    hospitalName.length > 22 ? `${hospitalName.slice(0, 20)}…` : hospitalName;

  const hospitalMetaParts = [
    [displayValue(hospital.address, ''), hospital.city ? displayValue(hospital.city, '') : '']
      .filter(Boolean)
      .join(', '),
    [
      hospital.phone ? `Phone: ${displayValue(hospital.phone)}` : '',
      hospital.email ? displayValue(hospital.email) : '',
    ]
      .filter(Boolean)
      .join(' | '),
  ].filter(Boolean);

  const sealHtml = stampUrl
    ? `<div class="official-seal"><img src="${esc(stampUrl)}" alt="Hospital seal" /></div>`
    : `<div class="official-seal official-seal--text"><span>Official Seal</span><strong>${esc(sealLabel)}</strong></div>`;

  const signatureBlock = `
    <div class="sign-block">
      ${
        signatureUrl
          ? `<img class="sign-img" src="${esc(signatureUrl)}" alt="Authorized signature" />`
          : '<div class="sign-spacer"></div>'
      }
      <div class="sign-line">${esc(signatoryName)}<br /><small>${esc(signatoryDesignation)}</small></div>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(snap.documentTitle || 'Hospital Birth Certificate')}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
      font-family: Georgia, 'Times New Roman', Times, serif;
    }
    body {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100%;
    }
    .sheet {
      position: relative;
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      padding: 18px 22px 16px;
      border: 3px double #1e3a8a;
      outline: 1px solid #93c5fd;
      outline-offset: 4px;
      min-height: 262mm;
      overflow: hidden;
      background: #fffef9;
    }
    .ornament {
      position: absolute;
      width: 28px;
      height: 28px;
      border-color: #1e3a8a;
      border-style: solid;
      opacity: 0.5;
      z-index: 2;
      pointer-events: none;
    }
    .ornament.tl { top: 8px; left: 8px; border-width: 2px 0 0 2px; }
    .ornament.tr { top: 8px; right: 8px; border-width: 2px 2px 0 0; }
    .ornament.bl { bottom: 8px; left: 8px; border-width: 0 0 2px 2px; }
    .ornament.br { bottom: 8px; right: 8px; border-width: 0 2px 2px 0; }
    .sheet-inner {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 640px;
      margin: 0 auto;
    }
    .watermark {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
      user-select: none;
    }
    .watermark-grid {
      position: absolute;
      left: -25%;
      top: -25%;
      width: 150%;
      height: 150%;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      grid-auto-rows: 72px;
      align-items: center;
      justify-items: center;
      transform: rotate(-28deg);
      opacity: 0.07;
      font-size: 13px;
      font-weight: 700;
      color: #1e3a8a;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .watermark span { white-space: nowrap; padding: 6px 8px; }
    .brand {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .brand-left {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      min-width: 0;
    }
    .logo {
      width: 58px;
      height: 58px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .hospital-name {
      font-size: 20px;
      font-weight: 700;
      color: #1e3a8a;
      letter-spacing: 0.4px;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .platform {
      margin-top: 2px;
      font-family: system-ui, sans-serif;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #1e3a8a;
      opacity: 0.85;
    }
    .hospital-meta {
      margin-top: 3px;
      font-family: system-ui, sans-serif;
      font-size: 10px;
      color: #475569;
      line-height: 1.4;
    }
    .tagline {
      max-width: 130px;
      text-align: right;
      font-family: system-ui, sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: #1e3a8a;
      line-height: 1.35;
    }
    .title {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      margin: 10px auto 4px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #1e3a8a;
      position: relative;
      padding: 6px 0 8px;
    }
    .title::before,
    .title::after {
      content: '';
      display: block;
      width: min(240px, 70%);
      height: 1px;
      margin: 0 auto;
      background: linear-gradient(90deg, transparent, #1e3a8a, transparent);
    }
    .title::before { margin-bottom: 6px; }
    .title::after { margin-top: 6px; }
    .attest {
      text-align: center;
      font-family: system-ui, sans-serif;
      font-size: 10.5px;
      color: #64748b;
      margin: 0 0 10px;
    }
    .doc-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      margin: 0 auto 8px;
      padding: 8px 0;
      border-top: 1px solid #bfdbfe;
      border-bottom: 1px solid #bfdbfe;
    }
    .row .label,
    .doc-meta .label,
    .section h3 {
      display: block;
      font-family: system-ui, sans-serif;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #1e3a8a;
      font-weight: 800;
      margin-bottom: 1px;
    }
    .doc-meta .value,
    .row .value {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
      word-break: break-word;
    }
    .section {
      margin: 0 0 8px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
    .section h3 { margin: 0 0 6px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 24px;
      row-gap: 4px;
      align-items: start;
    }
    .row { min-width: 0; min-height: 2.3em; }
    .authority {
      margin-top: 14px;
      display: grid;
      grid-template-columns: 120px 1fr 1.1fr;
      gap: 14px;
      align-items: end;
    }
    .qr-box { text-align: center; }
    .qr-box img {
      width: 108px;
      height: 108px;
      display: block;
      margin: 0 auto 4px;
      border: 1px solid #e2e8f0;
      background: #fff;
    }
    .qr-label {
      font-family: system-ui, sans-serif;
      font-size: 9px;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .qr-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .seal-wrap { display: grid; place-items: center; }
    .official-seal {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px double #1e3a8a;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: #fff;
    }
    .official-seal img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 8px;
    }
    .official-seal--text {
      text-align: center;
      color: #1e3a8a;
      padding: 8px;
      box-shadow: inset 0 0 0 3px rgba(30, 58, 138, 0.12);
    }
    .official-seal--text span {
      display: block;
      font-family: system-ui, sans-serif;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .official-seal--text strong {
      display: block;
      margin-top: 4px;
      font-size: 10px;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .sign-block { text-align: center; }
    .sign-img {
      display: block;
      max-height: 52px;
      max-width: 170px;
      object-fit: contain;
      margin: 0 auto 4px;
    }
    .sign-spacer { height: 52px; }
    .sign-line {
      border-top: 1px solid #334155;
      padding-top: 5px;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.3;
    }
    .sign-line small {
      display: block;
      font-family: system-ui, sans-serif;
      font-size: 9.5px;
      font-weight: 400;
      color: #64748b;
      margin-top: 2px;
    }
    .footer {
      margin-top: 12px;
      font-family: system-ui, sans-serif;
      font-size: 9.5px;
      color: #475569;
      line-height: 1.4;
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 6px;
      font-weight: 600;
    }
    @media print {
      body { display: block; }
      .sheet {
        max-width: none;
        min-height: auto;
        border-width: 2.5px;
      }
      .watermark-grid { opacity: 0.06; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="ornament tl"></div>
    <div class="ornament tr"></div>
    <div class="ornament bl"></div>
    <div class="ornament br"></div>
    ${buildWatermarkHtml(hospitalName)}
    <div class="sheet-inner">
      <div class="brand">
        <div class="brand-left">
          ${hospitalLogoUrl ? `<img class="logo" src="${esc(hospitalLogoUrl)}" alt="Hospital Logo" />` : ''}
          <div>
            <div class="hospital-name">${esc(hospitalName)}</div>
            <div class="platform">Hisaar360 Hospital Management System</div>
            <div class="hospital-meta">${hospitalMetaParts.map((line) => esc(line)).join('<br />')}</div>
          </div>
        </div>
        <div class="tagline">${esc(tagline)}</div>
      </div>

      <div class="title">${esc(snap.documentTitle || 'Hospital Birth Certificate')}</div>
      <div class="attest">This certifies that a live birth has been recorded at ${esc(hospitalName)} as per hospital records.</div>

      <div class="doc-meta">
        <div>
          <span class="label">Certificate No.</span>
          <span class="value">${esc(displayValue(certificate.certificateNo))}</span>
        </div>
        <div>
          <span class="label">Issue Date</span>
          <span class="value">${esc(formatDate(certificate.issuedAt))}</span>
        </div>
      </div>

      <div class="section">
        <h3>Child Details</h3>
        <div class="grid">
          ${fieldRow('Baby Name', displayValue(baby.name))}
          ${fieldRow('Date of Birth', formatDate(baby.dateOfBirth))}
          ${fieldRow('Time of Birth', displayValue(baby.timeOfBirth))}
          ${fieldRow('Gender', formatSex(baby.sex))}
          ${weightRow}
          ${fieldRow('Place of Birth', displayValue(baby.placeOfBirth))}
          ${deliveryRow}
          ${fieldRow('MR No', displayValue(baby.mrNo))}
        </div>
      </div>

      <div class="section">
        <h3>Parent Details</h3>
        <div class="grid">
          ${fieldRow('Mother Name', displayValue(mother.name))}
          ${fieldRow('Father Name', displayValue(father.name))}
          ${fieldRow('Mother MR No', displayValue(mother.mrNo))}
          ${motherCnicRow}
          ${fatherCnicRow}
        </div>
      </div>

      <div class="section">
        <h3>Authorization</h3>
        <div class="grid">
          ${fieldRow('Delivered By', deliveredBy)}
          ${fieldRow('Authorized Signatory', signatoryName)}
        </div>
      </div>

      <div class="authority">
        ${
          verifyUrl && printOptions.showQrCode !== false
            ? `<div class="qr-box">
          <img src="${qrImg}" alt="Verification QR Code" />
          <div class="qr-label">Scan to Verify</div>
          <div class="qr-code">${esc(certificate.verificationDisplayCode || verificationCode?.slice(0, 16) || '')}</div>
        </div>`
            : '<div></div>'
        }
        <div class="seal-wrap">${sealHtml}</div>
        ${signatureBlock}
      </div>

      <div class="footer">
        <div><strong>Important:</strong> ${esc(displayValue(snap.legalDisclaimer, 'This is a hospital-issued birth record certificate. It is not a NADRA B-Form or other government civil-registration document.'))}</div>
        <div class="footer-row">
          <span>${esc(tagline)}</span>
          <span>Powered by Hisaar360</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printBirthCertificateHtml(html: string): void {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=900');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
