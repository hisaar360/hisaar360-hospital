import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-image-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-viewer-modal.component.html',
  styleUrl: './image-viewer-modal.component.scss',
})
export class ImageViewerModalComponent {
  @Input() open = false;
  @Input() src = '';
  @Input() alt = 'Preview';
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
