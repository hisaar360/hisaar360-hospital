import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  HMS_KEYBOARD_STANDARDS,
  HmsKeyboardDirective,
  isEditableTarget,
  isModKey,
} from '../../../core/keyboard';
import { BackendService } from '../../../core/services/backend.service';
import { buildImagingOrderFromWardRow } from '../../../core/documents/imaging-order-document.builder';
import {
  buildProcedureSummaryDocumentHtml,
  buildVitalsSummaryDocumentHtml,
  buildWardPatientSummaryDocumentHtml,
} from '../../../core/documents/ward-clinical-document.builder';
import { readCurrentUserName, readStoredHospitalDocumentInfo } from '../../../core/utils/hms-document-context.util';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import { WardDataService } from './services/ward-data.service';
import {
  AdmissionRecommendationRecord,
  admissionRecommendationStatusLabel,
  admissionHandoverText,
  admissionSnapshotText,
  mapAdmissionRecommendationRecord,
} from '../prescription/admission-recommendation.models';
import { Doctor, OperationSchedule, Prescription, RoomAllotment } from '../../../shared/models/hospital.model';
import { WardActionModalComponent } from './ward-action-modal.component';
import { WardBillingPanelComponent } from './ward-billing-panel.component';
import { WardDoctorOrderModalComponent } from './ward-doctor-order-modal.component';
import { WardMarPanelComponent } from './ward-mar-panel.component';
import { WardActivityTimelineComponent } from './ward-activity-timeline.component';
import { WardVitalsPanelComponent } from './ward-vitals-panel.component';
import { WardDripPanelComponent } from './ward-drip-panel.component';
import { WardPatient } from './ward-patient-list.models';
import { WardModuleRow } from './ward-module.models';
import { WardActivityRecord } from './services/ward-api.mapper';
import {
  buildWardHandoverSnapshot,
  buildWardHistoryEntries,
  buildWardQuickActions,
  filterWardHistoryEntries,
  resolveWardIvSubTab,
  resolveWardWorkspaceTab,
  WARD_HISTORY_FILTERS,
  WARD_WORKSPACE_PRIMARY_TABS,
  WARD_WORKSPACE_SECONDARY_TABS,
  WardAdmissionHistoryItem,
  WardHandoverSnapshotLine,
  WardHistoryEntry,
  WardHistoryFilter,
  WardIvSubTab,
  WardOperationSummary,
  WardPatientUpdateItem,
  WardQuickAction,
  wardHistoryStatusIcon,
  WardWorkspaceTab,
  WardWorkspaceTabKey,
  wardWorkspaceTabLabel,
} from './ward-workspace.util';
import { ATTENDANT_TASK_TYPE_LABELS } from './ward-home.util';
import {
  hasPermission,
  readStoredPermissions,
  isDoctorRole,
  readStoredRole,
} from '../../auth/access-control';
import {
  isLaboratoryModuleEnabled,
  isPharmacyModuleEnabled,
  isWardModuleEnabled,
} from '../../auth/hospital-modules';

type WardNoteKind = 'nursing' | 'doctor' | 'handover';

interface WardNoteItem {
  id: string;
  kind: WardNoteKind;
  kindLabel: string;
  title: string;
  detail: string;
  author: string;
  timeLabel: string;
  status: string;
  statusIcon: string;
  important: boolean;
}

interface WardWidgetState {
  loading: boolean;
  failed: boolean;
}

const OPERATION_STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  scheduled: 'Scheduled',
  in_progress: 'In Theatre',
  completed: 'Completed',
  cancelled: 'Cancelled',
  postponed: 'Postponed',
  stopped: 'Stopped',
};

@Component({
  selector: 'app-ward-patient-detail',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    WardActionModalComponent,
    WardBillingPanelComponent,
    WardDoctorOrderModalComponent,
    WardMarPanelComponent,
    WardActivityTimelineComponent,
    WardVitalsPanelComponent,
    WardDripPanelComponent,
    HmsDocumentToolbarComponent,
    HmsKeyboardDirective,
  ],
  templateUrl: './ward-patient-detail.component.html',
  styleUrl: './ward-patient-detail.component.scss',
})
export class WardPatientDetailComponent implements OnInit, OnDestroy {
  loading = false;
  loadFailed = false;
  patient: WardPatient | null = null;
  allotment: RoomAllotment | null = null;
  activeTab: WardWorkspaceTabKey = 'overview';
  ivSubTab: WardIvSubTab = 'iv';
  moreTabsOpen = false;
  stickyActionIndex = 0;
  keyboardHintOpen = false;
  readonly keyboardHints = [
    ...HMS_KEYBOARD_STANDARDS,
    { keys: 'Ctrl/Cmd+1…n', action: 'Jump chart tabs' },
    { keys: '↑ ↓', action: 'Move quick action focus' },
    { keys: 'Enter', action: 'Run focused quick action' },
    { keys: 'Escape', action: 'Close ward modals' },
  ];

  vitalsRows: WardModuleRow[] = [];
  marRows: WardModuleRow[] = [];
  marPrescriptions: Prescription[] = [];
  marActivities: WardActivityRecord[] = [];
  dripRows: WardModuleRow[] = [];
  nursingRows: WardModuleRow[] = [];
  orderRows: WardModuleRow[] = [];
  ioRows: WardModuleRow[] = [];
  handoverRows: WardModuleRow[] = [];
  admissionRecommendation: AdmissionRecommendationRecord | null = null;
  patientUpdates: WardPatientUpdateItem[] = [];
  admissionHistory: WardAdmissionHistoryItem[] = [];
  operation: WardOperationSummary | null = null;
  doctors: Doctor[] = [];
  doctorOrderOpen = false;
  ioEntryOpen = false;

  /** Per-widget states so one failing panel never blanks the workspace. */
  readonly updatesState: WardWidgetState = { loading: false, failed: false };
  readonly admissionHistoryState: WardWidgetState = { loading: false, failed: false };
  readonly operationState: WardWidgetState = { loading: false, failed: false };
  readonly planState: WardWidgetState = { loading: false, failed: false };

  readonly primaryTabs = WARD_WORKSPACE_PRIMARY_TABS;
  readonly secondaryTabs = WARD_WORKSPACE_SECONDARY_TABS;
  readonly historyFilters = WARD_HISTORY_FILTERS;
  readonly noteKindFilters: Array<{ key: 'all' | WardNoteKind; label: string }> = [
    { key: 'all', label: 'All notes' },
    { key: 'nursing', label: 'Nursing' },
    { key: 'doctor', label: 'Doctor / Round' },
    { key: 'handover', label: 'Handover' },
  ];

  historyFilter: WardHistoryFilter = 'all';
  /** History defaults to the current admission; lifetime history is opt-in. */
  historyIncludePrevious = false;
  noteFilter: 'all' | WardNoteKind = 'all';
  noteText = '';
  noteCategory = 'routine';
  noteKind: 'nursing' | 'round' | 'handover' = 'nursing';
  attendantFormOpen = false;
  attendantSaving = false;
  attendantTaskType = 'TAKE_TO_IMAGING';
  attendantDestination = '';
  attendantDueAt = '';
  attendantInstruction = '';
  attendantPriority = 'normal';
  readonly attendantTaskTypes = Object.entries(ATTENDANT_TASK_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
  noteSaving = false;

  /** First-open guard for tab data, so Overview renders without waiting on them. */
  private readonly loadedTabs = new Set<string>(['overview']);
  private updatesRequested = false;
  private doctorsRequested = false;
  private permissions = readStoredPermissions();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private wardData: WardDataService,
    private backend: BackendService
  ) {}

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    this.activeTab = resolveWardWorkspaceTab(tabParam);
    this.ivSubTab = resolveWardIvSubTab(tabParam);
    this.loadedTabs.add(this.activeTab);
    this.loadWorkspace();
  }

  ngOnDestroy(): void {
    // Directive unregisters page context.
  }

  /** Browser-level guard for an unsaved note; in-app moves go through confirmLeaving(). */
  @HostListener('window:beforeunload', ['$event'])
  warnOnUnsavedNote(event: BeforeUnloadEvent): void {
    if (this.noteDirty) {
      event.preventDefault();
      event.returnValue = true;
    }
  }

  /* ----------------------------------------------------------- data loading */

  loadWorkspace(): void {
    const admissionId = this.admissionId;
    this.loading = true;
    this.loadFailed = false;

    this.wardData.loadPatientDetail(admissionId).subscribe({
      next: (data) => {
        this.applyDetail(data);
        this.loading = false;
        if (!data.patient) {
          this.toastr.warning('Patient admission not found.', 'Patient Workspace');
          return;
        }
        this.loadOperation(data.patient.patientId);
        this.ensureTabData(this.activeTab);
      },
      error: () => {
        this.loading = false;
        this.loadFailed = true;
        this.toastr.error('Failed to load patient workspace.', 'Patient Workspace');
      },
    });
  }

  private applyDetail(data: {
    patient: WardPatient | null;
    allotment: RoomAllotment | null;
    vitals: WardModuleRow[];
    mar: WardModuleRow[];
    drips: WardModuleRow[];
    nursing: WardModuleRow[];
    orders: WardModuleRow[];
    io: WardModuleRow[];
    handover: WardModuleRow[];
    prescriptions: Prescription[];
    marActivities: WardActivityRecord[];
  }): void {
    this.patient = data.patient;
    this.allotment = data.allotment;
    this.vitalsRows = data.vitals;
    this.marRows = data.mar;
    this.marPrescriptions = data.prescriptions;
    this.marActivities = data.marActivities;
    this.dripRows = data.drips;
    this.nursingRows = data.nursing;
    this.orderRows = data.orders;
    this.ioRows = data.io;
    this.handoverRows = data.handover;
  }

  private reloadDetail(): void {
    this.wardData.loadPatientDetail(this.admissionId).subscribe({
      next: (data) => {
        this.applyDetail(data);
        if (this.updatesRequested) {
          this.loadPatientUpdates();
        }
      },
    });
  }

  /**
   * Heavy or tab-specific data is fetched the first time a tab is opened.
   * Overview only needs the chart bundle plus the operation lookup.
   */
  private ensureTabData(tab: WardWorkspaceTabKey): void {
    switch (tab) {
      case 'notes':
        this.loadPatientUpdates();
        break;
      case 'history':
        this.loadPatientUpdates();
        break;
      case 'admission-plan':
        this.loadAdmissionPlan();
        break;
      case 'orders':
      case 'lab':
      case 'procedures':
        this.ensureDoctors();
        break;
      default:
        break;
    }
  }

  loadPatientUpdates(force = false): void {
    if (this.updatesState.loading || (this.updatesRequested && !force && !this.updatesState.failed)) {
      return;
    }
    this.updatesRequested = true;
    this.updatesState.loading = true;
    this.updatesState.failed = false;

    this.backend.getPatientUpdates(this.admissionId).subscribe({
      next: (data) => {
        this.patientUpdates = (data.items || []) as unknown as WardPatientUpdateItem[];
        this.updatesState.loading = false;
      },
      error: () => {
        this.patientUpdates = [];
        this.updatesState.loading = false;
        this.updatesState.failed = true;
      },
    });
  }

  /** Previous admissions are only fetched when the nurse asks for lifetime history. */
  loadPreviousAdmissions(): void {
    const patientId = this.patient?.patientId;
    if (!patientId || this.admissionHistoryState.loading) {
      return;
    }
    this.admissionHistoryState.loading = true;
    this.admissionHistoryState.failed = false;

    this.backend.getPatientAdmissionHistory(patientId, this.admissionId).subscribe({
      next: (data) => {
        this.admissionHistory = (data.items || []) as unknown as WardAdmissionHistoryItem[];
        this.admissionHistoryState.loading = false;
      },
      error: () => {
        this.admissionHistory = [];
        this.admissionHistoryState.loading = false;
        this.admissionHistoryState.failed = true;
      },
    });
  }

  toggleHistoryScope(): void {
    this.historyIncludePrevious = !this.historyIncludePrevious;
    if (this.historyIncludePrevious && !this.admissionHistory.length) {
      this.loadPreviousAdmissions();
    }
  }

  loadAdmissionPlan(): void {
    const recommendationId = String(this.allotment?.admissionRecommendationId || '').trim();
    if (!recommendationId) {
      this.admissionRecommendation = null;
      return;
    }
    if (this.planState.loading) {
      return;
    }
    this.planState.loading = true;
    this.planState.failed = false;

    this.backend.getAdmissionRecommendation(recommendationId).subscribe({
      next: (record: Record<string, unknown>) => {
        this.admissionRecommendation = mapAdmissionRecommendationRecord(record);
        this.planState.loading = false;
      },
      error: () => {
        this.admissionRecommendation = null;
        this.planState.loading = false;
        this.planState.failed = true;
      },
    });
  }

  /** Operation detail stays in the operations module — this is a read-only pointer. */
  loadOperation(patientId: string): void {
    if (!patientId || this.operationState.loading) {
      return;
    }
    this.operationState.loading = true;
    this.operationState.failed = false;

    this.backend.getOperationSchedules({ patientId, limit: 20 }).subscribe({
      next: (result) => {
        this.operation = this.pickLinkedOperation(result.items || []);
        this.operationState.loading = false;
      },
      error: () => {
        this.operation = null;
        this.operationState.loading = false;
        this.operationState.failed = true;
      },
    });
  }

  private pickLinkedOperation(items: OperationSchedule[]): WardOperationSummary | null {
    const admissionId = this.admissionId;
    const linked =
      items.find((item) => String(item.roomAllotmentId || '') === admissionId) ||
      items
        .filter((item) => item.status !== 'cancelled')
        .sort(
          (left, right) =>
            new Date(right.scheduledStart || 0).getTime() - new Date(left.scheduledStart || 0).getTime()
        )[0];

    if (!linked) {
      return null;
    }

    const site = [linked.operativeSite?.region, linked.operativeSite?.specificSite, linked.operativeLaterality]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' · ');

    return {
      id: String(linked._id),
      procedure:
        linked.treatmentCatalog?.name ||
        linked.treatmentPricingSnapshot?.name ||
        linked.operationNo ||
        'Scheduled operation',
      status: String(linked.status || ''),
      statusLabel: OPERATION_STATUS_LABELS[String(linked.status || '')] || String(linked.status || '—'),
      siteLabel: site,
      scheduledAt: String(linked.scheduledStart || ''),
      surgeon: linked.assignedOperatingDoctor?.user?.name || '',
      route: `/operations?operationId=${linked._id}`,
    };
  }

  private ensureDoctors(): void {
    if (this.doctorsRequested) {
      return;
    }
    this.doctorsRequested = true;
    this.backend.getDoctors({ limit: 100 }).subscribe({
      next: (result) => {
        this.doctors = result?.items || [];
      },
      error: () => {
        this.doctors = [];
      },
    });
  }

  reloadMarPanel(): void {
    this.reloadDetail();
  }

  refreshChartModules(): void {
    this.reloadDetail();
  }

  /* ------------------------------------------------------------------- tabs */

  get admissionId(): string {
    return this.route.snapshot.paramMap.get('admissionId') || '';
  }

  get visiblePrimaryTabs(): WardWorkspaceTab[] {
    return this.primaryTabs.filter((tab) => this.isTabAvailable(tab.key));
  }

  get visibleSecondaryTabs(): WardWorkspaceTab[] {
    return this.secondaryTabs.filter((tab) => this.isTabAvailable(tab.key));
  }

  private isTabAvailable(key: WardWorkspaceTabKey): boolean {
    if (key === 'lab') return isLaboratoryModuleEnabled();
    if (key === 'medicines') return isPharmacyModuleEnabled() || isWardModuleEnabled();
    return true;
  }

  get activeTabLabel(): string {
    return wardWorkspaceTabLabel(this.activeTab);
  }

  get isSecondaryTabActive(): boolean {
    return this.visibleSecondaryTabs.some((tab) => tab.key === this.activeTab);
  }

  setTab(tab: string, subTab?: WardIvSubTab): void {
    const next = resolveWardWorkspaceTab(tab);
    if (next !== this.activeTab && !this.confirmLeavingNote()) {
      return;
    }

    if (subTab) {
      this.ivSubTab = subTab;
    } else if (next !== this.activeTab) {
      this.ivSubTab = resolveWardIvSubTab(tab);
    }

    this.activeTab = next;
    this.moreTabsOpen = false;
    if (!this.loadedTabs.has(next)) {
      this.loadedTabs.add(next);
      this.ensureTabData(next);
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: next === 'overview' ? null : next },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setIvSubTab(subTab: WardIvSubTab): void {
    this.ivSubTab = subTab;
  }

  isTabLoaded(tab: WardWorkspaceTabKey): boolean {
    return this.loadedTabs.has(tab);
  }

  toggleMoreTabs(): void {
    this.moreTabsOpen = !this.moreTabsOpen;
  }

  toggleKeyboardHint(): void {
    this.keyboardHintOpen = !this.keyboardHintOpen;
  }

  backToOverview(): void {
    this.setTab('overview');
  }

  leaveWorkspace(): void {
    if (!this.confirmLeavingNote()) {
      return;
    }
    void this.router.navigate(['/ward/patient-list']);
  }

  /* --------------------------------------------------------- quick actions */

  get quickActions(): WardQuickAction[] {
    return buildWardQuickActions({
      permissions: this.permissions,
      wardEnabled: isWardModuleEnabled(),
      pharmacyEnabled: isPharmacyModuleEnabled(),
      laboratoryEnabled: isLaboratoryModuleEnabled(),
    });
  }

  isQuickActionFocused(action: WardQuickAction): boolean {
    return this.quickActions[this.stickyActionIndex]?.id === action.id;
  }

  runQuickAction(action: WardQuickAction): void {
    if (action.confirm && !this.confirmAction(action)) {
      return;
    }

    switch (action.id) {
      case 'new-order':
      case 'medicine-lab':
        this.openDoctorOrder();
        return;
      case 'transfer-bed':
        void this.router.navigate(['/ward/bed-management'], {
          queryParams: {
            admissionId: this.admissionId,
            bedNo: this.patient?.bedNo || undefined,
            patientName: this.patient?.patientName || undefined,
          },
        });
        return;
      case 'round-note':
        this.noteKind = 'round';
        this.setTab('notes');
        return;
      case 'add-nursing-note':
        this.noteKind = 'nursing';
        this.setTab('notes');
        return;
      default:
        break;
    }

    if (action.tab) {
      this.setTab(action.tab, action.subTab);
    }
  }

  private confirmAction(action: WardQuickAction): boolean {
    const messages: Partial<Record<WardQuickAction['id'], string>> = {
      'discharge-recommendation': 'Start the discharge recommendation for this patient?',
      'transfer-bed': 'Move to bed management to transfer this patient?',
    };
    return this.confirmMessage(messages[action.id] || 'Continue?');
  }

  /* -------------------------------------------------------------- overview */

  get lengthOfStayLabel(): string {
    if (!this.patient?.admittedOn) return '—';
    const start = new Date(this.patient.admittedOn).getTime();
    const days = Math.max(1, Math.ceil((Date.now() - start) / 86400000));
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  get admissionReason(): string {
    return (
      String(this.allotment?.admissionReason || '').trim() ||
      String(this.admissionRecommendation?.reason || '').trim() ||
      ''
    );
  }

  get allergyWarning(): string {
    const value = String(this.patient?.allergies || '').trim();
    return value && !/^none$/i.test(value) ? value : '';
  }

  get latestVitalsRow(): WardModuleRow | null {
    return this.vitalsRows[0] || null;
  }

  get dueMedicationCount(): number {
    const due = this.marRows.filter((row) => /due|missed/i.test(String(row.cells['status'] || ''))).length;
    return due || Number(this.patient?.medicationsDue || 0);
  }

  get activeDripCount(): number {
    const running = this.dripRows.filter((row) => /running/i.test(String(row.cells['status'] || ''))).length;
    return running || Number(this.patient?.dripsRunning || 0);
  }

  get pendingOrderCount(): number {
    return this.orderRows.filter((row) => /pending|in progress/i.test(String(row.cells['status'] || ''))).length;
  }

  get outstandingTaskCount(): number {
    const due = this.nursingRows.filter((row) => row.cells['_tab'] === 'due').length;
    return due || Number(this.patient?.nursingTasksDue || 0);
  }

  get latestImportantNote(): WardNoteItem | null {
    const notes = this.noteItems;
    return notes.find((note) => note.important) || notes[0] || null;
  }

  get dischargeStatusLabel(): string {
    if (!this.patient) return '—';
    return this.patient.status === 'dischargePlanned' ? 'Discharge planned' : 'Active inpatient';
  }

  get overviewAlerts(): Array<{ icon: string; text: string }> {
    const alerts: Array<{ icon: string; text: string }> = [];
    if (this.allergyWarning) {
      alerts.push({ icon: 'fa-ban', text: `Allergy: ${this.allergyWarning}` });
    }
    if (Number(this.patient?.criticalAlerts || 0) > 0) {
      alerts.push({
        icon: 'fa-exclamation-triangle',
        text: `${this.patient?.criticalAlerts} critical alert(s) on this patient`,
      });
    }
    if (this.patient?.status === 'critical') {
      alerts.push({ icon: 'fa-heartbeat', text: 'Patient flagged critical — review vitals' });
    }
    if (!this.patient?.nurseName) {
      alerts.push({ icon: 'fa-user-times', text: 'No nurse assigned to this bed' });
    }
    return alerts;
  }

  /* ----------------------------------------------------------------- notes */

  get noteItems(): WardNoteItem[] {
    const fromNursing = this.nursingRows.map((row) => {
      const priority = String(row.cells['priority'] || '');
      const status = String(row.cells['status'] || 'Recorded');
      return {
        id: `nursing-${row.id}`,
        kind: 'nursing' as WardNoteKind,
        kindLabel: 'Nursing',
        title: String(row.cells['task'] || 'Nursing note'),
        detail: priority ? `Priority ${priority}` : '',
        author: String(row.cells['nurse'] || '') === '—' ? '' : String(row.cells['nurse'] || ''),
        timeLabel: String(row.cells['dueAt'] || ''),
        status,
        statusIcon: wardHistoryStatusIcon(status),
        important: /high|critical/i.test(priority),
      };
    });

    const fromHandover = this.handoverRows.map((row) => {
      const status = String(row.cells['status'] || 'Recorded');
      return {
        id: `handover-${row.id}`,
        kind: 'handover' as WardNoteKind,
        kindLabel: 'Handover',
        title: `Handover — ${String(row.cells['shift'] || 'shift')}`,
        detail: String(row.cells['condition'] || ''),
        author: String(row.cells['nurse'] || ''),
        timeLabel: String(row.cells['updatedAt'] || ''),
        status,
        statusIcon: wardHistoryStatusIcon(status),
        important: Boolean(String(row.cells['risk'] || '').trim()) && row.cells['risk'] !== '—',
      };
    });

    const fromUpdates = this.patientUpdates
      .filter((update) => /note|round|order|plan/i.test(`${update.type} ${update.title}`))
      .map((update) => ({
        id: `update-${update.id}`,
        kind: 'doctor' as WardNoteKind,
        kindLabel: 'Doctor / Round',
        title: update.title || 'Doctor note',
        detail: update.description || '',
        author: update.recommendedBy || update.performedBy || '',
        timeLabel: update.timestamp || '',
        status: update.status || 'Recorded',
        statusIcon: wardHistoryStatusIcon(update.status),
        important: /critical|stat|urgent/i.test(`${update.status} ${update.title}`),
      }));

    return [...fromNursing, ...fromHandover, ...fromUpdates].sort(
      (left, right) => this.timeValue(right.timeLabel) - this.timeValue(left.timeLabel)
    );
  }

  get filteredNotes(): WardNoteItem[] {
    return this.noteFilter === 'all'
      ? this.noteItems
      : this.noteItems.filter((note) => note.kind === this.noteFilter);
  }

  get noteDirty(): boolean {
    return this.noteText.trim().length > 0;
  }

  get noteAuthorLabel(): string {
    return readCurrentUserName() || 'Current user';
  }

  get canWriteRoundNote(): boolean {
    return this.hasPerm('prescriptions.create') || isDoctorRole(readStoredRole());
  }

  get canWriteNursingNote(): boolean {
    return isWardModuleEnabled() && (this.hasPerm('ward.create') || this.hasPerm('ward.update'));
  }

  get canCreateAttendantTask(): boolean {
    return this.canWriteNursingNote || this.canWriteRoundNote;
  }

  get handoverSnapshot(): WardHandoverSnapshotLine[] {
    return buildWardHandoverSnapshot({
      vitals: this.vitalsRows,
      medications: this.marRows,
      drips: this.dripRows,
      orders: this.orderRows,
      nursing: this.nursingRows,
    });
  }

  get attendantDirty(): boolean {
    return Boolean(
      this.attendantDestination.trim() || this.attendantInstruction.trim() || this.attendantDueAt
    );
  }

  submitNote(): void {
    const text = this.noteText.trim();
    if (!text || !this.patient) {
      return;
    }

    this.noteSaving = true;
    const isHandover = this.noteKind === 'handover';
    const isRound = this.noteKind === 'round';

    if (isHandover) {
      // Snapshot lines are display-only. Persist only the nurse narrative + author —
      // never freeze live vitals/MAR/IV/order values into the handover record.
      this.wardData
        .submitModuleAction('shift-handover', {
          patientId: this.patient.patientId,
          admissionId: this.admissionId,
          title: `Handover — ${this.noteAuthorLabel}`,
          description: text,
          shift: 'day',
          nurseName: this.noteAuthorLabel,
          patientCondition: text,
        })
        .subscribe({
          next: () => {
            this.noteSaving = false;
            this.noteText = '';
            this.toastr.success('Handover note saved.');
            this.reloadDetail();
          },
          error: (err) => {
            this.noteSaving = false;
            this.toastr.error(err?.error?.message || 'Unable to save the handover note.');
          },
        });
      return;
    }

    this.wardData
      .submitModuleAction('nursing-care', {
        patientId: this.patient.patientId,
        admissionId: this.admissionId,
        title: text.slice(0, 60),
        description: text,
        priority: this.noteCategory === 'critical' ? 'high' : 'normal',
        shift: 'day',
        noteType: isRound ? 'round' : this.noteCategory,
        activityType: this.noteCategory === 'care_plan' ? 'care_plan' : 'nursing_task',
      })
      .subscribe({
        next: () => {
          this.noteSaving = false;
          this.noteText = '';
          this.noteCategory = 'routine';
          this.toastr.success(isRound ? 'Round note saved.' : 'Nursing note saved.');
          this.reloadDetail();
        },
        error: (err) => {
          this.noteSaving = false;
          this.toastr.error(err?.error?.message || 'Unable to save the note.');
        },
      });
  }

  submitAttendantTask(): void {
    if (!this.patient || this.attendantSaving) {
      return;
    }
    const taskType = this.attendantTaskType;
    const title =
      ATTENDANT_TASK_TYPE_LABELS[taskType] ||
      this.attendantInstruction.trim() ||
      'Ward task';
    this.attendantSaving = true;
    this.wardData
      .createAttendantTask({
        patientId: this.patient.patientId,
        admissionId: this.admissionId,
        taskType,
        title,
        instruction: this.attendantInstruction.trim(),
        fromLocation: `${this.patient.wardName || 'Ward'} · ${this.patient.bedNo || ''}`.trim(),
        toLocation: this.attendantDestination.trim(),
        dueAt: this.attendantDueAt || undefined,
        priority: this.attendantPriority,
      })
      .subscribe({
        next: () => {
          this.attendantSaving = false;
          this.attendantDestination = '';
          this.attendantInstruction = '';
          this.attendantDueAt = '';
          this.attendantFormOpen = false;
          this.toastr.success('Attendant task created.');
        },
        error: (err) => {
          this.attendantSaving = false;
          this.toastr.error(err?.error?.message || 'Unable to create the task.');
        },
      });
  }

  discardNote(): void {
    if (!this.noteDirty || this.confirmMessage('Discard this unsaved note?')) {
      this.noteText = '';
    }
  }

  /* --------------------------------------------------------------- history */

  get historyEntries(): WardHistoryEntry[] {
    return buildWardHistoryEntries({
      vitals: this.vitalsRows,
      medications: this.marRows,
      drips: this.dripRows,
      io: this.ioRows,
      orders: this.orderRows,
      nursing: this.nursingRows,
      handover: this.handoverRows,
      updates: this.patientUpdates,
      operations: this.operation ? [this.operation] : [],
      admissions: this.historyIncludePrevious ? this.admissionHistory : [],
    });
  }

  get filteredHistory(): WardHistoryEntry[] {
    return filterWardHistoryEntries(this.historyEntries, this.historyFilter);
  }

  historyCount(filter: WardHistoryFilter): number {
    return filterWardHistoryEntries(this.historyEntries, filter).length;
  }

  setHistoryFilter(filter: WardHistoryFilter): void {
    this.historyFilter = filter;
  }

  /* -------------------------------------------------------------- keyboard */

  readonly onPageKeydown = (event: KeyboardEvent): boolean => {
    if (isEditableTarget(event.target) && !isModKey(event) && event.key !== 'Escape') {
      return false;
    }

    if (event.key === '?' && !isEditableTarget(event.target) && !event.ctrlKey && !event.metaKey) {
      this.keyboardHintOpen = !this.keyboardHintOpen;
      return true;
    }

    if (isModKey(event) && !event.shiftKey && !event.altKey) {
      const digit = Number(event.key);
      if (digit >= 1 && digit <= 9) {
        const tab = this.visiblePrimaryTabs[digit - 1];
        if (tab) {
          this.setTab(tab.key);
          return true;
        }
      }
    }

    if (!isEditableTarget(event.target) && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      const actions = this.quickActions;
      if (!actions.length) {
        return false;
      }
      if (event.key === 'ArrowDown') {
        this.stickyActionIndex = Math.min(this.stickyActionIndex + 1, actions.length - 1);
      } else {
        this.stickyActionIndex = Math.max(this.stickyActionIndex - 1, 0);
      }
      return true;
    }

    if (!isEditableTarget(event.target) && event.key === 'Enter') {
      const action = this.quickActions[this.stickyActionIndex];
      if (action) {
        this.runQuickAction(action);
        return true;
      }
    }

    return false;
  };

  readonly onPageEscape = (): boolean => {
    if (this.keyboardHintOpen) {
      this.keyboardHintOpen = false;
      return true;
    }
    if (this.moreTabsOpen) {
      this.moreTabsOpen = false;
      return true;
    }
    if (this.doctorOrderOpen) {
      this.doctorOrderOpen = false;
      return true;
    }
    if (this.ioEntryOpen) {
      this.ioEntryOpen = false;
      return true;
    }
    return false;
  };

  /* ------------------------------------------------------------ permissions */

  get canVitals(): boolean {
    return this.hasPerm('ward.create') || this.hasPerm('ward.read');
  }

  get canDoctorOrder(): boolean {
    return isWardModuleEnabled() && (this.hasPerm('ward.create') || isDoctorRole(readStoredRole()));
  }

  get canMar(): boolean {
    return isWardModuleEnabled() && this.hasPerm('ward.read');
  }

  get canPharmacyRequest(): boolean {
    return isPharmacyModuleEnabled() && this.hasPerm('ward.create');
  }

  get canLab(): boolean {
    return isLaboratoryModuleEnabled() && (this.hasPerm('lab_orders.create') || isDoctorRole(readStoredRole()));
  }

  get canImaging(): boolean {
    return isWardModuleEnabled() && this.canDoctorOrder;
  }

  get canBilling(): boolean {
    return this.hasPerm('ward.billing.read') || this.hasPerm('encounters.read');
  }

  get canPayment(): boolean {
    return this.hasPerm('ledger_payments.create') || this.hasPerm('ward.payments.collect');
  }

  get canDischarge(): boolean {
    return this.hasPerm('ward.discharge.create') || this.hasPerm('room_allotments.update');
  }

  private hasPerm(permission: string): boolean {
    return this.permissions.includes('*') || hasPermission(permission, this.permissions);
  }

  /* ------------------------------------------------------------------ rows */

  get imagingRows(): WardModuleRow[] {
    return this.orderRows.filter((row) =>
      /imaging|x-ray|xray|ultrasound|ct|mri|radiology/i.test(`${row.cells['order'] || ''} ${this.rowTitle(row)}`)
    );
  }

  get labRows(): WardModuleRow[] {
    return this.orderRows.filter((row) => /lab/i.test(`${row.cells['order'] || ''} ${this.rowTitle(row)}`));
  }

  rowTitle(row: WardModuleRow): string {
    return String(
      row.cells['task'] ||
        row.cells['medicine'] ||
        row.cells['fluid'] ||
        row.cells['order'] ||
        row.cells['patient'] ||
        row.cells['bp'] ||
        'Record'
    );
  }

  rowStatus(row: WardModuleRow): string {
    return String(row.cells['status'] || row.cells['dueTime'] || row.cells['recordedAt'] || row.cells['updatedAt'] || '');
  }

  statusIcon(status: string): string {
    return wardHistoryStatusIcon(status);
  }

  /* --------------------------------------------------------------- display */

  onPatientDischarged(): void {
    this.patient = null;
  }

  ageLabel(patient: WardPatient): string {
    return patient.age > 0 ? `${patient.age} years` : '—';
  }

  genderLabel(patient: WardPatient): string {
    return patient.sex === 'F' ? 'Female' : patient.sex === 'M' ? 'Male' : '—';
  }

  doctorOrderPatientMeta(patient: WardPatient): string {
    const parts = [this.genderLabel(patient), this.ageLabel(patient)].filter((part) => part && part !== '—');
    const base = parts.join(', ');
    return patient.bloodGroup ? `${base} | ${patient.bloodGroup}` : base;
  }

  openDoctorOrder(): void {
    this.ensureDoctors();
    this.doctorOrderOpen = true;
  }

  onDoctorOrderSaved(): void {
    this.reloadDetail();
  }

  /** Uses the existing ward I/O action path — no new persistence route. */
  openIoEntry(): void {
    this.ioEntryOpen = true;
  }

  onIoEntrySaved(): void {
    this.ioEntryOpen = false;
    this.reloadDetail();
  }

  get chartActionPreset(): Record<string, string | number> {
    return {
      admissionId: this.admissionId,
      patientId: this.patient?.patientId || '',
    };
  }

  navigateAction(path: string): void {
    if (!this.confirmLeavingNote()) {
      return;
    }
    if (path.startsWith('/')) {
      void this.router.navigateByUrl(path);
      return;
    }
    this.navigate(path);
  }

  navigate(path: string): void {
    if (!this.patient) return;
    void this.router.navigate([path], {
      queryParams: {
        admissionId: this.patient.admissionId,
        patientId: this.patient.patientId,
        patientName: this.patient.patientName,
        wardName: this.patient.wardName,
      },
    });
  }

  statusLabel(status: WardPatient['status']): string {
    const labels: Record<WardPatient['status'], string> = {
      stable: 'Admitted — Stable',
      watch: 'Admitted — Watch',
      critical: 'Admitted — Critical',
      dischargePlanned: 'Ready for Discharge',
      pendingAssignment: 'Pending Assignment',
    };
    return labels[status];
  }

  statusClass(status: WardPatient['status']): string {
    return `hms-status-chip ward-badge ward-badge--${status}`;
  }

  patientStatusIcon(status: WardPatient['status']): string {
    switch (status) {
      case 'critical':
        return 'fa-exclamation-triangle';
      case 'watch':
        return 'fa-eye';
      case 'dischargePlanned':
        return 'fa-sign-out';
      case 'pendingAssignment':
        return 'fa-clock-o';
      default:
        return 'fa-check-circle';
    }
  }

  patientInitials(patient: WardPatient): string {
    const parts = String(patient.patientName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  admissionPlanStatusLabel(status?: string): string {
    return admissionRecommendationStatusLabel(status);
  }

  admissionTreatmentPlan(rec: AdmissionRecommendationRecord): string {
    return admissionSnapshotText(rec.clinicalSnapshot, 'treatmentPlan', 'plan');
  }

  admissionHandoverInstructions(rec: AdmissionRecommendationRecord): string {
    return admissionHandoverText(rec.clinicalSnapshot);
  }

  updateIcon(type: string): string {
    switch (type) {
      case 'lab':
        return 'fa-flask';
      case 'pharmacy':
        return 'fa-medkit';
      case 'mar':
        return 'fa-check-circle';
      case 'imaging':
        return 'fa-picture-o';
      default:
        return 'fa-info-circle';
    }
  }

  private timeValue(value: string): number {
    const parsed = new Date(String(value || '')).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private confirmLeavingNote(): boolean {
    if (this.noteDirty) {
      return this.confirmMessage('You have an unsaved note. Leave without saving?');
    }
    if (this.attendantDirty) {
      return this.confirmMessage('You have an unsaved attendant task. Leave without saving?');
    }
    return true;
  }

  private confirmMessage(message: string): boolean {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return true;
    }
    return window.confirm(message);
  }

  /* ------------------------------------------------------------- documents */

  private wardDocumentPatient(): { firstName?: string; lastName?: string; patientNo?: string } | null {
    if (!this.patient) return null;
    return {
      firstName: this.patient.patientName,
      lastName: '',
      patientNo: this.patient.mrn,
    };
  }

  buildPatientSummaryDocument = (): string =>
    buildWardPatientSummaryDocumentHtml({
      patient: this.wardDocumentPatient(),
      admissionNo: this.patient?.admissionNo,
      wardLabel: this.patient?.wardName,
      roomBed: `${this.patient?.roomName || ''}${this.patient?.bedNo ? ' / ' + this.patient?.bedNo : ''}`.trim(),
      consultantName: this.patient?.doctorName,
      assignedNurse: this.patient?.nurseName,
      diagnosis: this.patient?.diagnosis,
      allergies: this.patient?.allergies ? [this.patient.allergies] : [],
      vitals: this.vitalsRows.map((row) => row.cells as Record<string, unknown>),
      activeMedicines: this.marRows.map((row) => this.rowTitle(row)),
      doctorOrders: this.orderRows.map((row) => this.rowTitle(row)),
      pendingLaboratory: this.orderRows.filter((row) => /lab/i.test(this.rowTitle(row))).map((row) => this.rowTitle(row)),
      pendingImaging: this.imagingRows.map((row) => this.rowTitle(row)),
      procedures: this.orderRows.filter((row) => /procedure|operation/i.test(this.rowTitle(row))).map((row) => this.rowTitle(row)),
      nursingNotes: this.nursingRows.map((row) => this.rowTitle(row)),
      hospital: readStoredHospitalDocumentInfo(),
      generatedBy: readCurrentUserName(),
    });

  buildVitalsDocument = (): string =>
    buildVitalsSummaryDocumentHtml({
      patient: this.wardDocumentPatient(),
      admissionNo: this.patient?.admissionNo,
      vitals: this.vitalsRows.map((row) => row.cells as Record<string, unknown>),
      hospital: readStoredHospitalDocumentInfo(),
      generatedBy: readCurrentUserName(),
    });

  buildProcedureDocument = (): string =>
    buildProcedureSummaryDocumentHtml({
      patient: this.wardDocumentPatient(),
      admissionNo: this.patient?.admissionNo,
      rows: this.orderRows.filter((row) => /procedure|operation/i.test(this.rowTitle(row))) as unknown as Array<Record<string, unknown>>,
      hospital: readStoredHospitalDocumentInfo(),
      generatedBy: readCurrentUserName(),
    });

  buildImagingDocument = (): string => {
    const row = this.imagingRows[0];
    if (!row) return '';
    return buildImagingOrderFromWardRow({
      row: row as unknown as Record<string, unknown>,
      patient: this.wardDocumentPatient(),
      admissionNo: this.patient?.admissionNo,
      wardLabel: this.patient?.wardName,
      roomBed: `${this.patient?.roomName || ''}${this.patient?.bedNo ? ' / ' + this.patient?.bedNo : ''}`.trim(),
      hospital: readStoredHospitalDocumentInfo(),
      generatedBy: readCurrentUserName(),
    });
  };
}
