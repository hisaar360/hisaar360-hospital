import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  evaluateGrowthReference,
  GrowthMeasurementType,
  GrowthReferenceResult,
  listGrowthReferenceProfiles,
} from './growth-reference.service';
import { ageAtVisitLabel, agePartsAtDate } from './pediatric-age.util';

export interface PediatricGrowthPoint {
  date: string;
  weightKg?: number | null;
  heightCm?: number | null;
  lengthCm?: number | null;
  headCircumferenceCm?: number | null;
  lengthOrHeightMode?: string | null;
}

@Component({
  selector: 'app-pediatric-growth-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="peds-growth" *ngIf="dateOfBirth">
      <header class="peds-growth__head">
        <h5>Growth</h5>
        <span class="peds-growth__meta" *ngIf="activeProfileLabel">{{ activeProfileLabel }}</span>
      </header>

      <div class="peds-growth__latest" *ngIf="latest; else noMeas">
        <div class="peds-growth__chip" *ngIf="latest.weightKg != null">
          <strong>{{ latest.weightKg }} kg</strong>
          <small>Weight</small>
          <span *ngIf="weightRef?.eligible">Z {{ weightRef?.zScore }} · ~{{ weightRef?.percentile }}th</span>
          <span class="hint" *ngIf="weightRef && !weightRef.eligible">{{ weightRef.reasonUnavailable }}</span>
        </div>
        <div class="peds-growth__chip" *ngIf="heightValue != null">
          <strong>{{ heightValue }} cm</strong>
          <small>{{ heightLabel }}</small>
          <span *ngIf="heightRef?.eligible">Z {{ heightRef?.zScore }} · ~{{ heightRef?.percentile }}th</span>
        </div>
        <div class="peds-growth__chip" *ngIf="bmiValue != null">
          <strong>{{ bmiValue }}</strong>
          <small>BMI (pediatric ref)</small>
          <span *ngIf="bmiRef?.eligible">Z {{ bmiRef?.zScore }} · ~{{ bmiRef?.percentile }}th</span>
          <span class="hint" *ngIf="!bmiRef?.eligible">Not adult BMI thresholds</span>
        </div>
        <div class="peds-growth__chip" *ngIf="latest.headCircumferenceCm != null">
          <strong>{{ latest.headCircumferenceCm }} cm</strong>
          <small>Head circumference</small>
          <span *ngIf="hcRef?.eligible">Z {{ hcRef?.zScore }} · ~{{ hcRef?.percentile }}th</span>
          <span class="hint" *ngIf="hcRef && !hcRef.eligible">{{ hcRef.reasonUnavailable }}</span>
        </div>
      </div>
      <ng-template #noMeas>
        <p class="hint">No dated growth measurements yet. Record weight/height/HC in Vitals.</p>
      </ng-template>

      <div class="peds-growth__toggles" role="group" aria-label="Growth metric">
        <button
          type="button"
          *ngFor="let m of metrics"
          [class.active]="selectedMetric === m.key"
          (click)="selectedMetric = m.key">
          {{ m.label }}
        </button>
      </div>

      <ul class="peds-growth__timeline" *ngIf="series.length; else emptySeries">
        <li *ngFor="let row of series">
          <strong>{{ row.date }}</strong>
          <span>{{ row.ageLabel }}</span>
          <em>{{ row.valueLabel }}</em>
          <small *ngIf="row.ref?.eligible">
            {{ row.ref?.referenceName }} {{ row.ref?.referenceVersion }} · Z {{ row.ref?.zScore }} · ~{{
              row.ref?.percentile
            }}th
          </small>
          <small class="hint" *ngIf="row.ref && !row.ref.eligible">{{ row.ref.reasonUnavailable }}</small>
        </li>
      </ul>
      <ng-template #emptySeries>
        <p class="hint">No points for selected metric.</p>
      </ng-template>

      <p class="hint">
        Percentiles / Z-scores are derived decision support — not diagnoses (FTT, stunting, obesity, etc.).
      </p>
    </section>
  `,
  styles: [
    `
      .peds-growth {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 12px;
        margin: 8px 0 16px;
        background: #fafafa;
      }
      .peds-growth__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 8px;
      }
      .peds-growth__head h5 {
        margin: 0;
        font-size: 0.95rem;
      }
      .peds-growth__meta {
        font-size: 0.75rem;
        color: #6b7280;
      }
      .peds-growth__latest {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 10px 0;
      }
      .peds-growth__chip {
        min-width: 110px;
        padding: 8px 10px;
        border-radius: 8px;
        background: #fff;
        border: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .peds-growth__chip small {
        color: #6b7280;
      }
      .peds-growth__toggles {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
      }
      .peds-growth__toggles button {
        border: 1px solid #d1d5db;
        background: #fff;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 0.8rem;
      }
      .peds-growth__toggles button.active {
        background: #111827;
        color: #fff;
        border-color: #111827;
      }
      .peds-growth__timeline {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .peds-growth__timeline li {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 8px 10px;
        display: grid;
        gap: 2px;
      }
      .hint {
        color: #6b7280;
        font-size: 0.78rem;
        margin: 6px 0 0;
      }
      @media (max-width: 640px) {
        .peds-growth__chip {
          flex: 1 1 100%;
        }
      }
    `,
  ],
})
export class PediatricGrowthPanelComponent implements OnChanges {
  @Input() dateOfBirth: string | null = null;
  @Input() sex: string | null = null;
  @Input() visitDate: string | null = null;
  @Input() points: PediatricGrowthPoint[] = [];

  selectedMetric: 'weight' | 'height' | 'bmi' | 'hc' = 'weight';
  readonly metrics = [
    { key: 'weight' as const, label: 'Weight' },
    { key: 'height' as const, label: 'Height / Length' },
    { key: 'bmi' as const, label: 'BMI' },
    { key: 'hc' as const, label: 'Head circ.' },
  ];

  latest: PediatricGrowthPoint | null = null;
  weightRef: GrowthReferenceResult | null = null;
  heightRef: GrowthReferenceResult | null = null;
  bmiRef: GrowthReferenceResult | null = null;
  hcRef: GrowthReferenceResult | null = null;
  heightValue: number | null = null;
  heightLabel = 'Height';
  bmiValue: number | null = null;
  activeProfileLabel = '';
  series: Array<{
    date: string;
    ageLabel: string;
    valueLabel: string;
    ref: GrowthReferenceResult | null;
  }> = [];

  ngOnChanges(_changes: SimpleChanges): void {
    this.recompute();
  }

  private recompute(): void {
    const sorted = [...(this.points || [])].filter((p) => p?.date).sort((a, b) => (a.date < b.date ? 1 : -1));
    this.latest = sorted[0] || null;
    this.heightValue =
      this.latest?.heightCm ?? this.latest?.lengthCm ?? null;
    this.heightLabel =
      this.latest?.lengthOrHeightMode === 'recumbent_length'
        ? 'Length'
        : this.latest?.lengthOrHeightMode === 'standing_height'
          ? 'Height'
          : this.latest?.lengthCm != null && this.latest?.heightCm == null
            ? 'Length'
            : 'Height / Length';

    this.bmiValue = null;
    if (this.latest?.weightKg && this.heightValue && this.heightValue > 0) {
      const m = this.heightValue / 100;
      this.bmiValue = Math.round((this.latest.weightKg / (m * m)) * 10) / 10;
    }

    this.weightRef = this.evalRef('weight_kg', this.latest?.weightKg ?? null, this.latest?.date);
    const heightType: GrowthMeasurementType =
      this.latest?.lengthOrHeightMode === 'recumbent_length'
        ? 'length_cm'
        : this.latest?.lengthOrHeightMode === 'standing_height'
          ? 'height_cm'
          : this.latest?.lengthCm != null && this.latest?.heightCm == null
            ? 'length_cm'
            : 'height_cm';
    this.heightRef = this.evalRef(heightType, this.heightValue, this.latest?.date, this.latest?.lengthOrHeightMode);
    this.bmiRef = this.evalRef('bmi', this.bmiValue, this.latest?.date);
    this.hcRef = this.evalRef(
      'head_circumference_cm',
      this.latest?.headCircumferenceCm ?? null,
      this.latest?.date
    );

    const profiles = listGrowthReferenceProfiles();
    const age = agePartsAtDate(this.dateOfBirth, this.visitDate || this.latest?.date || new Date());
    const months = age ? age.years * 12 + age.months : null;
    const profile =
      months != null && months < 61
        ? profiles.find((p) => p.id === 'WHO_CGS_2006')
        : profiles.find((p) => p.id === 'WHO_GR_2007');
    this.activeProfileLabel = profile ? `${profile.name} ${profile.version}` : '';

    this.series = sorted
      .map((point) => {
        let value: number | null = null;
        let type: GrowthMeasurementType = 'weight_kg';
        let valueLabel = '';
        if (this.selectedMetric === 'weight') {
          value = point.weightKg ?? null;
          type = 'weight_kg';
          valueLabel = value != null ? `${value} kg` : '';
        } else if (this.selectedMetric === 'height') {
          value = point.heightCm ?? point.lengthCm ?? null;
          type =
            point.lengthOrHeightMode === 'recumbent_length'
              ? 'length_cm'
              : point.lengthOrHeightMode === 'standing_height'
                ? 'height_cm'
                : point.lengthCm != null && point.heightCm == null
                  ? 'length_cm'
                  : 'height_cm';
          valueLabel = value != null ? `${value} cm` : '';
        } else if (this.selectedMetric === 'hc') {
          value = point.headCircumferenceCm ?? null;
          type = 'head_circumference_cm';
          valueLabel = value != null ? `${value} cm` : '';
        } else if (this.selectedMetric === 'bmi') {
          const h = point.heightCm ?? point.lengthCm;
          if (point.weightKg && h) {
            const m = h / 100;
            value = Math.round((point.weightKg / (m * m)) * 10) / 10;
            type = 'bmi';
            valueLabel = String(value);
          }
        }
        if (value == null) {
          return null;
        }
        return {
          date: point.date,
          ageLabel: ageAtVisitLabel(this.dateOfBirth, point.date),
          valueLabel,
          ref: this.evalRef(type, value, point.date, point.lengthOrHeightMode),
        };
      })
      .filter(Boolean) as typeof this.series;
  }

  private evalRef(
    type: GrowthMeasurementType,
    value: number | null,
    date?: string | null,
    lengthOrHeightMode?: string | null
  ): GrowthReferenceResult | null {
    if (value == null) {
      return null;
    }
    return evaluateGrowthReference({
      sex: this.sex,
      dateOfBirth: this.dateOfBirth,
      measurementDate: date || this.visitDate || new Date(),
      measurementType: type,
      value,
      lengthOrHeightMode: lengthOrHeightMode || null,
      datasetKind: 'production',
    });
  }
}
