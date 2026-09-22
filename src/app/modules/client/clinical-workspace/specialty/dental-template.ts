import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyFieldSchema,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { LEGACY_DENTAL_KEYS } from './dental-legacy.adapter';

/**
 * DENTAL v1 — registered for documentation / summary / BE validation.
 *
 * UI PATH: CUSTOM_LEGACY (legacy dental grid). Do NOT switch to generic renderer.
 * usesGenericSpecialtyEngine('DENTAL') === false.
 *
 * Field set includes BOTH preserved legacy flat keys AND Phase N additive keys.
 */

const NUMBERING_OPTIONS = ['FDI', 'Universal', 'Palmer', 'Legacy', 'Not documented'];

function text(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    placeholder?: string;
    helpText?: string;
    type?: 'text' | 'textarea' | 'date';
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: options?.type || 'text',
    group,
    displayOrder,
    section: options?.section,
    placeholder: options?.placeholder,
    helpText: options?.helpText,
  };
}

function textArea(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; placeholder?: string; helpText?: string }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'textarea',
    group,
    displayOrder,
    section: options?.section,
    placeholder: options?.placeholder,
    helpText: options?.helpText,
  };
}

function select(
  key: string,
  label: string,
  optionsList: string[],
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; helpText?: string }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'single_select',
    options: optionsList,
    group,
    displayOrder,
    section: options?.section,
    helpText: options?.helpText,
  };
}

function tri(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; summaryLabel?: string; helpText?: string }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'tri_state',
    group,
    displayOrder,
    section: options?.section,
    summaryLabel: options?.summaryLabel,
    helpText: options?.helpText,
  };
}

export const DENTAL_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'DENTAL',
  name: 'Dental / Oral & Maxillofacial',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'Dental / OMFS consultation. Legacy dental grid keys preserved; Phase N fields additive. CUSTOM_LEGACY UI.',
  fields: [
    // Legacy keys (PRESERVE)
    text('toothNumber', 'Tooth Number', 'quick', 1, {
      section: 'Legacy dental',
      placeholder: '36, 46',
    }),
    textArea('dentalComplaint', 'Dental Complaint', 'quick', 2, { section: 'Legacy dental' }),
    text('procedure', 'Procedure', 'quick', 3, { section: 'Legacy dental' }),
    textArea('treatmentPlan', 'Treatment Plan', 'quick', 4, { section: 'Legacy dental' }),
    text('nextVisit', 'Next Visit', 'quick', 5, { section: 'Legacy dental', type: 'date' }),
    textArea('dentalNotes', 'Dental Notes', 'quick', 6, { section: 'Legacy dental' }),

    // Phase N additive
    select('toothNumberingSystem', 'Tooth numbering system', NUMBERING_OPTIONS, 'quick', 10, {
      section: 'Numbering / OMFS',
      helpText: 'Document which chart system is in use — does not auto-convert tooth numbers.',
    }),
    tri('omfsTrauma', 'OMFS trauma', 'quick', 11, {
      section: 'Numbering / OMFS',
      summaryLabel: 'OMFS trauma',
    }),
    tri('jawPain', 'Jaw pain', 'quick', 12, {
      section: 'Numbering / OMFS',
      summaryLabel: 'Jaw pain',
    }),
    text('mouthOpening', 'Mouth opening', 'quick', 13, {
      section: 'Numbering / OMFS',
      placeholder: 'e.g. 35 mm / limited',
    }),
    textArea('tmjNote', 'TMJ note', 'more', 20, { section: 'OMFS detail' }),
    textArea('oralLesion', 'Oral lesion', 'more', 21, { section: 'OMFS detail' }),
    textArea('procedureRecommended', 'Procedure recommended', 'more', 22, {
      section: 'OMFS detail',
      helpText: 'Recommendation only — does not create OperationSchedule.',
    }),
    text('operationScheduleId', 'Operation schedule ID (optional)', 'more', 23, {
      section: 'OMFS detail',
      placeholder: 'Existing OperationSchedule id if scheduled',
      helpText: 'Optional link only — specialty save does not create OT.',
    }),
  ],
};

/** Sanity: legacy keys must remain in the registered template. */
void LEGACY_DENTAL_KEYS;
