import {
  AfterViewInit,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { sidebarDropdownAnimation } from './sidebar-dropdown.animation';
import {
  canViewWardAdminMenu,
  canViewWardManagementMenu,
  hasPermission,
  hasRouteAccess,
  isWardCareRole,
  isWardOperationalRole,
  readStoredPermissions,
  readStoredRole,
  resolveDefaultRoute,
} from '../../auth/access-control';
import { isCurrentLaboratoryEdition } from '../../auth/product-edition';
import {
  isClinicalModuleEnabled,
  isHospitalPatientsModuleAllowed,
  isHospitalSetupModuleAllowed,
  isLaboratoryModuleEnabled,
  isPharmacyModuleEnabled,
  isPharmacyOnlyModules,
  isPharmacyWardIntegrationAllowed,
  isWardModuleEnabled,
} from '../../auth/hospital-modules';
import { canAccessHospitalSetup } from '../../auth/hospital-scope';
import { buildWardNavSections, WardNavSection } from '../ward/ward-nav.util';
import { AuthService } from '../../../core/services/auth.service';
import { CurrencyService } from '../../../core/services/currency.service';

type SidebarSectionKey =
  | 'doctors'
  | 'prescriptions'
  | 'pharmacy'
  | 'pharmacySales'
  | 'pharmacyPurchases'
  | 'pharmacyStock'
  | 'pharmacyAccounts'
  | 'pharmacyWard'
  | 'laboratory'
  | 'ward'
  | 'wardManagement'
  | 'patients'
  | 'rooms'
  | 'setup'
  | 'payments'
  | 'accounts'
  | 'accountsJournals';

/** Top-level accordion sections — opening one collapses the others. */
const TOP_LEVEL_SECTIONS: SidebarSectionKey[] = [
  'doctors',
  'prescriptions',
  'pharmacy',
  'laboratory',
  'ward',
  'patients',
  'rooms',
  'setup',
  'payments',
  'accounts',
];

@Component({
  selector: 'app-leftmenu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './leftmenu.component.html',
  styleUrl: './leftmenu.component.scss',
  animations: [sidebarDropdownAnimation],
})
export class LeftmenuComponent implements OnInit, AfterViewInit {
  isCollapsed = true;
  Pagecollapse = true;
  PaymentCollapsed = true;
  RoomCollapsed = true;
  PatientCollapsed = true;
  PharmacyCollapsed = true;
  PharmacySalesCollapsed = true;
  PharmacyPurchasesCollapsed = true;
  PharmacyStockCollapsed = true;
  PharmacyAccountsCollapsed = true;
  PharmacyWardCollapsed = true;
  PrescriptionCollapsed = true;
  LaboratoryCollapsed = true;
  WardCollapsed = true;
  WardManagementCollapsed = true;
  SetupCollapsed = true;
  AccountsCollapsed = true;
  AccountsJournalsCollapsed = true;
  /** Cached — must NOT be a getter. A fresh array each CD pass freezes the UI
   *  when Ward expands (`*ngFor` destroy/recreate loop). */
  wardNavSections: WardNavSection[] = [];
  private router = inject(Router);
  private authService = inject(AuthService);
  private currencyService = inject(CurrencyService);
  role = localStorage.getItem('role') || '';
  permissions = readStoredPermissions();

  get isLaboratoryEdition(): boolean {
    return isCurrentLaboratoryEdition();
  }

  get isDoctor(): boolean {
    return this.normalizeRole(this.role) === 'doctor';
  }

  /** Ward Admin / Nurse / Attendant / Ward Reception — work inside Ward, not OPD/Lab shells. */
  get isWardOperationalRole(): boolean {
    return isWardOperationalRole(this.role, this.permissions);
  }

  get isOwner(): boolean {
    return this.normalizeRole(this.role) === 'owner';
  }

  get isSuperAdmin(): boolean {
    return this.normalizeRole(this.role) === 'superadmin';
  }

  get canViewAllRoutes(): boolean {
    return this.hasWildcardPermission && !this.isLaboratoryEdition;
  }

  get canViewUsers(): boolean {
    return this.canViewAllRoutes || this.hasPermission('users.read');
  }

  get canViewHospitals(): boolean {
    return this.canViewAllRoutes || this.hasPermission('hospitals.read');
  }

  get canViewRoles(): boolean {
    return this.canViewAllRoutes || this.hasPermission('roles.read');
  }

  get canViewAuditLogs(): boolean {
    return this.canViewAllRoutes || this.hasPermission('audit_logs.read');
  }

  get canViewDashboard(): boolean {
    if (this.isLaboratoryEdition) {
      return false;
    }

    return this.canViewHospitalDashboard || this.canViewClinicalDashboard;
  }

  get canViewHospitalDashboard(): boolean {
    if (!isClinicalModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('hospital_dashboard.read');
  }

  get canViewClinicalDashboard(): boolean {
    if (!isClinicalModuleEnabled()) {
      return false;
    }

    return (
      this.isDoctor &&
      !this.canViewHospitalDashboard &&
      this.hasPermission('appointments.read') &&
      this.hasPermission('prescriptions.read')
    );
  }

  get dashboardRoute(): string {
    if (this.canViewHospitalDashboard) {
      return '/';
    }

    if (this.canViewClinicalDashboard) {
      return '/doctor-dashboard';
    }

    return this.homeRoute;
  }

  get homeRoute(): string {
    return resolveDefaultRoute(this.permissions, this.role);
  }

  get canViewDoctors(): boolean {
    if (this.isLaboratoryEdition || !isClinicalModuleEnabled()) {
      return false;
    }
    if (this.isWardOperationalRole) {
      return false;
    }
    return this.canViewAllRoutes || this.hasPermission('doctors.read');
  }

  get canViewOwnSchedule(): boolean {
    if (this.isLaboratoryEdition || !isClinicalModuleEnabled()) {
      return false;
    }
    return this.isDoctor;
  }

  get canManageDoctors(): boolean {
    if (this.isLaboratoryEdition || !isClinicalModuleEnabled()) {
      return false;
    }
    if (this.isWardOperationalRole) {
      return false;
    }

    return (
      this.canViewAllRoutes ||
      this.hasPermission('doctors.create') ||
      this.hasPermission('doctors.update')
    );
  }

  get canViewAppointments(): boolean {
    if (this.isLaboratoryEdition || !isClinicalModuleEnabled()) {
      return false;
    }
    if (this.isWardOperationalRole) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('appointments.read');
  }

  get canViewClinicalRecords(): boolean {
    if (this.isLaboratoryEdition || !isClinicalModuleEnabled()) {
      return false;
    }
    if (this.isWardOperationalRole) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('patients_history.read');
  }

  get canManageClinicalRecords(): boolean {
    if (this.isLaboratoryEdition || !isClinicalModuleEnabled()) {
      return false;
    }
    if (this.isWardOperationalRole) {
      return false;
    }

    return (
      this.canViewAllRoutes ||
      this.hasPermission('patients_history.create') ||
      this.hasPermission('patients_history.update')
    );
  }

  get canViewPrescriptions(): boolean {
    if (this.isLaboratoryEdition || !isClinicalModuleEnabled()) {
      return false;
    }
    // Ward operational roles use Ward chart / MAR — not OPD Consultation menus.
    if (this.isWardOperationalRole) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('prescriptions.read');
  }

  get canManagePrescriptions(): boolean {
    if (this.isLaboratoryEdition || !isClinicalModuleEnabled()) {
      return false;
    }
    if (this.isWardOperationalRole) {
      return false;
    }

    return (
      this.canViewAllRoutes ||
      this.hasPermission('prescriptions.create') ||
      this.hasPermission('prescriptions.update')
    );
  }

  get canViewPharmacy(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('products.read');
  }

  get canViewPharmacyInvoiceSettings(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return (
      this.canViewAllRoutes ||
      this.hasPermission('company.manage') ||
      this.hasPermission('products.read')
    );
  }

  get canViewPharmacySettings(): boolean {
    return this.canViewPharmacyInvoiceSettings;
  }

  get canOpenPharmacyPos(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return (
      this.canViewAllRoutes ||
      (this.hasPermission('sales.create') &&
        this.hasPermission('sales.read') &&
        this.hasPermission('products.read') &&
        this.hasPermission('register_sessions.open') &&
        this.hasPermission('register_sessions.read') &&
        this.hasPermission('register_sessions.close'))
    );
  }

  get canViewPosReports(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return (
      this.canViewAllRoutes ||
      this.hasPermission('reports.read') ||
      this.hasPermission('sales.read') ||
      this.hasPermission('products.read') ||
      this.hasPermission('register_sessions.read')
    );
  }

  get canViewPharmacyCustomers(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('customers.read');
  }

  get canViewPharmacySuppliers(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('suppliers.read');
  }

  get canViewPharmacyInventory(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('inventory.read');
  }

  get canViewPharmacyStockMovements(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('stock_movements.read');
  }

  get canViewPharmacySales(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('sales.read');
  }

  get canViewPharmacyTransfers(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('transfers.read');
  }

  get canViewPharmacyReturns(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('returns.read');
  }

  get canViewPharmacyPayments(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('payments.read');
  }

  get canViewPharmacyRegisterSessions(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return (
      this.canViewAllRoutes ||
      this.hasPermission('register_sessions.read') ||
      this.hasPermission('register_sessions.admin_read')
    );
  }

  get canViewPharmacyExpenses(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('expenses.read');
  }

  get canViewPurchases(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('purchases.read');
  }

  get canViewAccounts(): boolean {
    return (
      this.canViewAllRoutes ||
      this.hasPermission('accounts.read') ||
      this.hasPermission('accounts.reports.read') ||
      this.hasPermission('accounts.journals.read') ||
      this.hasPermission('accounts.cash_settlement.view')
    );
  }

  get canViewDepartmentCash(): boolean {
    return (
      this.canViewAllRoutes ||
      this.hasPermission('accounts.cash_settlement.view') ||
      this.hasPermission('accounts.reports.read') ||
      this.hasPermission('accounts.read')
    );
  }

  get canViewPharmacyCash(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }
    return this.canViewDepartmentCash;
  }

  get canViewWardCash(): boolean {
    if (this.isLaboratoryEdition || !isWardModuleEnabled()) {
      return false;
    }
    return this.canViewDepartmentCash;
  }

  get canViewOpdCash(): boolean {
    // Pharmacy-only installs have no OPD till / OPD billing UI.
    if (
      this.isLaboratoryEdition ||
      !isClinicalModuleEnabled() ||
      isPharmacyOnlyModules()
    ) {
      return false;
    }
    return this.canViewDepartmentCash;
  }

  get canViewAppointmentPayments(): boolean {
    // OPD / appointment fee audit needs clinical module — hide on pharmacy-only.
    if (
      this.isLaboratoryEdition ||
      !isClinicalModuleEnabled() ||
      isPharmacyOnlyModules()
    ) {
      return false;
    }
    return (
      this.canViewDepartmentCash ||
      this.hasPermission('appointments.read') ||
      this.hasPermission('appointments.update') ||
      this.hasPermission('ledger_payments.create')
    );
  }

  get canViewClinicalOpdSection(): boolean {
    return (
      this.canViewAppointments ||
      this.canViewClinicalRecords ||
      this.canManageClinicalRecords ||
      this.canViewPrescriptions ||
      this.canManagePrescriptions ||
      this.canViewAppointmentPayments
    );
  }

  get canViewLabDayPayments(): boolean {
    if (!isLaboratoryModuleEnabled()) {
      return false;
    }
    return this.canViewLabOrders || this.canViewDepartmentCash;
  }

  get canViewWardDayCollections(): boolean {
    if (this.isLaboratoryEdition || !isWardModuleEnabled()) {
      return false;
    }
    return (
      this.canViewWardAdmin ||
      this.hasPermission('ward.billing.read') ||
      this.hasPermission('ward.payments.collect') ||
      this.canViewDepartmentCash
    );
  }

  get canViewLaboratory(): boolean {
    if (!isLaboratoryModuleEnabled()) {
      return false;
    }
    // Lab orders from ward go through Ward patient chart — not Lab Dashboard.
    if (this.isWardOperationalRole) {
      return false;
    }

    return (
      this.canViewAllRoutes ||
      this.hasPermission('lab_orders.read') ||
      this.hasPermission('lab_tests.read')
    );
  }

  get canViewLabOrders(): boolean {
    if (this.isWardOperationalRole) {
      return false;
    }
    return this.canViewAllRoutes || this.hasPermission('lab_orders.read');
  }

  get canViewLabCatalog(): boolean {
    if (this.isWardOperationalRole) {
      return false;
    }
    return (
      this.canViewAllRoutes ||
      this.hasPermission('lab_tests.create') ||
      this.hasPermission('lab_tests.update') ||
      (this.hasPermission('lab_tests.read') && this.hasPermission('lab_orders.create'))
    );
  }

  get canCreateLaboratoryOrder(): boolean {
    if (this.isWardOperationalRole) {
      return false;
    }
    return this.canViewAllRoutes || this.hasPermission('lab_orders.create');
  }

  get canManageLaboratorySettings(): boolean {
    return this.canViewAllRoutes || this.hasPermission('lab_tests.update');
  }

  get canViewWardAdmin(): boolean {
    if (this.isLaboratoryEdition || !isWardModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('ward.read');
  }

  /** Full ops submenu (dashboard, roster, inventory, nursery). Care roles see only care links. */
  get showWardOpsMenu(): boolean {
    return this.canViewAllRoutes || canViewWardAdminMenu(this.role, this.permissions);
  }

  get isWardCareNav(): boolean {
    return isWardCareRole(this.role) && !this.showWardOpsMenu;
  }

  get canViewWardAdmissionsNav(): boolean {
    return (
      this.canViewAllRoutes ||
      this.hasPermission('ward.admissions.create') ||
      this.hasPermission('ward.admissions.recommend') ||
      this.hasPermission('room_allotments.create') ||
      this.showWardOpsMenu
    );
  }

  /** Maternity / nursery links stay off the menu unless the user actually works there. */
  get canViewWardMaternityNav(): boolean {
    return (
      this.showWardOpsMenu ||
      this.hasNavAccess('ward.nursery.read') ||
      this.hasNavAccess('ward.nursery.birth_records.read')
    );
  }

  get canViewPatients(): boolean {
    if (!isHospitalPatientsModuleAllowed()) {
      return false;
    }
    return this.canViewAllRoutes || this.hasPermission('patients.read');
  }

  get canManagePatients(): boolean {
    if (!isHospitalPatientsModuleAllowed()) {
      return false;
    }
    return (
      this.canViewAllRoutes ||
      this.hasPermission('patients.create') ||
      this.hasPermission('patients.update')
    );
  }

  get canViewRooms(): boolean {
    if (this.isLaboratoryEdition || !isWardModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('rooms.read');
  }

  get canManageRooms(): boolean {
    if (this.isLaboratoryEdition || !isWardModuleEnabled()) {
      return false;
    }

    return (
      this.canViewAllRoutes ||
      this.hasPermission('rooms.create') ||
      this.hasPermission('rooms.update')
    );
  }

  get canViewRoomAllotments(): boolean {
    if (this.isLaboratoryEdition || !isWardModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('room_allotments.read');
  }

  get canManageRoomAllotments(): boolean {
    if (this.isLaboratoryEdition || !isWardModuleEnabled()) {
      return false;
    }

    return (
      this.canViewAllRoutes ||
      (this.hasPermission('room_allotments.create') &&
        this.hasPermission('rooms.read') &&
        this.hasPermission('patients.read'))
    );
  }

  get canViewHospitalSetup(): boolean {
    if (this.isLaboratoryEdition || !isHospitalSetupModuleAllowed()) {
      return false;
    }
    return this.canViewAllRoutes || canAccessHospitalSetup();
  }

  get canViewTreatments(): boolean {
    if (this.isLaboratoryEdition || !isHospitalSetupModuleAllowed()) {
      return false;
    }
    return (
      this.canViewAllRoutes ||
      this.hasPermission('treatment_catalog.read') ||
      this.hasPermission('treatment_catalog.create') ||
      this.hasPermission('treatment_catalog.update') ||
      // Hospital admins who already manage setup — rates live under Setup
      this.hasPermission('hospitals.update') ||
      this.hasPermission('departments.update')
    );
  }

  get canViewHospitalForms(): boolean {
    if (this.isLaboratoryEdition) {
      return false;
    }
    return (
      this.canViewAllRoutes ||
      this.hasPermission('hospitals.read') ||
      this.hasPermission('ward.read')
    );
  }

  get canViewOperations(): boolean {
    if (this.isLaboratoryEdition || !isWardModuleEnabled()) {
      return false;
    }
    return (
      this.canViewAllRoutes ||
      this.hasPermission('operations.read') ||
      this.hasPermission('operations.read_all')
    );
  }

  /** Doctors may have operations without ward.read — show a top-level Ops entry. */
  get canViewOperationsStandalone(): boolean {
    return this.canViewOperations && !this.canViewWardAdmin;
  }

  get canViewDepartments(): boolean {
    if (this.isLaboratoryEdition || !isClinicalModuleEnabled()) {
      return false;
    }

    return this.canViewAllRoutes || this.hasPermission('departments.read');
  }

  get canViewBilling(): boolean {
    if (!isHospitalPatientsModuleAllowed()) {
      return false;
    }
    return (
      this.canViewAllRoutes ||
      this.hasPermission('encounters.read') ||
      this.hasPermission('ledger_payments.read') ||
      this.hasPermission('bills.read')
    );
  }

  get canViewSettings(): boolean {
    return true;
  }

  get canManageBilling(): boolean {
    if (!isHospitalPatientsModuleAllowed()) {
      return false;
    }
    return (
      this.canViewAllRoutes ||
      this.hasPermission('ledger_payments.create') ||
      this.hasPermission('bills.create') ||
      this.hasPermission('bills.update_payment')
    );
  }

  get canViewPharmacyWardSettlements(): boolean {
    if (!isPharmacyWardIntegrationAllowed()) {
      return false;
    }
    return this.canViewAllRoutes || this.hasPermission('pharmacy.ward_settlements.read');
  }

  get canViewPharmacyWardRequests(): boolean {
    if (!isPharmacyWardIntegrationAllowed()) {
      return false;
    }
    return this.canViewAllRoutes || this.hasPermission('pharmacy.ward_requests.read');
  }

  get showPharmacySalesGroup(): boolean {
    return (
      this.canOpenPharmacyPos ||
      this.canViewPharmacySales ||
      this.canViewPharmacyReturns ||
      this.canViewPharmacyCustomers
    );
  }

  get showPharmacyPurchasesGroup(): boolean {
    return this.canViewPurchases || this.canViewPharmacySuppliers;
  }

  get showPharmacyStockGroup(): boolean {
    return (
      this.canViewPharmacy ||
      this.canViewPharmacyInventory ||
      this.canViewPharmacyStockMovements ||
      this.canViewPharmacyTransfers
    );
  }

  get canViewPharmacyLedger(): boolean {
    if (this.isLaboratoryEdition || !isPharmacyModuleEnabled()) {
      return false;
    }
    return (
      this.canViewAllRoutes ||
      this.hasPermission('accounts.cash_settlement.view') ||
      this.hasPermission('accounts.reports.read') ||
      this.hasPermission('accounts.read') ||
      this.hasPermission('accounts.journals.create') ||
      this.hasPermission('accounts.cash_settlement.manage')
    );
  }

  get showPharmacyAccountsGroup(): boolean {
    return (
      this.canViewPharmacyCash ||
      this.canViewPharmacyLedger ||
      this.canViewPharmacyPayments ||
      this.canViewPharmacyExpenses ||
      this.canViewPharmacyRegisterSessions ||
      this.canViewPosReports
    );
  }

  get showAccountsJournalsGroup(): boolean {
    return (
      this.canViewAllRoutes ||
      this.hasPermission('accounts.journals.read') ||
      this.hasPermission('accounts.journals.create') ||
      this.hasPermission('accounts.read')
    );
  }

  get showPharmacyWardGroup(): boolean {
    return this.canViewPharmacyWardRequests || this.canViewPharmacyWardSettlements;
  }

  get canViewHospitalAdministration(): boolean {
    return this.canViewHospitals || this.canViewUsers || this.canViewRoles || this.canViewAuditLogs;
  }

  get hasWildcardPermission(): boolean {
    return this.permissions.includes('*');
  }

  constructor() {
    this.initializeCollapsedStates();
    this.rebuildWardNavSections();
  }

  ngOnInit(): void {
    this.authService.me({ force: true }).subscribe({
      next: () => this.refreshAccess(),
      error: () => this.refreshAccess(),
    });
    this.currencyService.ensureLoaded();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.refreshAccess();
        this.syncOpenSectionsFromRoute(event.urlAfterRedirects);
        this.closeSidebarOnMobile();
      }
    });
  }

  ngAfterViewInit() {
    this.applyThemeAndStyles();
  }

  private initializeCollapsedStates(): void {
    this.collapseAllTopLevel();
    this.syncOpenSectionsFromRoute(this.router.url);
  }

  private collapseAllTopLevel(): void {
    this.isCollapsed = true;
    this.PrescriptionCollapsed = true;
    this.PharmacyCollapsed = true;
    this.LaboratoryCollapsed = true;
    this.WardCollapsed = true;
    this.PatientCollapsed = true;
    this.RoomCollapsed = true;
    this.SetupCollapsed = true;
    this.PaymentCollapsed = true;
    this.AccountsCollapsed = true;
  }

  private syncOpenSectionsFromRoute(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    this.collapseAllTopLevel();

    const pharmacyApptFees =
      path.startsWith('/accounts/appointment-payments') &&
      (url.includes('channel=pharmacy') || url.includes('channel%3Dpharmacy'));

    if (
      path.startsWith('/prescriptions') ||
      path.startsWith('/appointments') ||
      path.startsWith('/clinical-records') ||
      (path.startsWith('/accounts/appointment-payments') && !pharmacyApptFees)
    ) {
      this.PrescriptionCollapsed = false;
    } else if (path.includes('doctors') || path.startsWith('/doctors-schedule') || path.startsWith('/all-doctors') || path.startsWith('/add-doctors')) {
      this.isCollapsed = false;
    } else if (
      path.startsWith('/pharmacy') ||
      path.startsWith('/pos-reports') ||
      path === '/accounts/pharmacy-cash' ||
      pharmacyApptFees
    ) {
      this.PharmacyCollapsed = false;
    } else if (path.startsWith('/laboratory')) {
      this.LaboratoryCollapsed = false;
    } else if (
      path.startsWith('/ward') ||
      path.includes('ward-admin') ||
      path.startsWith('/operations') ||
      path === '/accounts/ward-cash' ||
      path.startsWith('/ward/day-collections')
    ) {
      this.WardCollapsed = false;
    } else if (path.startsWith('/patients')) {
      this.PatientCollapsed = false;
    } else if (path.startsWith('/room-allotment')) {
      this.RoomCollapsed = false;
    } else if (path.startsWith('/hospital-setup') || path.startsWith('/hospital-forms')) {
      this.SetupCollapsed = false;
    } else if (path.startsWith('/payments')) {
      this.PaymentCollapsed = false;
    } else if (path.startsWith('/accounts')) {
      this.AccountsCollapsed = false;
    }

    this.syncPharmacyGroups(path);
    this.syncAccountsJournalsGroup(url);
    this.WardManagementCollapsed = !(
      path.includes('/ward/dashboard') ||
      path.includes('/ward/bed-management') ||
      path.includes('/ward/duty-roster') ||
      path.includes('/ward/inventory') ||
      path.includes('/ward/nurses-staff') ||
      path.includes('/ward/reports') ||
      path.includes('ward-admin') ||
      path.includes('/operations')
    );
  }

  private syncPharmacyGroups(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    const pharmacyApptFees =
      path.startsWith('/accounts/appointment-payments') &&
      (url.includes('channel=pharmacy') || url.includes('channel%3Dpharmacy'));
    const matches = (prefixes: string[]) =>
      prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

    this.PharmacySalesCollapsed = !matches([
      '/pharmacy/pos',
      '/pharmacy/sales',
      '/pharmacy/sales-returns',
      '/pharmacy/returns/sales',
      '/pharmacy/customers',
    ]);
    this.PharmacyPurchasesCollapsed = !matches([
      '/pharmacy/purchases',
      '/pharmacy/purchase-returns',
      '/pharmacy/suppliers',
    ]);
    this.PharmacyStockCollapsed = !matches([
      '/pharmacy/products',
      '/pharmacy/inventory',
      '/pharmacy/stock-movements',
      '/pharmacy/transfers',
    ]);
    this.PharmacyAccountsCollapsed =
      !pharmacyApptFees &&
      !matches([
        '/accounts/pharmacy-cash',
        '/pharmacy/ledger',
        '/pharmacy/payments',
        '/pharmacy/expenses',
        '/pharmacy/register-sessions',
        '/pharmacy/reports',
      ]);
    this.PharmacyWardCollapsed = !matches([
      '/pharmacy/ward-requests',
      '/pharmacy/ward-settlements',
    ]);
  }

  private syncAccountsJournalsGroup(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    const matches = (prefixes: string[]) =>
      prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    this.AccountsJournalsCollapsed = !matches([
      '/accounts/general-ledger',
      '/accounts/journal',
      '/accounts/cash-book',
      '/accounts/bank-book',
    ]);
  }

  private setTopLevelOpen(section: SidebarSectionKey, open: boolean): void {
    const apply = (key: SidebarSectionKey, collapsed: boolean) => {
      switch (key) {
        case 'doctors':
          this.isCollapsed = collapsed;
          break;
        case 'prescriptions':
          this.PrescriptionCollapsed = collapsed;
          break;
        case 'pharmacy':
          this.PharmacyCollapsed = collapsed;
          break;
        case 'laboratory':
          this.LaboratoryCollapsed = collapsed;
          break;
        case 'ward':
          this.WardCollapsed = collapsed;
          break;
        case 'patients':
          this.PatientCollapsed = collapsed;
          break;
        case 'rooms':
          this.RoomCollapsed = collapsed;
          break;
        case 'setup':
          this.SetupCollapsed = collapsed;
          break;
        case 'payments':
          this.PaymentCollapsed = collapsed;
          break;
        case 'accounts':
          this.AccountsCollapsed = collapsed;
          break;
        default:
          break;
      }
    };

    if (open && TOP_LEVEL_SECTIONS.includes(section)) {
      for (const key of TOP_LEVEL_SECTIONS) {
        apply(key, key !== section);
      }
      return;
    }

    apply(section, !open);
  }

  isTopOpen(section: SidebarSectionKey): boolean {
    switch (section) {
      case 'doctors':
        return !this.isCollapsed;
      case 'prescriptions':
        return !this.PrescriptionCollapsed;
      case 'pharmacy':
        return !this.PharmacyCollapsed;
      case 'laboratory':
        return !this.LaboratoryCollapsed;
      case 'ward':
        return !this.WardCollapsed;
      case 'patients':
        return !this.PatientCollapsed;
      case 'rooms':
        return !this.RoomCollapsed;
      case 'setup':
        return !this.SetupCollapsed;
      case 'payments':
        return !this.PaymentCollapsed;
      case 'accounts':
        return !this.AccountsCollapsed;
      default:
        return false;
    }
  }

  private normalizeRole(role: string): string {
    return role
      .trim()
      .replace(/[\s_-]/g, '')
      .toLowerCase();
  }

  private refreshAccess(): void {
    this.role = localStorage.getItem('role') || '';
    this.permissions = readStoredPermissions();
    this.rebuildWardNavSections();
  }

  private rebuildWardNavSections(): void {
    this.wardNavSections = buildWardNavSections({
      role: this.role,
      permissions: this.permissions,
      canViewWard: this.canViewWardAdmin,
      canViewAllRoutes: this.canViewAllRoutes,
      showWardOpsMenu: this.showWardOpsMenu,
      canViewManagement:
        this.canViewAllRoutes || canViewWardManagementMenu(this.role, this.permissions),
      canViewAdmissions: this.canViewWardAdmissionsNav,
      canViewRoster: this.hasNavAccess('ward.roster.read'),
      canViewOperations: this.canViewOperations,
      canViewMaternity: this.canViewWardMaternityNav,
    });
  }

  trackWardSection(_index: number, section: WardNavSection): string {
    return section.key;
  }

  trackWardItem(_index: number, item: { route: string; label: string }): string {
    return item.route || item.label;
  }

  private hasPermission(permission: string): boolean {
    return hasPermission(permission, this.permissions);
  }

  hasNavAccess(access: string | string[]): boolean {
    const requirement = Array.isArray(access) ? access : [access];
    return this.canViewAllRoutes || hasRouteAccess(requirement, this.permissions);
  }

  private applyThemeAndStyles(): void {
    setTimeout(() => {
      this.setThemeColor();
      this.applySidebarClass();
      this.applyGradientClasses();
    });
  }

  private setThemeColor(): void {
    document.getElementById('body')?.classList.add('theme-green');
  }

  private applySidebarClass(): void {
    const sidebar = document.getElementById('left-sidebar');
    const sidebarPref = sessionStorage.getItem('Sidebar');

    if (sidebarPref) {
      sidebar?.classList.add(sidebarPref);
    } else {
      sidebar?.classList.remove('light_active');
    }
  }

  private applyGradientClasses(): void {
    const colorElements = document.getElementsByClassName('theme-bg');
    const gradientPref = sessionStorage.getItem('GradientColor');

    Array.from(colorElements).forEach((element) => {
      if (gradientPref) {
        element.classList.add('gradient');
      } else {
        element.classList.remove('gradient');
      }
    });
  }

  toggleMenu(): void {
    document.body.classList.toggle('toggle_menu_active');
  }

  cToggoleMenu(): void {
    document.body.classList.remove('offcanvas-active');
    document.querySelector('.overlay')?.classList.remove('open');
  }

  /**
   * Pharmacy parent: toggle submenu like other sections.
   * When expanding, land on Pharmacy Dashboard (not Accounts).
   */
  openPharmacySection(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.isTopOpen('pharmacy')) {
      this.setTopLevelOpen('pharmacy', false);
      return;
    }

    this.setTopLevelOpen('pharmacy', true);
    if (this.canViewPharmacy) {
      void this.router.navigate(['/pharmacy']);
      this.closeSidebarOnMobile();
      return;
    }
    if (this.canOpenPharmacyPos) {
      void this.router.navigate(['/pharmacy/pos']);
      this.closeSidebarOnMobile();
      return;
    }
    if (this.canViewPosReports) {
      void this.router.navigate(['/pharmacy/reports']);
      this.closeSidebarOnMobile();
    }
  }

  /** Expand/collapse sidebar sections — used by all `has-arrow` parents. */
  toggleSection(section: SidebarSectionKey, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (TOP_LEVEL_SECTIONS.includes(section)) {
      this.setTopLevelOpen(section, !this.isTopOpen(section));
      return;
    }

    switch (section) {
      case 'pharmacySales':
        this.PharmacySalesCollapsed = !this.PharmacySalesCollapsed;
        break;
      case 'pharmacyPurchases':
        this.PharmacyPurchasesCollapsed = !this.PharmacyPurchasesCollapsed;
        break;
      case 'pharmacyStock':
        this.PharmacyStockCollapsed = !this.PharmacyStockCollapsed;
        break;
      case 'pharmacyAccounts':
        this.PharmacyAccountsCollapsed = !this.PharmacyAccountsCollapsed;
        break;
      case 'pharmacyWard':
        this.PharmacyWardCollapsed = !this.PharmacyWardCollapsed;
        break;
      case 'accountsJournals':
        this.AccountsJournalsCollapsed = !this.AccountsJournalsCollapsed;
        break;
      case 'wardManagement':
        this.WardManagementCollapsed = !this.WardManagementCollapsed;
        break;
      default:
        break;
    }
  }

  private closeSidebarOnMobile(): void {
    if (window.innerWidth < 768) {
      document.body.classList.remove('offcanvas-active');
      document.querySelector('.overlay')?.classList.remove('open');
    }
  }
}
