import {
  normalizeSpecialtyKey,
  normalizeSpecialtyText,
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

describe('specialty-keys / normalizeSpecialtyKey', () => {
  it('maps General Medicine variants to GENERAL_MEDICINE', () => {
    expect(normalizeSpecialtyKey('General Medicine')).toBe('GENERAL_MEDICINE');
    expect(normalizeSpecialtyKey('Internal Medicine')).toBe('GENERAL_MEDICINE');
    expect(normalizeSpecialtyKey('Physician')).toBe('GENERAL_MEDICINE');
    expect(normalizeSpecialtyKey('General Physician')).toBe('GENERAL_MEDICINE');
    expect(normalizeSpecialtyKey('Consultant Physician')).toBe('GENERAL_MEDICINE');
    expect(normalizeSpecialtyKey('Medicine Department')).toBe('GENERAL_MEDICINE');
  });

  it('maps exact "Medicine" only via exact alias', () => {
    expect(normalizeSpecialtyKey('Medicine')).toBe('GENERAL_MEDICINE');
    expect(normalizeSpecialtyKey('medicine')).toBe('GENERAL_MEDICINE');
  });

  it('does not map compound *Medicine departments to GENERAL_MEDICINE via substring', () => {
    expect(normalizeSpecialtyKey('Respiratory Medicine')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Chest Medicine')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Pulmonary Medicine')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Cardiac Medicine')).toBe('CARDIOLOGY');
    expect(normalizeSpecialtyKey('Emergency Medicine')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('Physical Medicine')).toBe('PHYSIOTHERAPY');
    expect(normalizeSpecialtyKey('Nuclear Medicine')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Sports Medicine')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Sleep Medicine')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Family Medicine')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Liver Medicine')).toBe('HEPATOLOGY');
  });

  it('maps cardiac aliases to CARDIOLOGY', () => {
    expect(normalizeSpecialtyKey('Cardiology')).toBe('CARDIOLOGY');
    expect(normalizeSpecialtyKey('Heart Department')).toBe('CARDIOLOGY');
    expect(normalizeSpecialtyKey('Cardiac Clinic')).toBe('CARDIOLOGY');
  });

  it('maps OB/GYN aliases to OBGYN', () => {
    expect(normalizeSpecialtyKey('OB/GYN')).toBe('OBGYN');
    expect(normalizeSpecialtyKey('Gynae')).toBe('OBGYN');
    expect(normalizeSpecialtyKey('Obstetrics & Gynecology')).toBe('OBGYN');
    expect(normalizeSpecialtyKey('Gynecologic Oncology')).toBe('OBGYN');
    expect(normalizeSpecialtyKey('Gynaecologic Oncology')).toBe('OBGYN');
  });

  it('maps chest / pulmonary aliases to PULMONOLOGY', () => {
    expect(normalizeSpecialtyKey('Chest Medicine')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Pulmonology')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Pulmonary Medicine')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Respiratory Diseases')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Chest Diseases')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Chest Clinic')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Lung Clinic')).toBe('PULMONOLOGY');
  });

  it('does not map Thoracic Surgery or Sleep Medicine to PULMONOLOGY', () => {
    expect(normalizeSpecialtyKey('Thoracic Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Sleep Medicine')).toBe('OTHER');
  });

  it('maps liver clinic to HEPATOLOGY', () => {
    expect(normalizeSpecialtyKey('Liver Clinic')).toBe('HEPATOLOGY');
  });

  it('returns OTHER for blank or unknown text', () => {
    expect(normalizeSpecialtyKey('')).toBe('OTHER');
    expect(normalizeSpecialtyKey('   ')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Quantum Healing Department')).toBe('OTHER');
  });

  it('normalizes punctuation for matching', () => {
    expect(normalizeSpecialtyText("OB/GYN & Women's Care")).toContain('ob');
    expect(normalizeSpecialtyKey('Gastro-Enterology')).toBe('GASTROENTEROLOGY');
  });

  it('bridges legacy sections', () => {
    expect(legacySectionToSpecialtyKey('gynae')).toBe('OBGYN');
    expect(specialtyKeyToLegacySection('OBGYN')).toBe('gynae');
    expect(specialtyKeyToLegacySection('GENERAL_MEDICINE')).toBe('general');
  });
});

describe('resolveSpecialtyKey priority', () => {
  it('edit mode prefers saved specialtyKey over renamed department', () => {
    expect(
      resolveSpecialtyKey({
        mode: 'edit',
        savedSpecialtyKey: 'CARDIOLOGY',
        doctorDepartment: 'Internal Medicine',
        appointmentDepartment: 'General Medicine',
        legacySpecialtySection: 'general',
      })
    ).toBe('CARDIOLOGY');
  });

  it('edit mode falls back to legacy section without re-deriving from doctor', () => {
    expect(
      resolveSpecialtyKey({
        mode: 'edit',
        doctorDepartment: 'Cardiology',
        legacySpecialtySection: 'gynae',
      })
    ).toBe('OBGYN');
  });

  it('edit mode with no saved key or legacy returns OTHER', () => {
    expect(
      resolveSpecialtyKey({
        mode: 'edit',
        doctorDepartment: 'Cardiology',
      })
    ).toBe('OTHER');
  });

  it('create mode derives from doctor specialty / department', () => {
    expect(
      resolveSpecialtyKey({
        mode: 'create',
        doctorSpecialty: 'Internal Medicine',
      })
    ).toBe('GENERAL_MEDICINE');

    expect(
      resolveSpecialtyKey({
        mode: 'create',
        doctorDepartment: 'Heart Department',
      })
    ).toBe('CARDIOLOGY');
  });

  it('create mode falls back through appointment then OTHER', () => {
    expect(
      resolveSpecialtyKey({
        mode: 'create',
        appointmentDepartment: 'Respiratory Medicine',
      })
    ).toBe('PULMONOLOGY');

    expect(
      resolveSpecialtyKey({
        mode: 'create',
        departmentName: 'Unknown Clinic',
      })
    ).toBe('OTHER');
  });
});

describe('specialty template registry', () => {
  it('returns GENERAL_MEDICINE v1 schema without Visit duplicates', () => {
    const template = getSpecialtyTemplate('GENERAL_MEDICINE');
    expect(template.version).toBe('1.0');
    expect(template.fields.some((field) => field.key === 'chronicHypertension')).toBe(true);
    expect(template.fields.some((field) => field.key === 'diabetesDuration')).toBe(true);
    expect(template.fields.some((field) => field.type === 'tri_state')).toBe(true);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(template.fields.some((field) => field.key === 'history')).toBe(false);
    expect(template.fields.some((field) => field.key === 'diagnosis')).toBe(false);
    expect(template.fields.some((field) => field.key === 'advice')).toBe(false);
  });

  it('maps Cardiac Medicine to CARDIOLOGY and not Respiratory', () => {
    expect(normalizeSpecialtyKey('Cardiac Medicine')).toBe('CARDIOLOGY');
    expect(normalizeSpecialtyKey('Respiratory Medicine')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Chest Medicine')).toBe('PULMONOLOGY');
  });

  it('returns CARDIOLOGY v1 schema without Visit duplicates', () => {
    const template = getSpecialtyTemplate('CARDIOLOGY');
    expect(template.key).toBe('CARDIOLOGY');
    expect(template.version).toBe('1.0');
    expect(template.fields.some((field) => field.key === 'conditionCad')).toBe(true);
    expect(template.fields.some((field) => field.key === 'lvefPercent')).toBe(true);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'CARDIOLOGY', legacySection: 'general' })).toBe(true);
  });

  it('cardiology summary shows meaningful chips only', () => {
    expect(
      buildSpecialtySummaryParts('CARDIOLOGY', {
        conditionCad: 'Yes',
        conditionAf: 'Yes',
        conditionHeartFailure: 'No',
        historyPci: 'Yes',
        pciYear: '2023',
        lvefPercent: 45,
      })
    ).toEqual(jasmine.arrayContaining(['CAD', 'AF', 'PCI', 'PCI 2023', 'EF 45%']));
  });

  it('OTHER always available; unregistered specialties fall back', () => {
    expect(getSpecialtyTemplate('OTHER').key).toBe('OTHER');
    expect(getSpecialtyTemplate('NEONATOLOGY').key).toBe('OTHER');
    expect(listRegisteredSpecialtyTemplates().length).toBeGreaterThanOrEqual(9);
  });

  it('maps Pediatrics aliases and not Neonatology', () => {
    expect(normalizeSpecialtyKey('Pediatrics')).toBe('PEDIATRICS');
    expect(normalizeSpecialtyKey('Paediatrics')).toBe('PEDIATRICS');
    expect(normalizeSpecialtyKey('Pediatric Medicine')).toBe('PEDIATRICS');
    expect(normalizeSpecialtyKey('Child Specialist')).toBe('PEDIATRICS');
    expect(normalizeSpecialtyKey('Child Medicine')).toBe('PEDIATRICS');
    expect(normalizeSpecialtyKey('Neonatology')).toBe('NEONATOLOGY');
    expect(normalizeSpecialtyKey('Neonatal Medicine')).toBe('NEONATOLOGY');
  });

  it('returns PEDIATRICS v1 schema without Visit duplicates', () => {
    const template = getSpecialtyTemplate('PEDIATRICS');
    expect(template.key).toBe('PEDIATRICS');
    expect(template.fields.some((field) => field.key === 'feedingType')).toBe(true);
    expect(template.fields.some((field) => field.key === 'developmentOverall')).toBe(true);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'PEDIATRICS', legacySection: 'general' })).toBe(true);
    expect(specialtyUiPath('PEDIATRICS')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('NEONATOLOGY')).toBe('OTHER_FALLBACK');
  });

  it('returns PULMONOLOGY v1 schema without Visit / SpO2 / medicine duplicates', () => {
    const template = getSpecialtyTemplate('PULMONOLOGY');
    expect(template.key).toBe('PULMONOLOGY');
    expect(template.version).toBe('1.0');
    expect(template.fields.some((field) => field.key === 'conditionAsthma')).toBe(true);
    expect(template.fields.some((field) => field.key === 'conditionCopd')).toBe(true);
    expect(template.fields.some((field) => field.key === 'smokingStatus')).toBe(true);
    expect(template.fields.some((field) => field.key === 'cigarettesPerDay')).toBe(true);
    expect(template.fields.some((field) => field.key === 'lastFev1')).toBe(true);
    expect(template.fields.some((field) => field.key === 'spo2')).toBe(false);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(template.fields.some((field) => /medicine|drug|inhaler dose/i.test(field.key))).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'PULMONOLOGY', legacySection: 'general' })).toBe(true);
    expect(specialtyUiPath('PULMONOLOGY')).toBe('GENERIC_ENGINE');
  });

  it('pulmonology summary shows meaningful chips only', () => {
    expect(
      buildSpecialtySummaryParts('PULMONOLOGY', {
        conditionAsthma: 'Yes',
        conditionCopd: 'Yes',
        conditionIld: 'No',
        examClubbing: 'Yes',
      })
    ).toEqual(jasmine.arrayContaining(['Asthma', 'COPD', 'Clubbing']));
  });

  it('maps GI Medicine / Digestive aliases to GASTROENTEROLOGY', () => {
    expect(normalizeSpecialtyKey('GI Medicine')).toBe('GASTROENTEROLOGY');
    expect(normalizeSpecialtyKey('Digestive Diseases')).toBe('GASTROENTEROLOGY');
    expect(normalizeSpecialtyKey('Digestive Medicine')).toBe('GASTROENTEROLOGY');
    expect(normalizeSpecialtyKey('Gastrointestinal Medicine')).toBe('GASTROENTEROLOGY');
    expect(normalizeSpecialtyKey('Gastroenterology')).toBe('GASTROENTEROLOGY');
  });

  it('maps Hepatic Medicine / Liver to HEPATOLOGY', () => {
    expect(normalizeSpecialtyKey('Hepatic Medicine')).toBe('HEPATOLOGY');
    expect(normalizeSpecialtyKey('Liver')).toBe('HEPATOLOGY');
    expect(normalizeSpecialtyKey('Liver Medicine')).toBe('HEPATOLOGY');
    expect(normalizeSpecialtyKey('Hepatology')).toBe('HEPATOLOGY');
  });

  it('does not map surgery specialties to Gastro / Hepato; specialist surgery is OTHER', () => {
    expect(normalizeSpecialtyKey('HPB Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('GI Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Hepatobiliary Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Colorectal Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Thoracic Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Cardiac Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Plastic Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Vascular Surgery')).toBe('OTHER');
    expect(normalizeSpecialtyKey('General Surgery')).toBe('GENERAL_SURGERY');
    expect(normalizeSpecialtyKey('Surgery')).toBe('GENERAL_SURGERY');
    expect(normalizeSpecialtyKey('Surgical Clinic')).toBe('GENERAL_SURGERY');
    expect(normalizeSpecialtyKey('General Surgeon')).toBe('GENERAL_SURGERY');
    expect(normalizeSpecialtyKey('Surgical Department')).toBe('GENERAL_SURGERY');
  });

  it('maps Orthopedics aliases and not rheumatology / physio / sports / neurosurgery', () => {
    expect(normalizeSpecialtyKey('Orthopedics')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Orthopaedics')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Orthopedic Surgery')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Orthopaedic Surgery')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Bone & Joint')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Bone and Joint')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Ortho')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Ortho Clinic')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Rheumatology')).toBe('RHEUMATOLOGY');
    expect(normalizeSpecialtyKey('Physiotherapy')).toBe('PHYSIOTHERAPY');
    expect(normalizeSpecialtyKey('Sports Medicine')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Neurosurgery')).toBe('NEUROSURGERY');
  });

  it('returns GASTROENTEROLOGY v1 schema without Visit / Lab / medicine duplicates', () => {
    const template = getSpecialtyTemplate('GASTROENTEROLOGY');
    expect(template.key).toBe('GASTROENTEROLOGY');
    expect(template.version).toBe('1.0');
    expect(template.fields.some((field) => field.key === 'symptomAbdominalPain')).toBe(true);
    expect(template.fields.some((field) => field.key === 'conditionIbd')).toBe(true);
    expect(template.fields.some((field) => field.key === 'bowelHabitChange')).toBe(true);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(template.fields.some((field) => /medicine|drug|dose/i.test(field.key))).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'GASTROENTEROLOGY', legacySection: 'general' })).toBe(
      true
    );
    expect(specialtyUiPath('GASTROENTEROLOGY')).toBe('GENERIC_ENGINE');
  });

  it('returns HEPATOLOGY v1 schema with documented scores and no auto-MELD', () => {
    const template = getSpecialtyTemplate('HEPATOLOGY');
    expect(template.key).toBe('HEPATOLOGY');
    expect(template.version).toBe('1.0');
    expect(template.fields.some((field) => field.key === 'etiologyHbv')).toBe(true);
    expect(template.fields.some((field) => field.key === 'cirrhosisStatus')).toBe(true);
    expect(template.fields.some((field) => field.key === 'meldScoreVersion')).toBe(true);
    expect(template.fields.some((field) => field.key === 'meldScoreValue')).toBe(true);
    expect(template.fields.some((field) => field.key === 'childPughClass')).toBe(true);
    expect(template.fields.some((field) => field.key === 'childPughInputsSnapshot')).toBe(true);
    expect(template.fields.some((field) => /auto.?meld|computeMeld|meldFormula/i.test(field.key))).toBe(false);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'HEPATOLOGY', legacySection: 'general' })).toBe(true);
    expect(specialtyUiPath('HEPATOLOGY')).toBe('GENERIC_ENGINE');
  });

  it('gastro / hepato summaries show meaningful chips only', () => {
    expect(
      buildSpecialtySummaryParts('GASTROENTEROLOGY', {
        conditionGerd: 'Yes',
        conditionIbd: 'Yes',
        symptomBloodInStool: 'Yes',
        conditionIbs: 'No',
      })
    ).toEqual(jasmine.arrayContaining(['GERD', 'IBD', 'PR bleed']));

    expect(
      buildSpecialtySummaryParts('HEPATOLOGY', {
        etiologyHbv: 'Yes',
        portalHtnKnown: 'Yes',
        symptomAscites: 'Yes',
        etiologyHcv: 'No',
      })
    ).toEqual(jasmine.arrayContaining(['HBV', 'PHTN', 'Ascites']));
  });

  it('returns GENERAL_SURGERY v1 schema with procedureStatus help and no OT creation fields', () => {
    const template = getSpecialtyTemplate('GENERAL_SURGERY');
    expect(template.key).toBe('GENERAL_SURGERY');
    expect(template.version).toBe('1.0');
    expect(template.fields.some((field) => field.key === 'procedureStatus')).toBe(true);
    expect(template.fields.some((field) => field.key === 'herniaSuspected')).toBe(true);
    expect(template.fields.some((field) => field.key === 'operationScheduleId')).toBe(true);
    const statusField = template.fields.find((field) => field.key === 'procedureStatus');
    expect(Boolean(statusField?.helpText && /does not create/i.test(statusField.helpText))).toBe(true);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'GENERAL_SURGERY', legacySection: 'general' })).toBe(
      true
    );
    expect(specialtyUiPath('GENERAL_SURGERY')).toBe('GENERIC_ENGINE');
  });

  it('returns ORTHOPEDICS v1 schema without auto classify / Visit duplicates', () => {
    const template = getSpecialtyTemplate('ORTHOPEDICS');
    expect(template.key).toBe('ORTHOPEDICS');
    expect(template.version).toBe('1.0');
    expect(template.fields.some((field) => field.key === 'bodyRegion')).toBe(true);
    expect(template.fields.some((field) => field.key === 'fractureClassificationSystem')).toBe(true);
    expect(template.fields.some((field) => field.key === 'neurovascularStatus')).toBe(true);
    expect(template.fields.some((field) => field.key === 'weightBearingStatus')).toBe(true);
    expect(template.fields.some((field) => /auto.?classif|computeFracture/i.test(field.key))).toBe(false);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'ORTHOPEDICS', legacySection: 'general' })).toBe(true);
    expect(specialtyUiPath('ORTHOPEDICS')).toBe('GENERIC_ENGINE');
  });

  it('maps Neurology / Neurosurgery aliases; spine ortho and psychiatry stay separate', () => {
    expect(normalizeSpecialtyKey('Neurology')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neurologist')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neurological Medicine')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neuro Medicine')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neurology Clinic')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neuro')).toBe('NEUROLOGY');
    expect(normalizeSpecialtyKey('Neurosurgery')).toBe('NEUROSURGERY');
    expect(normalizeSpecialtyKey('Neuro Surgery')).toBe('NEUROSURGERY');
    expect(normalizeSpecialtyKey('Neurosurgical')).toBe('NEUROSURGERY');
    expect(normalizeSpecialtyKey('Neurosurgeon')).toBe('NEUROSURGERY');
    expect(normalizeSpecialtyKey('Brain & Spine Surgery')).toBe('NEUROSURGERY');
    expect(normalizeSpecialtyKey('Brain and Spine Surgery')).toBe('NEUROSURGERY');
    expect(normalizeSpecialtyKey('Orthopedic Spine')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Psychiatry')).toBe('PSYCHIATRY');
  });

  it('returns NEUROLOGY v1 schema without Visit duplicates or auto classify', () => {
    const template = getSpecialtyTemplate('NEUROLOGY');
    expect(template.key).toBe('NEUROLOGY');
    expect(template.version).toBe('1.0');
    expect(template.fields.some((field) => field.key === 'symptomSeizure')).toBe(true);
    expect(template.fields.some((field) => field.key === 'classificationProfile')).toBe(true);
    expect(template.fields.some((field) => field.key === 'nihssScoreEventRef')).toBe(true);
    expect(template.fields.some((field) => field.key === 'mrsScoreEventRef')).toBe(true);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(template.fields.some((field) => field.key === 'diagnosis')).toBe(false);
    expect(template.fields.some((field) => field.key === 'advice')).toBe(false);
    expect(template.fields.some((field) => /thrombolysis|auto.?classif|computeSeizure/i.test(field.key))).toBe(
      false
    );
    const seizureClass = template.fields.find((field) => field.key === 'seizureClass');
    expect(Boolean(seizureClass?.helpText && /no automatic classification/i.test(seizureClass.helpText))).toBe(
      true
    );
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'NEUROLOGY', legacySection: 'general' })).toBe(true);
    expect(specialtyUiPath('NEUROLOGY')).toBe('GENERIC_ENGINE');
  });

  it('returns NEUROSURGERY v1 schema with plan help and no NeurosurgeryOperation', () => {
    const template = getSpecialtyTemplate('NEUROSURGERY');
    expect(template.key).toBe('NEUROSURGERY');
    expect(template.version).toBe('1.0');
    expect(template.fields.some((field) => field.key === 'problemDomain')).toBe(true);
    expect(template.fields.some((field) => field.key === 'surgicalPlanStatus')).toBe(true);
    expect(template.fields.some((field) => field.key === 'operationScheduleId')).toBe(true);
    expect(template.fields.some((field) => field.key === 'gcsScoreEventRef')).toBe(true);
    expect(template.fields.some((field) => /NeurosurgeryOperation|auto.?cauda/i.test(field.key))).toBe(false);
    const plan = template.fields.find((field) => field.key === 'surgicalPlanStatus');
    expect(Boolean(plan?.helpText && /does not create/i.test(plan.helpText))).toBe(true);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'NEUROSURGERY', legacySection: 'general' })).toBe(
      true
    );
    expect(specialtyUiPath('NEUROSURGERY')).toBe('GENERIC_ENGINE');
  });
});

describe('ENT / Ophthalmology Phase M', () => {
  it('maps ENT aliases; not audiology / speech / maxillofacial / H&N oncology', () => {
    expect(normalizeSpecialtyKey('ENT')).toBe('ENT');
    expect(normalizeSpecialtyKey('Ear Nose Throat')).toBe('ENT');
    expect(normalizeSpecialtyKey('Ear Nose and Throat')).toBe('ENT');
    expect(normalizeSpecialtyKey('Otolaryngology')).toBe('ENT');
    expect(normalizeSpecialtyKey('Otorhinolaryngology')).toBe('ENT');
    expect(normalizeSpecialtyKey('ENT Clinic')).toBe('ENT');
    expect(normalizeSpecialtyKey('ENT Specialist')).toBe('ENT');
    expect(normalizeSpecialtyKey('Audiology')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Speech Therapy')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Maxillofacial')).toBe('DENTAL');
    expect(normalizeSpecialtyKey('Head & Neck Oncology')).toBe('ONCOLOGY');
  });

  it('maps Ophthalmology / Eye Clinic; Optometry is OTHER', () => {
    expect(normalizeSpecialtyKey('Ophthalmology')).toBe('OPHTHALMOLOGY');
    expect(normalizeSpecialtyKey('Ophthalmologist')).toBe('OPHTHALMOLOGY');
    expect(normalizeSpecialtyKey('Eye')).toBe('OPHTHALMOLOGY');
    expect(normalizeSpecialtyKey('Eye Clinic')).toBe('OPHTHALMOLOGY');
    expect(normalizeSpecialtyKey('Eye Department')).toBe('OPHTHALMOLOGY');
    expect(normalizeSpecialtyKey('Eye Specialist')).toBe('OPHTHALMOLOGY');
    expect(normalizeSpecialtyKey('Optometry')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Optometrist')).toBe('OTHER');
  });

  it('returns ENT v1 on GENERIC_ENGINE without Visit duplicates or auto diagnosis', () => {
    const template = getSpecialtyTemplate('ENT');
    expect(template.key).toBe('ENT');
    expect(template.version).toBe('1.0');
    expect(template.fields.some((field) => field.key === 'hearingLoss')).toBe(true);
    expect(template.fields.some((field) => field.key === 'audiometryRef')).toBe(true);
    expect(template.fields.some((field) => field.key === 'rightEarOtoscopyCanal')).toBe(true);
    expect(template.fields.some((field) => field.key === 'chiefComplaint')).toBe(false);
    expect(template.fields.some((field) => /AudiologyTest|auto.?otitis|auto.?bppv/i.test(field.key))).toBe(
      false
    );
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'ENT', legacySection: 'general' })).toBe(true);
    expect(specialtyUiPath('ENT')).toBe('GENERIC_ENGINE');
  });

  it('registers OPHTHALMOLOGY for helpers but keeps CUSTOM_LEGACY gate', () => {
    const template = getSpecialtyTemplate('OPHTHALMOLOGY');
    expect(template.key).toBe('OPHTHALMOLOGY');
    expect(template.fields.some((field) => field.key === 'visualAcuityRight')).toBe(true);
    expect(template.fields.some((field) => field.key === 'cataractOd')).toBe(true);
    expect(template.fields.some((field) => field.key === 'surgicalPlanStatus')).toBe(true);
    const plan = template.fields.find((field) => field.key === 'surgicalPlanStatus');
    expect(Boolean(plan?.helpText && /does not create|does not mean OT/i.test(plan.helpText))).toBe(true);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'OPHTHALMOLOGY', legacySection: 'eye' })).toBe(
      false
    );
    expect(specialtyUiPath('OPHTHALMOLOGY')).toBe('CUSTOM_LEGACY');
    expect(specialtyUiPath('OPHTHALMOLOGY', 'eye')).toBe('CUSTOM_LEGACY');
  });
});

describe('specialty summary / print / showIf / engine gate', () => {
  it('summary only includes meaningful yes values', () => {
    expect(
      buildSpecialtySummaryParts('GENERAL_MEDICINE', {
        chronicHypertension: 'Yes',
        chronicDiabetes: 'No',
        chronicAsthma: '',
        chronicCopd: 'Yes',
      })
    ).toEqual(['HTN', 'COPD']);
  });

  it('empty summary returns blank line (caller hides area)', () => {
    expect(
      buildSpecialtySummaryLine('GENERAL_MEDICINE', {
        chronicHypertension: 'No',
        chronicDiabetes: '',
      })
    ).toBe('');
  });

  it('print rows skip No / empty values', () => {
    const rows = buildEngineSpecialtyPrintRows('GENERAL_MEDICINE', {
      chronicHypertension: 'Yes',
      chronicDiabetes: 'No',
      clinicalImpression: 'Viral illness',
      generalExaminationSummary: '',
    });
    expect(rows.some((row) => row.label === 'HTN' && row.value === 'Yes')).toBe(true);
    expect(rows.some((row) => /Diabetes/i.test(row.label) && row.value === 'No')).toBe(false);
    expect(rows.some((row) => row.label.toLowerCase().includes('impression'))).toBe(true);
  });

  it('evaluates showIf deterministically without eval', () => {
    expect(evaluateShowIf({ field: 'chronicDiabetes', equals: 'Yes' }, { chronicDiabetes: 'Yes' })).toBe(true);
    expect(evaluateShowIf({ field: 'chronicDiabetes', equals: 'Yes' }, { chronicDiabetes: 'No' })).toBe(false);
  });

  it('keeps gynae and physio on custom UI', () => {
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'OBGYN', legacySection: 'gynae' })).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'PHYSIOTHERAPY', legacySection: 'physiotherapy' })).toBe(
      false
    );
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'GENERAL_MEDICINE', legacySection: 'general' })).toBe(true);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'OTHER', legacySection: 'general' })).toBe(true);
    expect(specialtyUiPath('OBGYN', 'gynae')).toBe('CUSTOM_LEGACY');
    expect(specialtyUiPath('OPHTHALMOLOGY', 'eye')).toBe('CUSTOM_LEGACY');
    expect(specialtyUiPath('GENERAL_MEDICINE')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('CARDIOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('PEDIATRICS')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('PULMONOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('GASTROENTEROLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('HEPATOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('GENERAL_SURGERY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('ORTHOPEDICS')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('NEUROLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('NEUROSURGERY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('ENT')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('OPHTHALMOLOGY')).toBe('CUSTOM_LEGACY');
    expect(specialtyUiPath('ENDOCRINOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('NEPHROLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('UROLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('DERMATOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('RHEUMATOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('INFECTIOUS_DISEASE')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('PSYCHIATRY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('ONCOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('ANESTHESIOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('EMERGENCY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('NEONATOLOGY')).toBe('GENERIC_ENGINE');
    expect(specialtyUiPath('DENTAL')).toBe('CUSTOM_LEGACY');
    expect(specialtyUiPath('DENTAL', 'dental')).toBe('CUSTOM_LEGACY');
  });
});

describe('specialty data preservation', () => {
  it('keeps unknown legacy keys when merging form edits', () => {
    const preserved = {
      oldUnknownField: 'keep-me',
      oldNestedObject: { nested: true },
    };
    const merged = mergeSpecialtyDataForSave(
      {
        chronicHypertension: 'Yes',
        clinicalImpression: 'Updated',
      },
      preserved
    );
    expect(merged['oldUnknownField']).toBe('keep-me');
    expect(merged['oldNestedObject']).toEqual({ nested: true });
    expect(merged['chronicHypertension']).toBe('Yes');
    expect(merged['clinicalImpression']).toBe('Updated');
  });

  it('splitPreservedSpecialtyData does not erase nested unknown data', () => {
    const { formPatch, preserved } = splitPreservedSpecialtyData(
      {
        chronicHypertension: 'Yes',
        oldUnknownField: 'legacy',
        oldNestedObject: { a: 1 },
      },
      new Set(['chronicHypertension', 'clinicalImpression'])
    );
    expect(formPatch['chronicHypertension']).toBe('Yes');
    expect(preserved['oldUnknownField']).toBe('legacy');
    expect(preserved['oldNestedObject']).toEqual({ a: 1 });
  });
});

describe('Phase N remaining core specialties', () => {
  it('maps endocrinology aliases; obstetrics wins over gestational diabetes pattern via OBGYN first', () => {
    expect(normalizeSpecialtyKey('Endocrinology')).toBe('ENDOCRINOLOGY');
    expect(normalizeSpecialtyKey('Endocrine')).toBe('ENDOCRINOLOGY');
    expect(normalizeSpecialtyKey('Diabetes Clinic')).toBe('ENDOCRINOLOGY');
    expect(normalizeSpecialtyKey('Diabetology')).toBe('ENDOCRINOLOGY');
    expect(normalizeSpecialtyKey('Hormone Clinic')).toBe('ENDOCRINOLOGY');
    expect(normalizeSpecialtyKey('Gestational Diabetes')).toBe('ENDOCRINOLOGY');
    expect(normalizeSpecialtyKey('Obstetrics')).toBe('OBGYN');
    expect(normalizeSpecialtyKey('Antenatal')).toBe('OBGYN');
  });

  it('maps nephrology vs urology without collision', () => {
    expect(normalizeSpecialtyKey('Nephrology')).toBe('NEPHROLOGY');
    expect(normalizeSpecialtyKey('Kidney Clinic')).toBe('NEPHROLOGY');
    expect(normalizeSpecialtyKey('Renal Medicine')).toBe('NEPHROLOGY');
    expect(normalizeSpecialtyKey('Renal Clinic')).toBe('NEPHROLOGY');
    expect(normalizeSpecialtyKey('Urology')).toBe('UROLOGY');
    expect(normalizeSpecialtyKey('Urinary Tract Clinic')).toBe('UROLOGY');
    expect(normalizeSpecialtyKey('Urological Surgery')).toBe('UROLOGY');
    expect(normalizeSpecialtyKey('Urologist')).toBe('UROLOGY');
    expect(normalizeSpecialtyKey('Kidney')).toBe('NEPHROLOGY');
    expect(normalizeSpecialtyKey('Urinary')).toBe('UROLOGY');
  });

  it('maps dermatology / rheumatology / ID / psychiatry / oncology collisions', () => {
    expect(normalizeSpecialtyKey('Dermatology')).toBe('DERMATOLOGY');
    expect(normalizeSpecialtyKey('Skin Clinic')).toBe('DERMATOLOGY');
    expect(normalizeSpecialtyKey('Skin and VD')).toBe('DERMATOLOGY');
    expect(normalizeSpecialtyKey('Rheumatology')).toBe('RHEUMATOLOGY');
    expect(normalizeSpecialtyKey('Rheumatic Diseases')).toBe('RHEUMATOLOGY');
    expect(normalizeSpecialtyKey('Arthritis Clinic')).toBe('RHEUMATOLOGY');
    expect(normalizeSpecialtyKey('Autoimmune Clinic')).toBe('RHEUMATOLOGY');
    expect(normalizeSpecialtyKey('Orthopedics')).toBe('ORTHOPEDICS');
    expect(normalizeSpecialtyKey('Infectious Diseases')).toBe('INFECTIOUS_DISEASE');
    expect(normalizeSpecialtyKey('ID Clinic')).toBe('INFECTIOUS_DISEASE');
    expect(normalizeSpecialtyKey('Tropical Medicine')).toBe('INFECTIOUS_DISEASE');
    expect(normalizeSpecialtyKey('TB Clinic')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Tuberculosis Clinic')).toBe('PULMONOLOGY');
    expect(normalizeSpecialtyKey('Psychiatry')).toBe('PSYCHIATRY');
    expect(normalizeSpecialtyKey('Mental Health')).toBe('PSYCHIATRY');
    expect(normalizeSpecialtyKey('Behavioral Health')).toBe('PSYCHIATRY');
    expect(normalizeSpecialtyKey('Medical Oncology')).toBe('ONCOLOGY');
    expect(normalizeSpecialtyKey('Cancer Clinic')).toBe('ONCOLOGY');
    expect(normalizeSpecialtyKey('Surgical Oncology')).toBe('OTHER');
    expect(normalizeSpecialtyKey('Radiation Oncology')).toBe('OTHER');
  });

  it('maps anesthesiology / emergency / neonatology / dental aliases', () => {
    expect(normalizeSpecialtyKey('Anesthesiology')).toBe('ANESTHESIOLOGY');
    expect(normalizeSpecialtyKey('Anaesthesiology')).toBe('ANESTHESIOLOGY');
    expect(normalizeSpecialtyKey('Anesthesia')).toBe('ANESTHESIOLOGY');
    expect(normalizeSpecialtyKey('Pre-anaesthesia Clinic')).toBe('ANESTHESIOLOGY');
    expect(normalizeSpecialtyKey('Emergency')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('Emergency Medicine')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('ER')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('ED')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('Accident and Emergency')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('A&E')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('A and E')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('Neonatology')).toBe('NEONATOLOGY');
    expect(normalizeSpecialtyKey('Newborn Medicine')).toBe('NEONATOLOGY');
    expect(normalizeSpecialtyKey('Neonatal Clinic')).toBe('NEONATOLOGY');
    expect(normalizeSpecialtyKey('NICU')).toBe('NEONATOLOGY');
    expect(normalizeSpecialtyKey('Dental')).toBe('DENTAL');
    expect(normalizeSpecialtyKey('Dentistry')).toBe('DENTAL');
    expect(normalizeSpecialtyKey('Oral Surgery')).toBe('DENTAL');
    expect(normalizeSpecialtyKey('Oral and Maxillofacial')).toBe('DENTAL');
    expect(normalizeSpecialtyKey('Maxillofacial Surgery')).toBe('DENTAL');
    expect(specialtyDisplayName('DENTAL')).toBe('Dental / Oral & Maxillofacial');
    expect(specialtyDisplayName('EMERGENCY')).toBe('Emergency Medicine');
  });

  it('does not invent parallel keys EMERGENCY_MEDICINE / DENTAL_ORAL_MAXILLOFACIAL', () => {
    // Free-text "EMERGENCY_MEDICINE" normalizes to existing EMERGENCY (via "emergency medicine")
    expect(normalizeSpecialtyKey('EMERGENCY_MEDICINE')).toBe('EMERGENCY');
    expect(normalizeSpecialtyKey('Emergency Medicine')).toBe('EMERGENCY');
    // Oral/maxillofacial free text maps to existing DENTAL — never a parallel key token
    expect(normalizeSpecialtyKey('DENTAL_ORAL_MAXILLOFACIAL')).toBe('DENTAL');
    expect(normalizeSpecialtyKey('Oral and Maxillofacial')).toBe('DENTAL');
    expect(specialtyDisplayName('EMERGENCY')).toBe('Emergency Medicine');
    expect(specialtyDisplayName('DENTAL')).toBe('Dental / Oral & Maxillofacial');
  });

  it('registers Phase N GENERIC templates and DENTAL CUSTOM_LEGACY', () => {
    const genericKeys = [
      'ENDOCRINOLOGY',
      'NEPHROLOGY',
      'UROLOGY',
      'DERMATOLOGY',
      'RHEUMATOLOGY',
      'INFECTIOUS_DISEASE',
      'PSYCHIATRY',
      'ONCOLOGY',
      'ANESTHESIOLOGY',
      'EMERGENCY',
      'NEONATOLOGY',
    ] as const;

    for (const key of genericKeys) {
      expect(getSpecialtyTemplate(key).key).toBe(key);
      expect(specialtyUiPath(key)).toBe('GENERIC_ENGINE');
      expect(usesGenericSpecialtyEngine(key)).toBe(true);
      expect(shouldUseGenericSpecialtyEngine({ specialtyKey: key, legacySection: 'general' })).toBe(true);
      expect(getSpecialtyTemplate(key).fields.some((f) => f.key === 'chiefComplaint')).toBe(false);
    }

    expect(getSpecialtyTemplate('DENTAL').key).toBe('DENTAL');
    expect(getSpecialtyTemplate('DENTAL').fields.some((f) => f.key === 'toothNumber')).toBe(true);
    expect(getSpecialtyTemplate('DENTAL').fields.some((f) => f.key === 'toothNumberingSystem')).toBe(true);
    expect(specialtyUiPath('DENTAL')).toBe('CUSTOM_LEGACY');
    expect(usesGenericSpecialtyEngine('DENTAL')).toBe(false);
    expect(shouldUseGenericSpecialtyEngine({ specialtyKey: 'DENTAL', legacySection: 'dental' })).toBe(false);
    expect(listRegisteredSpecialtyTemplates().length).toBeGreaterThanOrEqual(20);
  });

  it('psychiatry summary chips exclude suicidal ideation', () => {
    const parts = buildSpecialtySummaryParts('PSYCHIATRY', {
      knownDepression: 'Yes',
      followUpPlan: 'Early review',
      suicidalIdeationNote: 'Present — do not chip',
      riskAssessmentNote: 'Narrative only',
    });
    expect(parts).toEqual(['Depression', 'Follow-up']);
    expect(parts.some((p) => /suicid/i.test(p))).toBe(false);
  });

  it('anesthesiology clearance has no Fit/Unfit auto field', () => {
    const t = getSpecialtyTemplate('ANESTHESIOLOGY');
    expect(t.fields.some((f) => f.key === 'clearanceConclusion')).toBe(true);
    expect(t.fields.some((f) => /fit|unfit/i.test(f.key))).toBe(false);
    const clearance = t.fields.find((f) => f.key === 'clearanceConclusion');
    expect(Boolean(clearance?.helpText && /no fit\/unfit/i.test(clearance.helpText))).toBe(true);
  });

  it('emergency uses Encounter helpText; neonatology refs BirthRecord', () => {
    const em = getSpecialtyTemplate('EMERGENCY');
    expect(em.fields.some((f) => f.key === 'triageCategory')).toBe(true);
    expect(em.fields.some((f) => /EmergencyEncounter/i.test(f.key))).toBe(false);
    const arrival = em.fields.find((f) => f.key === 'arrivalMode');
    expect(Boolean(arrival?.helpText && /Encounter emergency/i.test(arrival.helpText))).toBe(true);

    const neo = getSpecialtyTemplate('NEONATOLOGY');
    expect(neo.fields.some((f) => f.key === 'birthRecordRef')).toBe(true);
    const birth = neo.fields.find((f) => f.key === 'birthRecordRef');
    expect(Boolean(birth?.helpText && /BirthRecord/i.test(birth.helpText))).toBe(true);
  });
});
