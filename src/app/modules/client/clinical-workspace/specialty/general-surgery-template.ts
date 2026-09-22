import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import {
  ANATOMICAL_SITE_OPTIONS,
  BODY_REGION_OPTIONS,
  LATERALITY_OPTIONS,
  equals,
  integer,
  select,
  text,
  textArea,
  tri,
  yes,
} from './surgical-shared';

/**
 * GENERAL_SURGERY v1 — OPD consultation specialtyData only (Phase K).
 * Does NOT create OperationSchedule / completed operations.
 * SpO2/vitals/labs/meds/admission stay canonical elsewhere.
 * Wound/drain here are OPD follow-up fields only — not Ward nursing/I/O.
 */
export const GENERAL_SURGERY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'GENERAL_SURGERY',
  name: 'General Surgery',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'OPD surgical consultation notes. Procedure recommended / Surgery planned does not create a completed operation.',
  fields: [
    // --- QUICK: Surgical problem ---
    select('problemBodyRegion', 'Body region', BODY_REGION_OPTIONS, 'quick', 1, {
      section: 'Surgical problem',
    }),
    select('problemSite', 'Anatomical site', ANATOMICAL_SITE_OPTIONS, 'quick', 2, {
      section: 'Surgical problem',
      summaryLabel: 'Site',
    }),
    text('problemSiteDetail', 'Site detail', 'quick', 3, {
      section: 'Surgical problem',
      placeholder: 'e.g. right inguinal, epigastric',
    }),
    select('problemLaterality', 'Laterality', LATERALITY_OPTIONS, 'quick', 4, {
      section: 'Surgical problem',
      summaryLabel: 'Side',
    }),
    text('problemDuration', 'Duration', 'quick', 5, {
      section: 'Surgical problem',
      placeholder: 'e.g. 3 months',
    }),
    select(
      'problemAcuity',
      'Acute / chronic',
      ['Acute', 'Chronic', 'Acute on chronic', 'Not documented'],
      'quick',
      6,
      { section: 'Surgical problem', summaryLabel: 'Acuity' }
    ),
    tri('problemPain', 'Pain', 'quick', 7, { section: 'Surgical problem', summaryLabel: 'Pain' }),
    tri('problemSwelling', 'Swelling / lump', 'quick', 8, {
      section: 'Surgical problem',
      summaryLabel: 'Swelling',
    }),
    tri('problemDischarge', 'Discharge', 'quick', 9, { section: 'Surgical problem' }),
    tri('problemBleeding', 'Bleeding', 'quick', 10, {
      section: 'Surgical problem',
      summaryLabel: 'Bleed',
    }),
    tri('problemFever', 'Fever', 'quick', 11, { section: 'Surgical problem', summaryLabel: 'Fever' }),
    tri('problemBowelConcern', 'Bowel-related concern', 'quick', 12, {
      section: 'Surgical problem',
    }),
    textArea('problemNote', 'Other surgical concern / note', 'quick', 13, {
      section: 'Surgical problem',
      placeholder: 'Brief symptom / concern summary',
    }),

    // --- QUICK: Known surgical history ---
    tri('knownPriorAbdominalSurgery', 'Prior abdominal surgery', 'quick', 20, {
      section: 'Known surgical history',
      summaryLabel: 'Prior abd surg',
    }),
    tri('knownPriorAnesthesiaIssue', 'Previous anesthesia issue', 'quick', 21, {
      section: 'Known surgical history',
      helpText: 'Clinician-reported only — does not declare anesthetic fitness.',
    }),
    tri('knownPriorWoundComplication', 'Previous wound complication', 'quick', 22, {
      section: 'Known surgical history',
    }),
    tri('knownHerniaHistory', 'Known hernia history', 'quick', 23, {
      section: 'Known surgical history',
      summaryLabel: 'Hernia Hx',
    }),
    tri('knownGallstoneHistory', 'Known gallstone / biliary history', 'quick', 24, {
      section: 'Known surgical history',
    }),
    tri('knownAnorectalDisease', 'Known anorectal disease', 'quick', 25, {
      section: 'Known surgical history',
    }),
    tri('knownAppendectomy', 'Prior appendectomy', 'quick', 26, {
      section: 'Known surgical history',
    }),
    tri('knownOtherSurgery', 'Other prior surgery', 'quick', 27, {
      section: 'Known surgical history',
    }),
    textArea('knownSurgicalHistoryNote', 'Surgical history note', 'quick', 28, {
      section: 'Known surgical history',
      placeholder: 'Clinician-reported history only',
    }),

    // --- QUICK: Assessment / plan status ---
    textArea('examFindings', 'Key examination findings', 'quick', 39, {
      section: 'Assessment',
      placeholder: 'Site exam — clinician findings only',
    }),
    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 40, {
      section: 'Assessment',
      placeholder: 'Clinician assessment — not auto-diagnosed',
    }),
    select(
      'procedureStatus',
      'Procedure / surgery plan status',
      [
        'No procedure planned',
        'Further investigation',
        'Procedure recommended',
        'Surgery planned',
        'Post-operative follow-up',
      ],
      'quick',
      41,
      {
        section: 'Assessment',
        summaryLabel: 'Plan',
        helpText:
          'Recommendation or “Surgery planned” records OPD intent only — it does not create a completed OperationSchedule / OT record.',
      }
    ),
    textArea('planNote', 'Plan note', 'quick', 42, {
      section: 'Assessment',
      placeholder: 'Investigations, referral, or follow-up intent',
    }),

    // --- MORE: Lump ---
    tri('lumpPresent', 'Lump / mass', 'more', 50, {
      section: 'Lump',
      summaryLabel: 'Lump',
    }),
    text('lumpDuration', 'Lump duration', 'more', 51, {
      section: 'Lump',
      showIf: yes('lumpPresent'),
    }),
    text('lumpSizeEstimate', 'Size estimate', 'more', 52, {
      section: 'Lump',
      showIf: yes('lumpPresent'),
      placeholder: 'e.g. 2 cm',
    }),
    tri('lumpTender', 'Tender', 'more', 53, { section: 'Lump', showIf: yes('lumpPresent') }),
    tri('lumpMobile', 'Mobile', 'more', 54, { section: 'Lump', showIf: yes('lumpPresent') }),
    textArea('lumpNote', 'Lump note', 'more', 55, {
      section: 'Lump',
      showIf: yes('lumpPresent'),
    }),

    // --- MORE: Hernia (conditional) ---
    tri('herniaSuspected', 'Hernia suspected / known', 'more', 60, {
      section: 'Hernia',
      summaryLabel: 'Hernia',
    }),
    select(
      'herniaType',
      'Hernia type',
      ['Inguinal', 'Femoral', 'Umbilical', 'Epigastric', 'Incisional', 'Other', 'Not documented'],
      'more',
      61,
      { section: 'Hernia', showIf: yes('herniaSuspected') }
    ),
    select('herniaLaterality', 'Hernia laterality', LATERALITY_OPTIONS, 'more', 62, {
      section: 'Hernia',
      showIf: yes('herniaSuspected'),
    }),
    tri('herniaReducible', 'Reducible', 'more', 63, {
      section: 'Hernia',
      showIf: yes('herniaSuspected'),
    }),
    tri('herniaPainful', 'Painful / irreducible concern', 'more', 64, {
      section: 'Hernia',
      showIf: yes('herniaSuspected'),
    }),
    textArea('herniaNote', 'Hernia note', 'more', 65, {
      section: 'Hernia',
      showIf: yes('herniaSuspected'),
    }),

    // --- MORE: Anorectal ---
    tri('anorectalSymptoms', 'Anorectal symptoms', 'more', 70, {
      section: 'Anorectal',
    }),
    tri('anorectalBleeding', 'PR bleeding', 'more', 71, {
      section: 'Anorectal',
      showIf: yes('anorectalSymptoms'),
    }),
    tri('anorectalPain', 'Anal pain', 'more', 72, {
      section: 'Anorectal',
      showIf: yes('anorectalSymptoms'),
    }),
    tri('anorectalProlapse', 'Prolapse / swelling', 'more', 73, {
      section: 'Anorectal',
      showIf: yes('anorectalSymptoms'),
    }),
    textArea('anorectalNote', 'Anorectal note', 'more', 74, {
      section: 'Anorectal',
      showIf: yes('anorectalSymptoms'),
    }),

    // --- MORE: Wound OPD (not Ward nursing) ---
    tri('woundOpdPresent', 'Wound (OPD follow-up)', 'more', 80, {
      section: 'Wound (OPD)',
      helpText: 'OPD follow-up fields only. Active inpatient wound/drain care stays on Ward nursing / I/O.',
    }),
    select(
      'woundOpdAppearance',
      'Wound appearance',
      ['Clean', 'Erythema', 'Discharge', 'Dehiscence concern', 'Other', 'Not assessed'],
      'more',
      81,
      { section: 'Wound (OPD)', showIf: yes('woundOpdPresent') }
    ),
    tri('woundOpdInfectionConcern', 'Infection concern (clinician)', 'more', 82, {
      section: 'Wound (OPD)',
      showIf: yes('woundOpdPresent'),
    }),
    textArea('woundOpdNote', 'Wound OPD note', 'more', 83, {
      section: 'Wound (OPD)',
      showIf: yes('woundOpdPresent'),
    }),

    // --- MORE: Previous surgery reported ---
    tri('previousSurgeryReported', 'Previous surgery reported', 'more', 90, {
      section: 'Previous surgery',
    }),
    text('previousSurgeryYear', 'Year (approx)', 'more', 91, {
      section: 'Previous surgery',
      showIf: yes('previousSurgeryReported'),
      placeholder: 'e.g. 2022',
    }),
    textArea('previousSurgeryNote', 'Previous surgery note', 'more', 92, {
      section: 'Previous surgery',
      showIf: yes('previousSurgeryReported'),
    }),

    // --- MORE: Pre-op clinical info (intent only) ---
    text('proposedProcedure', 'Proposed procedure', 'more', 100, {
      section: 'Pre-op clinical info',
      placeholder: 'e.g. Open mesh hernioplasty',
      helpText: 'Clinical intent only — does not schedule or complete an OT record.',
    }),
    textArea('procedureIndication', 'Indication', 'more', 101, {
      section: 'Pre-op clinical info',
    }),
    select(
      'urgencyCategory',
      'Urgency',
      ['Elective', 'Urgent', 'Emergency', 'Not documented'],
      'more',
      102,
      { section: 'Pre-op clinical info' }
    ),
    select(
      'consentDiscussionStatus',
      'Consent discussion status',
      ['Not discussed', 'Discussed — pending', 'Discussed — patient agreeable', 'Deferred', 'Not applicable'],
      'more',
      103,
      {
        section: 'Pre-op clinical info',
        helpText:
          'Discussion status only — distinct from legal/procedural informed consent documentation elsewhere.',
      }
    ),
    tri('preOpPriorAnesthesiaIssue', 'Prior anesthesia issue (pre-op context)', 'more', 104, {
      section: 'Pre-op clinical info',
      helpText: 'Context only — does not declare fit/unfit for anesthesia.',
    }),
    tri('preOpBleedingHistory', 'Bleeding history', 'more', 105, {
      section: 'Pre-op clinical info',
    }),
    tri('preOpAnticoagulantContext', 'Anticoagulant / antiplatelet context', 'more', 106, {
      section: 'Pre-op clinical info',
    }),
    text('preOpBloodRequirementNote', 'Blood requirement note', 'more', 107, {
      section: 'Pre-op clinical info',
      placeholder: 'e.g. crossmatch requested — planning note only',
    }),
    select(
      'preOpFastingStatus',
      'Fasting instruction / status',
      ['Instructed', 'Confirmed fasting', 'Not fasting', 'Not applicable', 'Not documented'],
      'more',
      108,
      { section: 'Pre-op clinical info' }
    ),
    textArea('preOpClinicalNote', 'Pre-op clinical note', 'more', 109, {
      section: 'Pre-op clinical info',
      helpText: 'Does not declare surgical or anesthetic fitness.',
    }),

    // --- MORE: Post-op follow-up ---
    text('postOpOperationReference', 'Operation reference (text)', 'more', 110, {
      section: 'Post-op follow-up',
      placeholder: 'e.g. Lap chole 10 days ago — free-text reference',
      showIf: equals('procedureStatus', 'Post-operative follow-up'),
      helpText: 'Free-text / optional ID reference only. Does not write OperationSchedule.',
    }),
    text('operationScheduleId', 'OperationSchedule ID (optional reference)', 'more', 111, {
      section: 'Post-op follow-up',
      placeholder: 'Optional string reference only',
      showIf: equals('procedureStatus', 'Post-operative follow-up'),
      helpText: 'Reference string only — specialty save does not create or update OperationSchedule.',
    }),
    integer('daysPostOp', 'Days post-op', 'more', 112, {
      section: 'Post-op follow-up',
      min: 0,
      max: 3650,
      showIf: equals('procedureStatus', 'Post-operative follow-up'),
    }),
    select(
      'postOpWoundStatus',
      'Post-op wound (OPD)',
      ['Healing well', 'Mild concern', 'Needs review', 'Not assessed', 'Not applicable'],
      'more',
      113,
      { section: 'Post-op follow-up', showIf: equals('procedureStatus', 'Post-operative follow-up') }
    ),
    textArea('postOpFollowUpNote', 'Post-op follow-up note', 'more', 114, {
      section: 'Post-op follow-up',
      showIf: equals('procedureStatus', 'Post-operative follow-up'),
    }),
  ],
};
