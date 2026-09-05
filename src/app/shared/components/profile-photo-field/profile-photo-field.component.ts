import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import {
  PROFILE_PHOTO_ACCEPT,
  initialsFromName,
  resolveAssetUrl,
  validateProfilePhotoFile,
} from '../../../core/utils/asset.util';

@Component({
  selector: 'app-profile-photo-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-photo-field.component.html',
  styleUrl: './profile-photo-field.component.scss',
})
export class ProfilePhotoFieldComponent implements OnChanges, OnDestroy {
  @Input() label = 'Photo';
  @Input() uploadLabel = 'Choose Image';
  @Input() replaceLabel = 'Replace';
  @Input() currentUrl: string | null = null;
  @Input() personName = '';
  @Input() disabled = false;
  @Input() uploading = false;
  @Output() fileSelected = new EventEmitter<File | null>();
  @Output() removeCurrent = new EventEmitter<void>();
  @Output() viewImage = new EventEmitter<void>();

  readonly accept = PROFILE_PHOTO_ACCEPT;
  previewUrl: string | null = null;
  error = '';
  selectedFile: File | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentUrl'] && !this.selectedFile) {
      this.previewUrl = null;
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  get displayUrl(): string {
    return this.previewUrl || resolveAssetUrl(this.currentUrl);
  }

  get initials(): string {
    return initialsFromName(this.personName);
  }

  get hasImage(): boolean {
    return Boolean(this.displayUrl);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    input.value = '';
    this.applyFile(file);
  }

  clearSelected(): void {
    this.revokePreview();
    this.selectedFile = null;
    this.error = '';
    this.fileSelected.emit(null);
  }

  requestRemove(): void {
    this.clearSelected();
    this.removeCurrent.emit();
  }

  requestView(): void {
    if (!this.hasImage) {
      return;
    }
    this.viewImage.emit();
  }

  private applyFile(file: File | null): void {
    const message = validateProfilePhotoFile(file);
    if (message) {
      this.error = message;
      return;
    }

    this.error = '';
    this.revokePreview();
    this.selectedFile = file;
    this.previewUrl = file ? URL.createObjectURL(file) : null;
    this.fileSelected.emit(file);
  }

  private revokePreview(): void {
    if (this.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = null;
  }
}
