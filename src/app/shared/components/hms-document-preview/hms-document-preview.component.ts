import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { HmsDocumentService } from '../../../core/services/hms-document.service';
import { HmsDocumentSession } from '../../../core/services/hms-document.types';

@Component({
  selector: 'app-hms-document-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hms-document-preview.component.html',
  styleUrl: './hms-document-preview.component.scss',
})
export class HmsDocumentPreviewComponent implements OnInit, OnDestroy {
  session: HmsDocumentSession | null = null;
  /** Full HTML document via iframe so styles, watermark, and QR images render correctly. */
  previewSrcdoc: SafeHtml | null = null;
  pdfLoading = false;
  private subscription?: Subscription;

  constructor(
    private docs: HmsDocumentService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.subscription = this.docs.session$.subscribe((session) => {
      this.session = session;
      this.previewSrcdoc = session?.html
        ? this.sanitizer.bypassSecurityTrustHtml(session.html)
        : null;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  close(): void {
    this.docs.closePreview();
  }

  printDocument(): void {
    if (!this.session) return;
    this.docs.previewPrint(this.session);
  }

  async downloadPdf(): Promise<void> {
    if (!this.session || this.pdfLoading) return;
    this.pdfLoading = true;
    try {
      await this.docs.previewDownload(this.session);
    } finally {
      this.pdfLoading = false;
    }
  }
}
