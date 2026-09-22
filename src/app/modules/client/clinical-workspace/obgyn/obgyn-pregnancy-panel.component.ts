import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { calculateEddFromLmp } from './pregnancy-dating.util';
import {
  ObgynClinicalContext,
  PregnancyActiveResult,
  PregnancyEpisode,
  PregnancyTimelineEvent,
} from './pregnancy-episode.types';

@Component({
  selector: 'app-obgyn-pregnancy-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <section class="obgyn-panel" *ngIf="patientId">
      <header class="obgyn-panel__head">
        <h4>Clinical Context</h4>
        <div class="obgyn-panel__modes" role="group" aria-label="OBGYN clinical context">
          <button
            type="button"
            *ngFor="let mode of contexts"
            class="obgyn-panel__mode"
            [class.active]="clinicalContext === mode.key"
            [attr.aria-pressed]="clinicalContext === mode.key"
            (click)="setContext(mode.key)">
            {{ mode.label }}
          </button>
        </div>
      </header>

      <ng-container *ngIf="clinicalContext !== 'gynecology'">
        <div class="obgyn-panel__summary" *ngIf="selectedEpisode as episode; else noEpisode">
          <div>
            <strong>{{ episode.summaryLine || ('Pregnancy #' + episode.episodeNumber) }}</strong>
            <p *ngIf="episode.datingDisplay as d">
              <span *ngIf="d.gestationalAge?.label">{{ d.gestationalAge?.label }}</span>
              <span *ngIf="d.eddDisplay"> · {{ d.eddLabel }} {{ d.eddDisplay }}</span>
              <span *ngIf="d.lmp"> · LMP {{ d.lmp }}</span>
            </p>
          </div>
          <div class="obgyn-panel__actions">
            <button
              type="button"
              class="obgyn-action-btn"
              [class.active]="showAmend"
              (click)="showAmend = !showAmend"
              *ngIf="episode.status === 'active'">
              <i class="fa fa-calendar-check-o" aria-hidden="true"></i>
              Change Confirmed EDD
            </button>
            <button
              type="button"
              class="obgyn-action-btn"
              [class.active]="showTimeline"
              (click)="toggleTimeline()">
              <i class="fa" [class.fa-history]="!showTimeline" [class.fa-eye-slash]="showTimeline" aria-hidden="true"></i>
              {{ showTimeline ? 'Hide' : 'Show' }} Timeline
            </button>
          </div>
        </div>

        <div class="obgyn-panel__warning" *ngIf="activeWarning" role="alert">{{ activeWarning }}</div>

        <div class="obgyn-panel__select" *ngIf="activeEpisodes.length > 1">
          <label for="obgyn-episode-select">Select active pregnancy</label>
          <select id="obgyn-episode-select" [ngModel]="selectedEpisodeId" (ngModelChange)="selectEpisode($event)">
            <option value="">Choose…</option>
            <option *ngFor="let ep of activeEpisodes" [value]="ep._id">
              Pregnancy #{{ ep.episodeNumber }} — {{ ep.summaryLine }}
            </option>
          </select>
        </div>

        <ng-template #noEpisode>
          <div class="obgyn-panel__empty">
            <p>No active pregnancy episode</p>
            <button type="button" class="btn-primary" *ngIf="canWrite" (click)="showStart = true">
              Start Pregnancy Record
            </button>
          </div>
        </ng-template>

        <div class="obgyn-panel__card" *ngIf="showStart && canWrite">
          <h5>Start Pregnancy Record</h5>
          <p class="obgyn-panel__hint" *ngIf="prefillNote">{{ prefillNote }}</p>
          <form class="obgyn-panel__form" [formGroup]="startForm" (ngSubmit)="createEpisode()">
            <label>
              LMP
              <input type="date" formControlName="lmp" (change)="onStartLmpChange()" />
            </label>
            <label>
              LMP certainty
              <select formControlName="lmpCertainty" (change)="onStartLmpChange()">
                <option value="certain">Certain</option>
                <option value="approximate">Approximate</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
            <label>
              Estimated EDD
              <input type="text" [value]="estimatedEdd" readonly />
            </label>
            <label>
              Confirm EDD now (optional)
              <input type="date" formControlName="confirmedEdd" />
            </label>
            <label>
              Dating basis
              <select formControlName="datingBasis">
                <option value="lmp">LMP</option>
                <option value="ultrasound">Ultrasound</option>
                <option value="art_ivf">ART / IVF</option>
                <option value="clinician_confirmed">Clinician confirmed</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>Gravida <input formControlName="gravida" /></label>
            <label>Para <input formControlName="para" /></label>
            <label>Pregnancy losses <input formControlName="pregnancyLosses" /></label>
            <label>Living children <input formControlName="livingChildren" /></label>
            <label>Previous C-sections <input formControlName="previousCSections" /></label>
            <label>
              Plurality
              <select formControlName="singletonOrMultiple">
                <option value="unknown">Unknown</option>
                <option value="singleton">Singleton</option>
                <option value="multiple">Multiple</option>
              </select>
            </label>
            <label *ngIf="startForm.value.singletonOrMultiple === 'multiple'">
              Fetus count
              <input type="number" min="2" max="8" formControlName="fetusCount" />
            </label>
            <label>
              High risk
              <select formControlName="highRiskFlag">
                <option value="not_assessed">Not assessed</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            <div class="obgyn-panel__form-actions">
              <button type="button" class="linkish" (click)="showStart = false">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="startForm.invalid || saving">
                {{ saving ? 'Saving…' : 'Save Pregnancy Record' }}
              </button>
            </div>
          </form>
        </div>

        <div class="obgyn-panel__card" *ngIf="showAmend && selectedEpisode && canWrite">
          <h5>Change Confirmed EDD</h5>
          <p class="obgyn-panel__hint">Requires new EDD, basis, and reason. Previous value is preserved in history.</p>
          <form class="obgyn-panel__form" [formGroup]="amendForm" (ngSubmit)="amendEdd()">
            <label>New EDD <input type="date" formControlName="newEdd" required /></label>
            <label>
              Basis
              <select formControlName="basis">
                <option value="ultrasound">Ultrasound</option>
                <option value="art_ivf">ART / IVF</option>
                <option value="clinician_confirmed">Clinician confirmed</option>
                <option value="lmp">LMP</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label class="wide">Reason / note <textarea rows="2" formControlName="reason"></textarea></label>
            <div class="obgyn-panel__form-actions">
              <button type="button" class="linkish" (click)="showAmend = false">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="amendForm.invalid || saving">Save EDD change</button>
            </div>
          </form>
        </div>

        <div class="obgyn-panel__card" *ngIf="selectedEpisode">
          <div class="obgyn-panel__actions" style="justify-content: space-between; margin-bottom: 8px">
            <h5 style="margin: 0">Previous pregnancies</h5>
            <button type="button" class="linkish" *ngIf="canWrite" (click)="addPreviousPregnancy()">+ Add</button>
          </div>
          <p class="obgyn-panel__hint" *ngIf="!previousPregnancyDrafts.length">No previous pregnancy rows yet.</p>
          <div class="obgyn-panel__hx-card" *ngFor="let row of previousPregnancyDrafts; let i = index">
            <div class="obgyn-panel__form">
              <label>Year / date <input [(ngModel)]="row.yearOrDate" [ngModelOptions]="{ standalone: true }" /></label>
              <label>
                Outcome
                <select [(ngModel)]="row.outcome" [ngModelOptions]="{ standalone: true }">
                  <option value="">—</option>
                  <option value="live_birth">Live birth</option>
                  <option value="miscarriage">Miscarriage</option>
                  <option value="stillbirth">Stillbirth</option>
                  <option value="ectopic">Ectopic</option>
                  <option value="termination">Termination</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>GA at outcome <input [(ngModel)]="row.gestationalAgeAtOutcome" [ngModelOptions]="{ standalone: true }" placeholder="e.g. 38w" /></label>
              <label>
                Delivery mode
                <select [(ngModel)]="row.deliveryMode" [ngModelOptions]="{ standalone: true }">
                  <option value="">—</option>
                  <option value="vaginal">Vaginal</option>
                  <option value="assisted">Assisted</option>
                  <option value="c_section">C-section</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>Child / outcome context <input [(ngModel)]="row.childSex" [ngModelOptions]="{ standalone: true }" placeholder="Sex / living context" /></label>
              <label>Major complication <input [(ngModel)]="row.complicationNote" [ngModelOptions]="{ standalone: true }" /></label>
              <label class="wide">Notes <textarea rows="2" [(ngModel)]="row.notes" [ngModelOptions]="{ standalone: true }"></textarea></label>
            </div>
            <div class="obgyn-panel__form-actions">
              <button type="button" class="linkish" (click)="removePreviousPregnancy(i)">Remove</button>
            </div>
          </div>
          <div class="obgyn-panel__form-actions" *ngIf="canWrite && previousPregnancyDrafts.length">
            <button type="button" class="btn-primary" [disabled]="saving" (click)="savePreviousPregnancies()">
              Save obstetric history
            </button>
          </div>
        </div>

        <div class="obgyn-panel__timeline" *ngIf="showTimeline">
          <div class="obgyn-timeline__head">
            <div>
              <h5>Pregnancy Timeline</h5>
              <p class="obgyn-panel__hint">Consultations and linked birth records. Lab / Pharmacy stay in their modules.</p>
            </div>
            <span class="obgyn-timeline__count" *ngIf="timelineEvents.length">{{ timelineEvents.length }} event{{ timelineEvents.length === 1 ? '' : 's' }}</span>
          </div>
          <ol class="obgyn-timeline" *ngIf="timelineEvents.length; else emptyTimeline">
            <li class="obgyn-timeline__item" *ngFor="let event of timelineEvents; let last = last" [class.is-last]="last">
              <div class="obgyn-timeline__rail" aria-hidden="true">
                <span class="obgyn-timeline__dot" [attr.data-type]="eventTypeKey(event)"></span>
              </div>
              <article class="obgyn-timeline__card">
                <header class="obgyn-timeline__card-head">
                  <time class="obgyn-timeline__date">{{ event.at | date: 'dd MMM yyyy' }}</time>
                  <span class="obgyn-timeline__badge" [attr.data-type]="eventTypeKey(event)">{{ eventTitle(event) }}</span>
                </header>
                <p class="obgyn-timeline__detail" *ngIf="event.detail">{{ event.detail }}</p>
                <ul class="obgyn-timeline__meds" *ngIf="event.medicines?.length">
                  <li *ngFor="let med of event.medicines">{{ med }}</li>
                </ul>
                <small class="obgyn-timeline__meta" *ngIf="event.provenance === 'patient_during_pregnancy'">
                  Patient result during this pregnancy (not explicitly linked)
                </small>
                <small class="obgyn-timeline__meta" *ngIf="event.sourceModule">
                  Source: {{ event.sourceModule }}
                </small>
              </article>
            </li>
          </ol>
          <ng-template #emptyTimeline>
            <div class="obgyn-timeline__empty">
              <i class="fa fa-clock-o" aria-hidden="true"></i>
              <p>No timeline events yet. They appear after consultations or linked birth records.</p>
            </div>
          </ng-template>
        </div>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .obgyn-panel {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        display: grid;
        gap: 10px;
        margin-bottom: 12px;
        padding: 12px;
        background: #fafbfc;
      }
      .obgyn-panel__head h4,
      .obgyn-panel__card h5 {
        font-size: 13px;
        font-weight: 800;
        margin: 0 0 6px;
      }
      .obgyn-panel__modes {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .obgyn-panel__mode {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        min-height: 32px;
        padding: 4px 12px;
      }
      .obgyn-panel__mode.active {
        background: #eaf3ff;
        border-color: #1168c8;
        color: #1168c8;
      }
      .obgyn-panel__mode:focus,
      .obgyn-panel__form input:focus,
      .obgyn-panel__form select:focus,
      .obgyn-panel__form textarea:focus {
        box-shadow: 0 0 0 2px rgba(17, 104, 200, 0.2);
        outline: none;
      }
      .obgyn-panel__mode:focus:not(:focus-visible),
      .obgyn-action-btn:focus:not(:focus-visible),
      .linkish:focus:not(:focus-visible),
      .btn-primary:focus:not(:focus-visible) {
        box-shadow: none;
        outline: none;
      }
      .obgyn-panel__summary,
      .obgyn-panel__empty,
      .obgyn-panel__card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px;
      }
      .obgyn-panel__summary {
        align-items: flex-start;
        display: flex;
        gap: 12px;
        justify-content: space-between;
      }
      .obgyn-panel__summary p,
      .obgyn-panel__hint {
        color: #6b7280;
        font-size: 11px;
        margin: 4px 0 0;
      }
      .obgyn-panel__actions {
        align-items: center;
        display: flex;
        flex-shrink: 0;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }
      .obgyn-action-btn {
        align-items: center;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        color: #1e40af;
        cursor: pointer;
        display: inline-flex;
        font-size: 12px;
        font-weight: 700;
        gap: 6px;
        line-height: 1.2;
        min-height: 34px;
        padding: 6px 12px;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        white-space: nowrap;
      }
      .obgyn-action-btn i {
        font-size: 12px;
        opacity: 0.9;
      }
      .obgyn-action-btn:hover {
        background: #eff6ff;
        border-color: #93c5fd;
        color: #1d4ed8;
      }
      .obgyn-action-btn.active {
        background: #dbeafe;
        border-color: #60a5fa;
        color: #1e3a8a;
      }
      .obgyn-action-btn:focus-visible {
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
        outline: none;
      }
      .obgyn-panel__warning {
        background: #fff7ed;
        border: 1px solid #fdba74;
        border-radius: 8px;
        color: #9a3412;
        font-size: 12px;
        padding: 8px 10px;
      }
      .obgyn-panel__form {
        display: grid;
        gap: 8px;
        grid-template-columns: 1fr 1fr;
      }
      .obgyn-panel__form label {
        display: grid;
        font-size: 11px;
        font-weight: 700;
        gap: 4px;
        min-width: 0;
      }
      .obgyn-panel__form label.wide,
      .obgyn-panel__form-actions {
        grid-column: 1 / -1;
      }
      .obgyn-panel__form input,
      .obgyn-panel__form select,
      .obgyn-panel__form textarea {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 12px;
        max-width: 100%;
        min-height: 34px;
        padding: 6px 8px;
        width: 100%;
      }
      .obgyn-panel__form-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      .btn-primary {
        background: #1168c8;
        border: 0;
        border-radius: 6px;
        color: #fff;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        min-height: 34px;
        padding: 6px 12px;
      }
      .btn-primary:focus-visible {
        box-shadow: 0 0 0 3px rgba(17, 104, 200, 0.28);
        outline: none;
      }
      .linkish {
        background: transparent;
        border: 0;
        border-radius: 6px;
        color: #1168c8;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        padding: 4px 6px;
      }
      .linkish:hover {
        background: #eff6ff;
      }
      .linkish:focus-visible {
        box-shadow: 0 0 0 3px rgba(17, 104, 200, 0.22);
        outline: none;
      }
      .obgyn-panel__timeline {
        background: linear-gradient(180deg, #f8fbff 0%, #ffffff 48%);
        border: 1px solid #dbeafe;
        border-radius: 12px;
        padding: 14px;
      }
      .obgyn-timeline__head {
        align-items: flex-start;
        display: flex;
        gap: 12px;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .obgyn-timeline__head h5 {
        color: #0f172a;
        font-size: 14px;
        font-weight: 800;
        margin: 0;
      }
      .obgyn-timeline__count {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 999px;
        color: #1d4ed8;
        flex-shrink: 0;
        font-size: 11px;
        font-weight: 800;
        padding: 4px 10px;
      }
      .obgyn-timeline {
        display: grid;
        gap: 0;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .obgyn-timeline__item {
        display: grid;
        gap: 12px;
        grid-template-columns: 18px minmax(0, 1fr);
        padding-bottom: 14px;
        position: relative;
      }
      .obgyn-timeline__item.is-last {
        padding-bottom: 0;
      }
      .obgyn-timeline__rail {
        position: relative;
      }
      .obgyn-timeline__rail::before {
        background: #bfdbfe;
        bottom: -14px;
        content: '';
        left: 7px;
        position: absolute;
        top: 18px;
        width: 2px;
      }
      .obgyn-timeline__item.is-last .obgyn-timeline__rail::before {
        display: none;
      }
      .obgyn-timeline__dot {
        background: #fff;
        border: 3px solid #2563eb;
        border-radius: 999px;
        box-shadow: 0 0 0 3px #eff6ff;
        display: block;
        height: 14px;
        margin-top: 8px;
        width: 14px;
      }
      .obgyn-timeline__dot[data-type='start'] {
        border-color: #7c3aed;
        box-shadow: 0 0 0 3px #f5f3ff;
      }
      .obgyn-timeline__dot[data-type='consult'] {
        border-color: #2563eb;
      }
      .obgyn-timeline__dot[data-type='birth'] {
        border-color: #db2777;
        box-shadow: 0 0 0 3px #fdf2f8;
      }
      .obgyn-timeline__dot[data-type='dating'] {
        border-color: #059669;
        box-shadow: 0 0 0 3px #ecfdf5;
      }
      .obgyn-timeline__dot[data-type='lab'] {
        border-color: #d97706;
        box-shadow: 0 0 0 3px #fffbeb;
      }
      .obgyn-timeline__card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        display: grid;
        gap: 6px;
        min-width: 0;
        padding: 12px 14px;
      }
      .obgyn-timeline__card-head {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: space-between;
      }
      .obgyn-timeline__date {
        color: #0f172a;
        font-size: 13px;
        font-weight: 800;
      }
      .obgyn-timeline__badge {
        background: #eff6ff;
        border-radius: 999px;
        color: #1d4ed8;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.01em;
        padding: 4px 10px;
      }
      .obgyn-timeline__badge[data-type='start'] {
        background: #f5f3ff;
        color: #6d28d9;
      }
      .obgyn-timeline__badge[data-type='birth'] {
        background: #fdf2f8;
        color: #be185d;
      }
      .obgyn-timeline__badge[data-type='dating'] {
        background: #ecfdf5;
        color: #047857;
      }
      .obgyn-timeline__badge[data-type='lab'] {
        background: #fffbeb;
        color: #b45309;
      }
      .obgyn-timeline__detail {
        color: #334155;
        font-size: 12px;
        line-height: 1.45;
        margin: 0;
        word-break: break-word;
      }
      .obgyn-timeline__meds {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        list-style: none;
        margin: 2px 0 0;
        padding: 0;
      }
      .obgyn-timeline__meds li {
        background: #f1f5f9;
        border-radius: 6px;
        color: #334155;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
      }
      .obgyn-timeline__meta {
        color: #94a3b8;
        font-size: 11px;
      }
      .obgyn-timeline__empty {
        align-items: center;
        background: #fff;
        border: 1px dashed #cbd5e1;
        border-radius: 10px;
        color: #64748b;
        display: grid;
        gap: 6px;
        justify-items: center;
        padding: 18px 12px;
        text-align: center;
      }
      .obgyn-timeline__empty i {
        color: #94a3b8;
        font-size: 22px;
      }
      .obgyn-timeline__empty p {
        font-size: 12px;
        margin: 0;
        max-width: 360px;
      }
      .obgyn-panel__hx-card {
        border: 1px dashed #e5e7eb;
        border-radius: 8px;
        margin-bottom: 8px;
        padding: 8px;
      }
      @media (max-width: 700px) {
        .obgyn-panel__form,
        .obgyn-panel__summary {
          grid-template-columns: 1fr;
          flex-direction: column;
        }
        .obgyn-panel__actions {
          justify-content: flex-start;
          width: 100%;
        }
      }
    `,
  ],
})
export class ObgynPregnancyPanelComponent implements OnChanges {
  private readonly backend = inject(BackendService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) patientId = '';
  @Input() canWrite = true;
  @Input() clinicalContext: ObgynClinicalContext = 'pregnancy';
  @Input() selectedEpisodeId: string | null = null;
  @Input() legacyPrefill: Record<string, unknown> | null = null;

  @Output() clinicalContextChange = new EventEmitter<ObgynClinicalContext>();
  @Output() episodeChange = new EventEmitter<PregnancyEpisode | null>();

  readonly contexts: Array<{ key: ObgynClinicalContext; label: string }> = [
    { key: 'gynecology', label: 'Gynecology' },
    { key: 'pregnancy', label: 'Pregnancy / Antenatal' },
    { key: 'postpartum', label: 'Postpartum' },
  ];

  activeEpisodes: PregnancyEpisode[] = [];
  selectedEpisode: PregnancyEpisode | null = null;
  activeWarning: string | null = null;
  showStart = false;
  showAmend = false;
  showTimeline = false;
  saving = false;
  estimatedEdd = '';
  prefillNote = '';
  timelineEvents: PregnancyTimelineEvent[] = [];
  previousPregnancyDrafts: Array<{
    yearOrDate: string;
    outcome: string;
    gestationalAgeAtOutcome: string;
    deliveryMode: string;
    childSex: string;
    complicationNote: string;
    notes: string;
  }> = [];

  startForm = this.fb.nonNullable.group({
    lmp: [''],
    lmpCertainty: ['certain'],
    confirmedEdd: [''],
    datingBasis: ['lmp'],
    gravida: [''],
    para: [''],
    pregnancyLosses: [''],
    livingChildren: [''],
    previousCSections: [''],
    singletonOrMultiple: ['unknown'],
    fetusCount: [1],
    highRiskFlag: ['not_assessed'],
  });

  amendForm = this.fb.nonNullable.group({
    newEdd: ['', Validators.required],
    basis: ['ultrasound', Validators.required],
    reason: ['', Validators.required],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] && this.patientId) {
      this.reloadActive();
    }
    if (changes['legacyPrefill'] && this.legacyPrefill) {
      this.applyLegacyPrefill(this.legacyPrefill);
    }
  }

  setContext(context: ObgynClinicalContext): void {
    this.clinicalContext = context;
    this.clinicalContextChange.emit(context);
    if (context === 'gynecology') {
      this.episodeChange.emit(null);
    } else if (this.selectedEpisode) {
      this.episodeChange.emit(this.selectedEpisode);
    }
  }

  reloadActive(): void {
    if (!this.patientId) {
      return;
    }
    this.backend.getActivePregnancyEpisode(this.patientId).subscribe({
      next: (result) => {
        const data = result as unknown as PregnancyActiveResult;
        this.activeEpisodes = data.items || [];
        this.activeWarning = data.warning || null;
        if (this.selectedEpisodeId) {
          this.selectedEpisode =
            this.activeEpisodes.find((item) => item._id === this.selectedEpisodeId) || null;
        } else if (data.selected) {
          this.selectedEpisode = data.selected;
        } else if (this.activeEpisodes.length === 1) {
          this.selectedEpisode = this.activeEpisodes[0];
        } else {
          this.selectedEpisode = null;
        }
        if (this.clinicalContext !== 'gynecology') {
          this.episodeChange.emit(this.selectedEpisode);
        }
        this.syncPreviousPregnancyDrafts();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to load pregnancy episodes'),
    });
  }

  selectEpisode(id: string): void {
    this.selectedEpisodeId = id;
    this.selectedEpisode = this.activeEpisodes.find((item) => item._id === id) || null;
    this.syncPreviousPregnancyDrafts();
    this.episodeChange.emit(this.selectedEpisode);
  }

  syncPreviousPregnancyDrafts(): void {
    const rows = (this.selectedEpisode?.previousPregnancies || []) as Array<Record<string, unknown>>;
    this.previousPregnancyDrafts = rows.map((row) => ({
      yearOrDate: String(row['yearOrDate'] || ''),
      outcome: String(row['outcome'] || ''),
      gestationalAgeAtOutcome: String(row['gestationalAgeAtOutcome'] || ''),
      deliveryMode: String(row['deliveryMode'] || ''),
      childSex: String(row['childSex'] || ''),
      complicationNote: Array.isArray(row['complications'])
        ? String(row['complications'][0] || '')
        : String(row['complications'] || ''),
      notes: String(row['notes'] || ''),
    }));
  }

  addPreviousPregnancy(): void {
    this.previousPregnancyDrafts = [
      ...this.previousPregnancyDrafts,
      {
        yearOrDate: '',
        outcome: '',
        gestationalAgeAtOutcome: '',
        deliveryMode: '',
        childSex: '',
        complicationNote: '',
        notes: '',
      },
    ];
  }

  removePreviousPregnancy(index: number): void {
    this.previousPregnancyDrafts = this.previousPregnancyDrafts.filter((_, i) => i !== index);
  }

  savePreviousPregnancies(): void {
    if (!this.selectedEpisode || !this.canWrite) {
      return;
    }
    this.saving = true;
    const previousPregnancies = this.previousPregnancyDrafts.map((row, index) => ({
      sequence: index + 1,
      yearOrDate: row.yearOrDate || '',
      outcome: row.outcome || '',
      gestationalAgeAtOutcome: row.gestationalAgeAtOutcome || '',
      deliveryMode: row.deliveryMode || '',
      childSex: row.childSex || '',
      complications: row.complicationNote ? [row.complicationNote] : [],
      notes: row.notes || '',
    }));
    this.backend.updatePregnancyEpisode(this.selectedEpisode._id, { previousPregnancies }).subscribe({
      next: (response) => {
        this.saving = false;
        this.toastr.success(response.message || 'Obstetric history saved');
        this.selectedEpisode = (response.data || response) as unknown as PregnancyEpisode;
        this.syncPreviousPregnancyDrafts();
        this.episodeChange.emit(this.selectedEpisode);
      },
      error: (err) => {
        this.saving = false;
        this.toastr.error(err?.error?.message || 'Unable to save obstetric history');
      },
    });
  }

  onStartLmpChange(): void {
    const certainty = this.startForm.value.lmpCertainty;
    const lmp = this.startForm.value.lmp;
    this.estimatedEdd = certainty === 'unknown' ? '' : calculateEddFromLmp(lmp || '');
  }

  applyLegacyPrefill(data: Record<string, unknown>): void {
    this.prefillNote = 'Prefilled from previous consultation — review and confirm before saving.';
    this.startForm.patchValue({
      lmp: String(data['lmp'] || '').slice(0, 10),
      gravida: String(data['gravida'] || ''),
      para: String(data['para'] || ''),
      pregnancyLosses: String(data['abortion'] || ''),
      livingChildren: String(data['living'] || ''),
      previousCSections: String(data['previousCSection'] || '') === 'Yes' ? '1' : '',
    });
    this.onStartLmpChange();
    this.showStart = true;
  }

  createEpisode(): void {
    if (!this.patientId || this.startForm.invalid) {
      return;
    }
    const value = this.startForm.getRawValue();
    this.saving = true;
    const dating: Record<string, unknown> = {
      lmp: value.lmp || null,
      lmpCertainty: value.lmpCertainty,
      datingBasis: value.datingBasis,
    };
    if (value.confirmedEdd) {
      dating['confirmedEdd'] = value.confirmedEdd;
      dating['datingNote'] = 'Initial confirmed EDD at episode creation';
    }

    this.backend
      .createPregnancyEpisode({
        patientId: this.patientId,
        dating,
        obstetricSummary: {
          gravida: value.gravida,
          para: value.para,
          pregnancyLosses: value.pregnancyLosses,
          livingChildren: value.livingChildren,
          previousCSections: value.previousCSections,
        },
        currentPregnancy: {
          singletonOrMultiple: value.singletonOrMultiple,
          fetusCount: value.singletonOrMultiple === 'multiple' ? Number(value.fetusCount) || 2 : 1,
          highRiskFlag: value.highRiskFlag,
        },
      })
      .subscribe({
        next: (response) => {
          this.saving = false;
          this.showStart = false;
          this.toastr.success(response.message || 'Pregnancy episode created');
          const episode = (response.data || response) as unknown as PregnancyEpisode;
          this.selectedEpisode = episode;
          this.selectedEpisodeId = episode._id;
          this.episodeChange.emit(episode);
          this.reloadActive();
        },
        error: (err) => {
          this.saving = false;
          this.toastr.error(err?.error?.message || 'Unable to create pregnancy episode');
        },
      });
  }

  amendEdd(): void {
    if (!this.selectedEpisode || this.amendForm.invalid) {
      return;
    }
    const value = this.amendForm.getRawValue();
    this.saving = true;
    this.backend
      .amendPregnancyEdd(this.selectedEpisode._id, {
        newEdd: value.newEdd,
        basis: value.basis,
        reason: value.reason,
      })
      .subscribe({
        next: (response) => {
          this.saving = false;
          this.showAmend = false;
          this.toastr.success(response.message || 'Confirmed EDD updated');
          this.selectedEpisode = (response.data || response) as unknown as PregnancyEpisode;
          this.episodeChange.emit(this.selectedEpisode);
          this.reloadActive();
        },
        error: (err) => {
          this.saving = false;
          this.toastr.error(err?.error?.message || 'Unable to amend EDD');
        },
      });
  }

  toggleTimeline(): void {
    this.showTimeline = !this.showTimeline;
    if (this.showTimeline && this.selectedEpisode) {
      this.backend.getPregnancyTimeline(this.selectedEpisode._id).subscribe({
        next: (result) => {
          const data = result as { events?: PregnancyTimelineEvent[] };
          this.timelineEvents = data.events || [];
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to load timeline'),
      });
    }
  }

  eventTypeKey(event: PregnancyTimelineEvent): string {
    const raw = String(event.type || event.sourceModule || event.title || 'other')
      .toLowerCase()
      .replace(/\s+/g, '_');
    if (raw.includes('birth') || raw.includes('delivery')) {
      return 'birth';
    }
    if (raw.includes('consult') || raw.includes('prescription') || raw.includes('visit')) {
      return 'consult';
    }
    if (raw.includes('start') || raw.includes('episode') || raw.includes('pregnan')) {
      return 'start';
    }
    if (raw.includes('lab')) {
      return 'lab';
    }
    if (raw.includes('edd') || raw.includes('dating')) {
      return 'dating';
    }
    return 'other';
  }

  eventTitle(event: PregnancyTimelineEvent): string {
    return String(event.title || event.type || 'Event').trim() || 'Event';
  }
}
