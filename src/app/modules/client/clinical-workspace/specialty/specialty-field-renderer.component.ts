import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { evaluateShowIf, SpecialtyFieldSchema } from './specialty-template.schema';

@Component({
  selector: 'app-specialty-field-renderer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      class="specialty-field"
      [class.specialty-field--wide]="isWide()"
      [class.specialty-field--chip]="isChipField()"
      [class.specialty-field--hidden]="!visible"
      [formGroup]="form">
      <ng-container *ngIf="field.type === 'tri_state'">
        <fieldset class="specialty-field__tri">
          <legend>{{ field.label }}</legend>
          <div class="specialty-field__tri-options" role="group" [attr.aria-label]="field.label">
            <button type="button" class="specialty-field__tri-btn" [class.active]="triValue() === ''" (click)="setTri('')">—</button>
            <button type="button" class="specialty-field__tri-btn" [class.active]="triValue() === 'Yes'" (click)="setTri('Yes')">Yes</button>
            <button type="button" class="specialty-field__tri-btn" [class.active]="triValue() === 'No'" (click)="setTri('No')">No</button>
          </div>
        </fieldset>
      </ng-container>

      <ng-container *ngIf="field.type === 'boolean' || field.type === 'checkbox'">
        <label class="specialty-field__chip">
          <input
            type="checkbox"
            [checked]="isChecked()"
            [disabled]="ctrl?.disabled || false"
            (change)="onBooleanChange($any($event.target).checked)" />
          {{ field.label }}
        </label>
      </ng-container>

      <ng-container *ngIf="!isChipField()">
        <label>{{ field.label }}<small *ngIf="field.unit"> ({{ field.unit }})</small></label>

        <textarea
          *ngIf="field.type === 'textarea'"
          [formControlName]="field.key"
          [placeholder]="field.placeholder || ''"
          rows="3"></textarea>

        <select *ngIf="field.type === 'single_select' || field.type === 'radio'" [formControlName]="field.key">
          <option value="">Not recorded</option>
          <option *ngFor="let option of field.options || []" [value]="option">{{ option }}</option>
        </select>

        <div *ngIf="field.type === 'multi_select'" class="specialty-field__multi" role="group">
          <label *ngFor="let option of field.options || []" class="specialty-field__chip">
            <input
              type="checkbox"
              [checked]="isMultiSelected(option)"
              (change)="onMultiToggle(option, $any($event.target).checked)" />
            {{ option }}
          </label>
        </div>

        <input *ngIf="field.type === 'date'" type="date" [formControlName]="field.key" />
        <input *ngIf="field.type === 'datetime'" type="datetime-local" [formControlName]="field.key" />
        <input
          *ngIf="field.type === 'integer'"
          type="number"
          step="1"
          [formControlName]="field.key"
          [placeholder]="field.placeholder || ''" />
        <input
          *ngIf="field.type === 'decimal'"
          type="number"
          step="0.01"
          [formControlName]="field.key"
          [placeholder]="field.placeholder || ''" />
        <div *ngIf="field.type === 'score-display'" class="specialty-field__score">{{ ctrl?.value || '—' }}</div>

        <input
          *ngIf="isTextLike()"
          type="text"
          [formControlName]="field.key"
          autocomplete="off"
          [placeholder]="field.placeholder || ''" />
      </ng-container>

      <em *ngIf="false && field.helpText">{{ field.helpText }}</em>
      <span class="specialty-field__error" *ngIf="errorText" role="alert">{{ errorText }}</span>
    </div>
  `,
  styles: [
    `
      .specialty-field {
        display: grid;
        gap: 4px;
        min-width: 0;
        position: relative;
        z-index: 1;
      }
      .specialty-field--hidden {
        display: none;
      }
      .specialty-field--wide {
        grid-column: 1 / -1;
      }
      .specialty-field textarea {
        min-height: 72px;
        resize: vertical;
      }
      .specialty-field label,
      .specialty-field legend {
        color: #374151;
        font-size: 11px;
        font-weight: 700;
      }
      .specialty-field input,
      .specialty-field select,
      .specialty-field textarea {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 12px;
        max-width: 100%;
        min-height: 34px;
        padding: 6px 8px;
        width: 100%;
      }
      .specialty-field input:focus,
      .specialty-field select:focus,
      .specialty-field textarea:focus,
      .specialty-field__tri-btn:focus {
        border-color: #1168c8;
        box-shadow: 0 0 0 2px rgba(17, 104, 200, 0.2);
        outline: none;
      }
      .specialty-field em {
        color: #6b7280;
        font-size: 10px;
      }
      .specialty-field__error {
        color: #b91c1c;
        font-size: 11px;
        font-weight: 600;
      }
      .specialty-field__chip {
        align-items: center;
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        display: inline-flex;
        font-size: 12px;
        font-weight: 600;
        gap: 6px;
        padding: 6px 10px;
        width: fit-content;
      }
      .specialty-field__chip input {
        height: auto;
        min-height: 0;
        width: auto;
      }
      .specialty-field__tri {
        border: 0;
        margin: 0;
        min-width: 0;
        padding: 0;
      }
      .specialty-field__tri legend {
        margin-bottom: 4px;
        padding: 0;
      }
      .specialty-field__tri-options {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .specialty-field__tri-btn {
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        color: #4b5563;
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        min-height: 28px;
        min-width: 36px;
        padding: 2px 10px;
      }
      .specialty-field__tri-btn.active {
        background: #eaf3ff;
        border-color: #1168c8;
        color: #1168c8;
      }
      .specialty-field__multi {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .specialty-field__score {
        color: #111827;
        font-size: 13px;
        font-weight: 700;
      }
    `,
  ],
})
export class SpecialtyFieldRendererComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) field!: SpecialtyFieldSchema;
  @Input() errorText = '';

  visible = true;
  ctrl: FormControl | null = null;

  private watchSub: Subscription | null = null;

  ngOnInit(): void {
    this.setup();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form'] || changes['field']) {
      this.setup();
    }
  }

  ngOnDestroy(): void {
    this.watchSub?.unsubscribe();
    this.watchSub = null;
  }

  isWide(): boolean {
    if (this.field?.fullWidth) {
      return true;
    }
    const type = this.field?.type;
    return type === 'linked_record' || type === 'multi_select' || type === 'repeatable-row';
  }

  isChipField(): boolean {
    const type = this.field?.type;
    return type === 'tri_state' || type === 'boolean' || type === 'checkbox';
  }

  isTextLike(): boolean {
    const type = this.field?.type;
    return (
      type === 'text' ||
      type === 'measurement' ||
      type === 'score' ||
      type === 'laterality' ||
      type === 'file_ref' ||
      type === 'linked_record' ||
      type === 'repeatable-row'
    );
  }

  triValue(): string {
    return String(this.ctrl?.value || '').trim();
  }

  setTri(value: '' | 'Yes' | 'No'): void {
    this.ensureControl();
    this.ctrl?.setValue(value);
    this.refreshVisibility();
  }

  isChecked(): boolean {
    const value = this.ctrl?.value;
    return value === true || value === 'Yes' || value === 'true';
  }

  onBooleanChange(checked: boolean): void {
    this.ensureControl();
    this.ctrl?.setValue(checked ? 'Yes' : '');
  }

  isMultiSelected(option: string): boolean {
    const raw = String(this.ctrl?.value || '');
    return raw
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .includes(option);
  }

  onMultiToggle(option: string, checked: boolean): void {
    this.ensureControl();
    const current = String(this.ctrl?.value || '')
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);
    const next = checked ? [...new Set([...current, option])] : current.filter((item) => item !== option);
    this.ctrl?.setValue(next.join('|'));
  }

  private setup(): void {
    this.ensureControl();
    this.refreshVisibility();
    this.bindDependencyWatch();
  }

  private ensureControl(): void {
    if (!this.form || !this.field?.key) {
      this.ctrl = null;
      return;
    }
    if (!this.form.contains(this.field.key)) {
      this.form.addControl(this.field.key, new FormControl(''));
    }
    this.ctrl = this.form.get(this.field.key) as FormControl;
  }

  private bindDependencyWatch(): void {
    this.watchSub?.unsubscribe();
    this.watchSub = null;
    if (!this.form || !this.field?.showIf?.field) {
      return;
    }
    const depKey = this.field.showIf.field;
    if (!this.form.contains(depKey)) {
      this.form.addControl(depKey, new FormControl(''));
    }
    const dep = this.form.get(depKey);
    if (!dep) {
      return;
    }
    this.watchSub = dep.valueChanges.subscribe(() => this.refreshVisibility());
  }

  private refreshVisibility(): void {
    if (!this.form || !this.field) {
      this.visible = false;
      return;
    }
    this.visible = evaluateShowIf(this.field.showIf, this.form.getRawValue() as Record<string, unknown>);
  }
}
