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
import { EncounterLedger, LedgerItem, LedgerPayment } from '../../shared/models/hospital.model';

export interface PatientLedgerDocumentContext {
  ledger: EncounterLedger;
  hospital?: HmsDocumentHospitalInfo | null;
  generatedBy?: string;
  admissionNo?: string;
  doctorName?: string;
  departmentName?: string;
}

function sourceLabel(item: LedgerItem): string {
  return item.sourceType?.replace(/_/g, ' ') || item.category || 'Charge';
}

function humanReference(item: LedgerItem | LedgerPayment): string {
  if ('paymentNo' in item && item.paymentNo) return item.paymentNo;
  const charge = item as LedgerItem;
  return charge.title || charge.description || '—';
}

export function buildPatientLedgerDocumentHtml(context: PatientLedgerDocumentContext): string {
  const { ledger } = context;
  const encounter = ledger.encounter;
  const patient = encounter.patient;
  const summary = encounter.summary;
  const transactions: Array<{
    date: string;
    reference: string;
    description: string;
    source: string;
    charge: string;
    payment: string;
    balance: string;
  }> = [];

  let runningBalance = 0;
  const timeline = [
    ...ledger.items.map((item) => ({ kind: 'charge' as const, at: item.createdAt || '', item })),
    ...ledger.payments.map((item) => ({ kind: 'payment' as const, at: item.createdAt || '', item })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  timeline.forEach((entry) => {
    if (entry.kind === 'charge') {
      const item = entry.item as LedgerItem;
      if (item.status === 'cancelled') return;
      runningBalance += Number(item.netAmount || 0);
      transactions.push({
        date: formatHmsDateTime(item.createdAt),
        reference: humanReference(item),
        description: item.description || item.title,
        source: sourceLabel(item),
        charge: formatHmsMoney(item.netAmount),
        payment: '—',
        balance: formatHmsMoney(runningBalance),
      });
      return;
    }

    const payment = entry.item as LedgerPayment;
    const amount = Number(payment.amount || 0);
    runningBalance -= amount;
    transactions.push({
      date: formatHmsDateTime(payment.createdAt),
      reference: payment.paymentNo,
      description: payment.note || payment.type,
      source: payment.method,
      charge: '—',
      payment: formatHmsMoney(amount),
      balance: formatHmsMoney(runningBalance),
    });
  });

  const bodyHtml = `
    ${buildHmsSummaryCardsHtml([
      { label: 'Total Charges', value: formatHmsMoney(summary?.totalCharges) },
      { label: 'Discount', value: formatHmsMoney(summary?.totalDiscount) },
      { label: 'Net Payable', value: formatHmsMoney(summary?.netPayable) },
      { label: 'Paid', value: formatHmsMoney(summary?.totalPaid) },
      { label: 'Refunded', value: formatHmsMoney(summary?.totalRefunded) },
      { label: 'Outstanding', value: formatHmsMoney(summary?.balance) },
    ])}
    <section class="hms-doc-section">
      <h3>Transactions</h3>
      ${buildHmsTableHtml(
        ['Date', 'Reference', 'Description', 'Source', 'Charge', 'Payment', 'Running Balance'],
        transactions.map((row) => [
          row.date,
          row.reference,
          row.description,
          row.source,
          row.charge,
          row.payment,
          row.balance,
        ]),
        { numericColumns: [4, 5, 6], emptyMessage: 'No ledger transactions recorded.' }
      )}
    </section>`;

  return buildHmsStandardDocumentHtml({
    title: 'Patient Ledger',
    hospital: context.hospital,
    documentNumber: encounter.encounterNo,
    metaRows: [
      { label: 'Patient', value: patientDisplayName(patient) },
      { label: 'MR', value: patient?.patientNo || '—' },
      { label: 'Encounter No', value: encounter.encounterNo || '—' },
      { label: 'Admission No', value: context.admissionNo || '—' },
      { label: 'Doctor', value: context.doctorName || '—' },
      { label: 'Department', value: context.departmentName || '—' },
      { label: 'Ward / Room / Bed', value: [encounter.wardLabel, encounter.bedLabel].filter(Boolean).join(' / ') || '—' },
      { label: 'Encounter Type', value: encounter.type || '—' },
      { label: 'Status', value: encounter.status || '—' },
      { label: 'Opened', value: formatHmsDateTime(encounter.openedAt) },
    ],
    bodyHtml,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: context.generatedBy,
  });
}

export interface PaymentReceiptDocumentContext {
  payment: LedgerPayment;
  patient?: { firstName?: string; lastName?: string; patientNo?: string } | null;
  encounterNo?: string;
  hospital?: HmsDocumentHospitalInfo | null;
  generatedBy?: string;
  receivedBy?: string;
}

export function buildPaymentReceiptDocumentHtml(context: PaymentReceiptDocumentContext): string {
  const { payment } = context;
  const bodyHtml = `
    ${buildHmsSummaryCardsHtml([{ label: 'Amount Received', value: formatHmsMoney(payment.amount) }])}
    <section class="hms-doc-section">
      <h3>Receipt Details</h3>
      ${buildHmsTableHtml(
        ['Field', 'Value'],
        [
          ['Receipt No', payment.paymentNo],
          ['Payment Date', formatHmsDateTime(payment.createdAt)],
          ['Payment Type', payment.type],
          ['Payment Method', payment.method],
          ['Reference', payment.referenceNo || '—'],
          ['Note', payment.note || '—'],
          ['Received By', context.receivedBy || context.generatedBy || '—'],
        ]
      )}
    </section>`;

  return buildHmsStandardDocumentHtml({
    title: 'Payment Receipt',
    hospital: context.hospital,
    documentNumber: payment.paymentNo,
    metaRows: [
      { label: 'Patient', value: patientDisplayName(context.patient) },
      { label: 'MR', value: context.patient?.patientNo || '—' },
      { label: 'Encounter', value: context.encounterNo || '—' },
    ],
    bodyHtml,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: context.generatedBy,
  });
}
