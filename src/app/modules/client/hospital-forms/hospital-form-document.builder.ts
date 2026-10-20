export interface HospitalFormLetterhead {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logoUrl: string;
}

export interface HospitalFormDefinition {
  formKey: string;
  category: string;
  bilingual: boolean;
  title: string;
  titleUrdu: string;
  headerNote: string;
  footerNote: string;
  bodyHtml: string;
  bodyHtmlUrdu: string;
  customized?: boolean;
  updatedAt?: string | null;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function categoryLabel(category: string): string {
  switch (category) {
    case 'consent':
      return 'Consent (EN + UR)';
    case 'chart':
      return 'Chart';
    case 'clinical':
      return 'Clinical';
    default:
      return category;
  }
}

function formTitleIcon(formKey: string): string {
  if (formKey.includes('surgery') || formKey.includes('ot')) {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M14.5 4.5l5 5M4 20l7.5-7.5M9 8l2 2M15 14l2 2M3 21l3-1 9-9-2-2-9 9-1 3z"/></svg>`;
  }
  if (formKey.includes('chart') || formKey.includes('vitals') || formKey.includes('mar') || formKey.includes('io')) {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>`;
}

export function buildHospitalFormDocumentHtml(
  form: HospitalFormDefinition,
  letterhead: HospitalFormLetterhead
): string {
  const metaParts = [letterhead.address, letterhead.city, letterhead.phone, letterhead.email].filter(Boolean);
  const hospitalMeta = metaParts.map((part) => esc(part)).join(' · ');
  const bilingual = Boolean(form.bilingual && form.bodyHtmlUrdu);

  const urduBlock = bilingual
    ? `
      <section class="hf-lang hf-lang--ur" lang="ur" dir="rtl">
        <div class="hf-title-row">
          <div class="hf-title-main">
            <span class="hf-title-icon" aria-hidden="true">${formTitleIcon(form.formKey)}</span>
            <div>
              <h2 class="hf-doc-title urdu">${esc(form.titleUrdu || form.title)}</h2>
            </div>
          </div>
        </div>
        <div class="hf-body urdu">${form.bodyHtmlUrdu}</div>
      </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(form.title)} — A4</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      font-family: Arial, Helvetica, 'Segoe UI', sans-serif;
      font-size: 10.5px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media screen {
      html {
        height: auto;
        overflow: hidden;
      }
      body {
        background: transparent;
        height: auto;
        margin: 0;
        overflow: hidden;
        padding: 0;
      }
      .hf-page {
        width: 210mm;
        min-height: 297mm;
        margin: 0;
        background: #fff;
        padding: 8mm 9mm 7mm;
      }
    }
    @media print {
      body { background: #fff; }
      .hf-page {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
    }

    /* ── Letterhead ── */
    .hf-header {
      display: grid;
      grid-template-columns: 52px 1fr auto;
      gap: 10px;
      align-items: start;
      border-bottom: 2px solid #1d4ed8;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .hf-logo {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border-radius: 6px;
    }
    .hf-logo-fallback {
      align-items: center;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 8px;
      color: #fff;
      display: flex;
      font-size: 18px;
      font-weight: 800;
      height: 48px;
      justify-content: center;
      width: 48px;
    }
    .hf-hospital-name {
      color: #1d4ed8;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }
    .hf-hospital-meta {
      color: #64748b;
      font-size: 9.5px;
      line-height: 1.35;
      margin-top: 2px;
      max-width: 420px;
    }
    .hf-id-box {
      display: grid;
      gap: 5px;
      min-width: 118px;
      padding-top: 2px;
    }
    .hf-id-line {
      align-items: baseline;
      color: #334155;
      display: flex;
      font-size: 10px;
      font-weight: 600;
      gap: 4px;
      white-space: nowrap;
    }
    .hf-id-line span {
      border-bottom: 1px solid #94a3b8;
      display: inline-block;
      flex: 1;
      min-width: 64px;
      min-height: 12px;
    }

    /* ── Title ── */
    .hf-title-row {
      align-items: flex-start;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      margin-bottom: 7px;
    }
    .hf-title-main {
      align-items: flex-start;
      display: flex;
      flex: 1;
      gap: 8px;
      min-width: 0;
    }
    .hf-title-icon {
      align-items: center;
      background: #2563eb;
      border-radius: 8px;
      display: inline-flex;
      flex-shrink: 0;
      height: 30px;
      justify-content: center;
      width: 30px;
    }
    .hf-doc-title {
      color: #1d4ed8;
      font-size: 15px;
      font-weight: 800;
      line-height: 1.2;
      margin: 0;
    }
    .hf-doc-note {
      color: #64748b;
      font-size: 9.5px;
      margin: 2px 0 0;
    }
    .hf-lang-badge {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      border-radius: 999px;
      color: #1d4ed8;
      flex-shrink: 0;
      font-size: 9px;
      font-weight: 700;
      padding: 4px 9px;
      white-space: nowrap;
    }

    /* ── Body blocks ── */
    .hf-lang { margin: 0; }
    .hf-lang--en { margin-bottom: 6px; }
    .hf-lang--ur {
      border-top: 1px dashed #cbd5e1;
      margin-top: 6px;
      padding-top: 6px;
    }
    .hf-body p { margin: 0 0 5px; }
    .hf-body p.hf-lead { margin-bottom: 6px; }

    /* Numbered consent points */
    .hf-points {
      display: grid;
      gap: 4px;
      list-style: none;
      margin: 0 0 7px;
      padding: 0;
    }
    .hf-points li {
      align-items: flex-start;
      display: grid;
      gap: 7px;
      grid-template-columns: 16px 1fr;
    }
    .hf-num {
      align-items: center;
      background: #2563eb;
      border-radius: 50%;
      color: #fff;
      display: inline-flex;
      font-size: 9px;
      font-weight: 700;
      height: 16px;
      justify-content: center;
      line-height: 1;
      margin-top: 1px;
      width: 16px;
    }

    /* Section bars */
    .hf-section {
      margin: 0 0 6px;
    }
    .hf-section-bar {
      background: #93c5fd;
      border-radius: 4px;
      color: #1e3a8a;
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 5px;
      padding: 4px 8px;
    }
    .hf-lang--ur .hf-section-bar {
      text-align: right;
    }

    /* Fillable fields — full writing space */
    .hf-fields {
      display: grid;
      gap: 5px;
      margin: 0 0 6px;
      width: 100%;
    }
    .hf-row {
      display: grid;
      gap: 6px;
      width: 100%;
    }
    .hf-row--2 { grid-template-columns: 1.7fr 1fr; }
    .hf-row--2b { grid-template-columns: 1fr 1fr; }
    .hf-row--3 { grid-template-columns: 1fr 1fr 1fr; }
    .hf-row--name-cnic { grid-template-columns: 1.85fr 1fr; }
    .hf-field {
      display: grid;
      gap: 2px;
      min-width: 0;
      width: 100%;
    }
    .hf-field > label,
    .hf-field > .hf-label {
      color: #475569;
      font-size: 8.5px;
      font-weight: 600;
      line-height: 1.2;
    }
    .hf-input {
      background: transparent;
      border: 0;
      border-bottom: 1px solid #64748b;
      border-radius: 0;
      min-height: 18px;
      width: 100%;
    }
    .hf-input--lg { min-height: 22px; }
    .hf-input--sign {
      border-bottom: 1px solid #64748b;
      min-height: 52px;
    }
    .hf-input--stamp {
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      min-height: 64px;
    }
    .hf-input--date {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cpath d='M16 2v4M8 2v4M3 10h18'/%3E%3C/svg%3E");
      background-position: right 2px center;
      background-repeat: no-repeat;
      background-size: 11px;
      padding-right: 16px;
    }

    /* Doctor / Ward Admin sign + stamp blocks */
    .hf-sign-row {
      display: grid;
      gap: 16px;
      grid-template-columns: 1fr 1fr;
      margin: 10px 0 6px;
      width: 100%;
    }
    .hf-sign-block {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    .hf-sign-block__title {
      color: #1e3a8a;
      font-size: 10px;
      font-weight: 700;
    }
    .hf-sign-block__hint {
      color: #94a3b8;
      font-size: 8px;
      font-weight: 500;
    }
    .hf-sign-pad {
      border-bottom: 1px solid #64748b;
      min-height: 70px;
      width: 100%;
    }
    .hf-stamp-pad {
      align-items: flex-end;
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      color: #94a3b8;
      display: flex;
      font-size: 8px;
      justify-content: center;
      min-height: 56px;
      padding: 4px;
      width: 100%;
    }

    .hf-checks {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      margin: 0 0 6px;
      width: 100%;
    }
    .hf-check {
      align-items: center;
      display: inline-flex;
      font-size: 10px;
      font-weight: 600;
      gap: 5px;
    }
    .hf-box {
      border: 1.5px solid #64748b;
      border-radius: 2px;
      display: inline-block;
      height: 12px;
      width: 12px;
    }
    .hf-checks .hf-field {
      flex: 1;
      min-width: 140px;
    }

    /* Tables: lines only (no cell boxes) */
    .hf-grid, .hf-chart {
      border-collapse: collapse;
      margin: 4px 0 8px;
      table-layout: fixed;
      width: 100%;
    }
    .hf-grid td, .hf-chart th, .hf-chart td {
      border: 0;
      border-bottom: 1px solid #94a3b8;
      overflow-wrap: anywhere;
      padding: 6px 6px 4px 0;
      vertical-align: bottom;
      word-wrap: break-word;
    }
    .hf-grid td {
      padding-top: 10px;
      padding-bottom: 8px;
      min-height: 28px;
    }
    .hf-grid tr td:nth-child(even),
    .hf-grid tr td[colspan] {
      height: 32px;
    }
    .hf-grid td:nth-child(odd) {
      color: #475569;
      font-size: 9.5px;
      font-weight: 600;
      padding-right: 8px;
      white-space: nowrap;
      width: 18%;
    }
    .hf-grid td .hf-input {
      margin-top: 4px;
    }
    .hf-grid td .hf-input:first-child {
      margin-top: 0;
    }
    /* Admission / clinical forms: extra handwriting room */
    .hf-grid--roomy td {
      padding-top: 14px;
      padding-bottom: 12px;
    }
    .hf-grid--roomy tr td:nth-child(even),
    .hf-grid--roomy tr td[colspan] {
      height: 40px;
    }
    .hf-chart th {
      background: transparent;
      border-bottom: 1.5px solid #64748b;
      color: #1e3a8a;
      font-size: 9.5px;
      font-weight: 700;
      padding-bottom: 5px;
      text-align: left;
    }
    .hf-chart td {
      height: 26px;
      vertical-align: bottom;
    }
    .hf-totals {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(4, 1fr);
      margin: 8px 0 4px;
    }
    .hf-totals .hf-field > label {
      font-size: 9px;
    }
    .hf-footer {
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 9px;
      margin-top: 6px;
      padding-top: 4px;
    }

    .urdu {
      font-family: 'Noto Nastaliq Urdu', 'Noto Nastaliq Urdu Regular', serif;
      font-size: 11px;
      line-height: 1.7;
    }
    .hf-lang--ur .hf-doc-title { font-size: 13px; }
    .hf-lang--ur .hf-field > label,
    .hf-lang--ur .hf-field > .hf-label { font-size: 9px; }
    .hf-lang--ur .hf-input { min-height: 20px; }
    .hf-lang--ur .hf-input--sign,
    .hf-lang--ur .hf-sign-pad { min-height: 56px; }
  </style>
</head>
<body>
  <div class="hf-page">
    <header class="hf-header">
      ${
        letterhead.logoUrl
          ? `<img class="hf-logo" src="${esc(letterhead.logoUrl)}" alt="" />`
          : `<div class="hf-logo-fallback">${esc((letterhead.name || 'H').charAt(0))}</div>`
      }
      <div>
        <div class="hf-hospital-name">${esc(letterhead.name || 'Hospital')}</div>
        ${hospitalMeta ? `<div class="hf-hospital-meta">${hospitalMeta}</div>` : ''}
      </div>
      <div class="hf-id-box">
        <div class="hf-id-line">Patient ID: <span></span></div>
        <div class="hf-id-line">Date: <span></span></div>
      </div>
    </header>

    <section class="hf-lang hf-lang--en" lang="en">
      <div class="hf-title-row">
        <div class="hf-title-main">
          <span class="hf-title-icon" aria-hidden="true">${formTitleIcon(form.formKey)}</span>
          <div>
            <h1 class="hf-doc-title">${esc(form.title)}</h1>
            ${form.headerNote ? `<p class="hf-doc-note">${esc(form.headerNote)}</p>` : ''}
          </div>
        </div>
        ${bilingual ? '<div class="hf-lang-badge">English / اردو</div>' : ''}
      </div>
      <div class="hf-body">${form.bodyHtml || ''}</div>
    </section>

    ${urduBlock}
    ${form.footerNote ? `<footer class="hf-footer">${esc(form.footerNote)}</footer>` : ''}
  </div>
</body>
</html>`;
}
