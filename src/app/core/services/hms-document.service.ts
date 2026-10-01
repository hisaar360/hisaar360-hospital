import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { printHtmlJob, PrintJobOptions, HmsPrintJobType } from '../keyboard/print-job.util';
import { HmsDocumentOrientation, HmsDocumentSession } from './hms-document.types';
import {
  buildDesktopDownloadHint,
  buildDesktopPasteHint,
  buildWhatsAppChatUrl,
  isMobileOrTabletDevice,
  normalizeWhatsAppPhone,
  pasteShortcutLabel,
} from '../utils/whatsapp-share.util';

export type { HmsPrintJobType, PrintJobOptions };

export type HmsImageShareResult =
  | 'shared'
  | 'copied'
  | 'downloaded'
  | 'popup_blocked'
  | 'aborted'
  | 'failed';

export interface HmsPreparedShareEntry {
  blob: Blob;
  fileName: string;
  title?: string;
  phone?: string | null;
  documentLabel?: string;
}

export interface HmsShareHtmlAsImageOptions {
  html: string;
  fileName: string;
  title?: string;
  widthPx?: number;
  scale?: number;
  phone?: string | null;
  documentLabel?: string;
  prepareKey?: string | null;
  preparedBlob?: Blob | null;
}

const toPngBlob = async (blob: Blob): Promise<Blob> => {
  if (blob.type === 'image/png') {
    return blob;
  }
  const buffer = await blob.arrayBuffer();
  return new Blob([buffer], { type: 'image/png' });
};

const ensurePngName = (fileName: string): string => {
  const base = String(fileName || 'receipt')
    .replace(/\.(png|jpe?g|pdf)$/i, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'receipt'}.png`;
};

const downloadBlobFile = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = ensurePngName(fileName);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/** Copy PNG binary to clipboard (never text). Same approach as hisaar-marque. */
export const copyPngImageToClipboard = async (blob: Blob): Promise<void> => {
  const pngBlob = blob.type === 'image/png' ? blob : await toPngBlob(blob);
  if (!(pngBlob instanceof Blob) || pngBlob.size < 32) {
    throw new Error('IMAGE_CLIPBOARD_EMPTY');
  }

  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': Promise.resolve(pngBlob),
        }),
      ]);
      return;
    } catch {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        return;
      } catch {
        // Fall through to DOM copy.
      }
    }
  }

  await copyPngImageViaDom(pngBlob);
};

const copyPngImageViaDom = async (pngBlob: Blob): Promise<void> => {
  const url = URL.createObjectURL(pngBlob);
  const host = document.createElement('div');
  host.setAttribute('contenteditable', 'true');
  host.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  const img = document.createElement('img');
  img.src = url;
  host.appendChild(img);
  document.body.appendChild(host);

  try {
    await new Promise<void>((resolve, reject) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    });

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNode(img);
    selection?.removeAllRanges();
    selection?.addRange(range);
    host.focus();

    const ok = document.execCommand('copy');
    selection?.removeAllRanges();
    if (!ok) {
      throw new Error('IMAGE_DOM_COPY_FAILED');
    }
  } finally {
    host.remove();
    URL.revokeObjectURL(url);
  }
};

@Injectable({ providedIn: 'root' })
export class HmsDocumentService {
  private readonly sessionSubject = new BehaviorSubject<HmsDocumentSession | null>(null);
  readonly session$ = this.sessionSubject.asObservable();

  lastBlockedWhatsAppUrl: string | null = null;
  private preparedEntries = new Map<string, HmsPreparedShareEntry>();

  openPreview(session: HmsDocumentSession): void {
    this.sessionSubject.next({
      ...session,
      filename: session.filename || 'document.pdf',
      orientation: session.orientation || 'portrait',
    });
  }

  closePreview(): void {
    this.sessionSubject.next(null);
  }

  /**
   * Print HTML with paper preset. Prefer jobType so dual-printer setups
   * (Invoice thermal vs A4) get the right @page CSS in the browser dialog.
   */
  printHtml(
    html: string,
    titleOrOptions: string | PrintJobOptions = 'Document'
  ): void {
    const options: PrintJobOptions =
      typeof titleOrOptions === 'string'
        ? { jobType: 'a4', title: titleOrOptions }
        : {
            jobType: titleOrOptions.jobType || 'a4',
            title: titleOrOptions.title || 'Document',
          };
    printHtmlJob(html, options);
  }

  printInvoice(html: string, title = 'Invoice — select Invoice printer'): void {
    this.printHtml(html, { jobType: 'invoice', title });
  }

  printA4(html: string, title = 'A4 Document — select A4 printer'): void {
    this.printHtml(html, { jobType: 'a4', title });
  }

  async downloadPdf(
    html: string,
    filename: string,
    orientation: HmsDocumentOrientation = 'portrait'
  ): Promise<void> {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-10000px';
    host.style.top = '0';
    host.style.width = orientation === 'landscape' ? '297mm' : '210mm';
    host.style.background = '#fff';
    host.innerHTML = html;
    document.body.appendChild(host);

    try {
      const canvas = await html2canvas(host, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    } finally {
      document.body.removeChild(host);
    }
  }

  previewPrint(session: HmsDocumentSession): void {
    this.printHtml(session.html, {
      jobType: session.jobType || 'a4',
      title: session.title,
    });
  }

  previewDownload(session: HmsDocumentSession): Promise<void> {
    return this.downloadPdf(session.html, session.filename, session.orientation || 'portrait');
  }

  async htmlToPngBlob(
    html: string,
    options: { widthPx?: number; scale?: number } = {}
  ): Promise<Blob> {
    const result = await this.htmlToPngResult(html, options);
    return result.blob;
  }

  async htmlToPngResult(
    html: string,
    options: { widthPx?: number; scale?: number } = {}
  ): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
    const widthPx = options.widthPx ?? 420;
    const scale = options.scale ?? 2;
    const host = document.createElement('div');
    host.setAttribute('data-hms-image-capture', '1');
    host.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      `width:${widthPx}px`,
      'background:#ffffff',
      'opacity:0.01',
      'pointer-events:none',
      'z-index:2147483646',
      'overflow:visible',
    ].join(';');
    host.innerHTML = this.extractRenderableHtml(html);
    document.body.appendChild(host);

    try {
      await this.waitForCaptureReady(host);
      const target =
        (host.querySelector('.token, .receipt, [data-capture-root]') as HTMLElement | null) ||
        host;

      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 8000,
        removeContainer: true,
        foreignObjectRendering: false,
        onclone: (doc) => {
          const clonedHost = doc.querySelector(
            '[data-hms-image-capture="1"]'
          ) as HTMLElement | null;
          if (clonedHost) {
            clonedHost.style.opacity = '1';
            clonedHost.style.left = '0';
            clonedHost.style.top = '0';
          }
        },
      });

      if (!canvas.width || !canvas.height) {
        throw new Error('Receipt image capture returned an empty canvas');
      }

      const dataUrl = canvas.toDataURL('image/png');
      const blob = await this.canvasToPngBlob(canvas);
      return {
        blob,
        dataUrl,
        width: canvas.width,
        height: canvas.height,
      };
    } finally {
      if (host.parentNode) {
        host.parentNode.removeChild(host);
      }
    }
  }

  getPrepared(key: string | null | undefined): HmsPreparedShareEntry | null {
    if (!key) {
      return null;
    }
    return this.preparedEntries.get(key) || null;
  }

  rememberPrepared(key: string, entry: HmsPreparedShareEntry): void {
    this.preparedEntries.set(key, {
      ...entry,
      phone: normalizeWhatsAppPhone(entry.phone) || null,
    });
  }

  clearPrepared(key?: string | null): void {
    if (key) {
      this.preparedEntries.delete(key);
      return;
    }
    this.preparedEntries.clear();
  }

  /** Call synchronously from click when prepare cache exists. */
  deliverPreparedKey(key: string): Promise<HmsImageShareResult> {
    const entry = this.getPrepared(key);
    if (!entry) {
      return Promise.resolve('failed');
    }
    return this.deliverPreparedImage(entry);
  }

  hintForResult(result: HmsImageShareResult, documentLabel = 'Receipt'): string {
    if (result === 'copied') {
      return buildDesktopPasteHint(documentLabel);
    }
    if (result === 'downloaded') {
      return buildDesktopDownloadHint(documentLabel);
    }
    if (result === 'popup_blocked') {
      return `${documentLabel} image copied. Press ${pasteShortcutLabel()} in WhatsApp. Popup blocked — click Open WhatsApp.`;
    }
    if (result === 'shared') {
      return `${documentLabel} shared on WhatsApp.`;
    }
    return '';
  }

  pasteShortcutLabel(): string {
    return pasteShortcutLabel();
  }

  normalizeWhatsAppPhone(value: string): string {
    return normalizeWhatsAppPhone(value) || '';
  }

  openWhatsAppDirect(url: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return !!win;
  }

  openWhatsAppChat(phoneDigits: string, _caption = ''): boolean {
    // Never pass text= — chat only so paste is the receipt IMAGE.
    return this.openWhatsAppDirect(buildWhatsAppChatUrl(phoneDigits));
  }

  downloadPngBlob(blob: Blob, filename = 'receipt.png'): void {
    downloadBlobFile(blob, filename);
  }

  async copyPngBlobToClipboard(blob: Blob): Promise<void> {
    await copyPngImageToClipboard(blob);
  }

  /**
   * Desktop (PNG in memory — best when called from a click with no prior await):
   * 1) Copy image/png to clipboard
   * 2) Open WhatsApp chat with NO text= prefill
   */
  async deliverPreparedImage(options: HmsPreparedShareEntry): Promise<HmsImageShareResult> {
    this.lastBlockedWhatsAppUrl = null;
    const title = options.title || options.fileName;
    const phone = normalizeWhatsAppPhone(options.phone) || null;

    if (!(options.blob instanceof Blob) || options.blob.size < 32) {
      return 'failed';
    }

    const pngBlob =
      options.blob.type === 'image/png' ? options.blob : await toPngBlob(options.blob);
    const file = new File([pngBlob], ensurePngName(options.fileName), { type: 'image/png' });

    if (isMobileOrTabletDevice()) {
      const nav = window.navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data?: ShareData) => Promise<void>;
      };
      if (typeof nav.canShare === 'function' && typeof nav.share === 'function') {
        try {
          if (nav.canShare({ files: [file] })) {
            await nav.share({ files: [file], title });
            return 'shared';
          }
        } catch (error) {
          const name = (error as { name?: string } | null)?.name;
          if (name === 'AbortError') {
            return 'aborted';
          }
        }
      }
    }

    const whatsappUrl = buildWhatsAppChatUrl(phone);

    let copyPromise: Promise<void>;
    try {
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('IMAGE_CLIPBOARD_UNSUPPORTED');
      }
      copyPromise = navigator.clipboard.write([
        new ClipboardItem({
          'image/png': Promise.resolve(pngBlob),
        }),
      ]);
    } catch {
      try {
        copyPromise = copyPngImageToClipboard(pngBlob);
      } catch {
        downloadBlobFile(file, file.name);
        const openedAfterDownload = this.openWhatsAppDirect(whatsappUrl);
        if (!openedAfterDownload) {
          this.lastBlockedWhatsAppUrl = whatsappUrl;
          return 'popup_blocked';
        }
        return 'downloaded';
      }
    }

    try {
      await copyPromise;
    } catch {
      try {
        await copyPngImageViaDom(pngBlob);
      } catch {
        downloadBlobFile(file, file.name);
        const openedAfterDownload = this.openWhatsAppDirect(whatsappUrl);
        if (!openedAfterDownload) {
          this.lastBlockedWhatsAppUrl = whatsappUrl;
          return 'popup_blocked';
        }
        return 'downloaded';
      }
    }

    const opened = this.openWhatsAppDirect(whatsappUrl);
    if (!opened) {
      this.lastBlockedWhatsAppUrl = whatsappUrl;
      return 'popup_blocked';
    }
    return 'copied';
  }

  /**
   * Same as hisaar-marque DocumentShareService.shareHtmlAsImage:
   * generate PNG (or use cache) → clipboard image → open WhatsApp.
   */
  async shareHtmlAsImage(options: HmsShareHtmlAsImageOptions): Promise<HmsImageShareResult> {
    try {
      const key = String(options.prepareKey || options.fileName || '').trim();
      const prepared = options.preparedBlob
        ? {
            blob: options.preparedBlob,
            fileName: options.fileName,
            title: options.title,
            phone: options.phone,
            documentLabel: options.documentLabel,
          }
        : this.getPrepared(key);

      const blob =
        prepared?.blob ||
        (
          await this.htmlToPngResult(options.html, {
            widthPx: options.widthPx ?? 420,
            scale: options.scale ?? 2,
          })
        ).blob;

      if (key) {
        this.rememberPrepared(key, {
          blob,
          fileName: prepared?.fileName || options.fileName,
          title: prepared?.title || options.title,
          phone: prepared?.phone ?? options.phone,
          documentLabel: prepared?.documentLabel || options.documentLabel,
        });
      }

      return await this.deliverPreparedImage({
        blob,
        fileName: prepared?.fileName || options.fileName,
        title: prepared?.title || options.title,
        phone: prepared?.phone ?? options.phone,
        documentLabel: prepared?.documentLabel || options.documentLabel,
      });
    } catch {
      return 'failed';
    }
  }

  private async canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), 'image/png')
    );
    if (blob) {
      return blob;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const response = await fetch(dataUrl);
    return response.blob();
  }

  private async waitForCaptureReady(host: HTMLElement): Promise<void> {
    const images = Array.from(host.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            setTimeout(done, 2500);
          })
      )
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  }

  private extractRenderableHtml(html: string): string {
    const raw = String(html || '').trim();
    if (!raw) {
      return '';
    }

    const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const styles = styleMatch ? `<style>${styleMatch[1]}</style>` : '';
      return `${styles}${bodyMatch[1]}`;
    }

    return raw;
  }
}
