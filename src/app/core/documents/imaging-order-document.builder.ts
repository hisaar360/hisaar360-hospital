import {
  buildHmsStandardDocumentHtml,
  buildHmsTableHtml,
  formatHmsDateTime,
  patientDisplayName,
} from '../utils/hms-document-template.util';
import { HmsDocumentHospitalInfo } from '../services/hms-document.types';

export interface ImagingOrderDocumentContext {
  orderNo: string;
  patient?: { firstName?: string; lastName?: string; patientNo?: string } | null;
  admissionNo?: string;
  wardLabel?: string;
  roomBed?: string;
  orderingDoctor?: string;
  enteredBy?: string;
  modality?: string;
  study?: string;
  bodyPart?: string;
  views?: string;
  priority?: string;
  clinicalIndication?: string;
  instructions?: string;
  status?: string;
  orderedAt?: string;
  hospital?: HmsDocumentHospitalInfo | null;
  generatedBy?: string;
}

export function buildImagingOrderDocumentHtml(context: ImagingOrderDocumentContext): string {
  const bodyHtml = `
    <section class="hms-doc-section">
      <h3>Order Details</h3>
      ${buildHmsTableHtml(
        ['Field', 'Value'],
        [
          ['Modality', context.modality || '—'],
          ['Study', context.study || '—'],
          ['Body Part', context.bodyPart || '—'],
          ['Views', context.views || '—'],
          ['Priority', context.priority || '—'],
          ['Clinical Indication', context.clinicalIndication || '—'],
          ['Instructions', context.instructions || '—'],
          ['Status', context.status || '—'],
          ['Ordered At', context.orderedAt ? formatHmsDateTime(context.orderedAt) : '—'],
        ]
      )}
    </section>`;

  return buildHmsStandardDocumentHtml({
    title: 'Imaging Order',
    hospital: context.hospital,
    documentNumber: context.orderNo,
    metaRows: [
      { label: 'Patient', value: patientDisplayName(context.patient) },
      { label: 'MR', value: context.patient?.patientNo || '—' },
      { label: 'Admission', value: context.admissionNo || '—' },
      { label: 'Ward', value: context.wardLabel || '—' },
      { label: 'Room / Bed', value: context.roomBed || '—' },
      { label: 'Ordering Doctor', value: context.orderingDoctor || '—' },
      { label: 'Entered By', value: context.enteredBy || '—' },
    ],
    bodyHtml,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: context.generatedBy,
  });
}

export function buildImagingOrderFromWardRow(options: {
  row: Record<string, unknown>;
  patient?: ImagingOrderDocumentContext['patient'];
  admissionNo?: string;
  wardLabel?: string;
  roomBed?: string;
  hospital?: HmsDocumentHospitalInfo | null;
  generatedBy?: string;
}): string {
  const cells = (options.row['cells'] as Record<string, unknown>) || options.row;
  return buildImagingOrderDocumentHtml({
    orderNo: String(cells['orderNo'] || cells['order'] || options.row['id'] || 'Imaging Order'),
    patient: options.patient,
    admissionNo: options.admissionNo,
    wardLabel: options.wardLabel,
    roomBed: options.roomBed,
    orderingDoctor: String(cells['doctor'] || cells['orderingDoctor'] || '—'),
    enteredBy: String(cells['enteredBy'] || '—'),
    modality: String(cells['modality'] || cells['type'] || 'Imaging'),
    study: String(cells['study'] || cells['order'] || '—'),
    bodyPart: String(cells['bodyPart'] || '—'),
    views: String(cells['views'] || '—'),
    priority: String(cells['priority'] || 'Routine'),
    clinicalIndication: String(cells['indication'] || cells['clinicalIndication'] || '—'),
    instructions: String(cells['instructions'] || '—'),
    status: String(cells['status'] || options.row['status'] || 'Pending'),
    orderedAt: String(cells['time'] || cells['orderedAt'] || options.row['timestamp'] || ''),
    hospital: options.hospital,
    generatedBy: options.generatedBy,
  });
}
