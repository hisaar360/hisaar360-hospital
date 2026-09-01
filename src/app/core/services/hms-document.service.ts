import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { HmsDocumentOrientation, HmsDocumentSession } from './hms-document.types';

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

  printHtml(html: string, title = 'Document'): void {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', title);
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const triggerPrint = (): void => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    };

    if (iframe.contentWindow?.document.readyState === 'complete') {
      window.setTimeout(triggerPrint, 250);
    } else {
      iframe.onload = () => window.setTimeout(triggerPrint, 250);
    }
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
    this.printHtml(session.html, session.title);
  }

  previewDownload(session: HmsDocumentSession): Promise<void> {
    return this.downloadPdf(session.html, session.filename, session.orientation || 'portrait');
  }
}
