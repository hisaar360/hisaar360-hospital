import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { HmsDocumentOrientation } from '../../../core/services/hms-document.types';
import { HmsDocumentService } from '../../../core/services/hms-document.service';

@Component({
  selector: 'app-hms-document-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hms-document-toolbar.component.html',
  styleUrl: './hms-document-toolbar.component.scss',
})
export class HmsDocumentToolbarComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) filename = 'document.pdf';
  @Input() orientation: HmsDocumentOrientation = 'portrait';
  @Input() showExcel = false;
  @Input() disabled = false;
  @Input({ required: true }) getHtml!: () => string;
  @Input() onPrinted?: () => void;
  @Output() excelClick = new EventEmitter<void>();

  pdfLoading = false;

  constructor(
    private docs: HmsDocumentService,
    private toastr: ToastrService
  ) {}

  preview(): void {
    if (this.disabled) return;
    const html = this.safeHtml();
    if (!html) return;
    this.docs.openPreview({
      title: this.title,
      html,
      filename: this.filename,
      orientation: this.orientation,
    });
  }

  async downloadPdf(): Promise<void> {
    if (this.disabled || this.pdfLoading) return;
    const html = this.safeHtml();
    if (!html) return;
    this.pdfLoading = true;
    try {
      await this.docs.downloadPdf(html, this.filename, this.orientation);
    } catch {
      this.toastr.error('Unable to generate PDF.');
    } finally {
      this.pdfLoading = false;
    }
  }

  printDocument(): void {
    if (this.disabled) return;
    const html = this.safeHtml();
    if (!html) return;
    this.docs.printHtml(html, this.title);
    this.onPrinted?.();
  }

  exportExcel(): void {
    if (this.disabled) return;
    this.excelClick.emit();
  }

  private safeHtml(): string {
    const html = this.getHtml?.() || '';
    if (!html.trim()) {
      this.toastr.error('Nothing to export.');
      return '';
    }
    return html;
  }
}
