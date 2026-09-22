export type PregnancyEpisodeStatus =
  | 'active'
  | 'completed'
  | 'pregnancy_loss'
  | 'terminated'
  | 'unknown';

export type LmpCertainty = 'certain' | 'approximate' | 'unknown';

export type DatingBasis = 'lmp' | 'ultrasound' | 'art_ivf' | 'clinician_confirmed' | 'other';

export type HighRiskFlag = 'yes' | 'no' | 'not_assessed';

export type ObgynClinicalContext = 'gynecology' | 'pregnancy' | 'postpartum';

export interface PregnancyDatingDisplay {
  lmp: string;
  lmpCertainty: string;
  calculatedEdd: string;
  confirmedEdd: string;
  eddLabel: string;
  eddDisplay: string;
  datingBasis: string;
  gestationalAge: { weeks: number; days: number; label: string } | null;
  datingSource: string;
}

export interface PregnancyEpisode {
  _id: string;
  hospitalId: string;
  patientId: string;
  episodeNumber: number;
  status: PregnancyEpisodeStatus;
  startedAt?: string;
  endedAt?: string | null;
  completionOutcome?: string;
  dating?: Record<string, unknown>;
  datingDisplay?: PregnancyDatingDisplay;
  obstetricSummary?: Record<string, string>;
  previousPregnancies?: Array<Record<string, unknown>>;
  previousPregnancyRisks?: Record<string, unknown>;
  currentPregnancy?: {
    singletonOrMultiple?: string;
    fetusCount?: number;
    conceptionType?: string;
    highRiskFlag?: HighRiskFlag;
    highRiskReasons?: string[];
    highRiskNote?: string;
  };
  linkedBirthRecordIds?: string[];
  notes?: string;
  summaryLine?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PregnancyActiveResult {
  count: number;
  items: PregnancyEpisode[];
  selected: PregnancyEpisode | null;
  warning: string | null;
}

export interface PregnancyTimelineEvent {
  type: string;
  at: string;
  title: string;
  detail: string;
  sourceId: string;
  sourceModule: string;
  medicines?: string[];
  provenance?: 'direct' | 'patient_during_pregnancy' | string;
}

export interface PregnancyTimelineResult {
  episode: PregnancyEpisode;
  events: PregnancyTimelineEvent[];
  note?: string;
}

/**
 * Field ownership mapping (Phase F audit).
 *
 * EXISTING FIELD → OWNERSHIP
 * -----------------------------------------
 * gynaeMode → KEEP (visit specialtyData clinical context)
 * lmp / edd / gestationalAge (legacy visit) → LEGACY display; episode dating is canonical for new pregnancies
 * gravida/para/abortion/living → Episode obstetricSummary (new); KEEP visit copies for legacy
 * fetalMovement/FHR/fundalHeight/presentation/edema → VISIT specialtyData (today)
 * gynaeBp/gynaeWeight → DERIVED from Visit vitals (sync)
 * ultrasound flags/notes → VISIT specialtyData (legacy USG panel)
 * danger counselling → VISIT specialtyData
 * gynae_problem menstrual/exam fields → VISIT specialtyData (Gynecology mode)
 * postnatal delivery/baby fields → VISIT specialtyData; BirthRecord remains canonical for delivery
 * medicines/advice/labs → Prescription / Lab canonical
 * admission recommendation → KEEP via prescriptionId
 * Birth/Nursery → LINK by optional pregnancyEpisodeId (additive)
 */
