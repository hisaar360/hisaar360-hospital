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
