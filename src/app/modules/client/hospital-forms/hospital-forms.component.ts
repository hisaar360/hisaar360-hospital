import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { hasRouteAccess, readStoredPermissions } from '../../auth/access-control';
import { BackendService } from '../../../core/services/backend.service';
import { HmsDocumentService } from '../../../core/services/hms-document.service';
import { resolveAssetUrl } from '../../../core/utils/asset.util';
import {
  HospitalFormDefinition,
  HospitalFormLetterhead,
  buildHospitalFormDocumentHtml,
  categoryLabel,
} from './hospital-form-document.builder';

type WorkspaceTab = 'list' | 'edit' | 'preview';
type EditLang = 'en' | 'ur';
type PreviewLang = 'both' | 'en' | 'ur';

@Component({
  selector: 'app-hospital-forms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hospital-forms.component.html',
  styleUrl: './hospital-forms.component.scss',
})
export class HospitalFormsComponent implements OnInit {
  private backend = inject(BackendService);
  private docs = inject(HmsDocumentService);
  private toastr = inject(ToastrService);
  private sanitizer = inject(DomSanitizer);

  loading = false;
  saving = false;
  forms: HospitalFormDefinition[] = [];
  letterhead: HospitalFormLetterhead = {
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    logoUrl: '',
  };
  selectedKey = '';
  editForm: HospitalFormDefinition | null = null;
  previewUrl: SafeResourceUrl | null = null;
  filterCategory = 'all';
  formSearch = '';
  editLang: EditLang = 'en';
  previewLang: PreviewLang = 'both';
  workspaceTab: WorkspaceTab = 'list';
  previewZoom = 0.45;

  readonly canEdit = hasRouteAccess(
    { any: ['hospitals.update', 'ward.management.read', '*'] },
    readStoredPermissions()
  );

  readonly categoryFilters: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'consent', label: 'Consent' },
    { key: 'clinical', label: 'Clinical' },
    { key: 'chart', label: 'Charts' },
  ];

  ngOnInit(): void {
    this.previewZoom = 0.45;
    this.load();
  }

  get filteredForms(): HospitalFormDefinition[] {
    const q = this.formSearch.trim().toLowerCase();
    return this.forms.filter((form) => {
      if (this.filterCategory !== 'all' && form.category !== this.filterCategory) {
        return false;
      }
      if (!q) return true;
      return (
        form.title.toLowerCase().includes(q) ||
        form.titleUrdu.toLowerCase().includes(q) ||
        form.formKey.toLowerCase().includes(q) ||
        categoryLabel(form.category).toLowerCase().includes(q)
      );
    });
  }

  get selected(): HospitalFormDefinition | null {
    return this.forms.find((form) => form.formKey === this.selectedKey) || null;
  }

  categoryLabel = categoryLabel;

  formMeta(form: HospitalFormDefinition): string {
    const base = categoryLabel(form.category);
    if (form.category === 'consent') {
      return base;
    }
    return form.bilingual ? `${base} (EN + UR)` : base;
  }

  categoryIcon(category: string): string {
    switch (category) {
      case 'consent':
        return 'fa-file-text-o';
      case 'chart':
        return 'fa-heartbeat';
      default:
        return 'fa-folder-o';
    }
  }

  categoryTone(category: string): string {
    switch (category) {
      case 'consent':
        return 'consent';
      case 'chart':
        return 'chart';
      default:
        return 'clinical';
    }
  }

  load(): void {
    this.loading = true;
    this.backend
      .listHospitalForms()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.letterhead = this.normalizeLetterhead(data?.['letterhead']);
          const rows = Array.isArray(data?.['forms']) ? data['forms'] : [];
          this.forms = rows.map((row) => this.normalizeForm(row));
          if (!this.selectedKey && this.forms.length) {
            this.selectForm(this.forms[0].formKey, false);
          } else if (this.selectedKey) {
            this.selectForm(this.selectedKey, false);
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to load hospital forms');
        },
      });
  }

  selectForm(formKey: string, switchToEdit = true): void {
    this.selectedKey = formKey;
    const form = this.forms.find((item) => item.formKey === formKey) || null;
    this.editForm = form ? { ...form } : null;
    this.editLang = 'en';
    this.refreshPreview();
    if (switchToEdit) {
      this.workspaceTab = this.canEdit ? 'edit' : 'preview';
    }
  }

  setWorkspaceTab(tab: WorkspaceTab): void {
    this.workspaceTab = tab;
    if (tab === 'preview') {
      this.refreshPreview();
    }
  }

  setEditLang(lang: EditLang): void {
    this.editLang = lang;
  }

  setPreviewLang(lang: PreviewLang): void {
    this.previewLang = lang;
    this.refreshPreview();
  }

  zoomIn(): void {
    this.previewZoom = Math.min(1.15, Math.round((this.previewZoom + 0.05) * 100) / 100);
  }

  zoomOut(): void {
    this.previewZoom = Math.max(0.3, Math.round((this.previewZoom - 0.05) * 100) / 100);
  }

  resetZoom(): void {
    this.previewZoom = 0.45;
  }

  /** When preview can't scroll further, continue scrolling the outer page. */
  onPreviewWheel(event: WheelEvent): void {
    const stage = event.currentTarget as HTMLElement | null;
    if (!stage) return;

    const delta = event.deltaY;
    const atTop = stage.scrollTop <= 0;
    const atBottom = stage.scrollTop + stage.clientHeight >= stage.scrollHeight - 1;
    if (!((delta < 0 && atTop) || (delta > 0 && atBottom))) {
      return;
    }

    const scroller = this.findPageScroller(stage);
    if (scroller) {
      scroller.scrollTop += delta;
    } else if (typeof window !== 'undefined') {
      window.scrollBy(0, delta);
    }
  }

  private findPageScroller(from: HTMLElement): HTMLElement | null {
    let node: HTMLElement | null = from.parentElement;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      const canScrollY =
        /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
      if (canScrollY && node !== from) {
        return node;
      }
      node = node.parentElement;
    }
    const root = (document.scrollingElement as HTMLElement | null) || document.documentElement;
    return root;
  }

  refreshPreview(): void {
    const form = this.editForm || this.selected;
    if (!form) {
      this.previewUrl = null;
      return;
    }
    const previewForm = this.applyPreviewLangFilter({ ...form });
    const html = buildHospitalFormDocumentHtml(previewForm, this.letterhead);
    const blob = new Blob([html], { type: 'text/html' });
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
  }

  onEditChange(): void {
    this.refreshPreview();
  }

  save(): void {
    if (!this.canEdit || !this.editForm) {
      return;
    }
    this.saving = true;
    this.backend
      .updateHospitalForm(this.editForm.formKey, {
        title: this.editForm.title,
        titleUrdu: this.editForm.titleUrdu,
        bodyHtml: this.editForm.bodyHtml,
        bodyHtmlUrdu: this.editForm.bodyHtmlUrdu,
        headerNote: this.editForm.headerNote,
        footerNote: this.editForm.footerNote,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (data) => {
          const form = this.normalizeForm(data?.['form']);
          this.forms = this.forms.map((item) => (item.formKey === form.formKey ? form : item));
          this.editForm = { ...form };
          this.refreshPreview();
          this.toastr.success('Form saved for this hospital');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save form'),
      });
  }

  reset(): void {
    if (!this.canEdit || !this.editForm) {
      return;
    }
    this.saving = true;
    this.backend
      .resetHospitalForm(this.editForm.formKey)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (data) => {
          const form = this.normalizeForm(data?.['form']);
          this.forms = this.forms.map((item) => (item.formKey === form.formKey ? form : item));
          this.editForm = { ...form };
          this.refreshPreview();
          this.toastr.success('Form reset to system default');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to reset form'),
      });
  }

  print(): void {
    const form = this.editForm || this.selected;
    if (!form) return;
    const html = buildHospitalFormDocumentHtml(form, this.letterhead);
    this.docs.printHtml(html, {
      jobType: 'a4',
      title: `${form.title} — select A4 printer`,
    });
  }

  async downloadPdf(): Promise<void> {
    const form = this.editForm || this.selected;
    if (!form) return;
    const html = buildHospitalFormDocumentHtml(form, this.letterhead);
    try {
      await this.docs.downloadPdf(html, `${form.formKey}.pdf`, 'portrait');
      this.toastr.success('PDF download started');
    } catch {
      this.toastr.error('Unable to generate PDF');
    }
  }

  private applyPreviewLangFilter(form: HospitalFormDefinition): HospitalFormDefinition {
    if (this.previewLang === 'en') {
      return { ...form, bilingual: false, bodyHtmlUrdu: '', titleUrdu: '' };
    }
    if (this.previewLang === 'ur' && form.bilingual) {
      return {
        ...form,
        bilingual: false,
        title: form.titleUrdu || form.title,
        bodyHtml: form.bodyHtmlUrdu || form.bodyHtml,
        bodyHtmlUrdu: '',
        titleUrdu: '',
      };
    }
    return form;
  }

  private normalizeLetterhead(raw: unknown): HospitalFormLetterhead {
    const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      name: String(source['name'] || ''),
      address: String(source['address'] || ''),
      city: String(source['city'] || ''),
      phone: String(source['phone'] || ''),
      email: String(source['email'] || ''),
      logoUrl: resolveAssetUrl(String(source['logoUrl'] || '')),
    };
  }

  private normalizeForm(raw: unknown): HospitalFormDefinition {
    const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      formKey: String(source['formKey'] || ''),
      category: String(source['category'] || 'clinical'),
      bilingual: Boolean(source['bilingual']),
      title: String(source['title'] || ''),
      titleUrdu: String(source['titleUrdu'] || ''),
      headerNote: String(source['headerNote'] || ''),
      footerNote: String(source['footerNote'] || ''),
      bodyHtml: String(source['bodyHtml'] || ''),
      bodyHtmlUrdu: String(source['bodyHtmlUrdu'] || ''),
      customized: Boolean(source['customized']),
      updatedAt: source['updatedAt'] ? String(source['updatedAt']) : null,
    };
  }
}
