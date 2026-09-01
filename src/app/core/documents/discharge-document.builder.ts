import {
  buildHmsStandardDocumentHtml,
  buildHmsSummaryCardsHtml,
  buildHmsTableHtml,
  formatHmsDate,
  formatHmsDateTime,
  formatHmsMoney,
  patientDisplayName,
} from '../utils/hms-document-template.util';
import { HmsDocumentHospitalInfo } from '../services/hms-document.types';

const CHARGE_GROUP_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  room: 'Room / Bed',
  doctor_visit: 'Doctor Visit',
  laboratory: 'Laboratory',
  pharmacy: 'Pharmacy',
  procedure: 'Procedure',
  operation: 'Operation',
  nursing: 'Nursing / Ward',
  other: 'Other',
};

export interface DischargeDocumentContext {
  title?: string;
  patient?: { firstName?: string; lastName?: string; patientNo?: string } | null;
  encounterNo?: string;
  admissionNo?: string;
  consultantName?: string;
  departmentName?: string;
  wardLabel?: string;
  roomBed?: string;
  admittedAt?: string;
  dischargedAt?: string;
  chargeBreakdown?: Record<string, number>;
  summary?: {
    totalCharges?: number;
    totalDiscount?: number;
    netPayable?: number;
    totalPaid?: number;
    totalRefunded?: number;
    balance?: number;
    securityDepositHeld?: number;
    securityDepositApplied?: number;
    advanceCreditBalance?: number;
  };
  hospital?: HmsDocumentHospitalInfo | null;
  generatedBy?: string;
}

export function buildDischargeStatementDocumentHtml(context: DischargeDocumentContext): string {
  const summary = context.summary || {};
  const breakdownRows = Object.entries(context.chargeBreakdown || {}).map(([key, amount]) => [
    CHARGE_GROUP_LABELS[key] || key.replace(/_/g, ' '),
    formatHmsMoney(amount),
  ]);

  const bodyHtml = `
    ${buildHmsSummaryCardsHtml([
      { label: 'Gross Charges', value: formatHmsMoney(summary.totalCharges) },
      { label: 'Discount', value: formatHmsMoney(summary.totalDiscount) },
      { label: 'Net Payable', value: formatHmsMoney(summary.netPayable) },
      { label: 'Payments', value: formatHmsMoney(summary.totalPaid) },
      { label: 'Security Deposit', value: formatHmsMoney(summary.securityDepositHeld) },
      { label: 'Security Applied', value: formatHmsMoney(summary.securityDepositApplied) },
      { label: 'Advance Credit', value: formatHmsMoney(summary.advanceCreditBalance) },
      { label: 'Outstanding / Refund', value: formatHmsMoney(summary.balance) },
    ])}
    <section class="hms-doc-section">
      <h3>Charge Groups</h3>
      ${buildHmsTableHtml(['Category', 'Amount'], breakdownRows, {
        numericColumns: [1],
        emptyMessage: 'No charge breakdown available.',
      })}
    </section>`;

  return buildHmsStandardDocumentHtml({
    title: context.title || 'Discharge Statement',
    hospital: context.hospital,
    documentNumber: context.encounterNo || context.admissionNo,
    metaRows: [
      { label: 'Patient', value: patientDisplayName(context.patient) },
      { label: 'MR', value: context.patient?.patientNo || '—' },
      { label: 'Admission No', value: context.admissionNo || '—' },
      { label: 'Encounter No', value: context.encounterNo || '—' },
      { label: 'Consultant', value: context.consultantName || '—' },
      { label: 'Department', value: context.departmentName || '—' },
      { label: 'Ward', value: context.wardLabel || '—' },
      { label: 'Room / Bed', value: context.roomBed || '—' },
      { label: 'Admission Date', value: formatHmsDate(context.admittedAt) },
      { label: 'Discharge Date', value: formatHmsDate(context.dischargedAt) },
    ],
    bodyHtml,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: context.generatedBy,
    footerNote: 'Financial figures are sourced from the encounter ledger and discharge billing summary.',
  });
}

export function buildRunningBillDocumentHtml(context: DischargeDocumentContext): string {
  return buildDischargeStatementDocumentHtml({
    ...context,
    title: 'Running Bill',
  });
}
