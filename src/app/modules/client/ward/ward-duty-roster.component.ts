import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { buildDutyRosterDocumentHtml } from '../../../core/documents/duty-roster-document.builder';
import { readCurrentUserName, readStoredHospitalDocumentInfo } from '../../../core/utils/hms-document-context.util';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import { hasPermission } from '../../auth/access-control';
import { isClinicalModuleEnabled, isLaboratoryModuleEnabled, isPharmacyModuleEnabled, isWardModuleEnabled } from '../../auth/hospital-modules';
import {
  ROSTER_SHIFT_TIMES,
  RosterCoverageRow,
  calculateCoverage,
  expandBulkDates,
  rankEligibleStaff,
  toYmd,
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
  conflict: boolean;
  payload: Record<string, unknown>;
}

const TUTORIAL_STEPS = [
  { target: 'date', text: 'Choose the day or week you want to schedule.' },
  { target: 'tree', text: 'Select a Ward, Room, Department, OPD area, Laboratory or Pharmacy.' },
  { target: 'coverage', text: 'Required shows how many staff you need. Assigned shows how many are scheduled. Open shows what is still missing.' },
  { target: 'open-position', text: 'Click an open position to quickly fill a missing shift.' },
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
})
export class WardDutyRosterComponent implements OnInit {
  loading = false;
  selectedDate = new Date().toISOString().slice(0, 10);
  viewMode: 'tree' | 'day' | 'week' = 'tree';
  groupBy: 'shift' | 'area' = 'shift';
  mobileTab: 'overview' | 'schedule' | 'tree' = 'overview';
  selectedShift = 'morning';
  selectedNode: TreeNode = { id: 'hospital', label: 'Hospital', type: 'HOSPITAL' };
  tree: TreeNode[] = [];
  assignments: Array<Record<string, unknown>> = [];
  staff: Array<Record<string, unknown>> = [];
  coverageRows: RosterCoverageRow[] = [];
  requirements: Array<{ role: string; requiredCount: number; shift?: string; areaId?: string; dayOfWeek?: number }> = [];
  showAssign = false;
  assignRole = 'Nurse';
  selectedStaffId = '';
  notes = '';
  copyPreview: Record<string, unknown> | null = null;
  myDutyOnly = false;
  canCreate = hasPermission('ward.roster.create');
  canUpdate = hasPermission('ward.roster.update');
  readonly shifts = ['morning', 'afternoon', 'night'] as const;
  readonly bulkShifts = ['morning', 'afternoon', 'night', 'on_call', 'custom'] as const;
  readonly weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly bulkRoles = ['Doctor', 'Nurse', 'Reception', 'Lab', 'Pharmacy', 'Support'];

  showBulk = false;
  bulkStep = 1;
  bulkArea: TreeNode | null = null;
  bulkDays: number[] = [0, 1, 2, 3, 4];
  bulkUseRange = false;
  bulkFrom = '';
  bulkTo = '';
  bulkShift = 'morning';
  bulkRole = 'Nurse';
  bulkStaffId = '';
  bulkPreview: BulkPreviewRow[] = [];
  bulkSaving = false;

  tutorialActive = false;
  tutorialOffer = false;
  tutorialIndex = 0;
  tutorialStyle: Record<string, string> = {};
  readonly tutorialSteps = TUTORIAL_STEPS;
  rosterDocumentHtml = () => this.buildRosterHtml();

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.myDutyOnly = !this.canCreate && !this.canUpdate;
    this.bulkFrom = this.weekFrom;
    this.bulkTo = this.weekTo;
    this.load();
    if (this.canCreate && !localStorage.getItem(TUTORIAL_STORAGE)) {
      this.tutorialOffer = true;
    }
  }

  get weekFrom(): string {
    const date = new Date(this.selectedDate);
    const day = date.getDay();
    date.setDate(date.getDate() - ((day + 6) % 7));
    return date.toISOString().slice(0, 10);
  }

  get weekTo(): string {
    const date = new Date(this.weekFrom);
    date.setDate(date.getDate() + 6);
    return date.toISOString().slice(0, 10);
  }

  get breadcrumb(): string[] {
    return ['Duty Roster', this.selectedNode.type === 'HOSPITAL' ? 'Hospital' : this.selectedNode.label, this.shiftLabel(this.selectedShift)];
  }

  get scopedAssignments(): Array<Record<string, unknown>> {
    return this.assignments.filter((row) => {
      if (toYmd(row['rosterDate'] as string) !== this.selectedDate) return false;
      if (this.selectedNode.type === 'HOSPITAL' || this.selectedNode.type === 'GROUP') return true;
      if (this.selectedNode.roomId) return String(row['roomId'] || '') === this.selectedNode.roomId;
      if (this.selectedNode.departmentId) return String(row['departmentId'] || '') === this.selectedNode.departmentId;
      if (this.selectedNode.wardId) {
        return String(row['wardId'] || row['areaId'] || '') === this.selectedNode.wardId;
      }
      return String(row['areaType'] || '') === this.selectedNode.type;
    });
  }

  get kpis() {
    const today = this.assignments.filter((row) => toYmd(row['rosterDate'] as string) === this.selectedDate && row['status'] !== 'cancelled');
    const open = this.coverageRows.reduce((sum, row) => sum + row.open, 0);
    return {
      onDuty: today.length,
      openShifts: open,
      nurses: today.filter((row) => String(row['staffRole'] || '').toLowerCase().includes('nurse')).length,
      pending: today.filter((row) => row['status'] === 'draft').length,
    };
  }

  get eligibleStaff(): Array<Record<string, unknown> & { availability: string }> {
    return rankEligibleStaff(this.staff, this.assignments, {
      role: this.assignRole,
      date: this.selectedDate,
      startTime: this.shiftTimes.startTime,
      endTime: this.shiftTimes.endTime,
      wardId: this.selectedNode.wardId,
    });
  }

  get bulkEligibleStaff(): Array<Record<string, unknown> & { availability: string }> {
    const date = this.bulkDates[0] || this.selectedDate;
    const times = ROSTER_SHIFT_TIMES[this.bulkShift] || ROSTER_SHIFT_TIMES['morning'];
    return rankEligibleStaff(this.staff, this.assignments, {
      role: this.bulkRole,
      date,
      startTime: times.startTime,
      endTime: times.endTime,
      wardId: this.bulkArea?.wardId,
    });
  }

  get shiftTimes() {
    return this.timesFor(this.selectedShift);
  }

  timesFor(shift: string) {
    return ROSTER_SHIFT_TIMES[shift] || ROSTER_SHIFT_TIMES['morning'];
  }

  get coverageByShift(): Array<{ shift: string; rows: RosterCoverageRow[] }> {
    return this.shifts.map((shift) => ({
      shift,
      rows: calculateCoverage(this.scopedAssignments.filter((row) => String(row['shift'] || '') === shift), this.shiftRequirements(shift), shift),
    }));
  }

  get showAllShiftCoverage(): boolean {
    return this.selectedNode.type === 'WARD' && !this.selectedNode.roomId;
  }

  get bulkDates(): string[] {
    if (this.bulkUseRange) {
      return expandBulkDates({ from: this.bulkFrom, to: this.bulkTo });
    }
    return expandBulkDates({ weekFrom: this.weekFrom, days: this.bulkDays });
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

  get bulkConflictCount(): number {
    return this.bulkPreview.filter((row) => row.conflict).length;
  }

  load(): void {
    this.loading = true;
    this.backend.getDutyRosterBootstrap({ from: this.weekFrom, to: this.weekTo }).subscribe({
      next: (data) => {
        const wards = (data['wards'] as Array<Record<string, unknown>>) || [];
        const rooms = (data['rooms'] as Array<Record<string, unknown>>) || [];
        const departments = (data['departments'] as Array<Record<string, unknown>>) || [];
        this.assignments = (data['assignments'] as Array<Record<string, unknown>>) || [];
        this.staff = (data['staff'] as Array<Record<string, unknown>>) || [];
        this.requirements = (data['coverage'] as typeof this.requirements) || [];
        this.tree = this.buildTree(wards, rooms, departments);
        this.refreshCoverage();
        this.loading = false;
      },
      error: () => {
        this.backend.listWardRoster({ from: this.weekFrom, to: this.weekTo }).subscribe({
          next: (items) => {
            this.assignments = items || [];
            this.refreshCoverage();
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          },
        });
      },
    });
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
            {
              id: `${ward['_id']}-level`,
              label: 'Ward Level',
              type: 'WARD',
              wardId: String(ward['_id']),
            },
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
    if (isLaboratoryModuleEnabled()) {
      children.push({ id: 'lab', label: 'Laboratory', type: 'LABORATORY' });
    }
    if (isPharmacyModuleEnabled()) {
      children.push({ id: 'pharmacy', label: 'Pharmacy', type: 'PHARMACY' });
    }
    children.push({ id: 'support', label: 'Support', type: 'SUPPORT' });
    return [{ id: 'hospital', label: 'Hospital', type: 'HOSPITAL', children }];
  }

  selectNode(node: TreeNode): void {
    if (node.type === 'GROUP') {
      this.selectedNode = node;
      this.refreshCoverage();
      return;
    }
    this.selectedNode = node;
    this.refreshCoverage();
  }

  selectShift(shift: string): void {
    this.selectedShift = shift;
    this.refreshCoverage();
  }

  refreshCoverage(): void {
    this.coverageRows = calculateCoverage(this.scopedAssignments, this.shiftRequirements(this.selectedShift), this.selectedShift);
  }

  shiftRequirements(shift: string) {
    const day = new Date(this.selectedDate).getDay();
    return this.requirements.filter((item) => {
      if (item.shift && item.shift !== shift) return false;
      if (item.dayOfWeek !== undefined && item.dayOfWeek !== day) return false;
      if (item.areaId && this.selectedNode.id !== 'hospital' && item.areaId !== this.selectedNode.id && item.areaId !== this.selectedNode.wardId) {
        return false;
      }
      return true;
    });
  }

  shiftLabel(shift: string): string {
    return ROSTER_SHIFT_TIMES[shift]?.label || shift;
  }

  staffName(row: Record<string, unknown>): string {
    const staff = row['staffUserId'];
    if (staff && typeof staff === 'object') return String((staff as Record<string, unknown>)['name'] || 'Staff');
    const match = this.staff.find((item) => String(item['_id']) === String(staff));
    return String(match?.['name'] || 'Staff');
  }

  staffInitials(name: unknown): string {
    const parts = String(name || 'S').trim().split(/\s+/);
    return ((parts[0]?.[0] || 'S') + (parts[1]?.[0] || '')).toUpperCase();
  }

  areaLabel(row: Record<string, unknown>): string {
    return String(row['wardLabel'] || row['areaType'] || 'Area');
  }

  openAssign(role = 'Nurse'): void {
    if (!this.canCreate) return;
    this.assignRole = role;
    this.selectedStaffId = '';
    this.notes = '';
    this.showAssign = true;
    if (this.tutorialActive && this.tutorialSteps[this.tutorialIndex]?.target === 'open-position') {
      this.goTutorial(this.tutorialIndex + 1);
    }
  }

  saveAssignment(): void {
    if (!this.selectedStaffId) {
      this.toastr.warning('Choose a staff member');
      return;
    }
    this.backend
      .createWardRosterShift({
        staffUserId: this.selectedStaffId,
        staffRole: this.assignRole,
        wardId: this.selectedNode.wardId,
        wardLabel: this.selectedNode.label,
        areaType: this.areaTypeFromNode(this.selectedNode),
        areaId: this.selectedNode.wardId || this.selectedNode.id,
        roomId: this.selectedNode.roomId,
        departmentId: this.selectedNode.departmentId,
        rosterDate: this.selectedDate,
        startTime: this.shiftTimes.startTime,
        endTime: this.shiftTimes.endTime,
        shift: this.selectedShift,
        status: 'draft',
        notes: this.notes,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Assignment saved as draft');
          this.showAssign = false;
          this.load();
        },
        error: (error) => {
          this.toastr.error(this.rosterConflictMessage(error, 'Could not save assignment'));
        },
      });
  }

  previewCopy(): void {
    this.backend.previewCopyDutyRosterWeek({ from: this.weekFrom, to: this.weekTo }).subscribe({
      next: (data) => {
        this.copyPreview = data;
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

  weekDays(): string[] {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(this.weekFrom);
      date.setDate(date.getDate() + index);
      return date.toISOString().slice(0, 10);
    });
  }

  assignmentsFor(date: string, shift: string): Array<Record<string, unknown>> {
    return this.assignments.filter((row) => toYmd(row['rosterDate'] as string) === date && String(row['shift'] || '') === shift);
  }

  openBulk(): void {
    if (!this.canCreate) return;
    this.showBulk = true;
    this.bulkStep = 1;
    this.bulkArea = this.selectedNode.type === 'GROUP' || this.selectedNode.type === 'HOSPITAL' ? null : this.selectedNode;
    this.bulkShift = this.selectedShift;
    this.bulkRole = this.assignRole || 'Nurse';
    this.bulkStaffId = '';
    this.bulkPreview = [];
  }

  selectBulkArea(node: TreeNode): void {
    if (node.type === 'GROUP' || node.type === 'HOSPITAL') return;
    this.bulkArea = node;
  }

  toggleBulkDay(index: number): void {
    this.bulkDays = this.bulkDays.includes(index)
      ? this.bulkDays.filter((day) => day !== index)
      : [...this.bulkDays, index].sort();
  }

  nextBulkStep(): void {
    if (this.bulkStep === 1 && !this.bulkArea) {
      this.toastr.warning('Select an area first');
      return;
    }
    if (this.bulkStep === 2 && !this.bulkDates.length) {
      this.toastr.warning('Select at least one day');
      return;
    }
    if (this.bulkStep === 3 && !this.bulkStaffId) {
      this.toastr.warning('Select eligible staff');
      return;
    }
    if (this.bulkStep === 3) {
      this.buildBulkPreview();
    }
    this.bulkStep = Math.min(5, this.bulkStep + 1);
  }

  prevBulkStep(): void {
    this.bulkStep = Math.max(1, this.bulkStep - 1);
  }

  buildBulkPreview(): void {
    const area = this.bulkArea;
    const person = this.staff.find((item) => String(item['_id']) === this.bulkStaffId);
    const times = ROSTER_SHIFT_TIMES[this.bulkShift] || ROSTER_SHIFT_TIMES['morning'];
    this.bulkPreview = this.bulkDates.map((date) => {
      const payload = {
        staffUserId: this.bulkStaffId,
        staffRole: this.bulkRole,
        wardId: area?.wardId,
        wardLabel: area?.label,
        areaType: this.areaTypeFromNode(area),
        areaId: area?.wardId || area?.id,
        roomId: area?.roomId,
        departmentId: area?.departmentId,
        rosterDate: date,
        startTime: times.startTime,
        endTime: times.endTime,
        shift: this.bulkShift,
        status: 'draft',
      };
      const conflict = this.assignments.some((row) => {
        const staffId = String((row['staffUserId'] as { _id?: string } | undefined)?._id || row['staffUserId'] || '');
        return staffId === this.bulkStaffId && toYmd(row['rosterDate'] as string) === date && row['status'] !== 'cancelled'
          && String(row['startTime']) === times.startTime && String(row['endTime']) === times.endTime;
      });
      return {
        staffName: String(person?.['name'] || 'Staff'),
        role: this.bulkRole,
        area: area?.label || 'Area',
        shift: this.shiftLabel(this.bulkShift),
        date,
        conflict,
        payload,
      };
    });
  }

  saveBulk(status: 'draft' | 'published'): void {
    const safe = this.bulkPreview.filter((row) => !row.conflict);
    if (!safe.length) {
      this.toastr.error('No safe assignments to save. Resolve conflicts first.');
      return;
    }
    if (this.bulkConflictCount) {
      this.toastr.warning(`${this.bulkConflictCount} conflicted rows will be skipped.`);
    }
    this.bulkSaving = true;
    this.backend
      .previewBulkDutyRoster({ items: safe.map((row) => row.payload) })
      .subscribe({
        next: (preview) => {
          const conflicts = Number(preview['conflicts'] || 0);
          if (conflicts && status === 'published') {
            this.bulkSaving = false;
            this.toastr.error('Conflicts remain. Backend returned ROSTER_CONFLICT preview.');
            return;
          }
          this.backend
            .bulkCreateDutyRoster({
              items: safe.map((row) => ({ ...row.payload, status })),
              status,
              atomic: conflicts === 0,
            })
            .subscribe({
              next: (data) => {
                this.bulkSaving = false;
                this.showBulk = false;
                this.toastr.success(`${data['createdCount'] || 0} assignments saved${data['skippedCount'] ? `, ${data['skippedCount']} skipped` : ''}`);
                this.load();
              },
              error: (error) => {
                this.bulkSaving = false;
                this.toastr.error(this.rosterConflictMessage(error, 'Bulk assign failed'));
              },
            });
        },
        error: () => {
          this.bulkSaving = false;
          this.toastr.error('Could not validate bulk assignments');
        },
      });
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
    if (code === 'ROSTER_CONFLICT') {
      if (apiMessage && !/^overlapping roster shift exists$/i.test(apiMessage)) {
        return apiMessage;
      }
      return 'Scheduling conflict: this staff member already has an overlapping shift.';
    }
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
  }

  goTutorial(index: number): void {
    if (index < 0 || index >= this.tutorialSteps.length) {
      this.skipTutorial();
      return;
    }
    this.tutorialIndex = index;
    const target = this.tutorialSteps[index].target;
    if (target === 'staff' && !this.showAssign && this.canCreate) {
      this.showAssign = true;
    }
    this.placeTutorial();
  }

  private placeTutorial(): void {
    const target = this.tutorialSteps[this.tutorialIndex]?.target;
    const element = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null;
    if (!element) {
      this.tutorialStyle = { top: '88px', left: '24px' };
      return;
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const position = () => {
      const rect = element.getBoundingClientRect();
      this.tutorialStyle = {
        top: `${Math.min(window.innerHeight - 180, Math.max(16, rect.bottom + 12))}px`,
        left: `${Math.min(window.innerWidth - 360, Math.max(16, rect.left))}px`,
      };
    };
    position();
    requestAnimationFrame(() => requestAnimationFrame(position));
    window.addEventListener('scrollend', position, { once: true });
  }

  buildRosterHtml(): string {
    const rows = (this.viewMode === 'week'
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

    const groups = this.viewMode === 'week'
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
}
