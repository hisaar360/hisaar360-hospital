import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { formatAdmissionDateTime } from './services/ward-api.mapper';
import {
  MonitoringCard,
  NursingSummaryRow,
  TodaySummaryRow,
  WardAlertRow,
  WardBed,
  WardBedMenuAction,
  WardDashboardFilters,
  WardKpiCard,
  WardRoomStatusFilter,
  WardSection,
  WardTaskRow,
  WardWorkflowTab,
} from './ward-dashboard.models';
import { WardDataService } from './services/ward-data.service';
import { BackendService } from '../../../core/services/backend.service';
import { isLaboratoryModuleEnabled, isPharmacyModuleEnabled } from '../../auth/hospital-modules';
import { isNurseRole, readStoredRole } from '../../auth/access-control';

type ManageableBedStatus = 'available' | 'on_hold' | 'cleaning' | 'maintenance';

@Component({
  selector: 'app-ward-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './ward-dashboard.component.html',
  styleUrl: './ward-dashboard.component.scss',
})
export class WardDashboardComponent implements OnInit {
  loading = false;
  kpiCards: WardKpiCard[] = [];
  bedSections: WardSection[] = [];
  filteredBedSections: WardSection[] = [];
  todaySummary: TodaySummaryRow[] = [];
  todayAlerts: WardAlertRow[] = [];
  nursingTasks: WardTaskRow[] = [];
  nursingSummary: NursingSummaryRow[] = [];
  monitoringCards: MonitoringCard[] = [];
  actionRequired: Array<{ key: string; label: string; route: string; priority: string }> = [];
  controlCenterPatients: Array<Record<string, unknown>> = [];

  wardOptions: string[] = [];
  statusFilter: WardRoomStatusFilter = 'all';
  bedSearchQuery = '';
  activeBedMenu: { key: string; bed: WardBed; actions: WardBedMenuAction[]; opensUp: boolean } | null = null;
  savingBedStatusKey: string | null = null;

  readonly shiftOptions = [
    { value: 'day', label: 'Day Shift (08 AM - 02 PM)' },
    { value: 'evening', label: 'Evening Shift (02 PM - 08 PM)' },
    { value: 'night', label: 'Night Shift (08 PM - 08 AM)' },
  ];

  readonly statusFilters: Array<{ key: WardRoomStatusFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'occupied', label: 'Occupied' },
    { key: 'icu', label: 'ICU' },
    { key: 'private', label: 'Private' },
    { key: 'general', label: 'General' },
    { key: 'cleaning', label: 'Cleaning' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'critical', label: 'Critical' },
    { key: 'discharge_pending', label: 'Discharge Pending' },
  ];

  readonly workflowTabs: WardWorkflowTab[] = [
    { key: 'dashboard', label: 'Dashboard', route: '/ward/dashboard', icon: 'fa-th-large' },
    { key: 'beds', label: 'Beds', route: '/ward/bed-management', icon: 'fa-bed' },
    { key: 'admissions', label: 'Admissions', route: '/ward/admissions', icon: 'fa-hospital-o' },
    { key: 'vitals', label: 'Vitals', route: '/ward/vitals', icon: 'fa-heartbeat' },
    { key: 'mar', label: 'MAR', route: '/ward/mar', icon: 'fa-medkit' },
    { key: 'drips', label: 'Drips / IV', route: '/ward/drips-iv', icon: 'fa-tint' },
    { key: 'notes', label: 'Notes', route: '/ward/nursing-care', icon: 'fa-sticky-note' },
    { key: 'discharge', label: 'Discharge', route: '/ward/admissions', icon: 'fa-sign-out' },
  ];

  filters: WardDashboardFilters = {
    ward: '',
    date: this.todayInputValue(),
    shift: 'day',
  };

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private wardData: WardDataService,
    private backend: BackendService
  ) {}

  ngOnInit(): void {
    this.loadControlCenter();
    this.loadDashboard();
  }

  get selectedShiftLabel(): string {
    return this.shiftOptions.find((shift) => shift.value === this.filters.shift)?.label || '';
  }

  get bedOverviewTitle(): string {
    return this.filters.ward ? `Bed Overview — ${this.filters.ward}` : 'Bed Overview — All Wards';
  }

  get isNurseView(): boolean {
    return isNurseRole(readStoredRole());
  }

  get visibleWorkflowTabs(): WardWorkflowTab[] {
    if (!this.isNurseView) {
      return this.workflowTabs;
    }
    return this.workflowTabs.filter((tab) => tab.key !== 'beds' && tab.key !== 'discharge');
  }

  get dashboardSubtitle(): string {
    const shift = this.selectedShiftLabel;
    if (this.isNurseView) {
      return this.filters.ward
        ? `My assigned patients · ${this.filters.ward} · ${shift}`
        : `My assigned patients · ${shift}`;
    }
    return this.filters.ward
      ? `${this.filters.ward} operational overview · ${shift}`
      : `Ward operational overview · ${shift}`;
  }

  loadDashboard(): void {
    this.loading = true;
    this.wardData.loadDashboard(this.filters.ward).subscribe({
      next: (data) => {
        this.wardOptions = data.wardOptions;
        if (!this.kpiCards.length) {
          this.kpiCards = data.kpiCards;
        }
        this.bedSections = data.bedSections;
        this.todaySummary = data.todaySummary;
        this.todayAlerts = data.todayAlerts;
        this.nursingTasks = data.nursingTasks;
        this.nursingSummary = data.nursingSummary;
        this.monitoringCards = data.monitoringCards;
        this.applyBedFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Failed to load ward dashboard.', 'Dashboard');
      },
    });
  }

  onWardChange(): void {
    this.loadDashboard();
  }

  onStatusFilterChange(filter: WardRoomStatusFilter): void {
    this.statusFilter = filter;
    this.applyBedFilters();
  }

  onSearchChange(): void {
    this.applyBedFilters();
  }

  refresh(): void {
    this.loadDashboard();
    this.loadControlCenter();
    this.toastr.success('Ward dashboard refreshed.');
  }

  loadControlCenter(): void {
    this.backend.getWardControlCenter().subscribe({
      next: (data) => {
        const summary = (data?.['summary'] || {}) as Record<string, number>;
        this.actionRequired = (Array.isArray(data?.['actionRequired']) ? data['actionRequired'] : [])
          .filter((item: { key: string; label: string; route: string; priority: string }) => {
            if (item.key === 'lab') return isLaboratoryModuleEnabled();
            if (item.key === 'pharmacy') return isPharmacyModuleEnabled();
            return true;
          });
        this.controlCenterPatients = Array.isArray(data?.['patients']) ? (data['patients'] as Array<Record<string, unknown>>) : [];

        const controlKpis: WardKpiCard[] = [
          { key: 'pending-admissions', label: 'Pending Admissions', value: Number(summary['pendingAdmissions'] || 0), icon: 'fa-hospital-o', tone: 'amber', route: '/ward/admissions' },
          { key: 'currently-admitted', label: 'Currently Admitted', value: Number(summary['currentlyAdmitted'] || summary['myActivePatients'] || 0), icon: 'fa-user', tone: 'blue', route: '/ward/patient-list' },
          { key: 'ready-discharge', label: 'Ready for Discharge', value: Number(summary['readyForDischarge'] || 0), icon: 'fa-sign-out', tone: 'teal', route: '/ward/admissions' },
          { key: 'available-beds', label: 'Available Beds', value: Number(summary['availableBeds'] || 0), icon: 'fa-check', tone: 'green', route: '/ward/bed-management' },
          { key: 'occupied-beds', label: 'Occupied Beds', value: Number(summary['occupiedBeds'] || 0), icon: 'fa-bed', tone: 'purple', route: '/ward/bed-management' },
          { key: 'medicines-due', label: 'Medicines Due', value: Number(summary['medicinesDue'] || summary['medicationOverdue'] || 0), icon: 'fa-medkit', tone: 'red', route: '/ward/mar' },
        ];

        if (isLaboratoryModuleEnabled()) {
          controlKpis.push({
            key: 'lab-pending',
            label: 'Lab Orders Pending',
            value: Number(summary['labOrdersPending'] || 0),
            icon: 'fa-flask',
            tone: 'amber',
            route: '/laboratory',
          });
        }

        if (isPharmacyModuleEnabled()) {
          controlKpis.push({
            key: 'pharmacy-pending',
            label: 'Pharmacy Requests Pending',
            value: Number(summary['pharmacyRequestsPending'] || 0),
            icon: 'fa-shopping-cart',
            tone: 'amber',
            route: '/pharmacy/ward-requests',
          });
        }

        controlKpis.push({
          key: 'imaging-pending',
          label: 'Imaging Orders Pending',
          value: Number(summary['imagingOrdersPending'] || 0),
          icon: 'fa-picture-o',
          tone: 'blue',
          route: '/ward/orders-services',
        });
        controlKpis.push({
          key: 'procedures-today',
          label: 'Procedures Today',
          value: Number(summary['proceduresToday'] || 0),
          icon: 'fa-stethoscope',
          tone: 'teal',
          route: '/ward/orders-services',
        });

        this.kpiCards = controlKpis;
      },
      error: () => {
        this.actionRequired = [];
        this.controlCenterPatients = [];
      },
    });
  }

  openControlPanel(admissionId: string): void {
    void this.router.navigate(['/ward/patient-detail', admissionId]);
  }

  asString(value: unknown): string {
    return String(value || '');
  }

  isOccupiedBed(bed: WardBed): boolean {
    return bed.status === 'occupied' || bed.status === 'critical';
  }

  onBedClick(bed: WardBed, event?: Event): void {
    const target = event?.target as HTMLElement | undefined;
    if (target?.closest('.ward-bed-card__menu-wrap, .ward-bed-card__actions, .ward-bed-card__quick-btn')) {
      return;
    }

    if (this.activeBedMenu) {
      this.activeBedMenu = null;
      return;
    }

    if (this.isOccupiedBed(bed) && bed.admissionId) {
      void this.router.navigate(['/ward/patient-detail', bed.admissionId]);
      return;
    }

    void this.router.navigate(['/ward/bed-management'], {
      queryParams: {
        bedId: bed.id || undefined,
        roomId: bed.roomId || undefined,
        bedNo: bed.bedNo,
      },
    });
  }

  onBedQuickAction(action: string, bed: WardBed, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.onBedMenuAction(action, bed, event);
  }

  toggleBedMenu(bed: WardBed, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const key = this.bedMenuKey(bed);
    if (this.activeBedMenu?.key === key) {
      this.activeBedMenu = null;
      return;
    }

    this.activeBedMenu = {
      key,
      bed,
      actions: this.buildBedMenuActions(bed),
      opensUp: false,
    };

    queueMicrotask(() => this.updateMenuPlacement(event, key));
  }

  menuOpensUp(bed: WardBed): boolean {
    return this.isBedMenuOpen(bed) && Boolean(this.activeBedMenu?.opensUp);
  }

  private updateMenuPlacement(event: Event, key: string): void {
    if (!this.activeBedMenu || this.activeBedMenu.key !== key) {
      return;
    }

    const button = event.currentTarget as HTMLElement | null;
    const dropdown = button?.closest('.ward-bed-card')?.querySelector('.ward-bed-card__dropdown') as HTMLElement | null;
    if (!button || !dropdown) {
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    const menuHeight = dropdown.getBoundingClientRect().height || 220;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const opensUp = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;

    if (this.activeBedMenu.key === key) {
      this.activeBedMenu = {
        ...this.activeBedMenu,
        opensUp,
      };
    }
  }

  isBedMenuOpen(bed: WardBed): boolean {
    return this.activeBedMenu?.key === this.bedMenuKey(bed);
  }

  activeMenuActions(bed: WardBed): WardBedMenuAction[] {
    return this.isBedMenuOpen(bed) ? this.activeBedMenu?.actions || [] : [];
  }

  bedMenuKey(bed: WardBed): string {
    return String(bed.id || `${bed.roomId || ''}:${bed.bedNo}`);
  }

  private buildBedMenuActions(bed: WardBed): WardBedMenuAction[] {
    const occupied = this.isOccupiedBed(bed);
    const available = bed.status === 'available';
    const cleaning = bed.status === 'cleaning';
    const actions: WardBedMenuAction[] = [];

    if (occupied && bed.admissionId) {
      actions.push(
        { key: 'view_chart', label: 'Patient Chart', icon: 'fa-file-text-o' },
        { key: 'add_vitals', label: 'Add Vitals', icon: 'fa-heartbeat' },
        { key: 'add_note', label: 'Add Nursing Note', icon: 'fa-sticky-note' },
        { key: 'mar', label: 'Medication / MAR', icon: 'fa-medkit' },
        { key: 'add_drip', label: 'Add Drip / IV', icon: 'fa-tint' },
        { key: 'transfer', label: 'Transfer Bed', icon: 'fa-random' },
        { key: 'discharge', label: 'Request Discharge', icon: 'fa-sign-out' }
      );
    }

    if (available) {
      actions.push(
        { key: 'admit_patient', label: 'Admit Patient', icon: 'fa-hospital-o' },
        { key: 'reserve_bed', label: 'Reserve Bed', icon: 'fa-bookmark' },
        { key: 'mark_cleaning', label: 'Mark Cleaning', icon: 'fa-shower' },
        { key: 'maintenance', label: 'Mark Maintenance', icon: 'fa-wrench' }
      );
    }

    if (cleaning) {
      actions.push({ key: 'mark_available', label: 'Mark Available', icon: 'fa-check-circle' });
    }

    if (bed.status === 'maintenance') {
      actions.push({ key: 'mark_available', label: 'Mark Available', icon: 'fa-check-circle' });
    }

    actions.push({ key: 'bed_details', label: 'Bed Details', icon: 'fa-bed' });
    if (this.isNurseView) {
      return actions.filter(
        (action) =>
          !['admit_patient', 'transfer', 'discharge', 'reserve_bed'].includes(action.key)
      );
    }
    return actions;
  }

  onBedMenuAction(action: string, bed: WardBed, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.activeBedMenu = null;

    const query = {
      bedId: bed.id || undefined,
      admissionId: bed.admissionId || undefined,
      patientId: bed.patientId || undefined,
      patientName: bed.patientName || undefined,
      roomId: bed.roomId || undefined,
      bedNo: bed.bedNo,
      wardName: bed.wardName || undefined,
    };

    switch (action) {
      case 'admit_patient':
        void this.router.navigate(['/room-allotment/add-alloted-rooms'], { queryParams: query });
        return;
      case 'reserve_bed':
        this.updateBedStatusFromDashboard(bed, 'on_hold');
        return;
      case 'mark_cleaning':
        this.updateBedStatusFromDashboard(bed, 'cleaning');
        return;
      case 'maintenance':
        this.updateBedStatusFromDashboard(bed, 'maintenance');
        return;
      case 'mark_available':
        this.updateBedStatusFromDashboard(bed, 'available');
        return;
      case 'bed_details':
        void this.router.navigate(['/ward/bed-management'], {
          queryParams: { ...query, action: 'details' },
        });
        return;
      case 'view_chart':
      case 'view_patient':
        if (bed.admissionId) {
          void this.router.navigate(['/ward/patient-detail', bed.admissionId]);
        }
        return;
      case 'add_vitals':
      case 'vitals':
        void this.router.navigate(['/ward/vitals'], { queryParams: query });
        return;
      case 'add_note':
        void this.router.navigate(['/ward/nursing-care'], { queryParams: query });
        return;
      case 'mar':
        void this.router.navigate(['/ward/mar'], { queryParams: query });
        return;
      case 'add_drip':
        void this.router.navigate(['/ward/drips-iv'], { queryParams: query });
        return;
      case 'transfer':
        void this.router.navigate(['/ward/bed-management'], { queryParams: query });
        return;
      case 'discharge':
        void this.router.navigate(['/ward/admissions'], { queryParams: { ...query, action: 'discharge' } });
        return;
      default:
        return;
    }
  }

  private updateBedStatusFromDashboard(bed: WardBed, status: ManageableBedStatus): void {
    if (this.savingBedStatusKey) {
      return;
    }

    if (this.isOccupiedBed(bed)) {
      this.toastr.error('Occupied beds cannot be marked from dashboard.');
      return;
    }

    if (!bed.roomId) {
      this.toastr.error('Room information is missing for this bed.');
      return;
    }

    if (bed.status === status) {
      this.toastr.info(`Bed is already ${this.formatStatusLabel(status)}.`);
      return;
    }

    const payload = {
      status,
      notes: `Marked ${this.formatStatusLabel(status)} from ward dashboard.`,
    };
    const request$ = this.isPersistedBedId(bed.id)
      ? this.wardData.updateWardBed(bed.id!, payload)
      : this.wardData.createWardBed({
          roomId: bed.roomId,
          bedNo: bed.bedNo,
          bedType: status === 'maintenance' ? 'standard' : this.bedTypeFromRoomType(bed.roomType),
          status,
          notes: payload.notes,
        });

    this.savingBedStatusKey = this.bedMenuKey(bed);
    request$.subscribe({
      next: () => {
        this.toastr.success(`Bed marked ${this.formatStatusLabel(status)}.`);
        this.savingBedStatusKey = null;
        this.loadDashboard();
      },
      error: (err) => {
        this.savingBedStatusKey = null;
        this.toastr.error(err?.error?.message || 'Failed to update bed status.');
      },
    });
  }

  private isPersistedBedId(value: string | null | undefined): boolean {
    return /^[a-f\d]{24}$/i.test(String(value || '').trim());
  }

  private formatStatusLabel(status: ManageableBedStatus): string {
    const labels: Record<ManageableBedStatus, string> = {
      available: 'Available',
      on_hold: 'On Hold',
      cleaning: 'Cleaning',
      maintenance: 'Maintenance',
    };
    return labels[status];
  }

  private bedTypeFromRoomType(roomType?: string): string {
    const value = String(roomType || '').toLowerCase();
    return value.includes('icu')
      ? 'icu'
      : value.includes('isolation')
        ? 'isolation'
        : 'standard';
  }

  @HostListener('document:click', ['$event'])
  closeBedMenus(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.ward-bed-card__menu-wrap')) {
      return;
    }

    this.activeBedMenu = null;
  }

  trackByBedKey(_index: number, bed: WardBed): string {
    return String(bed.roomId || bed.bedNo);
  }

  trackByMenuAction(_index: number, action: WardBedMenuAction): string {
    return action.key;
  }

  navigateTo(route?: string): void {
    if (!route) {
      return;
    }

    void this.router.navigate([route]);
  }

  bedStatusLabel(bed: WardBed): string {
    if (bed.clinicalStatus === 'critical') {
      return 'Critical';
    }
    if (bed.clinicalStatus === 'discharge_pending') {
      return 'Discharge Pending';
    }
    if (bed.clinicalStatus === 'observation') {
      return 'Observation';
    }

    const labels: Record<WardBed['status'], string> = {
      available: 'Available',
      occupied: 'Stable',
      on_hold: 'On Hold',
      cleaning: 'Cleaning',
      maintenance: 'Maintenance',
      critical: 'Critical',
    };

    return labels[bed.status];
  }

  bedStatusClass(bed: WardBed): string {
    if (bed.clinicalStatus === 'discharge_pending') {
      return 'ward-bed--discharge';
    }
    if (bed.clinicalStatus === 'observation') {
      return 'ward-bed--observation';
    }

    return `ward-bed--${bed.status}`;
  }

  patientMeta(bed: WardBed): string {
    const parts = [
      bed.age != null ? `${bed.age}Y` : '',
      bed.sex || '',
    ].filter(Boolean);
    return parts.join(' / ');
  }

  bedTitle(bed: WardBed): string {
    const room = bed.roomNo || bed.bedNo;
    return `${room} - ${bed.bedNo}`;
  }

  wardTypeLabel(bed: WardBed): string {
    return bed.roomType ? `${bed.roomType} Ward` : bed.wardName || 'Ward';
  }

  admissionLabel(bed: WardBed): string {
    return formatAdmissionDateTime(bed.admittedAt);
  }

  trackBySectionName(_index: number, section: WardSection): string {
    return `${section.sectionName}|${section.subtitle}`;
  }

  private applyBedFilters(): void {
    const query = this.bedSearchQuery.trim().toLowerCase();

    this.filteredBedSections = this.bedSections
      .map((section) => ({
        ...section,
        beds: section.beds.filter((bed) => this.matchesBedFilters(bed, query)),
      }))
      .filter((section) => section.beds.length > 0);
  }

  private matchesBedFilters(bed: WardBed, query: string): boolean {
    if (!this.matchesStatusFilter(bed)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      bed.patientName,
      bed.patientNo,
      bed.bedNo,
      bed.roomNo,
      bed.doctorName,
      bed.wardName,
      bed.diagnosis,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }

  private matchesStatusFilter(bed: WardBed): boolean {
    switch (this.statusFilter) {
      case 'all':
        return true;
      case 'available':
        return bed.status === 'available';
      case 'occupied':
        return bed.status === 'occupied' || bed.status === 'critical';
      case 'cleaning':
        return bed.status === 'cleaning';
      case 'maintenance':
        return bed.status === 'maintenance';
      case 'critical':
        return bed.status === 'critical' || bed.clinicalStatus === 'critical';
      case 'discharge_pending':
        return bed.clinicalStatus === 'discharge_pending';
      case 'icu':
        return String(bed.roomType || '').toLowerCase() === 'icu';
      case 'private':
        return String(bed.roomType || '').toLowerCase() === 'private';
      case 'general':
        return String(bed.roomType || '').toLowerCase() === 'general';
      default:
        return true;
    }
  }

  private todayInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
