import { HELP_ARTICLES } from './help-content.data';
import {
  filterModuleGuidesForRole,
  filterQuickTasksForRole,
  isHelpRoleVisible,
  rankArticlesForRole,
  resolveRoleWorkflow,
  sanitizeHelpRoleKey,
  workflowContainsLabel,
  workflowNodeLabels,
} from './help-role-workflows.util';
import { searchHelpArticles } from './help-search.util';

describe('help-role-workflows.util', () => {
  const allFlags = {
    clinical: true,
    pharmacy: true,
    laboratory: true,
    ward: true,
    accounts: true,
    nursery: true,
    setup: true,
  };

  it('sanitizes invalid role keys to All Roles', () => {
    expect(sanitizeHelpRoleKey('doctor')).toBe('doctor');
    expect(sanitizeHelpRoleKey('invalid')).toBe('');
  });

  it('shows Main Hospital Workflow for All Roles', () => {
    const workflow = resolveRoleWorkflow('', allFlags);
    expect(workflow.title).toBe('Main Hospital Workflow');
    expect(workflowContainsLabel(workflow, 'Patient Registration')).toBeTrue();
    expect(workflowContainsLabel(workflow, 'Admission Recommended')).toBeTrue();
  });

  it('changes workflow when Doctor role is selected', () => {
    const allWorkflow = resolveRoleWorkflow('', allFlags);
    const doctorWorkflow = resolveRoleWorkflow('doctor', allFlags);

    expect(doctorWorkflow.title).toBe('Doctor Workflow');
    expect(workflowContainsLabel(doctorWorkflow, 'Recommend Admission')).toBeTrue();
    expect(workflowContainsLabel(doctorWorkflow, 'Review Patient History')).toBeTrue();
    expect(workflowContainsLabel(doctorWorkflow, 'Select Room / Bed')).toBeFalse();
    expect(workflowNodeLabels(allWorkflow)).not.toEqual(workflowNodeLabels(doctorWorkflow));
  });

  it('shows Accounts Workflow for Accountant without clinical front-door steps', () => {
    const accountantWorkflow = resolveRoleWorkflow('accountant', allFlags);
    expect(accountantWorkflow.title).toBe('Accounts Workflow');
    expect(workflowContainsLabel(accountantWorkflow, 'Trial Balance')).toBeTrue();
    expect(workflowContainsLabel(accountantWorkflow, 'Accounts Rules')).toBeTrue();
    expect(workflowContainsLabel(accountantWorkflow, 'Reconciliation')).toBeTrue();
    expect(workflowContainsLabel(accountantWorkflow, 'Doctor Consultation')).toBeFalse();
  });

  it('shows Ward Reception and Nurse branches for ward role', () => {
    const wardWorkflow = resolveRoleWorkflow('ward', allFlags);
    expect(wardWorkflow.title).toContain('Ward Receptionist / Nurse');
    expect(workflowContainsLabel(wardWorkflow, 'Pending Admissions')).toBeTrue();
    expect(workflowContainsLabel(wardWorkflow, 'MAR / Medicine')).toBeTrue();
    expect(workflowContainsLabel(wardWorkflow, 'Recommended By doctor')).toBeTrue();
  });

  it('shows Laboratory workflow nodes', () => {
    const labWorkflow = resolveRoleWorkflow('laboratory', allFlags);
    expect(labWorkflow.title).toBe('Laboratory Workflow');
    expect(workflowContainsLabel(labWorkflow, 'Collect Sample')).toBeTrue();
    expect(workflowContainsLabel(labWorkflow, 'Verify Result')).toBeTrue();
  });

  it('shows Pharmacy ward and counter sale flows', () => {
    const pharmacyWorkflow = resolveRoleWorkflow('pharmacy', allFlags);
    expect(pharmacyWorkflow.title).toBe('Pharmacy Workflow');
    expect(workflowContainsLabel(pharmacyWorkflow, 'Ward Medicine Request')).toBeTrue();
    expect(workflowContainsLabel(pharmacyWorkflow, 'Open Register / POS')).toBeTrue();
  });

  it('shows Owner setup workflow', () => {
    const ownerWorkflow = resolveRoleWorkflow('owner', allFlags);
    expect(ownerWorkflow.title).toBe('Owner / Admin Workflow');
    expect(workflowContainsLabel(ownerWorkflow, 'Hospital Setup')).toBeTrue();
    expect(workflowContainsLabel(ownerWorkflow, 'Birth Cert Setup')).toBeTrue();
    expect(workflowContainsLabel(ownerWorkflow, 'Users & Roles')).toBeTrue();
  });

  it('filters quick tasks and module guides by role', () => {
    const tasks = filterQuickTasksForRole(
      [
        { label: 'Register Patient', slug: 'how-to-register-patient', icon: 'fa-user-plus' },
        { label: 'Recommend Admission', slug: 'doctor-recommend-admission', icon: 'fa-hospital-o' },
        { label: 'Receive Payment', slug: 'receive-patient-payment', icon: 'fa-money' },
      ],
      'doctor',
      () => true
    );

    expect(tasks.map((task) => task.slug)).toContain('doctor-recommend-admission');
    expect(tasks.map((task) => task.slug)).not.toContain('receive-patient-payment');

    const guides = filterModuleGuidesForRole(
      [
        { key: 'clinical', title: 'Clinical', description: 'x', icon: 'fa-stethoscope', module: 'clinical', category: 'Appointments / OPD' },
        { key: 'accounts', title: 'Accounts', description: 'x', icon: 'fa-book', module: 'accounts', category: 'Billing / Accounts' },
      ],
      'doctor',
      () => true
    );

    expect(guides.map((guide) => guide.key)).toEqual(['clinical']);
  });

  it('ranks preferred guides for selected role', () => {
    const ranked = rankArticlesForRole(HELP_ARTICLES, 'doctor');
    expect(ranked[0]?.slug).toBe('doctor-consultation-flow');
  });

  it('hides laboratory role chip when laboratory module disabled', () => {
    expect(isHelpRoleVisible('laboratory', { ...allFlags, laboratory: false })).toBeFalse();
    expect(isHelpRoleVisible('laboratory', allFlags)).toBeTrue();
  });

  it('removes disabled module nodes from role workflow', () => {
    const doctorWorkflow = resolveRoleWorkflow('doctor', { ...allFlags, laboratory: false, ward: false });
    expect(workflowContainsLabel(doctorWorkflow, 'Open Admitted Patient')).toBeFalse();
    expect(workflowContainsLabel(doctorWorkflow, 'Recommend Admission')).toBeTrue();
  });

  it('hides accounts rules workflow when accounts module flag is off', () => {
    const accountantWorkflow = resolveRoleWorkflow('accountant', { ...allFlags, accounts: false });
    expect(workflowContainsLabel(accountantWorkflow, 'Accounts Rules')).toBeFalse();
  });
});

describe('help search with role context', () => {
  const allFlags = {
    clinical: true,
    pharmacy: true,
    laboratory: true,
    ward: true,
    accounts: true,
    nursery: true,
    setup: true,
  };

  it('ranks doctor admission recommendation first for doctor role', () => {
    const results = searchHelpArticles(HELP_ARTICLES, 'admit', {
      roleKey: 'doctor',
      moduleFlags: allFlags,
      preferredGuideSlugs: ['doctor-consultation-flow', 'doctor-recommend-admission'],
    });
    expect(results[0]?.article.slug).toBe('doctor-recommend-admission');
  });

  it('ranks ward admission guide first for ward role', () => {
    const results = searchHelpArticles(HELP_ARTICLES, 'admit', {
      roleKey: 'ward',
      moduleFlags: allFlags,
      preferredGuideSlugs: ['how-to-admit-patient', 'doctor-recommend-admission'],
    });
    expect(results[0]?.article.slug).toBe('how-to-admit-patient');
  });
});
