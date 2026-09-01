import {
  buildHmsStandardDocumentHtml,
  buildHmsTableHtml,
  formatHmsDateTime,
  patientDisplayName,
} from '../utils/hms-document-template.util';
import { HmsDocumentHospitalInfo } from '../services/hms-document.types';

export interface WardPatientSummaryContext {
  patient?: { firstName?: string; lastName?: string; patientNo?: string } | null;
  admissionNo?: string;
  wardLabel?: string;
  roomBed?: string;
  consultantName?: string;
  assignedNurse?: string;
  diagnosis?: string;
  allergies?: string[];
  vitals?: Array<Record<string, unknown>>;
  activeMedicines?: string[];
  doctorOrders?: string[];
  pendingLaboratory?: string[];
  pendingImaging?: string[];
  procedures?: string[];
  nursingNotes?: string[];
  hospital?: HmsDocumentHospitalInfo | null;
  generatedBy?: string;
}

function listSection(title: string, items: string[] | undefined, empty = 'None recorded.'): string {
  const values = (items || []).filter(Boolean);
  if (!values.length) {
    return `<section class="hms-doc-section"><h3>${title}</h3><p>${empty}</p></section>`;
  }
  return `<section class="hms-doc-section"><h3>${title}</h3><ul>${values.map((item) => `<li>${item}</li>`).join('')}</ul></section>`;
}

export function buildWardPatientSummaryDocumentHtml(context: WardPatientSummaryContext): string {
  const vitalsRows = (context.vitals || []).map((row) => [
    formatHmsDateTime(String(row['timestamp'] || row['recordedAt'] || '')),
    String(row['temperature'] || '—'),
    String(row['pulse'] || '—'),
    String(row['respiratoryRate'] || '—'),
    String(row['bloodPressure'] || row['bp'] || '—'),
    String(row['spo2'] || row['SpO2'] || '—'),
    String(row['weight'] || '—'),
    String(row['recordedBy'] || '—'),
  ]);

  const bodyHtml = `
    <section class="hms-doc-section">
      <h3>Latest Vitals</h3>
      ${buildHmsTableHtml(
        ['Date/Time', 'Temp', 'Pulse', 'RR', 'BP', 'SpO2', 'Weight', 'Recorded By'],
        vitalsRows,
        { emptyMessage: 'No vitals recorded.' }
      )}
    </section>
    ${listSection('Active Medicines', context.activeMedicines)}
    ${listSection('Doctor Orders', context.doctorOrders)}
    ${listSection('Pending Laboratory', context.pendingLaboratory)}
    ${listSection('Pending Imaging', context.pendingImaging)}
    ${listSection('Procedures', context.procedures)}
    ${listSection('Important Nursing Notes', context.nursingNotes)}`;

  return buildHmsStandardDocumentHtml({
    title: 'Ward Patient Summary',
    hospital: context.hospital,
    metaRows: [
      { label: 'Patient', value: patientDisplayName(context.patient) },
      { label: 'MR', value: context.patient?.patientNo || '—' },
      { label: 'Admission', value: context.admissionNo || '—' },
      { label: 'Ward', value: context.wardLabel || '—' },
      { label: 'Room / Bed', value: context.roomBed || '—' },
      { label: 'Consultant', value: context.consultantName || '—' },
      { label: 'Assigned Nurse', value: context.assignedNurse || '—' },
      { label: 'Diagnosis', value: context.diagnosis || '—' },
      { label: 'Allergies', value: (context.allergies || []).join(', ') || 'None recorded' },
    ],
    bodyHtml,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: context.generatedBy,
  });
}

export function buildVitalsSummaryDocumentHtml(context: WardPatientSummaryContext): string {
  const vitalsRows = (context.vitals || []).map((row) => [
    formatHmsDateTime(String(row['timestamp'] || row['recordedAt'] || '')),
    String(row['temperature'] || '—'),
    String(row['pulse'] || '—'),
    String(row['respiratoryRate'] || '—'),
    String(row['bloodPressure'] || row['bp'] || '—'),
    String(row['spo2'] || row['SpO2'] || '—'),
    String(row['weight'] || '—'),
    String(row['recordedBy'] || '—'),
  ]);

  return buildHmsStandardDocumentHtml({
    title: 'Vitals Summary',
    hospital: context.hospital,
    metaRows: [
      { label: 'Patient', value: patientDisplayName(context.patient) },
      { label: 'MR', value: context.patient?.patientNo || '—' },
      { label: 'Admission', value: context.admissionNo || '—' },
    ],
    bodyHtml: `
      <section class="hms-doc-section">
        <h3>Vitals</h3>
        ${buildHmsTableHtml(
          ['Date/Time', 'Temp', 'Pulse', 'RR', 'BP', 'SpO2', 'Weight', 'Recorded By'],
          vitalsRows,
          { emptyMessage: 'No vitals recorded.' }
        )}
      </section>`,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: context.generatedBy,
  });
}

export function buildProcedureSummaryDocumentHtml(options: {
  title?: string;
  rows: Array<Record<string, unknown>>;
  patient?: WardPatientSummaryContext['patient'];
  admissionNo?: string;
  hospital?: HmsDocumentHospitalInfo | null;
  generatedBy?: string;
}): string {
  const tableRows = options.rows.map((row) => {
    const cells = (row['cells'] as Record<string, unknown>) || row;
    return [
      String(cells['orderNo'] || cells['procedureNo'] || row['id'] || '—'),
      String(cells['name'] || cells['order'] || row['title'] || '—'),
      String(cells['doctor'] || '—'),
      String(cells['department'] || '—'),
      String(cells['status'] || row['status'] || '—'),
      formatHmsDateTime(String(cells['scheduledAt'] || cells['time'] || '')),
      formatHmsDateTime(String(cells['completedAt'] || '')),
      String(cells['amount'] || '—'),
      String(cells['notes'] || row['description'] || '—'),
    ];
  });

  return buildHmsStandardDocumentHtml({
    title: options.title || 'Procedure / Operation Summary',
    hospital: options.hospital,
    metaRows: [
      { label: 'Patient', value: patientDisplayName(options.patient) },
      { label: 'MR', value: options.patient?.patientNo || '—' },
      { label: 'Admission', value: options.admissionNo || '—' },
    ],
    bodyHtml: `
      <section class="hms-doc-section">
        <h3>Procedures</h3>
        ${buildHmsTableHtml(
          ['No', 'Name', 'Doctor', 'Department', 'Status', 'Scheduled', 'Completed', 'Amount', 'Notes'],
          tableRows,
          { numericColumns: [7], emptyMessage: 'No procedures recorded.' }
        )}
      </section>`,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: options.generatedBy,
  });
}
