import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { buildDutyRosterDocumentHtml } from '../../../core/documents/duty-roster-document.builder';
import { readCurrentUserName, readStoredHospitalDocumentInfo } from '../../../core/utils/hms-document-context.util';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import { hasPermission } from '../../auth/access-control';
import { isClinicalModuleEnabled, isLaboratoryModuleEnabled, isPharmacyModuleEnabled, isWardModuleEnabled } from '../../auth/hospital-modules';
import {
  ELIGIBLE_STAFF_PAGE_SIZE,
  ROSTER_SHIFT_TIMES,
  RankedStaff,
  RosterCoverageRow,
  RosterGroupBy,
  RosterWeekMatrix,
  buildRosterWeekMatrix,
  calculateCoverage,
  coverageDonutStyle,
  coverageTotals,
  expandBulkDates,
  filterRankedStaff,
  initialExpandedTreeIds,
  normalizeRosterGroupBy,
  rankEligibleStaff,
  shouldRunBulkPreview,
  staffDisplayNo,
  staffIdOf,
  toYmd,
  weekDatesFrom,
} from './duty-roster.util';

interface TreeNode {
  id: string;
  label: string;
  type: string;
  wardId?: string;
  roomId?: string;
  departmentId?: string;
  children?: TreeNode[];
}

interface BulkPreviewRow {
  staffName: string;
  role: string;
  area: string;
  shift: string;
  date: string;
  time: string;
  conflict: boolean;
  conflictText: string;
  payload: Record<string, unknown>;
}

const TUTORIAL_STEPS = [
  { target: 'date', text: 'Choose the day or week you want to schedule.' },
  { target: 'tree', text: 'Select a Ward, Room, Department, OPD area, Laboratory or Pharmacy.' },
  { target: 'coverage', text: 'Required shows how many staff you need. Assigned shows how many are scheduled. Open shows what is still missing.' },
  { target: 'open-position', text: 'Click an open position or Set Coverage if this shift has no requirement yet.' },
  { target: 'staff', text: 'Available staff are shown first. Conflicting assignments are clearly marked.' },
  { target: 'draft', text: 'Save changes while you continue building the roster.' },
  { target: 'publish', text: 'Publish the roster when it is ready for staff.' },
];

const TUTORIAL_STORAGE = 'hms-duty-roster-tutorial-seen';

@Component({
  selector: 'app-ward-duty-roster',
  standalone: true,
  imports: [CommonModule, FormsModule, HmsDocumentToolbarComponent],
  templateUrl: './ward-duty-roster.component.html',
  styleUrl: './ward-duty-roster.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardDutyRosterComponent implements OnInit, OnDestroy {
  private readonly backend = inject(BackendService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly load$ = new Subject<void>();
  private previousBodyOverflow = '';
  private rankedStaff: RankedStaff[] = [];
  private assignmentIndexStamp = '';

  loading = false;
  saving = false;
  drawerBusy = false;
  selectedDate = new Date().toISOString().slice(0, 10);
  viewMode: 'tree' | 'list' | 'day' | 'week' = 'tree';
  groupBy: RosterGroupBy = 'shift';
  selectedShift = 'morning';
  selectedNode: TreeNode = { id: 'hospital', label: 'Hospital', type: 'HOSPITAL' };
  tree: TreeNode[] = [];
  assignments: Array<Record<string, unknown>> = [];
  staff: Array<Record<string, unknown>> = [];
  wardsCatalog: Array<Record<string, unknown>> = [];
  departmentsCatalog: Array<Record<string, unknown>> = [];
  weekMatrix: RosterWeekMatrix = {
    groupBy: 'area',
    from: '',
    to: '',
    days: [],
    label: 'Hospital Area',
    rows: [],
  };
  expandedMatrixGroups = new Set<string>(['root']);
  matrixPopover: {
    day: string;
    dateLabel: string;
    areaId: string;
    areaLabel: string;
    shift: string;
    shiftLabel: string;
    timeLabel: string;
    total: number;
    moreCount: number;
    preview: Array<Record<string, unknown>>;
    all: Array<Record<string, unknown>>;
  } | null = null;
  coverageRows: RosterCoverageRow[] = [];
  coverageSummary = coverageTotals([]);
  donutStyle = coverageDonutStyle(this.coverageSummary);
  scopedRows: Array<Record<string, unknown>> = [];
  selectedRowIds = new Set<string>();
  requirements: Array<{ role: string; requiredCount: number; shift?: string; areaId?: string; areaType?: string; dayOfWeek?: number }> = [];
  kpis = { onDuty: 0, openShifts: 0, nurses: 0, pending: 0 };
  treeSearch = '';
  staffSearch = '';
  tableSearch = '';
  weekFrom = '';
  weekTo = '';
  weekDays: string[] = [];
  breadcrumb = ['Home', 'Duty Roster'];
  expandedIds = new Set(initialExpandedTreeIds());
  areaCounts = new Map<string, number>();

  myDutyOnly = false;
  canCreate = hasPermission('ward.roster.create');
  canUpdate = hasPermission('ward.roster.update');
  readonly shifts = ['morning', 'afternoon', 'night'] as const;
  readonly weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly bulkRoles = ['All Roles', 'Doctor', 'Nurse', 'Reception', 'Lab', 'Pharmacy', 'Support'];
  readonly groupByOptions: Array<{ value: RosterGroupBy; label: string }> = [
    { value: 'shift', label: 'Shift' },
    { value: 'area', label: 'Area' },
    { value: 'department', label: 'Department' },
    { value: 'ward', label: 'Ward' },
    { value: 'role', label: 'Role' },
    { value: 'staff', label: 'Staff' },
  ];

  showDrawer = false;
  drawerMode: 'assign' | 'bulk' = 'assign';
  drawerStep = 1;
  notes = '';
  assignRole = 'Nurse';
  visibleStaff: RankedStaff[] = [];
  selectedStaffIds = new Set<string>();
  staffError = false;
  staffLoading = false;

  bulkDays: number[] = [0, 1, 2, 3, 4];
  bulkUseRange = false;
  bulkFrom = '';
  bulkTo = '';
  bulkPreview: BulkPreviewRow[] = [];
  previewRequestCount = 0;

  showCoverage = false;
  coverageRole = 'Nurse';
  coverageRequired = 1;
  coverageSaving = false;

  copyPreview: Record<string, unknown> | null = null;
  tutorialActive = false;
  tutorialOffer = false;
  tutorialIndex = 0;
  tutorialStyle: Record<string, string> = {};
  readonly tutorialSteps = TUTORIAL_STEPS;
  rosterDocumentHtml = () => this.buildRosterHtml();

  ngOnInit(): void {
    this.myDutyOnly = !this.canCreate && !this.canUpdate;
    this.refreshWeekWindow();
    this.bulkFrom = this.weekFrom;
    this.bulkTo = this.weekTo;
    this.load$.pipe(
      switchMap(() => {
        this.loading = true;
        this.cdr.markForCheck();
        return this.backend.getDutyRosterBootstrap({
          from: this.weekFrom,
          to: this.weekTo,
          groupBy: this.groupBy === 'shift' ? 'area' : this.groupBy,
        }).pipe(
          catchError(() =>
            this.backend.listWardRoster({ from: this.weekFrom, to: this.weekTo }).pipe(
              catchError(() => of([])),
              switchMap((items) =>
                of({
                  wards: [],
                  rooms: [],
                  departments: [],
                  assignments: items || [],
                  coverage: this.requirements,
                  staff: this.staff,
                } as Record<string, unknown>)
              )
            )
          ),
          finalize(() => {
            this.loading = false;
            this.cdr.markForCheck();
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((data) => this.applyBootstrap(data));
    this.load();
    if (this.canCreate && !localStorage.getItem(TUTORIAL_STORAGE)) {
      this.tutorialOffer = true;
    }
  }

  ngOnDestroy(): void {
    this.unlockBody();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showCoverage) {
      this.showCoverage = false;
      this.unlockBody();
      this.cdr.markForCheck();
      return;
    }
    if (this.showDrawer) this.closeDrawer();
  }

  get shiftTimes() {
    return this.timesFor(this.selectedShift);
  }

  get rosterDocTitle(): string {
    return this.viewMode === 'week' ? 'Duty Roster — Weekly' : 'Duty Roster — Daily';
  }

  get rosterDocFilename(): string {
    return this.viewMode === 'week' ? `duty-roster-week-${this.weekFrom}.pdf` : `duty-roster-${this.selectedDate}.pdf`;
  }

  get rosterDocOrientation() {
    return this.viewMode === 'week' ? 'landscape' : 'portrait';
  }

  get tutorialText(): string {
    return this.tutorialSteps[this.tutorialIndex]?.text || '';
  }

  get drawerTitle(): string {
    return this.drawerMode === 'bulk' ? 'Bulk Assign Staff' : 'Assign Staff';
  }

  get selectedStaffCount(): number {
    return this.selectedStaffIds.size;
  }

  get hasCoverageRequirement(): boolean {
    return this.coverageRows.some((row) => row.required > 0);
  }

  timesFor(shift: string) {
    return ROSTER_SHIFT_TIMES[shift] || ROSTER_SHIFT_TIMES['morning'];
  }

  shiftLabel(shift: string): string {
    return ROSTER_SHIFT_TIMES[shift]?.label || shift;
  }

  load(): void {
    this.refreshWeekWindow();
    this.load$.next();
  }

  onDateChange(): void {
    this.refreshWeekWindow();
    this.load();
  }

  private applyBootstrap(data: Record<string, unknown>): void {
    const wards = (data['wards'] as Array<Record<string, unknown>>) || [];
    const rooms = (data['rooms'] as Array<Record<string, unknown>>) || [];
    const departments = (data['departments'] as Array<Record<string, unknown>>) || [];
    this.assignments = (data['assignments'] as Array<Record<string, unknown>>) || [];
    this.staff = (data['staff'] as Array<Record<string, unknown>>) || [];
    this.wardsCatalog = wards;
    this.departmentsCatalog = departments;
    this.requirements = (data['coverage'] as typeof this.requirements) || [];
    if (data['weekMatrix'] && typeof data['weekMatrix'] === 'object') {
      this.weekMatrix = data['weekMatrix'] as RosterWeekMatrix;
    }
    this.tree = this.buildTree(wards, rooms, departments);
    this.rankedStaff = [];
    this.assignmentIndexStamp = '';
    this.refreshDerived();
  }

  buildTree(
    wards: Array<Record<string, unknown>>,
    rooms: Array<Record<string, unknown>>,
    departments: Array<Record<string, unknown>>
  ): TreeNode[] {
    const children: TreeNode[] = [];
    if (isWardModuleEnabled()) {
      children.push({
        id: 'wards',
        label: 'Wards',
        type: 'GROUP',
        children: wards.map((ward) => ({
          id: String(ward['_id']),
          label: String(ward['name'] || 'Ward'),
          type: 'WARD',
          wardId: String(ward['_id']),
          children: [
            { id: `${ward['_id']}-level`, label: 'Ward Level', type: 'WARD', wardId: String(ward['_id']) },
            ...rooms
              .filter((room) => String(room['wardId'] || '') === String(ward['_id']))
              .map((room) => ({
                id: String(room['_id']),
                label: String(room['roomNo'] || 'Room'),
                type: 'ROOM',
                wardId: String(ward['_id']),
                roomId: String(room['_id']),
              })),
          ],
        })),
      });
    }
    if (isClinicalModuleEnabled()) {
      children.push({
        id: 'departments',
        label: 'Departments',
        type: 'GROUP',
        children: departments.map((dept) => ({
          id: String(dept['_id']),
          label: String(dept['name'] || 'Department'),
          type: 'DEPARTMENT',
          departmentId: String(dept['_id']),
        })),
      });
      children.push({
        id: 'opd',
        label: 'OPD',
        type: 'GROUP',
        children: [
          { id: 'opd-front-desk', label: 'Front Desk', type: 'OPD' },
          { id: 'opd-consult', label: 'Consultation', type: 'OPD' },
        ],
      });
    }
    if (isLaboratoryModuleEnabled()) children.push({ id: 'lab', label: 'Laboratory', type: 'LABORATORY' });
    if (isPharmacyModuleEnabled()) children.push({ id: 'pharmacy', label: 'Pharmacy', type: 'PHARMACY' });
    children.push({ id: 'support', label: 'Support', type: 'SUPPORT' });
    return [{ id: 'hospital', label: 'Hospital', type: 'HOSPITAL', children }];
  }

  visibleChildren(node: TreeNode): TreeNode[] {
    if (!node.children?.length || !this.isExpanded(node.id)) return [];
    const query = this.treeSearch.trim().toLowerCase();
    if (!query) return node.children;
    return node.children.filter((child) => this.nodeMatches(child, query));
  }

  nodeMatches(node: TreeNode, query: string): boolean {
    if (node.label.toLowerCase().includes(query)) return true;
    return Boolean(node.children?.some((child) => this.nodeMatches(child, query)));
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  toggleExpand(node: TreeNode, event?: Event): void {
    event?.stopPropagation();
    if (!node.children?.length) return;
    if (this.expandedIds.has(node.id)) this.expandedIds.delete(node.id);
    else this.expandedIds.add(node.id);
    this.cdr.markForCheck();
  }

  selectNode(node: TreeNode): void {
    this.selectedNode = node;
    if (node.children?.length) this.expandedIds.add(node.id);
    this.refreshDerived();
  }

  selectShift(shift: string): void {
    this.selectedShift = shift;
    this.refreshDerived();
  }

  shiftCount(date: string, shift: string): number {
    const target = this.normalizeShiftKey(shift);
    return this.assignments.filter(
      (row) =>
        toYmd(row['rosterDate'] as string) === date &&
        this.normalizeShiftKey(row['shift']) === target &&
        row['status'] !== 'cancelled'
    ).length;
  }

  weekShiftPreview(date: string, shift: string): Array<Record<string, unknown>> {
    return this.assignmentsFor(date, shift).slice(0, 8);
  }

  private normalizeShiftKey(shift: unknown): string {
    const value = String(shift || '').toLowerCase();
    return value === 'evening' ? 'afternoon' : value;
  }

  assignmentsFor(date: string, shift: string): Array<Record<string, unknown>> {
    const target = this.normalizeShiftKey(shift);
    return this.assignments.filter(
      (row) =>
        toYmd(row['rosterDate'] as string) === date &&
        this.normalizeShiftKey(row['shift']) === target &&
        row['status'] !== 'cancelled' &&
        this.rowInSelectedArea(row)
    );
  }

  matrixGroupAssignments(day: string, groupId: string, shift: string): Array<Record<string, unknown>> {
    const target = this.normalizeShiftKey(shift);
    return this.assignments.filter((row) => {
      if (toYmd(row['rosterDate'] as string) !== day) return false;
      if (this.normalizeShiftKey(row['shift']) !== target) return false;
      if (row['status'] === 'cancelled') return false;
      return this.rowMatchesMatrixGroup(row, groupId);
    });
  }

  private rowMatchesMatrixGroup(row: Record<string, unknown>, groupId: string): boolean {
    const mode = this.groupBy === 'shift' ? 'area' : this.groupBy;
    if (mode === 'ward') {
      return String(row['wardId'] || row['areaId'] || 'unassigned') === groupId;
    }
    if (mode === 'department') {
      const id = String(row['departmentId'] || (row['areaType'] === 'DEPARTMENT' ? row['areaId'] : '') || 'unassigned');
      return id === groupId;
    }
    if (mode === 'role') {
      return String(row['staffRole'] || 'Staff').trim().toLowerCase() === groupId.toLowerCase();
    }
    if (mode === 'staff') {
      return staffIdOf(row['staffUserId']) === groupId;
    }
    return String(row['areaType'] || 'WARD').toUpperCase() === String(groupId).toUpperCase();
  }

  openMatrixShiftPopover(
    day: string,
    group: { id: string; label: string },
    shift: string,
    event: Event
  ): void {
    event.stopPropagation();
    const all = this.matrixGroupAssignments(day, group.id, shift);
    const times = this.timesFor(shift);
    const date = new Date(`${day}T00:00:00`);
    this.matrixPopover = {
      day,
      dateLabel: date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
      areaId: group.id,
      areaLabel: group.label,
      shift,
      shiftLabel: this.shiftLabel(shift),
      timeLabel: `${times.startTime} – ${times.endTime}`,
      total: all.length,
      moreCount: Math.max(0, all.length - 8),
      preview: all.slice(0, 8),
      all,
    };
    this.cdr.markForCheck();
  }

  closeMatrixPopover(): void {
    this.matrixPopover = null;
    this.cdr.markForCheck();
  }

  viewAllMatrixStaff(): void {
    const pop = this.matrixPopover;
    if (!pop) return;
    this.selectedDate = pop.day;
    this.selectedShift = pop.shift;
    this.selectMatrixCell(pop.day, pop.areaId);
    this.viewMode = 'tree';
    this.groupBy = this.groupBy === 'shift' ? 'area' : this.groupBy;
    this.matrixPopover = null;
    this.refreshDerived();
    this.cdr.markForCheck();
    requestAnimationFrame(() => {
      document.querySelector('.duty-roster-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  weekdayName(day: string): string {
    return new Date(`${day}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
  }

  isToday(day: string): boolean {
    return day === toYmd(new Date());
  }

  selectWeekDay(day: string): void {
    this.selectedDate = day;
    this.refreshDerived();
  }

  selectWeekShift(day: string, shift: string, event: Event): void {
    event.stopPropagation();
    this.selectedDate = day;
    this.selectedShift = shift;
    this.refreshDerived();
  }

  shiftWeek(offset: number): void {
    this.shiftDate(offset * 7);
  }

  goToday(): void {
    this.selectedDate = toYmd(new Date());
    this.onDateChange();
  }

  roleAbbrev(role: unknown): string {
    const value = String(role || '').toLowerCase();
    if (value.includes('charge')) return 'CN';
    if (value.includes('head')) return 'HN';
    if (value.includes('nurse')) return 'RN';
    if (value.includes('resident')) return 'RD';
    if (value.includes('doctor')) return 'MD';
    if (value.includes('ward')) return 'WB';
    if (value.includes('clean')) return 'CL';
    if (value.includes('lab')) return 'LT';
    return (String(role || 'ST').replace(/[^a-z]/gi, '').slice(0, 2) || 'ST').toUpperCase();
  }

  areaCount(node: TreeNode): number {
    return this.areaCounts.get(node.id) || 0;
  }

  private refreshWeekWindow(): void {
    const date = new Date(`${this.selectedDate}T00:00:00`);
    const day = date.getDay();
    date.setDate(date.getDate() - ((day + 6) % 7));
    this.weekFrom = toYmd(date);
    const end = new Date(`${this.weekFrom}T00:00:00`);
    end.setDate(end.getDate() + 6);
    this.weekTo = toYmd(end);
    this.weekDays = weekDatesFrom(this.weekFrom);
  }

  refreshDerived(): void {
    const today = this.assignments.filter(
      (row) => toYmd(row['rosterDate'] as string) === this.selectedDate && row['status'] !== 'cancelled'
    );
    this.scopedRows = today.filter((row) => this.rowInSelectedArea(row));
    if (this.selectedShift) {
      const target = this.normalizeShiftKey(this.selectedShift);
      this.scopedRows = this.scopedRows.filter((row) => this.normalizeShiftKey(row['shift']) === target);
    }
    if (this.tableSearch.trim()) {
      const query = this.tableSearch.trim().toLowerCase();
      this.scopedRows = this.scopedRows.filter((row) =>
        [this.staffName(row), row['staffRole'], this.areaLabel(row)].join(' ').toLowerCase().includes(query)
      );
    }
    this.coverageRows = calculateCoverage(this.scopedRows, this.shiftRequirements(this.selectedShift), this.selectedShift);
    this.coverageSummary = coverageTotals(this.coverageRows);
    this.donutStyle = coverageDonutStyle(this.coverageSummary);
    this.kpis = {
      onDuty: today.length,
      openShifts: this.coverageSummary.open,
      nurses: today.filter((row) => String(row['staffRole'] || '').toLowerCase().includes('nurse')).length,
      pending: today.filter((row) => row['status'] === 'draft').length,
    };
    this.breadcrumb = ['Home', 'Duty Roster', this.selectedNode.label, `${this.shiftLabel(this.selectedShift)} Shift`];
    this.rebuildAreaCounts(today);
    this.rebuildWeekMatrix();
    this.cdr.markForCheck();
  }

  private rebuildWeekMatrix(): void {
    this.weekMatrix = buildRosterWeekMatrix({
      assignments: this.assignments,
      coverage: this.requirements,
      wards: this.wardsCatalog,
      departments: this.departmentsCatalog,
      staff: this.staff,
      from: this.weekFrom,
      to: this.weekTo,
      groupBy: this.groupBy === 'shift' ? 'area' : this.groupBy,
    });
  }

  private rebuildAreaCounts(today: Array<Record<string, unknown>>): void {
    const counts = new Map<string, number>();
    const visit = (node: TreeNode) => {
      const count = today.filter(
        (row) => this.rowMatchesNode(row, node) && this.normalizeShiftKey(row['shift']) === this.normalizeShiftKey(this.selectedShift)
      ).length;
      counts.set(node.id, count);
      node.children?.forEach(visit);
    };
    this.tree.forEach(visit);
    this.areaCounts = counts;
  }

  private rowInSelectedArea(row: Record<string, unknown>): boolean {
    return this.rowMatchesNode(row, this.selectedNode);
  }

  private rowMatchesNode(row: Record<string, unknown>, node: TreeNode): boolean {
    if (node.type === 'HOSPITAL' || node.type === 'GROUP') return true;
    if (node.roomId) return String(row['roomId'] || '') === node.roomId;
    if (node.departmentId) return String(row['departmentId'] || '') === node.departmentId;
    if (node.wardId) return String(row['wardId'] || row['areaId'] || '') === node.wardId;
    return String(row['areaType'] || '') === node.type;
  }

  shiftRequirements(shift: string) {
    const day = new Date(`${this.selectedDate}T00:00:00`).getDay();
    return this.requirements.filter((item) => {
      if (item.shift && item.shift !== shift) return false;
      if (item.dayOfWeek !== undefined && item.dayOfWeek !== day) return false;
      if (item.areaId && this.selectedNode.id !== 'hospital' && item.areaId !== this.selectedNode.id && item.areaId !== this.selectedNode.wardId) {
        return false;
      }
      return true;
    });
  }

  staffName(row: Record<string, unknown>): string {
    const staff = row['staffUserId'];
    if (staff && typeof staff === 'object') return String((staff as Record<string, unknown>)['name'] || 'Staff');
    const match = this.staff.find((item) => String(item['_id']) === String(staff));
    return String(match?.['name'] || 'Staff');
  }

  staffNo(row: Record<string, unknown>): string {
    const staff = row['staffUserId'];
    if (staff && typeof staff === 'object') return staffDisplayNo(staff as Record<string, unknown>);
    const match = this.staff.find((item) => String(item['_id']) === String(staff));
    return match ? staffDisplayNo(match) : '';
  }

  staffPhoto(row: Record<string, unknown>): string {
    const staff = row['staffUserId'];
    if (staff && typeof staff === 'object') return String((staff as Record<string, unknown>)['photoUrl'] || '');
    const match = this.staff.find((item) => String(item['_id']) === String(staff));
    return String(match?.['photoUrl'] || '');
  }

  personPhoto(person: Record<string, unknown>): string {
    return String(person['photoUrl'] || '');
  }

  staffInitials(name: unknown): string {
    const parts = String(name || 'S').trim().split(/\s+/);
    return ((parts[0]?.[0] || 'S') + (parts[1]?.[0] || '')).toUpperCase();
  }

  areaLabel(row: Record<string, unknown>): string {
    return String(row['wardLabel'] || row['areaType'] || 'Area');
  }

  roomLabel(row: Record<string, unknown>): string {
    return String(row['roomLabel'] || row['wardLabel'] || '—');
  }

  roleClass(role: unknown): string {
    const value = String(role || '').toLowerCase();
    if (value.includes('nurse')) return 'is-nurse';
    if (value.includes('doctor')) return 'is-doctor';
    if (value.includes('ward boy') || value.includes('wardboy')) return 'is-wardboy';
    if (value.includes('clean')) return 'is-cleaner';
    if (value.includes('lab')) return 'is-lab';
    return 'is-staff';
  }

  trackNode = (_: number, node: TreeNode) => node.id;
  trackRow = (_: number, row: Record<string, unknown>) => String(row['_id'] || '');
  trackStaff = (_: number, person: RankedStaff) => String(person['_id'] || '');

  toggleRow(id: string, checked: boolean): void {
    if (checked) this.selectedRowIds.add(id);
    else this.selectedRowIds.delete(id);
  }

  openAssign(role = this.assignRole, mode: 'assign' | 'bulk' = 'assign'): void {
    if (!this.canCreate || this.drawerBusy) return;
    this.drawerBusy = true;
    this.drawerMode = mode;
    this.assignRole = role || 'Nurse';
    this.notes = '';
    this.staffSearch = '';
    this.selectedStaffIds = new Set();
    this.bulkPreview = [];
    this.staffError = false;
    this.showDrawer = true;
    this.drawerStep = mode === 'bulk' && !this.selectedNode.wardId && this.selectedNode.type !== 'WARD' ? 1 : mode === 'assign' ? 3 : 1;
    this.lockBody();
    this.rebuildEligibleStaff();
    this.cdr.markForCheck();
    if (this.tutorialActive && this.tutorialSteps[this.tutorialIndex]?.target === 'open-position') {
      this.goTutorial(this.tutorialIndex + 1);
    }
  }

  openBulk(): void {
    this.openAssign(this.assignRole, 'bulk');
  }

  fillOpen(role: string): void {
    this.openAssign(role, 'assign');
  }

  closeDrawer(): void {
    this.showDrawer = false;
    this.drawerBusy = false;
    this.saving = false;
    this.unlockBody();
    this.cdr.markForCheck();
  }

  onStaffSearch(): void {
    this.applyStaffFilter();
  }

  onAssignRoleChange(): void {
    this.rebuildEligibleStaff();
  }

  setViewMode(mode: 'tree' | 'list' | 'day' | 'week'): void {
    this.viewMode = mode;
    this.cdr.markForCheck();
  }

  setGroupBy(value: RosterGroupBy | string): void {
    this.groupBy = normalizeRosterGroupBy(value);
    if (this.groupBy !== 'shift' && this.viewMode !== 'week') {
      this.viewMode = 'week';
    }
    this.rebuildWeekMatrix();
    this.cdr.markForCheck();
  }

  get showGroupedWeekMatrix(): boolean {
    return this.viewMode === 'week' && this.groupBy !== 'shift';
  }

  get groupByCaption(): string {
    const option = this.groupByOptions.find((item) => item.value === this.groupBy);
    if (this.groupBy === 'area') return 'Hospital Area';
    return option?.label || 'Shift';
  }

  get matrixStaffTotal(): number {
    return this.weekMatrix.rows.reduce((sum, row) => sum + Number(row.staffCount || 0), 0);
  }

  matrixCell(rowId: string, day: string) {
    return this.weekMatrix.rows.find((row) => row.id === rowId)?.days?.[day] || {
      morning: 0,
      afternoon: 0,
      night: 0,
      assigned: 0,
      required: 0,
      open: 0,
      short: false,
    };
  }

  toggleMatrixRoot(): void {
    if (this.expandedMatrixGroups.has('root')) this.expandedMatrixGroups.delete('root');
    else this.expandedMatrixGroups.add('root');
    this.cdr.markForCheck();
  }

  isMatrixRootExpanded(): boolean {
    return this.expandedMatrixGroups.has('root');
  }

  selectMatrixCell(day: string, rowId: string): void {
    this.selectedDate = day;
    if (this.groupBy === 'ward') {
      const ward = this.wardsCatalog.find((item) => String(item['_id']) === rowId);
      if (ward) {
        this.selectedNode = {
          id: rowId,
          label: String(ward['name'] || 'Ward'),
          type: 'WARD',
          wardId: rowId,
        };
      }
    } else if (this.groupBy === 'department') {
      const dept = this.departmentsCatalog.find((item) => String(item['_id']) === rowId);
      if (dept) {
        this.selectedNode = {
          id: rowId,
          label: String(dept['name'] || 'Department'),
          type: 'DEPARTMENT',
          departmentId: rowId,
        };
      }
    } else if (this.groupBy === 'area') {
      this.selectedNode = { id: rowId.toLowerCase(), label: this.weekMatrix.rows.find((row) => row.id === rowId)?.label || rowId, type: rowId };
    } else if (this.groupBy === 'role') {
      this.assignRole = this.weekMatrix.rows.find((row) => row.id === rowId)?.label || 'Nurse';
    }
    this.refreshDerived();
  }

  onTreeSearch(): void {
    const query = this.treeSearch.trim().toLowerCase();
    if (query) this.expandMatching(this.tree, query);
    this.cdr.markForCheck();
  }

  private expandMatching(nodes: TreeNode[], query: string): boolean {
    let matched = false;
    for (const node of nodes) {
      const childMatch = node.children?.length ? this.expandMatching(node.children, query) : false;
      const selfMatch = node.label.toLowerCase().includes(query);
      if (childMatch || selfMatch) {
        this.expandedIds.add(node.id);
        matched = true;
      }
    }
    return matched;
  }

  onDrawerShift(shift: string): void {
    this.selectShift(shift);
    this.rebuildEligibleStaff();
  }

  closeCoverage(): void {
    this.showCoverage = false;
    this.unlockBody();
    this.cdr.markForCheck();
  }

  dismissCopy(): void {
    this.copyPreview = null;
    this.cdr.markForCheck();
  }

  rebuildEligibleStaff(): void {
    this.staffLoading = true;
    this.staffError = false;
    try {
      const stamp = `${this.selectedDate}|${this.selectedShift}|${this.assignRole}|${this.assignments.length}|${this.staff.length}`;
      if (this.assignmentIndexStamp !== stamp || !this.rankedStaff.length) {
        const times = this.timesFor(this.selectedShift);
        this.rankedStaff = rankEligibleStaff(this.staff, this.assignments, {
          role: this.assignRole === 'All Roles' ? '' : this.assignRole,
          date: this.selectedDate,
          startTime: times.startTime,
          endTime: times.endTime,
          wardId: this.selectedNode.wardId,
        });
        this.assignmentIndexStamp = stamp;
      }
      this.applyStaffFilter();
    } catch {
      this.staffError = true;
      this.visibleStaff = [];
    } finally {
      this.staffLoading = false;
      this.cdr.markForCheck();
    }
  }

  private applyStaffFilter(): void {
    this.visibleStaff = filterRankedStaff(this.rankedStaff, {
      search: this.staffSearch,
      role: this.assignRole === 'All Roles' ? '' : this.assignRole,
      hideIncompatible: true,
      limit: ELIGIBLE_STAFF_PAGE_SIZE,
    });
    this.cdr.markForCheck();
  }

  toggleStaff(id: string, checked: boolean): void {
    if (!shouldRunBulkPreview('staff-toggle')) {
      /* preview is intentionally skipped on checkbox */
    }
    if (checked) this.selectedStaffIds.add(id);
    else this.selectedStaffIds.delete(id);
    this.cdr.markForCheck();
  }

  isStaffSelected(id: unknown): boolean {
    return this.selectedStaffIds.has(String(id));
  }

  clearStaffSelection(): void {
    this.selectedStaffIds = new Set();
    this.cdr.markForCheck();
  }

  nextDrawerStep(): void {
    if (this.drawerStep === 1 && this.selectedNode.type === 'GROUP') {
      this.toastr.warning('Select a ward, room, or area first');
      return;
    }
    if (this.drawerStep === 3 && !this.selectedStaffIds.size) {
      this.toastr.warning('Select eligible staff');
      return;
    }
    if (this.drawerStep === 3) this.buildBulkPreview();
    this.drawerStep = Math.min(4, this.drawerStep + 1);
    this.goDrawerStep(this.drawerStep);
  }

  prevDrawerStep(): void {
    this.drawerStep = Math.max(1, this.drawerStep - 1);
    this.cdr.markForCheck();
  }

  shiftIcon(shift: string): string {
    if (shift === 'night') return 'fa-moon-o';
    if (shift === 'afternoon') return 'fa-cloud';
    return 'fa-sun-o';
  }

  goDrawerStep(step: number): void {
    this.drawerStep = step;
    if (step === 4) this.buildBulkPreview();
    this.cdr.markForCheck();
    requestAnimationFrame(() => {
      document.getElementById(`duty-step-${step}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  private assignmentDates(): string[] {
    if (this.drawerMode !== 'bulk') return [this.selectedDate];
    if (this.bulkUseRange) return expandBulkDates({ from: this.bulkFrom, to: this.bulkTo });
    return expandBulkDates({ weekFrom: this.weekFrom, days: this.bulkDays });
  }

  toggleBulkDay(index: number): void {
    this.bulkDays = this.bulkDays.includes(index)
      ? this.bulkDays.filter((day) => day !== index)
      : [...this.bulkDays, index].sort();
  }

  buildBulkPreview(): void {
    if (!shouldRunBulkPreview('review')) return;
    const times = this.timesFor(this.selectedShift);
    const dates = this.assignmentDates();
    const rows: BulkPreviewRow[] = [];
    for (const staffId of this.selectedStaffIds) {
      const person = this.staff.find((item) => String(item['_id']) === staffId);
      for (const date of dates) {
        const payload = {
          staffUserId: staffId,
          staffRole: this.assignRole === 'All Roles' ? String(person?.['role'] || 'Staff') : this.assignRole,
          wardId: this.selectedNode.wardId,
          wardLabel: this.selectedNode.label,
          areaType: this.areaTypeFromNode(this.selectedNode),
          areaId: this.selectedNode.wardId || this.selectedNode.id,
          roomId: this.selectedNode.roomId,
          departmentId: this.selectedNode.departmentId,
          rosterDate: date,
          startTime: times.startTime,
          endTime: times.endTime,
          shift: this.selectedShift,
          status: 'draft',
          notes: this.notes,
        };
        const existing = this.assignments.find((row) => {
          if (staffIdOf(row['staffUserId']) !== staffId) return false;
          if (toYmd(row['rosterDate'] as string) !== date) return false;
          if (row['status'] === 'cancelled') return false;
          return String(row['startTime']) === times.startTime || String(row['shift']) === this.selectedShift;
        });
        rows.push({
          staffName: String(person?.['name'] || 'Staff'),
          role: String(payload.staffRole),
          area: this.selectedNode.label,
          shift: this.shiftLabel(this.selectedShift),
          date,
          time: `${times.startTime}–${times.endTime}`,
          conflict: Boolean(existing),
          conflictText: existing
            ? `${person?.['name'] || 'Staff'} is already assigned to ${this.areaLabel(existing)} from ${existing['startTime']}–${existing['endTime']}.`
            : '',
          payload,
        });
      }
    }
    this.bulkPreview = rows;
    this.previewRequestCount += 1;
  }

  saveAssignment(status: 'draft' | 'published'): void {
    if (this.saving) return;
    if (!this.bulkPreview.length) this.buildBulkPreview();
    const items = this.bulkPreview.filter((row) => !row.conflict).map((row) => ({ ...row.payload, status }));
    if (!items.length) {
      this.toastr.error('No safe assignments to save. Resolve conflicts first.');
      return;
    }
    this.saving = true;
    const request$ =
      items.length === 1
        ? this.backend.createWardRosterShift(items[0])
        : this.backend.previewBulkDutyRoster({ items }).pipe(
            switchMap((preview) => {
              const conflicts = Number(preview['conflicts'] || 0);
              if (conflicts) {
                throw Object.assign(new Error('Scheduling Conflict'), {
                  error: { code: 'ROSTER_CONFLICT', message: this.conflictSummary() },
                  status: 409,
                });
              }
              return this.backend.bulkCreateDutyRoster({ items, status, atomic: true });
            })
          );
    request$.subscribe({
      next: (data) => {
        this.saving = false;
        const count = Number((data as Record<string, unknown>)?.['createdCount'] || items.length);
        this.toastr.success(`${count} assignment${count === 1 ? '' : 's'} saved`);
        this.closeDrawer();
        this.load();
      },
      error: (error) => {
        this.saving = false;
        this.toastr.error(this.rosterConflictMessage(error, 'Could not save assignment'));
        this.cdr.markForCheck();
      },
    });
  }

  private conflictSummary(): string {
    const row = this.bulkPreview.find((item) => item.conflict);
    return row?.conflictText || 'Scheduling Conflict';
  }

  openCoverage(): void {
    this.coverageRole = this.assignRole || 'Nurse';
    this.coverageRequired = Math.max(1, this.coverageRows.find((row) => row.role === this.coverageRole)?.required || this.scopedRows.length + 1);
    this.showCoverage = true;
    this.lockBody();
    this.cdr.markForCheck();
  }

  saveCoverage(): void {
    if (this.coverageSaving || !this.canUpdate) return;
    this.coverageSaving = true;
    this.backend
      .upsertDutyRosterCoverage({
        areaType: this.areaTypeFromNode(this.selectedNode),
        areaId: this.selectedNode.wardId || this.selectedNode.id,
        dayOfWeek: new Date(`${this.selectedDate}T00:00:00`).getDay(),
        shift: this.selectedShift,
        role: this.coverageRole,
        requiredCount: this.coverageRequired,
      })
      .subscribe({
        next: () => {
          this.coverageSaving = false;
          this.showCoverage = false;
          this.unlockBody();
          this.toastr.success('Coverage requirement saved');
          this.load();
        },
        error: () => {
          this.coverageSaving = false;
          this.toastr.error('Could not save coverage');
          this.cdr.markForCheck();
        },
      });
  }

  previewCopy(): void {
    this.backend.previewCopyDutyRosterWeek({ from: this.weekFrom, to: this.weekTo }).subscribe({
      next: (data) => {
        this.copyPreview = data;
        this.cdr.markForCheck();
      },
      error: () => this.toastr.error('Could not preview previous week'),
    });
  }

  confirmCopy(): void {
    this.backend.copyDutyRosterWeek({ from: this.weekFrom, to: this.weekTo }).subscribe({
      next: (data) => {
        this.toastr.success(`${data['createdCount'] || 0} assignments copied as draft`);
        this.copyPreview = null;
        this.load();
      },
      error: () => this.toastr.error('Copy failed'),
    });
  }

  publish(): void {
    if (!this.canUpdate) return;
    this.backend.publishDutyRosterRange({ from: this.weekFrom, to: this.weekTo }).subscribe({
      next: (data) => {
        this.toastr.success(`${data['updatedCount'] || 0} assignments published`);
        this.load();
      },
      error: () => this.toastr.error('Publish failed'),
    });
  }

  shiftDate(offset: number): void {
    const date = new Date(`${this.selectedDate}T00:00:00`);
    date.setDate(date.getDate() + offset);
    this.selectedDate = toYmd(date);
    this.onDateChange();
  }

  formattedSelectedDate(): string {
    const date = new Date(`${this.selectedDate}T00:00:00`);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private rosterConflictCode(error: { error?: Record<string, unknown>; status?: number } | null | undefined): string {
    const body = error?.error || {};
    return String(body['code'] || body['errorCode'] || body['error'] || '')
      .trim()
      .toUpperCase();
  }

  private rosterConflictMessage(
    error: { error?: Record<string, unknown>; status?: number } | null | undefined,
    fallback: string
  ): string {
    const body = error?.error || {};
    const code = this.rosterConflictCode(error);
    const apiMessage = String(body['message'] || '').trim();
    if (error?.status === 409 || code === 'ROSTER_CONFLICT') {
      if (apiMessage && !/^overlapping roster shift exists$/i.test(apiMessage) && apiMessage !== '[object Object]') {
        return apiMessage.startsWith('Scheduling') ? apiMessage : `Scheduling Conflict. ${apiMessage}`;
      }
      return this.conflictSummary() || 'Scheduling Conflict. This staff member already has an overlapping shift.';
    }
    if (apiMessage === '[object Object]') return fallback;
    return apiMessage || fallback;
  }

  startTutorial(): void {
    this.tutorialOffer = false;
    this.tutorialActive = true;
    this.tutorialIndex = 0;
    localStorage.setItem(TUTORIAL_STORAGE, '1');
    this.placeTutorial();
  }

  skipTutorial(): void {
    this.tutorialActive = false;
    this.tutorialOffer = false;
    localStorage.setItem(TUTORIAL_STORAGE, '1');
    this.cdr.markForCheck();
  }

  goTutorial(index: number): void {
    if (index < 0 || index >= this.tutorialSteps.length) {
      this.skipTutorial();
      return;
    }
    this.tutorialIndex = index;
    const target = this.tutorialSteps[index].target;
    if (target === 'staff' && !this.showDrawer && this.canCreate) {
      this.openAssign(this.assignRole);
    }
    this.placeTutorial();
  }

  private placeTutorial(): void {
    this.cdr.markForCheck();
    requestAnimationFrame(() => {
      const target = this.tutorialSteps[this.tutorialIndex]?.target;
      const element = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null;
      if (!element) {
        this.tutorialStyle = { top: '88px', left: '24px' };
        this.cdr.markForCheck();
        return;
      }
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = element.getBoundingClientRect();
      this.tutorialStyle = {
        top: `${Math.min(window.innerHeight - 180, Math.max(16, rect.bottom + 12))}px`,
        left: `${Math.min(window.innerWidth - 360, Math.max(16, rect.left))}px`,
      };
      this.cdr.markForCheck();
    });
  }

  buildRosterHtml(): string {
    const rows = (
      this.viewMode === 'week'
        ? this.assignments.filter((row) => {
            const date = toYmd(row['rosterDate'] as string);
            return date >= this.weekFrom && date <= this.weekTo && row['status'] !== 'cancelled';
          })
        : this.assignments.filter((row) => toYmd(row['rosterDate'] as string) === this.selectedDate && row['status'] !== 'cancelled')
    ).map((row) => ({
      staff: this.staffName(row),
      role: String(row['staffRole'] || 'Staff'),
      area: this.areaLabel(row),
      shift: this.shiftLabel(String(row['shift'] || '')),
      start: String(row['startTime'] || '—'),
      end: String(row['endTime'] || '—'),
      status: String(row['status'] || 'draft'),
      date: toYmd(row['rosterDate'] as string),
    }));

    const groups =
      this.viewMode === 'week'
        ? this.groupRosterRows(rows, (row) => `${row.area} · ${row.shift}`)
        : this.groupRosterRows(rows, (row) => `${row.date || this.selectedDate} · ${row.area} · ${row.shift}`);

    return buildDutyRosterDocumentHtml({
      title: this.rosterDocTitle,
      period: this.viewMode === 'week' ? `${this.weekFrom} – ${this.weekTo}` : this.selectedDate,
      generatedBy: readCurrentUserName(),
      hospital: readStoredHospitalDocumentInfo(),
      filters: this.selectedNode.label,
      orientation: this.rosterDocOrientation,
      rows,
      groups,
    });
  }

  private groupRosterRows(
    rows: Array<{ staff: string; role: string; area: string; shift: string; start: string; end: string; status: string; date?: string }>,
    heading: (row: (typeof rows)[number]) => string
  ) {
    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = heading(row);
      map.set(key, [...(map.get(key) || []), row]);
    }
    return [...map.entries()].map(([title, items]) => ({ heading: title, rows: items }));
  }

  private areaTypeFromNode(node?: TreeNode | null): string {
    const type = node?.type || 'WARD';
    if (type === 'GROUP' || type === 'HOSPITAL') return 'WARD';
    return type;
  }

  private lockBody(): void {
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockBody(): void {
    if (!this.showDrawer && !this.showCoverage) {
      document.body.style.overflow = this.previousBodyOverflow || '';
    }
  }
}
