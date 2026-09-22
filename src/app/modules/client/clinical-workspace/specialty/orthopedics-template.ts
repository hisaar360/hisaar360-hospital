import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import {
  BODY_REGION_OPTIONS,
  LATERALITY_OPTIONS,
  dateField,
  equals,
  select,
  text,
  textArea,
  tri,
  yes,
} from './surgical-shared';

/**
 * ORTHOPEDICS v1 — OPD consultation specialtyData only (Phase K).
 * No auto fracture classification, no auto cauda equina diagnosis.
 * SpO2/vitals/labs/meds/physio remain canonical elsewhere.
 */
export const ORTHOPEDICS_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'ORTHOPEDICS',
  name: 'Orthopaedics',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'OPD orthopaedic consultation notes. Clinician-documented findings only — no automated diagnosis.',
  fields: [
    // --- QUICK: Presentation ---
    select('bodyRegion', 'Body region', BODY_REGION_OPTIONS, 'quick', 1, {
      section: 'Presentation',
      summaryLabel: 'Region',
    }),
    text('specificSite', 'Specific site', 'quick', 2, {
      section: 'Presentation',
      placeholder: 'e.g. mid-shaft tibia, rotator cuff',
      summaryLabel: 'Site',
    }),
    select('laterality', 'Laterality', LATERALITY_OPTIONS, 'quick', 3, {
      section: 'Presentation',
      summaryLabel: 'Side',
    }),
    tri('symptomPain', 'Pain', 'quick', 4, { section: 'Presentation', summaryLabel: 'Pain' }),
    tri('symptomSwelling', 'Swelling', 'quick', 5, {
      section: 'Presentation',
      summaryLabel: 'Swelling',
    }),
    select(
      'onsetType',
      'Onset type',
      ['Injury / traumatic', 'Non-traumatic', 'Not documented'],
      'quick',
      6,
      { section: 'Presentation', summaryLabel: 'Onset' }
    ),
    text('symptomDuration', 'Duration', 'quick', 7, {
      section: 'Presentation',
      placeholder: 'e.g. 2 weeks',
    }),

    // --- QUICK: Injury ---
    dateField('injuryDate', 'Injury date', 'quick', 20, {
      section: 'Injury',
      showIf: equals('onsetType', 'Injury / traumatic'),
    }),
    select(
      'injuryMechanismCategory',
      'Injury mechanism',
      [
        'Fall',
        'Road traffic accident',
        'Sports',
        'Twisting',
        'Direct blow',
        'Crush',
        'Work injury',
        'Assault',
        'Overuse',
        'Other',
        'Not documented',
      ],
      'quick',
      21,
      { section: 'Injury', showIf: equals('onsetType', 'Injury / traumatic') }
    ),
    textArea('injuryMechanism', 'Injury mechanism detail', 'quick', 22, {
      section: 'Injury',
      showIf: equals('onsetType', 'Injury / traumatic'),
      placeholder: 'Optional detail — no automatic severity inference',
    }),
    text('digitIdentification', 'Digit identification (optional)', 'quick', 23, {
      section: 'Injury',
      placeholder: 'e.g. right index finger, left 5th toe',
      helpText: 'For hand / finger / foot / toe — optional.',
    }),

    // --- QUICK: Function ---
    select(
      'romStatus',
      'Range of motion',
      ['Normal', 'Reduced', 'Not assessed'],
      'quick',
      30,
      { section: 'Function', summaryLabel: 'ROM' }
    ),
    textArea('romSummary', 'ROM summary', 'quick', 31, {
      section: 'Function',
      placeholder: 'Clinician ROM description',
    }),
    select(
      'weightBearingStatus',
      'Weight-bearing status',
      [
        'Full weight bearing',
        'Weight bearing as tolerated',
        'Partial weight bearing',
        'Toe-touch',
        'Non-weight bearing',
        'Not specified',
      ],
      'quick',
      32,
      {
        section: 'Function',
        summaryLabel: 'WB',
        helpText: 'Clinician-directed only — not derived from fracture type.',
      }
    ),

    // --- QUICK: Neurovascular ---
    select(
      'neurovascularStatus',
      'Neurovascular summary',
      ['Intact', 'Abnormal', 'Not fully assessed'],
      'quick',
      40,
      { section: 'Neurovascular', summaryLabel: 'NV' }
    ),
    text('neurovascularMotor', 'Motor function', 'quick', 41, {
      section: 'Neurovascular',
      placeholder: 'Clinician description',
    }),
    text('neurovascularSensation', 'Sensation', 'quick', 42, {
      section: 'Neurovascular',
      placeholder: 'Clinician description',
    }),
    text('neurovascularDistalPulse', 'Distal pulse / perfusion', 'quick', 43, {
      section: 'Neurovascular',
      placeholder: 'Clinician description',
    }),
    textArea('neurovascularNote', 'Neurovascular note', 'quick', 44, {
      section: 'Neurovascular',
      helpText: 'Does not auto-diagnose compartment syndrome.',
    }),

    // --- QUICK: Known issues / plan ---
    tri('knownOsteoarthritis', 'Known osteoarthritis', 'quick', 50, {
      section: 'Known issues',
      summaryLabel: 'OA',
    }),
    tri('knownPriorFracture', 'Prior fracture (known)', 'quick', 51, {
      section: 'Known issues',
    }),
    tri('knownPriorOrthoSurgery', 'Prior ortho surgery', 'quick', 52, {
      section: 'Known issues',
    }),
    textArea('knownIssuesNote', 'Known issues note', 'quick', 53, {
      section: 'Known issues',
    }),
    textArea('clinicalImpression', 'Clinical impression / plan', 'quick', 60, {
      section: 'Plan',
      placeholder: 'Clinician assessment — not auto-diagnosed',
    }),
    tri('physiotherapyRecommended', 'Physiotherapy recommended / refer', 'quick', 61, {
      section: 'Plan',
      helpText: 'Recommendation only — physiotherapy treatment plan stays in Physiotherapy module.',
    }),
    textArea('planNote', 'Plan note', 'quick', 62, {
      section: 'Plan',
    }),

    // --- MORE: Fracture (clinician only) ---
    tri('fractureSuspected', 'Fracture suspected / known', 'more', 70, {
      section: 'Fracture',
      summaryLabel: 'Fracture',
    }),
    text('fractureSite', 'Fracture site (clinician)', 'more', 71, {
      section: 'Fracture',
      showIf: yes('fractureSuspected'),
      placeholder: 'Clinician description',
    }),
    text('fractureClassificationSystem', 'Classification system', 'more', 72, {
      section: 'Fracture',
      showIf: yes('fractureSuspected'),
      placeholder: 'e.g. AO, Garden — clinician-chosen',
      helpText: 'No automatic classification — record system/value only if clinician applies one.',
    }),
    text('fractureClassificationValue', 'Classification value', 'more', 73, {
      section: 'Fracture',
      showIf: yes('fractureSuspected'),
    }),
    textArea('fractureNote', 'Fracture note', 'more', 74, {
      section: 'Fracture',
      showIf: yes('fractureSuspected'),
    }),

    // --- MORE: Dislocation ---
    tri('dislocationSuspected', 'Dislocation / subluxation', 'more', 80, {
      section: 'Dislocation',
    }),
    text('dislocationSite', 'Dislocation site', 'more', 81, {
      section: 'Dislocation',
      showIf: yes('dislocationSuspected'),
    }),
    textArea('dislocationNote', 'Dislocation note', 'more', 82, {
      section: 'Dislocation',
      showIf: yes('dislocationSuspected'),
    }),

    // --- MORE: Soft tissue ---
    tri('softTissueInjury', 'Soft tissue injury', 'more', 90, {
      section: 'Soft tissue',
    }),
    textArea('softTissueNote', 'Soft tissue note', 'more', 91, {
      section: 'Soft tissue',
      showIf: yes('softTissueInjury'),
    }),

    // --- MORE: Arthritis ---
    tri('arthritisConcern', 'Arthritis concern', 'more', 100, {
      section: 'Arthritis',
    }),
    textArea('arthritisNote', 'Arthritis note', 'more', 101, {
      section: 'Arthritis',
      showIf: yes('arthritisConcern'),
    }),

    // --- MORE: Spine (region-conditional) + red flags as notes only ---
    textArea('spineSymptomNote', 'Spine symptom note', 'more', 110, {
      section: 'Spine',
      showIf: equals('bodyRegion', 'Spine / back'),
      placeholder: 'Clinician notes only',
    }),
    textArea('spineRedFlagNote', 'Spine red-flag notes (clinician)', 'more', 111, {
      section: 'Spine',
      showIf: equals('bodyRegion', 'Spine / back'),
      helpText:
        'Clinician documentation only — no automatic cauda equina or red-flag diagnosis.',
      placeholder: 'e.g. saddle anaesthesia reported — clinician judgment',
    }),

    // --- MORE: Immobilization / cast ---
    select(
      'immobilizationType',
      'Immobilization',
      ['None', 'Sling', 'Splint', 'Cast', 'Brace', 'Other', 'Not documented'],
      'more',
      120,
      { section: 'Immobilization' }
    ),
    textArea('immobilizationNote', 'Immobilization note', 'more', 121, {
      section: 'Immobilization',
    }),
    tri('castFollowUp', 'Cast follow-up visit', 'more', 122, {
      section: 'Immobilization',
    }),
    textArea('castFollowUpNote', 'Cast follow-up note', 'more', 123, {
      section: 'Immobilization',
      showIf: yes('castFollowUp'),
    }),

    // --- MORE: Implant / prosthesis ---
    tri('implantProsthesisHistory', 'Implant / prosthesis history', 'more', 130, {
      section: 'Implant / prosthesis',
    }),
    text('implantType', 'Implant / prosthesis type', 'more', 131, {
      section: 'Implant / prosthesis',
      showIf: yes('implantProsthesisHistory'),
    }),
    text('implantYear', 'Year (approx)', 'more', 132, {
      section: 'Implant / prosthesis',
      showIf: yes('implantProsthesisHistory'),
    }),
    textArea('implantNote', 'Implant note', 'more', 133, {
      section: 'Implant / prosthesis',
      showIf: yes('implantProsthesisHistory'),
    }),

    // --- MORE: Imaging reference ---
    text('imagingType', 'Imaging type (reference)', 'more', 140, {
      section: 'Imaging reference',
      placeholder: 'e.g. X-ray, MRI — reference only',
    }),
    dateField('imagingDate', 'Imaging date', 'more', 141, {
      section: 'Imaging reference',
    }),
    textArea('imagingSummary', 'Imaging summary (clinician)', 'more', 142, {
      section: 'Imaging reference',
    }),
    text('imagingDocumentRef', 'Imaging document ref', 'more', 143, {
      section: 'Imaging reference',
      placeholder: 'Optional reference string',
    }),

    // --- MORE: Compartment concern (no auto diagnose) ---
    select(
      'compartmentConcern',
      'Compartment concern',
      ['Yes', 'No', 'Not assessed'],
      'more',
      150,
      {
        section: 'Compartment',
        helpText: 'Clinician concern flag only — does not auto-diagnose compartment syndrome.',
      }
    ),
    textArea('compartmentNote', 'Compartment note', 'more', 151, {
      section: 'Compartment',
    }),

    // --- MORE: Optional ROM degrees (text/numeric-friendly) ---
    text('romFlexionDegrees', 'ROM flexion (°)', 'more', 160, {
      section: 'ROM detail',
      placeholder: 'Optional numeric text',
      showIf: equals('bodyRegion', 'Thigh / knee'),
    }),
    text('romExtensionDegrees', 'ROM extension (°)', 'more', 161, {
      section: 'ROM detail',
      placeholder: 'Optional numeric text',
      showIf: equals('bodyRegion', 'Thigh / knee'),
    }),
    text('romAbductionDegrees', 'ROM abduction (°)', 'more', 162, {
      section: 'ROM detail',
      placeholder: 'Optional numeric text',
      showIf: equals('bodyRegion', 'Shoulder'),
    }),
    text('romOtherDegrees', 'Other ROM (°)', 'more', 163, {
      section: 'ROM detail',
      placeholder: 'Optional — any joint',
    }),

    text('operationScheduleId', 'OperationSchedule ID (optional reference)', 'more', 170, {
      section: 'References',
      placeholder: 'Optional string reference only',
      helpText: 'Reference only — specialty save does not write OperationSchedule.',
    }),
  ],
};
