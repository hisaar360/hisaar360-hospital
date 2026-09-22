import {
  isWardAttendantRole,
  isWardReceptionRole,
  resolveWardLandingRoute,
} from '../../auth/access-control';
import { buildWardNavSections, WardNavContext } from './ward-nav.util';

const context = (overrides: Partial<WardNavContext>): WardNavContext => ({
  role: '',
  permissions: ['ward.read'],
  canViewWard: true,
  ...overrides,
});

const routesOf = (sections: ReturnType<typeof buildWardNavSections>): string[] =>
  sections.flatMap((section) => section.items.map((item) => item.route));

const CHART_ONLY_ROUTES = [
  '/ward/vitals',
  '/ward/mar',
  '/ward/drips-iv',
  '/ward/io-chart',
  '/ward/orders-services',
  '/ward/nursing-care',
];

describe('ward-nav.util', () => {
  it('hides the whole menu without ward.read', () => {
    expect(buildWardNavSections(context({ canViewWard: false }))).toEqual([]);
  });

  it('gives a ward attendant only My Tasks', () => {
    const sections = buildWardNavSections(context({ role: 'Ward Attendant' }));
    expect(sections.length).toBe(1);
    expect(routesOf(sections)).toEqual(['/ward/tasks']);
  });

  it('treats ward boy the same as ward attendant', () => {
    expect(routesOf(buildWardNavSections(context({ role: 'Ward Boy' })))).toEqual(['/ward/tasks']);
  });

  it('gives a nurse home, patients and tasks & handover', () => {
    const sections = buildWardNavSections(context({ role: 'Nurse' }));
    expect(sections.map((section) => section.key)).toEqual(['primary', 'tasks']);
    expect(routesOf(sections)).toEqual([
      '/ward/home',
      '/ward/patient-list',
      '/ward/my-work',
      '/ward/shift-handover',
    ]);
  });

  it('gives a doctor a single My Inpatients entry', () => {
    const sections = buildWardNavSections(context({ role: 'Doctor' }));
    expect(sections.length).toBe(1);
    expect(sections[0].items).toEqual([{ label: 'My Inpatients', route: '/ward/patient-list' }]);
  });

  it('gives ward admin primary links plus a collapsible Management group', () => {
    const sections = buildWardNavSections(
      context({
        role: 'Ward Admin',
        showWardOpsMenu: true,
        canViewManagement: true,
        canViewRoster: true,
        canViewOperations: true,
        canViewMaternity: true,
      })
    );

    expect(sections.map((section) => section.key)).toEqual(['primary', 'tasks', 'management', 'maternity']);
    expect(routesOf(sections.slice(0, 2))).toEqual([
      '/ward/home',
      '/ward/admissions',
      '/ward/patient-list',
      '/ward/my-work',
      '/ward/shift-handover',
    ]);

    const managementSection = sections.find((section) => section.key === 'management');
    expect(managementSection?.collapsible).toBe(true);
    expect(managementSection?.items.map((item) => item.route)).toEqual([
      '/ward/dashboard',
      '/ward/bed-management',
      '/operations',
      '/ward/duty-roster',
      '/ward/inventory',
      '/ward/nurses-staff',
      '/ward/reports',
      '/ward-admin',
    ]);
  });

  it('hides Management unless canViewManagement is set', () => {
    const without = buildWardNavSections(
      context({ role: 'Ward Admin', showWardOpsMenu: true, canViewManagement: false })
    );
    expect(without.map((section) => section.key)).toEqual(['primary', 'tasks']);
    expect(routesOf(without)).not.toContain('/ward/dashboard');
    expect(routesOf(without)).not.toContain('/ward/inventory');

    const withPerm = buildWardNavSections(
      context({
        role: 'Hospital Admin',
        showWardOpsMenu: true,
        canViewManagement: true,
        permissions: ['ward.read', 'ward.management.read'],
      })
    );
    expect(withPerm.map((section) => section.key)).toContain('management');
  });

  it('drops roster and operations links when the user lacks those permissions', () => {
    const sections = buildWardNavSections(
      context({ role: 'Ward Admin', showWardOpsMenu: true, canViewManagement: true })
    );
    const managementRoutes = sections.find((section) => section.key === 'management')?.items.map((item) => item.route);

    expect(managementRoutes).not.toContain('/ward/duty-roster');
    expect(managementRoutes).not.toContain('/operations');
  });

  it('gives admission desk staff admissions, patients and beds', () => {
    const sections = buildWardNavSections(
      context({ role: 'Admission Officer', permissions: ['ward.read', 'ward.admissions.create'] })
    );

    expect(routesOf(sections)).toEqual(['/ward/admissions', '/ward/patient-list', '/ward/bed-management']);
  });

  it('keeps maternity links off the menu unless the user works there', () => {
    const nurse = buildWardNavSections(context({ role: 'Nurse' }));
    expect(routesOf(nurse)).not.toContain('/ward/nursery');

    const nurseryNurse = buildWardNavSections(context({ role: 'Nurse', canViewMaternity: true }));
    expect(routesOf(nurseryNurse)).toContain('/ward/nursery');
    expect(routesOf(nurseryNurse)).toContain('/ward/nursery/birth-records');
  });

  it('lands each ward role on its own home screen', () => {
    expect(resolveWardLandingRoute('Ward Attendant', ['ward.read'])).toBe('/ward/tasks');
    expect(resolveWardLandingRoute('Ward Boy', ['ward.read'])).toBe('/ward/tasks');
    expect(resolveWardLandingRoute('Nurse', ['ward.read'])).toBe('/ward/my-work');
    expect(resolveWardLandingRoute('Staff Nurse', ['ward.read'])).toBe('/ward/my-work');
    expect(resolveWardLandingRoute('Doctor', ['ward.read'])).toBe('/ward/patient-list');
    expect(resolveWardLandingRoute('Ward Admin', ['ward.read'])).toBe('/ward/home');
    expect(resolveWardLandingRoute('Admission Officer', ['ward.read', 'room_allotments.create'])).toBe(
      '/ward/admissions'
    );
  });

  it('classifies attendant and admission-desk roles', () => {
    expect(isWardAttendantRole('Ward Boy')).toBe(true);
    expect(isWardAttendantRole('Nurse')).toBe(false);
    expect(isWardReceptionRole('Admission Officer', ['ward.read', 'ward.admissions.create'])).toBe(true);
    expect(isWardReceptionRole('Ward Admin', ['ward.read', 'ward.admissions.create'])).toBe(false);
    expect(isWardReceptionRole('Nurse', ['ward.read', 'room_allotments.create'])).toBe(false);
  });

  it('never surfaces charting pages in the primary nav', () => {
    const roles = ['Nurse', 'Ward Admin', 'Doctor', 'Ward Boy', 'Admission Officer', ''];
    roles.forEach((role) => {
      const routes = routesOf(
        buildWardNavSections(
          context({
            role,
            permissions: ['ward.read', 'ward.admissions.create'],
            showWardOpsMenu: role === 'Ward Admin',
            canViewMaternity: true,
          })
        )
      );
      CHART_ONLY_ROUTES.forEach((chartRoute) => expect(routes).not.toContain(chartRoute));
    });
  });
});
