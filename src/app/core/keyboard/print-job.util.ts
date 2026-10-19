import { HmsPrintJobType } from './hms-keyboard.types';

export type { HmsPrintJobType };

export interface PrintJobOptions {
  jobType: HmsPrintJobType;
  title?: string;
}

/**
 * Thermal / small invoice printers (58mm–80mm roll).
 * Important: use continuous height (`auto`), tiny margins, and never force A4 —
 * `size: auto` alone is often treated as Letter/A4 and truncates the receipt.
 */
const INVOICE_PAGE_CSS = `
@page { size: 80mm auto; margin: 0; }
html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: #fff;
  height: auto !important;
  overflow: visible !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body.hms-print-invoice {
  width: 80mm;
  max-width: 80mm;
  margin: 0 auto !important;
  font-family: Arial, "Noto Nastaliq Urdu", Helvetica, sans-serif;
  font-size: 11px;
  color: #111;
  height: auto !important;
  overflow: visible !important;
}
@media print {
  @page { size: 80mm auto; margin: 0; }
  html, body, body.hms-print-invoice {
    width: 80mm;
    max-width: 80mm;
    height: auto !important;
    overflow: visible !important;
  }
}
`;

const A4_PAGE_CSS = `
@page { size: A4; margin: 12mm; }
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
}
body.hms-print-a4 {
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
  width: 210mm;
  max-width: 210mm;
  margin: 0 auto;
}
@media print {
  body.hms-print-a4 { width: auto; max-width: none; }
}
`;

/**
 * Wraps document HTML with job-type page CSS so the browser print dialog
 * defaults to a sensible paper size. User still picks Invoice vs A4 printer.
 */
export const wrapPrintHtml = (html: string, options: PrintJobOptions): string => {
  const jobType = options.jobType || 'a4';
  const title =
    options.title ||
    (jobType === 'invoice' ? 'Invoice — select Invoice printer' : 'A4 Document — select A4 printer');
  const bodyClass = jobType === 'invoice' ? 'hms-print-invoice' : 'hms-print-a4';
  const pageCss = jobType === 'invoice' ? INVOICE_PAGE_CSS : A4_PAGE_CSS;

  const trimmed = String(html || '').trim();
  if (/^<!DOCTYPE/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    // Inject style + body class into existing document.
    let next = trimmed;
    if (!/<body[\s>]/i.test(next)) {
      return buildShell(title, bodyClass, pageCss, trimmed);
    }
    next = next.replace(/<body([^>]*)>/i, (_match, attrs: string) => {
      if (/class\s*=/i.test(attrs)) {
        return `<body${attrs.replace(/class\s*=\s*(['"])(.*?)\1/i, (_m, q, cls) => `class=${q}${cls} ${bodyClass}${q}`)}>`;
      }
      return `<body${attrs} class="${bodyClass}">`;
    });

    // Receipt HTML already sets @page width (58/80mm). Do not override it with
    // a second @page { size: 80mm } / size:auto — that truncates small printers.
    const hasThermalPage =
      jobType === 'invoice' && /@page\s*\{[^}]*size\s*:\s*\d+mm/i.test(next);
    const injectCss = hasThermalPage
      ? `
html, body {
  margin: 0 !important;
  padding: 0 !important;
  height: auto !important;
  overflow: visible !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body.hms-print-invoice {
  height: auto !important;
  overflow: visible !important;
}
`
      : pageCss;

    if (/<\/head>/i.test(next)) {
      next = next.replace(/<\/head>/i, `<style id="hms-print-job">${injectCss}</style></head>`);
    } else if (/<html[\s>]/i.test(next)) {
      next = next.replace(/<html([^>]*)>/i, `<html$1><head><style id="hms-print-job">${injectCss}</style></head>`);
    }
    if (/<title>.*?<\/title>/i.test(next)) {
      next = next.replace(/<title>.*?<\/title>/i, `<title>${escapeTitle(title)}</title>`);
    }
    return next;
  }

  return buildShell(title, bodyClass, pageCss, trimmed);
};

const buildShell = (title: string, bodyClass: string, pageCss: string, bodyHtml: string): string =>
  `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeTitle(title)}</title>
  <style id="hms-print-job">${pageCss}</style>
</head>
<body class="${bodyClass}">
${bodyHtml}
</body>
</html>`;

const escapeTitle = (value: string): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Print HTML via hidden iframe with invoice/a4 paper hints.
 */
export const printHtmlJob = (html: string, options: PrintJobOptions): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }

  const wrapped = wrapPrintHtml(html, options);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', options.title || 'Print');
  iframe.setAttribute('aria-hidden', 'true');
  // Keep a real layout box. Zero-size iframes often clip thermal receipts mid-print.
  Object.assign(iframe.style, {
    border: '0',
    height: '1px',
    left: '-10000px',
    opacity: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: options.jobType === 'invoice' ? '80mm' : '210mm',
  });
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDocument = iframe.contentDocument || printWindow?.document;
  if (!printWindow || !printDocument) {
    iframe.remove();
    return false;
  }

  printDocument.open();
  printDocument.write(wrapped);
  printDocument.close();

  const trigger = (): void => {
    try {
      printWindow.focus();
      printWindow.print();
    } finally {
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }
  };

  if (printDocument.readyState === 'complete') {
    window.setTimeout(trigger, 250);
  } else {
    iframe.onload = () => window.setTimeout(trigger, 250);
  }

  return true;
};
