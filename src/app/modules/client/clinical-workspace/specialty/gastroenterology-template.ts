import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { dateField, select, text, textArea, tri, yes } from './gi-shared-fields';

/**
 * GASTROENTEROLOGY v1 — generic engine template (Phase J).
 * Compact Quick + More. No Lab/medicine duplicates. No autonomous diagnosis.
 * Separate from HEPATOLOGY — do not merge into one GI/Liver form.
 */
export const GASTROENTEROLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'GASTROENTEROLOGY',
  name: 'Gastroenterology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'Structured GI history and exam. Clinical decisions remain clinician-controlled.',
  fields: [
    // --- QUICK: GI symptoms ---
    tri('symptomAbdominalPain', 'Abdominal pain', 'quick', 1, { section: 'GI symptoms' }),
    tri('symptomNausea', 'Nausea', 'quick', 2, { section: 'GI symptoms' }),
    tri('symptomVomiting', 'Vomiting', 'quick', 3, { section: 'GI symptoms' }),
    tri('symptomHeartburn', 'Heartburn / reflux', 'quick', 4, {
      section: 'GI symptoms',
      summaryLabel: 'Reflux',
    }),
    tri('symptomDysphagia', 'Dysphagia', 'quick', 5, {
      section: 'GI symptoms',
      summaryLabel: 'Dysphagia',
    }),
    tri('symptomBloating', 'Bloating', 'quick', 6, { section: 'GI symptoms' }),
    tri('symptomEarlySatiety', 'Early satiety', 'quick', 7, { section: 'GI symptoms' }),
    tri('symptomWeightLoss', 'Weight loss', 'quick', 8, { section: 'GI symptoms' }),
    tri('symptomGiBleed', 'GI bleeding (reported)', 'quick', 9, {
      section: 'GI symptoms',
      summaryLabel: 'GI bleed',
    }),

    // --- QUICK: Bowel ---
    select(
      'bowelHabitChange',
      'Bowel habit change',
      ['None', 'Diarrhea', 'Constipation', 'Alternating', 'Not documented'],
      'quick',
      20,
      { section: 'Bowel', summaryLabel: 'Bowel' }
    ),
    tri('symptomDiarrhea', 'Diarrhea', 'quick', 21, { section: 'Bowel' }),
    tri('symptomConstipation', 'Constipation', 'quick', 22, { section: 'Bowel' }),
    tri('symptomBloodInStool', 'Blood in stool', 'quick', 23, {
      section: 'Bowel',
      summaryLabel: 'PR bleed',
    }),
    tri('symptomMelena', 'Melena', 'quick', 24, { section: 'Bowel', summaryLabel: 'Melena' }),
    tri('symptomTenesmus', 'Tenesmus', 'quick', 25, { section: 'Bowel' }),

    // --- QUICK: Known GI conditions (clinician-documented) ---
    tri('conditionGerd', 'GERD (known)', 'quick', 40, {
      section: 'Known GI conditions',
      summaryLabel: 'GERD',
    }),
    tri('conditionPepticUlcer', 'Peptic ulcer disease', 'quick', 41, {
      section: 'Known GI conditions',
      summaryLabel: 'PUD',
    }),
    tri('conditionIbd', 'IBD (known)', 'quick', 42, {
      section: 'Known GI conditions',
      summaryLabel: 'IBD',
    }),
    tri('conditionIbs', 'IBS (known)', 'quick', 43, {
      section: 'Known GI conditions',
      summaryLabel: 'IBS',
    }),
    tri('conditionCeliac', 'Celiac disease', 'quick', 44, {
      section: 'Known GI conditions',
    }),
    tri('conditionHPyloriHistory', 'H. pylori history', 'quick', 45, {
      section: 'Known GI conditions',
      summaryLabel: 'H. pylori',
    }),
    tri('conditionGiMalignancy', 'GI malignancy / under review', 'quick', 46, {
      section: 'Known GI conditions',
    }),
    textArea('conditionNote', 'Condition note', 'quick', 47, {
      section: 'Known GI conditions',
      placeholder: 'Clinician-documented detail — not auto-diagnosed',
    }),

    // --- QUICK: GI history ---
    tri('historyPriorEndoscopy', 'Prior endoscopy', 'quick', 60, {
      section: 'GI history',
      summaryLabel: 'Prior EGD/colo',
    }),
    text('priorEndoscopyYear', 'Prior endoscopy year', 'quick', 61, {
      section: 'GI history',
      showIf: yes('historyPriorEndoscopy'),
      placeholder: 'e.g. 2024',
    }),
    text('priorEndoscopyNote', 'Prior endoscopy note', 'quick', 62, {
      section: 'GI history',
      showIf: yes('historyPriorEndoscopy'),
      placeholder: 'Type / findings summary if known',
    }),
    tri('historyPriorColonoscopy', 'Prior colonoscopy', 'quick', 63, {
      section: 'GI history',
    }),
    tri('historyAbdominalSurgery', 'Prior abdominal surgery', 'quick', 64, {
      section: 'GI history',
    }),
    tri('historyGiHospitalization', 'Prior GI hospitalization', 'quick', 65, {
      section: 'GI history',
    }),
    textArea('giHistoryNote', 'GI history note', 'quick', 66, { section: 'GI history' }),

    // --- QUICK: Exam summary ---
    text('examAbdomen', 'Abdominal exam', 'quick', 80, {
      section: 'GI examination summary',
      placeholder: 'e.g. Soft / tender / distended',
    }),
    text('examBowelSounds', 'Bowel sounds', 'quick', 81, {
      section: 'GI examination summary',
    }),
    tri('examGuarding', 'Guarding', 'quick', 82, { section: 'GI examination summary' }),
    tri('examRebound', 'Rebound tenderness', 'quick', 83, {
      section: 'GI examination summary',
    }),
    tri('examHepatomegaly', 'Hepatomegaly (exam)', 'quick', 84, {
      section: 'GI examination summary',
    }),
    textArea('examOtherFindings', 'Other GI findings', 'quick', 85, {
      section: 'GI examination summary',
    }),
    textArea('clinicalImpression', 'Clinical impression / specialty note', 'quick', 90, {
      section: 'Assessment',
      placeholder: 'Clinician assessment — not auto-diagnosed',
    }),

    // --- MORE: Symptom detail ---
    select(
      'painLocation',
      'Pain location',
      [
        'Epigastric',
        'RUQ',
        'LUQ',
        'RLQ',
        'LLQ',
        'Periumbilical',
        'Diffuse',
        'Other',
        'Not documented',
      ],
      'more',
      100,
      { section: 'Abdominal pain detail', showIf: yes('symptomAbdominalPain') }
    ),
    select(
      'painCharacter',
      'Pain character',
      ['Cramping', 'Burning', 'Sharp', 'Dull', 'Colicky', 'Other', 'Not documented'],
      'more',
      101,
      { section: 'Abdominal pain detail', showIf: yes('symptomAbdominalPain') }
    ),
    text('painDuration', 'Pain duration', 'more', 102, {
      section: 'Abdominal pain detail',
      showIf: yes('symptomAbdominalPain'),
    }),
    textArea('painNote', 'Pain note', 'more', 103, {
      section: 'Abdominal pain detail',
      showIf: yes('symptomAbdominalPain'),
    }),

    select(
      'bleedType',
      'Bleed type (clinician)',
      ['Hematemesis', 'Melena', 'Hematochezia', 'Occult', 'Mixed', 'Not documented'],
      'more',
      120,
      { section: 'GI bleeding detail', showIf: yes('symptomGiBleed') }
    ),
    textArea('bleedNote', 'Bleed note', 'more', 121, {
      section: 'GI bleeding detail',
      showIf: yes('symptomGiBleed'),
    }),

    select(
      'diarrheaDuration',
      'Diarrhea duration',
      ['Acute (<2 weeks)', 'Persistent (2–4 weeks)', 'Chronic (>4 weeks)', 'Not documented'],
      'more',
      140,
      { section: 'Bowel detail', showIf: yes('symptomDiarrhea') }
    ),
    text('stoolCharacter', 'Stool character', 'more', 141, {
      section: 'Bowel detail',
    }),
    textArea('bowelNote', 'Bowel note', 'more', 142, { section: 'Bowel detail' }),

    // --- MORE: IBD / known disease detail ---
    select(
      'ibdType',
      'IBD type (clinician)',
      ['Ulcerative colitis', 'Crohn disease', 'IBD-U', 'Other', 'Not classified'],
      'more',
      160,
      { section: 'IBD (known)', showIf: yes('conditionIbd') }
    ),
    text('ibdDiagnosisYear', 'IBD diagnosis year', 'more', 161, {
      section: 'IBD (known)',
      showIf: yes('conditionIbd'),
    }),
    tri('ibdRecentFlare', 'Recent flare', 'more', 162, {
      section: 'IBD (known)',
      showIf: yes('conditionIbd'),
    }),
    textArea('ibdNote', 'IBD note', 'more', 163, {
      section: 'IBD (known)',
      showIf: yes('conditionIbd'),
      placeholder: 'Extent / prior therapy notes — medicines remain on Visit tab',
    }),

    // --- MORE: Endoscopy / investigation refs (not pathology truth) ---
    dateField('lastEndoscopyDate', 'Last endoscopy date (visit ref)', 'more', 180, {
      section: 'Endoscopy / investigations',
    }),
    select(
      'lastEndoscopyType',
      'Last endoscopy type (visit ref)',
      [
        'None documented',
        'Upper GI endoscopy',
        'Colonoscopy',
        'Flexible sigmoidoscopy',
        'EUS',
        'ERCP',
        'Other',
      ],
      'more',
      181,
      {
        section: 'Endoscopy / investigations',
        helpText: 'Reference only — longitudinal EndoscopyRecord is authoritative when present.',
      }
    ),
    textArea('lastEndoscopySummary', 'Last endoscopy summary', 'more', 182, {
      section: 'Endoscopy / investigations',
      placeholder: 'Findings summary — pathology remains in Lab/pathology systems',
    }),
    text('lastEndoscopyReportRef', 'Endoscopy report reference', 'more', 183, {
      section: 'Endoscopy / investigations',
    }),
    select(
      'otherInvestigationType',
      'Other investigation',
      ['None', 'Abdominal US', 'CT abdomen', 'MRI', 'Stool studies', 'Breath test', 'Other'],
      'more',
      190,
      { section: 'Other investigations' }
    ),
    dateField('otherInvestigationDate', 'Investigation date', 'more', 191, {
      section: 'Other investigations',
    }),
    textArea('otherInvestigationSummary', 'Investigation summary', 'more', 192, {
      section: 'Other investigations',
    }),
    text('otherInvestigationRef', 'Report / document reference', 'more', 193, {
      section: 'Other investigations',
    }),

    // --- MORE: Detailed exam ---
    text('examPercussion', 'Percussion / shifting dullness', 'more', 210, {
      section: 'Detailed GI examination',
    }),
    textArea('examDetailedNote', 'Detailed exam note', 'more', 211, {
      section: 'Detailed GI examination',
    }),
  ],
};
