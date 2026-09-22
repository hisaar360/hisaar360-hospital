import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { SpecialtyFieldRendererComponent } from './specialty-field-renderer.component';
import { moreFields, quickFields, SpecialtyFieldSchema, SpecialtyTemplateSchema } from './specialty-template.schema';
import { SpecialtyKey } from './specialty-keys';
import { buildSpecialtySummaryParts } from './specialty-summary.util';
import {
  PediatricGrowthPanelComponent,
  PediatricGrowthPoint,
} from '../pediatrics/pediatric-growth-panel.component';

interface FieldSectionView {
  title: string;
  chipFields: SpecialtyFieldSchema[];
  textFields: SpecialtyFieldSchema[];
}

@Component({
  selector: 'app-specialty-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpecialtyFieldRendererComponent, PediatricGrowthPanelComponent],
  template: `
    <section class="specialty-consult" *ngIf="template; else missingTemplate" [formGroup]="form">
      <aside class="specialty-consult__nav" *ngIf="navSections.length">
        <p class="specialty-consult__nav-title">Sections</p>
        <button
          type="button"
          class="specialty-consult__nav-item"
          *ngFor="let section of navSections; trackBy: trackNavSection"
          (click)="scrollToSection(section.id)"
        >
          {{ section.title }}
        </button>
        <div class="specialty-consult__summary" *ngIf="cachedSummaryChips.length">
          <span *ngFor="let part of cachedSummaryChips">{{ part }}</span>
        </div>
      </aside>

      <div class="specialty-consult__body">
        <app-pediatric-growth-panel
          *ngIf="template.key === 'PEDIATRICS'"
          [dateOfBirth]="patientDateOfBirth"
          [sex]="patientSex"
          [visitDate]="visitDate"
          [points]="growthPoints">
        </app-pediatric-growth-panel>

        <article
          class="specialty-card"
          *ngFor="let group of quickSections; trackBy: trackSectionView"
          [attr.id]="sectionDomId(group.title)"
        >
          <header class="specialty-card__head" *ngIf="group.title">
            <h4>{{ group.title }}</h4>
          </header>
          <div class="specialty-card__grid specialty-card__grid--chips" *ngIf="group.chipFields.length">
            <app-specialty-field-renderer
              *ngFor="let field of group.chipFields; trackBy: trackFieldKey"
              [form]="form"
              [field]="field">
            </app-specialty-field-renderer>
          </div>
          <div class="specialty-card__grid" *ngIf="group.textFields.length">
            <app-specialty-field-renderer
              *ngFor="let field of group.textFields; trackBy: trackFieldKey"
              [form]="form"
              [field]="field">
            </app-specialty-field-renderer>
          </div>
        </article>

        <button
          type="button"
          class="specialty-consult__more-toggle"
          *ngIf="moreSections.length"
          (click)="showMore = !showMore"
        >
          <i class="fa" [ngClass]="showMore ? 'fa-chevron-up' : 'fa-chevron-down'" aria-hidden="true"></i>
          {{ showMore ? 'Hide' : 'More' }} details
        </button>

        <ng-container *ngIf="showMore">
          <article
            class="specialty-card"
            *ngFor="let group of moreSections; trackBy: trackSectionView"
            [attr.id]="sectionDomId(group.title)"
          >
            <header class="specialty-card__head" *ngIf="group.title">
              <h4>{{ group.title }}</h4>
            </header>
            <div class="specialty-card__grid specialty-card__grid--chips" *ngIf="group.chipFields.length">
              <app-specialty-field-renderer
                *ngFor="let field of group.chipFields; trackBy: trackFieldKey"
                [form]="form"
                [field]="field">
              </app-specialty-field-renderer>
            </div>
            <div class="specialty-card__grid" *ngIf="group.textFields.length">
              <app-specialty-field-renderer
                *ngFor="let field of group.textFields; trackBy: trackFieldKey"
                [form]="form"
                [field]="field">
              </app-specialty-field-renderer>
            </div>
          </article>
        </ng-container>
      </div>
    </section>

    <ng-template #missingTemplate>
      <div class="specialty-consult specialty-consult--empty">
        <p>Specialty template unavailable. Use Visit tab to continue.</p>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .specialty-consult {
        display: grid;
        gap: 12px;
        grid-template-columns: 148px minmax(0, 1fr);
        padding: 0;
      }
      .specialty-consult--empty {
        color: #6b7280;
        font-size: 12px;
        grid-template-columns: 1fr;
      }
      .specialty-consult__nav {
        align-self: start;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-top: 2px;
        position: sticky;
        top: 8px;
      }
      .specialty-consult__nav-title {
        color: #9ca3af;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
        margin: 0 0 4px;
        text-transform: uppercase;
      }
      .specialty-consult__nav-item {
        background: transparent;
        border: 0;
        border-radius: 6px;
        color: #4b5563;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 8px;
        text-align: left;
      }
      .specialty-consult__nav-item:hover {
        background: #f3f4f6;
        color: #111827;
      }
      .specialty-consult__summary {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 8px;
      }
      .specialty-consult__summary span {
        background: #111827;
        border-radius: 999px;
        color: #fff;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 7px;
      }
      .specialty-consult__body {
        display: grid;
        gap: 10px;
        min-width: 0;
      }
      .specialty-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        display: grid;
        gap: 8px;
        padding: 12px;
      }
      .specialty-card__head h4 {
        color: #111827;
        font-size: 13px;
        font-weight: 800;
        margin: 0;
      }
      .specialty-card__grid {
        display: grid;
        gap: 8px 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .specialty-card__grid--chips {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
      .specialty-consult__more-toggle {
        align-items: center;
        background: transparent;
        border: 0;
        color: #1168c8;
        cursor: pointer;
        display: inline-flex;
        font-size: 12px;
        font-weight: 700;
        gap: 6px;
        padding: 0;
        width: fit-content;
      }
      @media (max-width: 900px) {
        .specialty-consult {
          grid-template-columns: 1fr;
        }
        .specialty-consult__nav {
          display: none;
        }
        .specialty-card__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SpecialtySectionComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  @Input() template: SpecialtyTemplateSchema | null = null;
  @Input() specialtyKey: SpecialtyKey = 'OTHER';
  @Input() patientDateOfBirth: string | null = null;
  @Input() patientSex: string | null = null;
  @Input() visitDate: string | null = null;
  @Input() growthPoints: PediatricGrowthPoint[] = [];

  quickSections: FieldSectionView[] = [];
  moreSections: FieldSectionView[] = [];
  navSections: Array<{ id: string; title: string }> = [];
  showMore = false;
  cachedSummaryChips: string[] = [];
  private formSub: Subscription | null = null;

  ngOnInit(): void {
    this.bindFormWatch();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.template) {
      this.quickSections = [];
      this.moreSections = [];
      this.navSections = [];
      this.cachedSummaryChips = [];
      return;
    }

    const templateChanged =
      !!changes['template'] &&
      (changes['template'].firstChange ||
        changes['template'].previousValue?.key !== changes['template'].currentValue?.key ||
        changes['template'].previousValue?.version !== changes['template'].currentValue?.version);
    const specialtyKeyChanged =
      !!changes['specialtyKey'] &&
      (changes['specialtyKey'].firstChange ||
        changes['specialtyKey'].previousValue !== changes['specialtyKey'].currentValue);

    if (templateChanged || specialtyKeyChanged || !this.quickSections.length) {
      this.quickSections = this.toSectionViews(quickFields(this.template));
      this.moreSections = this.toSectionViews(moreFields(this.template));
      this.navSections = this.quickSections
        .filter((section) => Boolean(section.title))
        .map((section) => ({
          id: this.sectionDomId(section.title),
          title: section.title,
        }));
    }

    if (templateChanged || specialtyKeyChanged || changes['form']) {
      this.refreshSummaryChips();
    }

    if (changes['form']) {
      this.bindFormWatch();
    }
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
    this.formSub = null;
  }

  summaryChips(): string[] {
    return this.cachedSummaryChips;
  }

  trackFieldKey(_index: number, field: SpecialtyFieldSchema): string {
    return field.key;
  }

  trackSectionView(_index: number, section: FieldSectionView): string {
    return section.title || `section-${_index}`;
  }

  trackNavSection(_index: number, section: { id: string; title: string }): string {
    return section.id;
  }

  sectionDomId(title: string): string {
    const slug = String(title || 'section')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `specialty-section-${slug || 'main'}`;
  }

  scrollToSection(id: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private bindFormWatch(): void {
    this.formSub?.unsubscribe();
    this.formSub = null;
    if (!this.form) {
      return;
    }
    this.formSub = this.form.valueChanges.pipe(debounceTime(150)).subscribe(() => {
      const next = buildSpecialtySummaryParts(
        this.specialtyKey || this.template?.key || 'OTHER',
        this.form.getRawValue(),
        this.template
      );
      if (next.join('|') !== this.cachedSummaryChips.join('|')) {
        this.cachedSummaryChips = next;
      }
    });
  }

  private refreshSummaryChips(): void {
    if (!this.template || !this.form) {
      this.cachedSummaryChips = [];
      return;
    }
    this.cachedSummaryChips = buildSpecialtySummaryParts(
      this.specialtyKey || this.template.key,
      this.form.getRawValue(),
      this.template
    );
  }

  private toSectionViews(fields: SpecialtyFieldSchema[]): FieldSectionView[] {
    const order: string[] = [];
    const map = new Map<string, SpecialtyFieldSchema[]>();
    fields.forEach((field) => {
      const title = field.section || '';
      if (!map.has(title)) {
        map.set(title, []);
        order.push(title);
      }
      map.get(title)!.push(field);
    });
    return order.map((title) => {
      const sectionFields = map.get(title) || [];
      const chipFields = sectionFields.filter(
        (f) => f.type === 'tri_state' || f.type === 'boolean' || f.type === 'checkbox'
      );
      const textFields = sectionFields.filter(
        (f) => f.type !== 'tri_state' && f.type !== 'boolean' && f.type !== 'checkbox'
      );
      return { title, chipFields, textFields };
    });
  }
}
