import { HmsPrintJobType } from './hms-keyboard.types';

export type { HmsPrintJobType };

export interface PrintJobOptions {
  jobType: HmsPrintJobType;
  title?: string;
  /** Thermal roll width hint (58 or 80). Used for compact fonts, not @page size. */
  paperWidthMm?: number;
}

const clampPaperWidthMm = (value: unknown, fallback = 58): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(120, Math.max(48, Math.round(parsed)));
};

/**
 * Invoice / thermal printers (58mm, 80mm, POS-58, etc.).
 *
 * Critical: do NOT set `@page { size: 58mm }` (or 80mm) when the driver already
 * provides "Printer Paper (58 x 3276mm)". That size fight makes Chrome show a
 * blank grey print preview. Let the selected printer paper win; fill 100% width.
 */
const buildInvoicePageCss = (paperWidthMm: number): string => {
  const compact = paperWidthMm <= 58;
  // size:auto = use whatever the cashier selected (58×3276, 80mm, …). Never A4.
  return `
@page { size: auto; margin: 0 !important; }
html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: #fff !important;
  width: 100% !important;
  max-width: 100% !important;
  min-height: 1px !important;
  height: auto !important;
  overflow: visible !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body.hms-print-invoice {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  font-family: Arial, "Noto Nastaliq Urdu", Helvetica, sans-serif;
  font-size: ${compact ? 10 : 11}px;
  color: #111;
  min-height: 1px !important;
  height: auto !important;
  overflow: visible !important;
}
body.hms-print-invoice .receipt,
body.hms-print-invoice section.receipt {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  /* Thermal heads often clip the far-right edge — bias content left */
  padding-left: 1.2mm !important;
  padding-right: 4mm !important;
}
@media print {
  @page { size: auto; margin: 0 !important; }
  html, body, body.hms-print-invoice {
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    overflow: visible !important;
  }
  body.hms-print-invoice .receipt,
  body.hms-print-invoice section.receipt {
    padding-left: 1.2mm !important;
    padding-right: 4mm !important;
  }
}
`;
};

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
  const paperWidthMm = clampPaperWidthMm(options.paperWidthMm, 58);
  const title =
    options.title ||
    (jobType === 'invoice'
      ? `Invoice — paper ${paperWidthMm}mm · Margins None · Headers off`
      : 'A4 Document — select A4 printer');
  const bodyClass = jobType === 'invoice' ? 'hms-print-invoice' : 'hms-print-a4';
  const pageCss =
    jobType === 'invoice' ? buildInvoicePageCss(paperWidthMm) : A4_PAGE_CSS;

  const trimmed = String(html || '').trim();
  if (/^<!DOCTYPE/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
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

    // Remove any @page size: NNmm that fights the driver paper size.
    next = next.replace(/@page\s*\{[^}]*\}/gi, '@page { size: auto; margin: 0 !important; }');

    if (/<\/head>/i.test(next)) {
      next = next.replace(/<\/head>/i, `<style id="hms-print-job">${pageCss}</style></head>`);
    } else if (/<html[\s>]/i.test(next)) {
      next = next.replace(/<html([^>]*)>/i, `<html$1><head><style id="hms-print-job">${pageCss}</style></head>`);
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
 * Print HTML without opening a new browser tab.
 *
 * `window.open('', '_blank')` briefly navigates the cashier to about:blank
 * (looks like a blank page after double-Enter sale). Use a hidden iframe instead.
 */
export const printHtmlJob = (html: string, options: PrintJobOptions): boolean => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return false;
  }

  const paperWidthMm = clampPaperWidthMm(
    options.paperWidthMm,
    options.jobType === 'invoice' ? 58 : 210,
  );
  const wrapped = wrapPrintHtml(html, { ...options, paperWidthMm });

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', options.title || 'Print');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    border: '0',
    height: `${Math.max(400, paperWidthMm * 8)}px`,
    left: '0',
    opacity: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    visibility: 'hidden',
    width: `${Math.max(paperWidthMm, 58)}mm`,
    zIndex: '-1',
  });
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument || frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return false;
  }

  const cleanup = (): void => {
    window.setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1500);
  };

  const trigger = (): void => {
    try {
      // Keep cashier on POS — do not focus the iframe window/tab.
      frameWindow.print();
    } finally {
      cleanup();
    }
  };

  try {
    frameDocument.open();
    frameDocument.write(wrapped);
    frameDocument.close();
  } catch {
    iframe.remove();
    return false;
  }

  // Let layout paint so Chrome thermal preview is not empty.
  window.setTimeout(trigger, 500);
  return true;
};
