import { HmsPrintJobType } from './hms-keyboard.types';

export type { HmsPrintJobType };

export interface PrintJobOptions {
  jobType: HmsPrintJobType;
  title?: string;
}

const INVOICE_PAGE_CSS = `
@page { size: auto; margin: 4mm; }
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
}
body.hms-print-invoice {
  width: 80mm;
  max-width: 80mm;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  color: #111;
}
@media print {
  body.hms-print-invoice { width: 80mm; }
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
  Object.assign(iframe.style, {
    border: '0',
    height: '0',
    left: '-10000px',
    opacity: '0',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: '0',
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
