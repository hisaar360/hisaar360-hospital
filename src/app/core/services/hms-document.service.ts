import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { printHtmlJob, PrintJobOptions, HmsPrintJobType } from '../keyboard/print-job.util';
import { HmsDocumentOrientation, HmsDocumentSession } from './hms-document.types';

export type { HmsPrintJobType, PrintJobOptions };

@Injectable({ providedIn: 'root' })
export class HmsDocumentService {
  private readonly sessionSubject = new BehaviorSubject<HmsDocumentSession | null>(null);
  readonly session$ = this.sessionSubject.asObservable();

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
}
