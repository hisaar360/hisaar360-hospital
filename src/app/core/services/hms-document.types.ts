export type HmsDocumentOrientation = 'portrait' | 'landscape';

export interface HmsDocumentHospitalInfo {
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

export interface HmsDocumentMetaRow {
  label: string;
  value: string;
}

export interface HmsDocumentSession {
  title: string;
  html: string;
  filename: string;
  orientation: HmsDocumentOrientation;
  /** Paper preset for browser print dialog (invoice thermal vs A4). */
  jobType?: 'invoice' | 'a4';
}

export interface HmsStandardDocumentOptions {
  title: string;
  hospital?: HmsDocumentHospitalInfo | null;
  documentNumber?: string;
  dateRangeLabel?: string;
  dateRangeValue?: string;
  metaRows?: HmsDocumentMetaRow[];
  bodyHtml: string;
  generatedAt?: string;
  generatedBy?: string;
  orientation?: HmsDocumentOrientation;
  footerNote?: string;
}
