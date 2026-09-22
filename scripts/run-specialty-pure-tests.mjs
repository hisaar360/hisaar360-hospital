/**
 * Pure Node runner for specialty engine unit logic (no Karma/Chrome).
 */
import * as esbuild from 'esbuild';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const specialtyDir =
  '/Users/alirandhawa/Hisaar360/hisaar360-hospital/src/app/modules/client/clinical-workspace/specialty';
const outDir = '/tmp/hisaar-specialty-pure-tests';
mkdirSync(outDir, { recursive: true });

const harnessPath = join(specialtyDir, '_pure-test-harness.tmp.ts');
const harness = `
import {
  normalizeSpecialtyKey,
  specialtyKeyToLegacySection,
  legacySectionToSpecialtyKey,
  specialtyUiPath,
  specialtyDisplayName,
} from './specialty-keys';
import { resolveSpecialtyKey } from './specialty-resolver';
import {
  getSpecialtyTemplate,
  listRegisteredSpecialtyTemplates,
  usesGenericSpecialtyEngine,
} from './specialty-template.registry';
import { evaluateShowIf } from './specialty-template.schema';
import {
  buildEngineSpecialtyPrintRows,
  buildSpecialtySummaryLine,
  buildSpecialtySummaryParts,
} from './specialty-summary.util';
import { shouldUseGenericSpecialtyEngine } from './specialty-engine-gate';
import { mergeSpecialtyDataForSave, splitPreservedSpecialtyData } from './specialty-data.util';
import { calculatePackYears } from '../pulmonology/pack-years.util';
import { calculateFev1FvcRatio } from '../pulmonology/spirometry-ratio.util';
import { mapLegacyEyeToDisplay, mergePreserveLegacy } from './ophthalmology-legacy.adapter';
import { mapLegacyDentalToDisplay, mergePreserveLegacyDental } from './dental-legacy.adapter';
import { SPECIALTY_TEMPLATES } from '../../prescription/prescription-specialty-print';

let passed = 0;
let failed = 0;

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
    },
    toEqual(expected: unknown) {
      const a = JSON.stringify(actual);
      const e = JSON.stringify(expected);
      if (a !== e) throw new Error('Expected ' + e + ' but got ' + a);
    },
    toBeGreaterThanOrEqual(n: number) {
      if (!(Number(actual) >= n)) throw new Error('Expected >= ' + n + ' got ' + actual);
    },
    toBeNull() {
      if (actual !== null) throw new Error('Expected null got ' + JSON.stringify(actual));
    },
  };
}

function it(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log('  ok -', name);
  } catch (err: any) {
    failed += 1;
    console.log('  FAIL -', name, err?.message || err);
  }
}

function describe(name: string, fn: () => void) {
  console.log(name);
  fn();
}

describe('specialty-keys / normalizeSpecialtyKey', () => {
  it('maps General Medicine variants to GENERAL_MEDICINE', () => {
    expect(normalizeSpecialtyKey('General Medicine')).toBe('GENERAL_MEDICINE');
    expect(normalizeSpecialtyKey('Internal Medicine')).toBe('GENERAL_MEDICINE');
    expect(normalizeSpecialtyKey('Physician')).toBe('GENERAL_MEDICINE');
    expect(normalizeSpecialtyKey('Medicine')).toBe('GENERAL_MEDICINE');
  });

  it('does not map compound Medicine departments to GENERAL_MEDICINE', () => {
    expect(normalizeSpecialtyKey('Respiratory Medicine')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Chest Medicine')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Cardiac Medicine')).toBe('CARDIOLOGY');
    expect(normalizeSpecialtyKey('Emergency Medicine')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('Physical Medicine')).toBe('PHYSIOTHERAPY');
    expect(normalizeSpecialtyKey('Nuclear Medicine')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Liver Medicine')).toBe('HEPATOLOGY');
    expect(normalizeSpecialtyKey('Family Medicine')).toBe('OTHER');
  });

  it('maps expanded pulmonology aliases', () => {
    expect(normalizeSpecialtyKey('Pulmonary Medicine')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Respiratory Diseases')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Chest Diseases')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Chest Clinic')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Lung Clinic')).toBe('PULMONOLOGY');
  });

  it('Thoracic Surgery / Sleep Medicine do not map to PULMONOLOGY', () => {
    expect(normalizeSpecialtyKey('Thoracic Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Sleep Medicine')).toBe('OTHER');
  });

  it('returns OTHER for blank/unknown', () => {
    expect(normalizeSpecialtyKey('')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Quantum Healing')).toBe('OTHER');
  });

  it('bridges legacy sections', () => {
    expect(legacySectionToSpecialtyKey('gynae')).toBe('OBGYN');
    expect(specialtyKeyToLegacySection('GENERAL_MEDICINE')).toBe('general');
  });
});

describe('resolveSpecialtyKey priority', () => {
  it('edit saved key wins over renamed department', () => {
    expect(resolveSpecialtyKey({
      mode: 'edit',
      savedSpecialtyKey: 'CARDIOLOGY',
      doctorDepartment: 'Internal Medicine',
    })).toBe('CARDIOLOGY');
  });

  it('create uses doctor specialty', () => {
    expect(resolveSpecialtyKey({ mode: 'create', doctorSpecialty: 'Internal Medicine' })).toBe('GENERAL_MEDICINE');
  });

  it('unknown create → OTHER', () => {
    expect(resolveSpecialtyKey({ mode: 'create', departmentName: 'Unknown' })).toBe('OTHER');
  });
});

describe('registry / summary / preserve / gate', () => {
  it('GENERAL_MEDICINE v1 without Visit duplicates', () => {
    const t = getSpecialtyTemplate('GENERAL_MEDICINE');
    expect(t.version).toBe('1.0');
    expect(t.fields.some((f) => f.key === 'chiefComplaint')).toBe(false);
    expect(getSpecialtyTemplate('CARDIOLOGY').key).toBe('CARDIOLOGY');
    expect(getSpecialtyTemplate('PEDIATRICS').key).toBe('PEDIATRICS');
    expect(getSpecialtyTemplate('PULMONOLOGY').key).toBe('PULMONOLOGY');
    expect(getSpecialtyTemplate('GASTROENTEROLOGY').key).toBe('GASTROENTEROLOGY');
    expect(getSpecialtyTemplate('HEPATOLOGY').key).toBe('HEPATOLOGY');
    expect(getSpecialtyTemplate('GENERAL_SURGERY').key).toBe('GENERAL_SURGERY');
    expect(getSpecialtyTemplate('ORTHOPEDICS').key).toBe('ORTHOPEDICS');
    expect(listRegisteredSpecialtyTemplates().length).toBeGreaterThanOrEqual(9);
  });

  it('summary only meaningful yes', () => {
    expect(buildSpecialtySummaryParts('GENERAL_MEDICINE', {
      chronicHypertension: 'Yes', chronicDiabetes: 'No', chronicCopd: 'Yes',
    })).toEqual(['HTN', 'COPD']);
    expect(buildSpecialtySummaryLine('GENERAL_MEDICINE', { chronicHypertension: 'No' })).toBe('');
  });

  it('print skips empty/No', () => {
    const rows = buildEngineSpecialtyPrintRows('GENERAL_MEDICINE', {
      chronicHypertension: 'Yes', chronicDiabetes: 'No', clinicalImpression: 'Viral',
    });
    expect(rows.some((r) => r.label === 'HTN')).toBe(true);
    expect(rows.some((r) => r.value === 'No')).toBe(false);
  });

  it('preserve legacy keys on merge', () => {
    const merged = mergeSpecialtyDataForSave(
      { chronicHypertension: 'Yes' },
      { oldUnknownField: 'keep', oldNestedObject: { a: 1 } }
    );
    expect(merged['oldUnknownField']).toBe('keep');
    expect(JSON.stringify(merged['oldNestedObject'])).toBe(JSON.stringify({ a: 1 }));
  });

  it('split preserves nested unknowns', () => {
    const { preserved } = splitPreservedSpecialtyData(
      { chronicHypertension: 'Yes', oldNestedObject: { a: 1 }, oldUnknownField: 'x' },
      new Set(['chronicHypertension'])
    );
    expect(preserved['oldUnknownField']).toBe('x');
    expect(JSON.stringify(preserved['oldNestedObject'])).toBe(JSON.stringify({ a: 1 }));
  });

  it('engine gate mapping', () => {
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'OBGYN', legacySection: 'gynae' })).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'GENERAL_MEDICINE', legacySection: 'general' })).toBe(true);
    expect(specialtyUiPath('CARDIOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('PEDIATRICS')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('PULMONOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('GASTROENTEROLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('HEPATOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('GENERAL_SURGERY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('ORTHOPEDICS')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('ENT')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('OPHTHALMOLOGY')).toBe('CUSTOM_LEGACY');
    expect(specialtyUiPath('NEONATOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('DENTAL')).toBe('CUSTOM_LEGACY');
    expect(evaluateShowIf({ field: 'chronicDiabetes', equals: 'Yes' }, { chronicDiabetes: 'Yes' })).toBe(true);
  });
});

describe('gastro / hepato aliases and templates', () => {
  it('maps GI Medicine / Digestive / Gastrointestinal Medicine to GASTRO', () => {
    expect(normalizeSpecialtyKey('GI Medicine')).toBe('GASTROENTEROLOGY');
    expect(normalizeSpecialtyKey('Digestive Diseases')).toBe('GASTROENTEROLOGY');
    expect(normalizeSpecialtyKey('Digestive Medicine')).toBe('GASTROENTEROLOGY');
    expect(normalizeSpecialtyKey('Gastrointestinal Medicine')).toBe('GASTROENTEROLOGY');
  });

  it('maps Hepatic Medicine / Liver to HEPATOLOGY', () => {
    expect(normalizeSpecialtyKey('Hepatic Medicine')).toBe('HEPATOLOGY');
    expect(normalizeSpecialtyKey('Liver')).toBe('HEPATOLOGY');
  });

  it('specialist surgery maps to OTHER; General Surgery exact aliases work', () => {
    expect(normalizeSpecialtyKey('HPB Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('GI Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Hepatobiliary Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Colorectal Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Thoracic Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('General Surgery')).toBe('GENERAL_SURGERY');
    expect(normalizeSpecialtyKey('Surgery')).toBe('GENERAL_SURGERY');
    expect(normalizeSpecialtyKey('Surgical Clinic')).toBe('GENERAL_SURGERY');
  });

  it('GASTROENTEROLOGY / HEPATOLOGY templates without Visit duplicates or auto-MELD', () => {
    const gastro = getSpecialtyTemplate('GASTROENTEROLOGY');
    expect(gastro.key).toBe('GASTROENTEROLOGY');
    expect(gastro.fields.some((f) => f.key === 'conditionIbd')).toBe(true);
    expect(gastro.fields.some((f) => f.key === 'chiefComplaint')).toBe(false);

    const hepato = getSpecialtyTemplate('HEPATOLOGY');
    expect(hepato.key).toBe('HEPATOLOGY');
    expect(hepato.fields.some((f) => f.key === 'meldScoreVersion')).toBe(true);
    expect(hepato.fields.some((f) => f.key === 'childPughClass')).toBe(true);
    expect(hepato.fields.some((f) => /meldFormula|computeMeld/i.test(f.key))).toBe(false);
  });
});

describe('general surgery / orthopedics aliases and templates', () => {
  it('maps Orthopedics aliases; not rheumatology / physio / sports / neurosurgery', () => {
    expect(normalizeSpecialtyKey('Orthopedics')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Orthopaedic Surgery')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Bone & Joint')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Ortho Clinic')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Rheumatology')).toBe('RHEUMATOLOGY');
    expect(normalizeSpecialtyKey('Physiotherapy')).toBe('PHYSIOTHERAPY');
    expect(normalizeSpecialtyKey('Sports Medicine')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Neurosurgery')).toBe('NEUROSURGERY');
  });

  it('GENERAL_SURGERY / ORTHOPEDICS templates registered on generic engine', () => {
    const gs = getSpecialtyTemplate('GENERAL_SURGERY');
    expect(gs.key).toBe('GENERAL_SURGERY');
    expect(gs.fields.some((f) => f.key === 'procedureStatus')).toBe(true);
    expect(gs.fields.some((f) => f.key === 'herniaSuspected')).toBe(true);
    const status = gs.fields.find((f) => f.key === 'procedureStatus');
    expect(Boolean(status?.helpText && /does not create/i.test(status.helpText))).toBe(true);

    const ortho = getSpecialtyTemplate('ORTHOPEDICS');
    expect(ortho.key).toBe('ORTHOPEDICS');
    expect(ortho.fields.some((f) => f.key === 'fractureClassificationSystem')).toBe(true);
    expect(ortho.fields.some((f) => f.key === 'neurovascularStatus')).toBe(true);
    expect(ortho.fields.some((f) => /auto.?classif|computeFracture/i.test(f.key))).toBe(false);
  });
});

describe('neurology / neurosurgery aliases and templates', () => {
  it('maps Neurology / Neurosurgery; not ortho spine / psychiatry', () => {
    expect(normalizeSpecialtyKey('Neurology')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neurological Medicine')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neuro Medicine')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neurology Clinic')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neuro')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neurosurgery')).toBe('NEUROSURGERY');
    expect(normalizeSpecialtyKey('Neuro Surgery')).toBe('NEUROSURGERY');
    expect(normalizeSpecialtyKey('Neurosurgeon')).toBe('NEUROSURGERY');
    expect(normalizeSpecialtyKey('Brain & Spine Surgery')).toBe('NEUROSURGERY');
    expect(normalizeSpecialtyKey('Orthopedic Spine')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Psychiatry')).toBe('PSYCHIATRY');
  });

  it('NEUROLOGY / NEUROSURGERY templates on generic engine without Visit duplicates', () => {
    const neuro = getSpecialtyTemplate('NEUROLOGY');
    expect(neuro.key).toBe('NEUROLOGY');
    expect(neuro.fields.some((f) => f.key === 'symptomSeizure')).toBe(true);
    expect(neuro.fields.some((f) => f.key === 'classificationVersion')).toBe(true);
    expect(neuro.fields.some((f) => f.key === 'nihssScoreEventRef')).toBe(true);
    expect(neuro.fields.some((f) => f.key === 'chiefComplaint')).toBe(false);
    expect(neuro.fields.some((f) => /thrombolysis|auto.?classif/i.test(f.key))).toBe(false);

    const ns = getSpecialtyTemplate('NEUROSURGERY');
    expect(ns.key).toBe('NEUROSURGERY');
    expect(ns.fields.some((f) => f.key === 'surgicalPlanStatus')).toBe(true);
    expect(ns.fields.some((f) => f.key === 'operationScheduleId')).toBe(true);
    expect(ns.fields.some((f) => f.key === 'gcsScoreEventRef')).toBe(true);
    const plan = ns.fields.find((f) => f.key === 'surgicalPlanStatus');
    expect(Boolean(plan?.helpText && /does not create/i.test(plan.helpText))).toBe(true);
    expect(ns.fields.some((f) => /NeurosurgeryOperation/i.test(f.key))).toBe(false);
  });
});

describe('ENT / Ophthalmology Phase M', () => {
  it('maps ENT aliases; Audiology ≠ ENT', () => {
    expect(normalizeSpecialtyKey('ENT')).toBe('ENT');
    expect(normalizeSpecialtyKey('Ear Nose Throat')).toBe('ENT');
    expect(normalizeSpecialtyKey('Otolaryngology')).toBe('ENT');
    expect(normalizeSpecialtyKey('ENT Clinic')).toBe('ENT');
    expect(normalizeSpecialtyKey('Audiology')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Speech Therapy')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Head & Neck Oncology')).toBe('ONCOLOGY');
  });

  it('maps Eye Clinic → OPHTHALMOLOGY; Optometry ≠ Ophthalmology', () => {
    expect(normalizeSpecialtyKey('Ophthalmology')).toBe('OPHTHALMOLOGY');
    expect(normalizeSpecialtyKey('Eye Clinic')).toBe('OPHTHALMOLOGY');
    expect(normalizeSpecialtyKey('Eye')).toBe('OPHTHALMOLOGY');
    expect(normalizeSpecialtyKey('Optometry')).toBe('OTHER');
  });

  it('ENT is GENERIC_ENGINE; OPHTHALMOLOGY is CUSTOM_LEGACY', () => {
    expect(getSpecialtyTemplate('ENT').key).toBe('ENT');
    expect(getSpecialtyTemplate('ENT').fields.some((f) => f.key === 'audiometryRef')).toBe(true);
    expect(specialtyUiPath('ENT')).toBe('GENERIC_ENGINE');
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'ENT', legacySection: 'general' })).toBe(true);

    expect(getSpecialtyTemplate('OPHTHALMOLOGY').key).toBe('OPHTHALMOLOGY');
    expect(getSpecialtyTemplate('OPHTHALMOLOGY').fields.some((f) => f.key === 'visualAcuityRight')).toBe(true);
    expect(specialtyUiPath('OPHTHALMOLOGY')).toBe('CUSTOM_LEGACY');
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'OPHTHALMOLOGY', legacySection: 'eye' })).toBe(false);
  });

  it('legacy eye keys still in print map', () => {
    const eye = SPECIALTY_TEMPLATES.eye;
    const keys = eye.fields.map((f) => f.key);
    expect(keys.includes('visualAcuityRight')).toBe(true);
    expect(keys.includes('visualAcuityLeft')).toBe(true);
    expect(keys.includes('iopRight')).toBe(true);
    expect(keys.includes('iopLeft')).toBe(true);
    expect(keys.includes('refractionRightSph')).toBe(true);
    expect(keys.includes('refractionRightCyl')).toBe(true);
    expect(keys.includes('refractionRightAxis')).toBe(true);
    expect(keys.includes('refractionLeftSph')).toBe(true);
    expect(keys.includes('refractionLeftCyl')).toBe(true);
    expect(keys.includes('refractionLeftAxis')).toBe(true);
    expect(keys.includes('slitLampFindings')).toBe(true);
    expect(keys.includes('fundusFindings')).toBe(true);
    expect(keys.includes('glassesPrescription')).toBe(true);
    expect(keys.includes('eyeDiagnosis')).toBe(true);
    expect(keys.includes('cataractOd')).toBe(true);
    expect(keys.includes('surgicalPlanStatus')).toBe(true);
  });

  it('legacy adapter maps display without rewriting payload', () => {
    const data = { visualAcuityRight: '6/24', eyeDiagnosis: 'cataract', unknownExtra: 'keep' };
    const rows = mapLegacyEyeToDisplay(data);
    expect(rows.some((r) => r.key === 'visualAcuityRight' && r.label.includes('OD'))).toBe(true);
    expect(data['unknownExtra']).toBe('keep');
    const merged = mergePreserveLegacy(data, { cataractOd: 'NS' });
    expect(merged['visualAcuityRight']).toBe('6/24');
    expect(merged['unknownExtra']).toBe('keep');
    expect(merged['cataractOd']).toBe('NS');
  });
});

describe('Phase N remaining core specialties', () => {
  it('maps Phase N aliases and collision guards', () => {
    expect(normalizeSpecialtyKey('Diabetes Clinic')).toBe('ENDOCRINOLOGY');
    expect(normalizeSpecialtyKey('Hormone Clinic')).toBe('ENDOCRINOLOGY');
    expect(normalizeSpecialtyKey('Gestational Diabetes')).toBe('ENDOCRINOLOGY');
    expect(normalizeSpecialtyKey('Obstetrics')).toBe('OBGYN');
    expect(normalizeSpecialtyKey('Kidney Clinic')).toBe('NEPHROLOGY');
    expect(normalizeSpecialtyKey('Renal Medicine')).toBe('NEPHROLOGY');
    expect(normalizeSpecialtyKey('Urinary Tract Clinic')).toBe('UROLOGY');
    expect(normalizeSpecialtyKey('Urologist')).toBe('UROLOGY');
    expect(normalizeSpecialtyKey('Skin Clinic')).toBe('DERMATOLOGY');
    expect(normalizeSpecialtyKey('Skin and VD')).toBe('DERMATOLOGY');
    expect(normalizeSpecialtyKey('Rheumatic Diseases')).toBe('RHEUMATOLOGY');
    expect(normalizeSpecialtyKey('Arthritis Clinic')).toBe('RHEUMATOLOGY');
    expect(normalizeSpecialtyKey('Orthopedics')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Infectious Diseases')).toBe('INFECTIOUS_DISEASE');
    expect(normalizeSpecialtyKey('TB Clinic')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Mental Health')).toBe('PSYCHIATRY');
    expect(normalizeSpecialtyKey('Medical Oncology')).toBe('ONCOLOGY');
    expect(normalizeSpecialtyKey('Surgical Oncology')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Radiation Oncology')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Anaesthesiology')).toBe('ANESTHESIOLOGY');
    expect(normalizeSpecialtyKey('Pre-anesthesia Clinic')).toBe('ANESTHESIOLOGY');
    expect(normalizeSpecialtyKey('ER')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('A&E')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('Accident and Emergency')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('Newborn Medicine')).toBe('NEONATOLOGY');
    expect(normalizeSpecialtyKey('NICU')).toBe('NEONATOLOGY');
    expect(normalizeSpecialtyKey('Oral and Maxillofacial')).toBe('DENTAL');
    expect(normalizeSpecialtyKey('Maxillofacial')).toBe('DENTAL');
    expect(specialtyDisplayName('DENTAL')).toBe('Dental / Oral & Maxillofacial');
    expect(specialtyDisplayName('EMERGENCY')).toBe('Emergency Medicine');
  });

  it('does not invent EMERGENCY_MEDICINE or DENTAL_ORAL_MAXILLOFACIAL keys', () => {
    expect(normalizeSpecialtyKey('EMERGENCY_MEDICINE')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('DENTAL_ORAL_MAXILLOFACIAL')).toBe('DENTAL');
    expect(specialtyDisplayName('EMERGENCY')).toBe('Emergency Medicine');
    expect(specialtyDisplayName('DENTAL')).toBe('Dental / Oral & Maxillofacial');
  });

  it('Phase N engine paths: GENERIC for 11 keys; DENTAL CUSTOM_LEGACY', () => {
    const generic = [
      'ENDOCRINOLOGY', 'NEPHROLOGY', 'UROLOGY', 'DERMATOLOGY', 'RHEUMATOLOGY',
      'INFECTIOUS_DISEASE', 'PSYCHIATRY', 'ONCOLOGY', 'ANESTHESIOLOGY', 'EMERGENCY', 'NEONATOLOGY',
    ];
    for (const key of generic) {
      expect(getSpecialtyTemplate(key as any).key).toBe(key);
      expect(specialtyUiPath(key as any)).toBe('GENERIC_ENGINE');
      expect(usesGenericSpecialtyEngine(key as any)).toBe(true);
    }
    expect(getSpecialtyTemplate('DENTAL').fields.some((f) => f.key === 'toothNumber')).toBe(true);
    expect(getSpecialtyTemplate('DENTAL').fields.some((f) => f.key === 'omfsTrauma')).toBe(true);
    expect(specialtyUiPath('DENTAL')).toBe('CUSTOM_LEGACY');
    expect(usesGenericSpecialtyEngine('DENTAL')).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'DENTAL', legacySection: 'dental' })).toBe(false);
    expect(listRegisteredSpecialtyTemplates().length).toBeGreaterThanOrEqual(20);
  });

  it('psychiatry summary excludes suicidal ideation chips', () => {
    const parts = buildSpecialtySummaryParts('PSYCHIATRY', {
      knownDepression: 'Yes',
      followUpPlan: 'Early review',
      suicidalIdeationNote: 'Present — do not chip',
    });
    expect(parts).toEqual(['Depression', 'Follow-up']);
    expect(parts.some((p) => /suicid/i.test(p))).toBe(false);
  });

  it('legacy dental print fields include Phase N additives', () => {
    const dental = SPECIALTY_TEMPLATES.dental;
    const keys = dental.fields.map((f) => f.key);
    expect(keys.includes('toothNumber')).toBe(true);
    expect(keys.includes('toothNumberingSystem')).toBe(true);
    expect(keys.includes('omfsTrauma')).toBe(true);
    expect(keys.includes('operationScheduleId')).toBe(true);
    const data = { toothNumber: '36', dentalNotes: 'keep', unknownExtra: 'x' };
    const rows = mapLegacyDentalToDisplay(data);
    expect(rows.some((r) => r.key === 'toothNumber')).toBe(true);
    const merged = mergePreserveLegacyDental(data, { toothNumberingSystem: 'FDI' });
    expect(merged['toothNumber']).toBe('36');
    expect(merged['unknownExtra']).toBe('x');
    expect(merged['toothNumberingSystem']).toBe('FDI');
  });
});

describe('pulmonology helpers', () => {
  it('pack-years from complete cigarette inputs only', () => {
    expect(calculatePackYears({ packsPerDay: 1, yearsSmoked: 20 }).packYears).toBe(20);
    expect(calculatePackYears({ cigarettesPerDay: 40, yearsSmoked: 10 }).packYears).toBe(20);
    expect(calculatePackYears({ productType: 'vaping', cigarettesPerDay: 20, yearsSmoked: 10 }).packYears).toBeNull();
  });

  it('spirometry ratio transparent arithmetic only', () => {
    expect(calculateFev1FvcRatio({ fev1: 2.4, fvc: 3.2 }).ratio).toBe(0.75);
    expect(calculateFev1FvcRatio({ fev1: 2.4 }).ratio).toBeNull();
  });
});

console.log('\\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
`;

writeFileSync(harnessPath, harness);

try {
  await esbuild.build({
    entryPoints: [harnessPath],
    bundle: true,
    outfile: join(outDir, 'harness.mjs'),
    format: 'esm',
    platform: 'node',
    target: 'node20',
  });

  const run = spawnSync(process.execPath, [join(outDir, 'harness.mjs')], { encoding: 'utf8' });
  process.stdout.write(run.stdout || '');
  process.stderr.write(run.stderr || '');
  process.exit(run.status ?? 1);
} finally {
  try {
    unlinkSync(harnessPath);
  } catch {
    /* ignore */
  }
}
