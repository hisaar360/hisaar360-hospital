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

const EXTRA_ROUTES = [
  '/ward/vitals',
  '/ward/mar',
  '/ward/drips-iv',
  '/ward/io-chart',
  '/ward/orders-services',
  '/ward/nursing-care',
  '/ward/duty-roster',
  '/ward/dashboard',
  '/ward/inventory',
  '/ward/nurses-staff',
  '/ward/reports',
  '/hospital-forms',
  '/ward-admin',
  '/operations',
];

const MATERNITY_ROUTES = ['/ward/nursery', '/ward/nursery/birth-records'];

const CORE_ROUTES = ['/ward/home', '/ward/admissions', '/ward/patient-list', '/ward/bed-management'];

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

  it('gives legacy nurse the core desk without extras', () => {
    const sections = buildWardNavSections(context({ role: 'Nurse' }));
    expect(sections.map((section) => section.key)).toEqual(['primary']);
    expect(routesOf(sections)).toEqual(['/ward/home', '/ward/patient-list', '/ward/bed-management']);
    expect(routesOf(sections)).not.toContain('/ward/my-work');
    EXTRA_ROUTES.forEach((route) => expect(routesOf(sections)).not.toContain(route));
  });

  it('includes admissions for nurses with admissions access', () => {
    const sections = buildWardNavSections(
      context({ role: 'Nurse', canViewAdmissions: true })
    );
    expect(routesOf(sections)).toEqual(CORE_ROUTES);
  });

  it('gives a doctor a single My Inpatients entry', () => {
    const sections = buildWardNavSections(context({ role: 'Doctor' }));
    expect(sections.length).toBe(1);
    expect(sections[0].items).toEqual([{ label: 'My Inpatients', route: '/ward/patient-list' }]);
  });

  it('gives ward admin the core desk plus maternity when enabled — no Management or roster', () => {
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

    expect(sections.map((section) => section.key)).toEqual(['primary', 'maternity']);
    expect(routesOf(sections)).toEqual([...CORE_ROUTES, ...MATERNITY_ROUTES]);
    EXTRA_ROUTES.forEach((route) => expect(routesOf(sections)).not.toContain(route));
  });

  it('ignores canViewManagement — Management block is removed from the slim menu', () => {
    const withPerm = buildWardNavSections(
      context({
        role: 'Hospital Admin',
        showWardOpsMenu: true,
        canViewManagement: true,
        permissions: ['ward.read', 'ward.management.read'],
      })
    );
    expect(withPerm.map((section) => section.key)).toEqual(['primary']);
    expect(routesOf(withPerm)).toEqual(CORE_ROUTES);
  });

  it('gives admission desk staff admissions, patients and beds', () => {
    const sections = buildWardNavSections(
      context({ role: 'Admission Officer', permissions: ['ward.read', 'ward.admissions.create'] })
    );

    expect(routesOf(sections)).toEqual(['/ward/admissions', '/ward/patient-list', '/ward/bed-management']);
  });

  it('shows nursery and birth records when maternity is enabled', () => {
    const nurseryNurse = buildWardNavSections(context({ role: 'Nurse', canViewMaternity: true }));
    expect(routesOf(nurseryNurse)).toContain('/ward/nursery');
    expect(routesOf(nurseryNurse)).toContain('/ward/nursery/birth-records');

    const withoutMaternity = buildWardNavSections(context({ role: 'Nurse', canViewMaternity: false }));
    expect(routesOf(withoutMaternity)).not.toContain('/ward/nursery');
  });

  it('keeps duty roster off the menu even when the flag is set', () => {
    const withRoster = buildWardNavSections(
      context({ role: 'Ward Admin', showWardOpsMenu: true, canViewRoster: true })
    );
    expect(routesOf(withRoster)).not.toContain('/ward/duty-roster');
  });

  it('lands each ward role on its own home screen', () => {
    expect(resolveWardLandingRoute('Ward Attendant', ['ward.read'])).toBe('/ward/tasks');
    expect(resolveWardLandingRoute('Ward Boy', ['ward.read'])).toBe('/ward/tasks');
    expect(resolveWardLandingRoute('Nurse', ['ward.read'])).toBe('/ward/home');
    expect(resolveWardLandingRoute('Staff Nurse', ['ward.read'])).toBe('/ward/home');
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

  it('never surfaces charting or management pages in the primary nav', () => {
    const roles = ['Nurse', 'Ward Admin', 'Doctor', 'Ward Boy', 'Admission Officer', ''];
    roles.forEach((role) => {
      const routes = routesOf(
        buildWardNavSections(
          context({
            role,
            permissions: ['ward.read', 'ward.admissions.create'],
            showWardOpsMenu: role === 'Ward Admin',
            canViewMaternity: true,
            canViewManagement: true,
            canViewRoster: true,
            canViewOperations: true,
          })
        )
      );
      EXTRA_ROUTES.forEach((extraRoute) => expect(routes).not.toContain(extraRoute));
    });
  });
});
