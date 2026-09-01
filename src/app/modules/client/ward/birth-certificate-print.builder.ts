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

function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB');
}

export function buildBirthCertificateVerificationUrl(
  verificationCode: string,
  baseUrl = 'https://www.hisaar360.com/verify/birth'
): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  return `${normalizedBase}/${encodeURIComponent(verificationCode)}`;
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
  const verifyUrl = verificationCode
    ? buildBirthCertificateVerificationUrl(verificationCode, verificationBaseUrl)
    : '';
  const qrImg = verifyUrl && printOptions.showQrCode !== false
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}`
    : '';

  const motherCnicRow =
    printOptions.showMotherCnic && mother.cnic && mother.cnic !== 'Not Provided'
      ? `<div class="row"><span class="label">CNIC</span><span class="value">${esc(mother.cnic)}</span></div>`
      : '';
  const fatherCnicRow =
    printOptions.showFatherCnic && father.cnic && father.cnic !== 'Not Provided'
      ? `<div class="row"><span class="label">CNIC</span><span class="value">${esc(father.cnic)}</span></div>`
      : '';
  const weightRow =
    printOptions.showBirthWeight !== false && baby.birthWeightGrams
      ? `<div class="row"><span class="label">Birth Weight</span><span class="value">${esc(baby.birthWeightGrams)} g</span></div>`
      : '';
  const deliveryRow =
    printOptions.showDeliveryMode && snap.delivery?.modeOfDelivery
      ? `<div class="row"><span class="label">Mode of Delivery</span><span class="value">${esc(snap.delivery?.modeOfDelivery)}</span></div>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(snap.documentTitle || 'Hospital Birth Certificate')}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; margin: 0; background: #fff; }
    .sheet { max-width: 780px; margin: 0 auto; padding: 24px 28px; border: 3px double #1e3a8a; min-height: 1040px; box-sizing: border-box; position: relative; }
    .header { text-align: center; margin-bottom: 18px; }
    .logo { max-height: 72px; max-width: 180px; object-fit: contain; margin-bottom: 8px; }
    .hospital-name { font-size: 24px; font-weight: 700; color: #1e3a8a; letter-spacing: 0.4px; }
    .hospital-meta { font-size: 12px; color: #475569; line-height: 1.5; }
    .title { text-align: center; font-size: 20px; font-weight: 700; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
    .doc-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 18px; font-size: 13px; }
    .section { margin-bottom: 16px; border-top: 1px solid #cbd5e1; padding-top: 10px; }
    .section h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px; color: #1e3a8a; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; }
    .row .label { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.6px; }
    .row .value { display: block; font-size: 14px; margin-bottom: 6px; font-weight: 600; }
    .verify-box { margin-top: 18px; display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: center; border: 1px solid #dbeafe; background: #f8fafc; padding: 12px; border-radius: 8px; }
    .verify-box img { width: 160px; height: 160px; }
    .verify-label { font-size: 12px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; }
    .verify-code { font-family: monospace; font-size: 16px; letter-spacing: 1px; margin: 6px 0; }
    .signatory { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: end; }
    .sign-block { text-align: center; }
    .sign-block img { max-height: 64px; max-width: 180px; object-fit: contain; }
    .sign-line { border-top: 1px solid #334155; padding-top: 6px; font-size: 13px; }
    .footer { margin-top: 18px; font-size: 11px; color: #475569; line-height: 1.5; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
    .version { position: absolute; top: 18px; right: 24px; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="version">Version ${esc(certificate.version || 1)}</div>
    <div class="header">
      ${hospital.logoUrl ? `<img class="logo" src="${esc(hospital.logoUrl)}" alt="Hospital Logo" />` : ''}
      <div class="hospital-name">${esc(hospital.name)}</div>
      <div class="hospital-meta">
        ${esc(hospital.address)}${hospital.city ? `, ${esc(hospital.city)}` : ''}<br />
        ${hospital.phone ? `Phone: ${esc(hospital.phone)}` : ''}${hospital.email ? ` | ${esc(hospital.email)}` : ''}
      </div>
    </div>

    <div class="title">${esc(snap.documentTitle || 'Hospital Birth Certificate')}</div>
    <div class="doc-meta">
      <div><strong>Certificate No:</strong> ${esc(certificate.certificateNo)}</div>
      <div><strong>Birth Record No:</strong> ${esc(snap.birthRecordNo)}</div>
      <div><strong>Issue Date:</strong> ${esc(formatDateTime(certificate.issuedAt))}</div>
      <div><strong>Multiple Birth:</strong> ${esc(baby.pluralityLabel || 'Singleton')}</div>
    </div>

    <div class="section">
      <h3>Baby Details</h3>
      <div class="grid">
        <div class="row"><span class="label">Child / Baby Name</span><span class="value">${esc(baby.name)}</span></div>
        <div class="row"><span class="label">MR No</span><span class="value">${esc(baby.mrNo)}</span></div>
        <div class="row"><span class="label">Sex</span><span class="value">${esc(baby.sex)}</span></div>
        <div class="row"><span class="label">Date of Birth</span><span class="value">${esc(formatDate(baby.dateOfBirth))}</span></div>
        <div class="row"><span class="label">Time of Birth</span><span class="value">${esc(baby.timeOfBirth || '—')}</span></div>
        <div class="row"><span class="label">Place of Birth</span><span class="value">${esc(baby.placeOfBirth)}</span></div>
        ${weightRow}
        ${deliveryRow}
      </div>
    </div>

    <div class="section">
      <h3>Parent Details</h3>
      <div class="grid">
        <div>
          <div class="row"><span class="label">Mother Name</span><span class="value">${esc(mother.name)}</span></div>
          <div class="row"><span class="label">Mother MR No</span><span class="value">${esc(mother.mrNo)}</span></div>
          ${motherCnicRow}
        </div>
        <div>
          <div class="row"><span class="label">Father Name</span><span class="value">${esc(father.name || 'Not Provided')}</span></div>
          ${fatherCnicRow}
        </div>
      </div>
    </div>

    <div class="section">
      <h3>Authorization</h3>
      <div class="grid">
        <div class="row"><span class="label">Delivered By</span><span class="value">${esc(snap.delivery?.deliveredBy || '—')}</span></div>
        <div class="row"><span class="label">Authorized Signatory</span><span class="value">${esc(signatory.name || '—')}</span></div>
      </div>
    </div>

    ${
      verifyUrl && printOptions.showQrCode !== false
        ? `<div class="verify-box">
      <img src="${qrImg}" alt="Verification QR Code" />
      <div>
        <div class="verify-label">Scan to Verify</div>
        <div class="verify-code">${esc(certificate.verificationDisplayCode || verificationCode?.slice(0, 16))}</div>
        <div style="font-size:11px;">Verify at: ${esc(verifyUrl)}</div>
      </div>
    </div>`
        : ''
    }

    <div class="signatory">
      <div class="sign-block">
        ${signatory.signatureUrl ? `<img src="${esc(signatory.signatureUrl)}" alt="Signature" />` : '<div style="height:64px;"></div>'}
        <div class="sign-line">${esc(signatory.name || 'Authorized Signatory')}<br /><span style="font-size:11px;color:#64748b;">${esc(signatory.designation || '')}</span></div>
      </div>
      <div class="sign-block">
        ${signatory.stampUrl ? `<img src="${esc(signatory.stampUrl)}" alt="Hospital Stamp" />` : '<div style="height:64px;"></div>'}
        <div class="sign-line">Hospital Stamp</div>
      </div>
    </div>

    <div class="footer">
      ${snap.footerText ? `<div>${esc(snap.footerText)}</div>` : ''}
      <div><strong>Important:</strong> ${esc(snap.legalDisclaimer)}</div>
      <div>This is a hospital-issued birth record certificate. It is not a NADRA B-Form, Union Council computerized birth registration certificate, or other government civil-registration document unless a formally authorized government integration is in place.</div>
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
