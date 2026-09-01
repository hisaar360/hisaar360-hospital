import {
  buildHmsStandardDocumentHtml,
  buildHmsTableHtml,
  formatHmsDateTime,
  patientDisplayName,
} from '../utils/hms-document-template.util';
import { HmsDocumentHospitalInfo } from '../services/hms-document.types';
import { MarMedicineCard } from '../../modules/client/ward/ward-mar.models';

export interface MarDocumentContext {
  patient?: { firstName?: string; lastName?: string; patientNo?: string } | null;
  admissionNo?: string;
  wardLabel?: string;
  roomBed?: string;
  consultantName?: string;
  cards: MarMedicineCard[];
  hospital?: HmsDocumentHospitalInfo | null;
  generatedBy?: string;
}

export function buildMarDocumentHtml(context: MarDocumentContext): string {
  const medicineRows = context.cards.map((card) => [
    card.medicine,
    card.dose,
    card.route,
    card.frequency,
    card.recommendedBy || card.issuedBy || '—',
    card.startAt ? formatHmsDateTime(card.startAt) : '—',
    card.duration || '—',
  ]);

  const administrationRows = context.cards.flatMap((card) =>
    card.slots.map((slot) => [
      card.medicine,
      formatHmsDateTime(slot.scheduledAt),
      slot.administeredAt ? formatHmsDateTime(slot.administeredAt) : '—',
      slot.status,
      card.dose,
      slot.administeredBy || '—',
      slot.status,
    ])
  );

  administrationRows.sort(
    (a, b) => new Date(a[1] || 0).getTime() - new Date(b[1] || 0).getTime()
  );

  const bodyHtml = `
    <section class="hms-doc-section">
      <h3>Medicines</h3>
      ${buildHmsTableHtml(
        ['Medicine', 'Dose', 'Route', 'Frequency', 'Recommended By', 'Start', 'Duration'],
        medicineRows,
        { emptyMessage: 'No active medicines on MAR.' }
      )}
    </section>
    <section class="hms-doc-section">
      <h3>Administration Record</h3>
      ${buildHmsTableHtml(
        ['Medicine', 'Scheduled At', 'Administered At', 'Status', 'Actual Dose', 'Administered By', 'Notes'],
        administrationRows,
        { emptyMessage: 'No administration events recorded.' }
      )}
    </section>`;

  return buildHmsStandardDocumentHtml({
    title: 'Medication Administration Record',
    hospital: context.hospital,
    metaRows: [
      { label: 'Patient', value: patientDisplayName(context.patient) },
      { label: 'MR', value: context.patient?.patientNo || '—' },
      { label: 'Admission No', value: context.admissionNo || '—' },
      { label: 'Ward', value: context.wardLabel || '—' },
      { label: 'Room / Bed', value: context.roomBed || '—' },
      { label: 'Consultant', value: context.consultantName || '—' },
    ],
    bodyHtml,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: context.generatedBy,
    footerNote: 'Read-only MAR export. No doses were recorded or modified by this document.',
  });
}
