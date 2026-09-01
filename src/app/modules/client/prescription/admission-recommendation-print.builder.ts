import { AdmissionRecommendationRecord, doctorDisplayName } from './admission-recommendation.models';
import { Appointment, Doctor, Hospital, Patient } from '../../../shared/models/hospital.model';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function patientName(patient?: Patient | null): string {
  if (!patient) return '—';
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || '—';
}

function doctorName(doctor?: Doctor | null): string {
  return doctorDisplayName(doctor);
}

function snapshotSection(record: AdmissionRecommendationRecord, key: string): Record<string, unknown> {
  return ((record.clinicalSnapshot || {})[key] as Record<string, unknown>) || {};
}

export function buildAdmissionRecommendationPrintHtml(options: {
  hospital?: Hospital | null;
  patient?: Patient | null;
  appointment?: Appointment | null;
  doctor?: Doctor | null;
  record: AdmissionRecommendationRecord;
}): string {
  const { hospital, patient, appointment, doctor, record } = options;
  const clinical = snapshotSection(record, 'clinicalSummary');
  const decision = snapshotSection(record, 'admissionDecision');
  const treatment = snapshotSection(record, 'treatmentPlan');
  const nursing = snapshotSection(record, 'nursingOrders');
  const diet = snapshotSection(record, 'diet');
  const activity = snapshotSection(record, 'activity');
  const isolation = snapshotSection(record, 'isolation');
  const handover = snapshotSection(record, 'handover');
  const investigations = snapshotSection(record, 'investigations');
  const medications = Array.isArray(record.clinicalSnapshot?.['medications'])
    ? (record.clinicalSnapshot?.['medications'] as Array<Record<string, unknown>>)
    : [];

  const medRows = medications
    .map(
      (med) => `
      <tr>
        <td>${esc(med['name'])}</td>
        <td>${esc(med['dose'])}</td>
        <td>${esc(med['route'])}</td>
        <td>${esc(med['frequency'])}</td>
        <td>${esc(med['duration'])}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Admission Recommendation</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
    h1, h2 { margin: 0 0 8px; }
    .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 18px; }
    .meta, .section { margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
    .label { color: #64748b; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 14px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; text-align: left; }
    th { background: #f8fafc; }
    .note { margin-top: 18px; font-size: 12px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    .footer { margin-top: 24px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>HISAAR360</h1>
    <h2>HOSPITAL ADMISSION ADVICE / ADMISSION RECOMMENDATION</h2>
    <div>${esc(hospital?.name)}</div>
    <div>${esc(hospital?.address)}</div>
    <div>${esc(hospital?.phone)}</div>
  </div>

  <div class="meta grid">
    <div><div class="label">Order No</div><div class="value">${esc(record.orderNo || '—')}</div></div>
    <div><div class="label">Date / Time</div><div class="value">${esc(record.recommendedAt || record.createdAt || new Date().toISOString())}</div></div>
    <div><div class="label">Patient Name</div><div class="value">${esc(patientName(patient))}</div></div>
    <div><div class="label">MR No</div><div class="value">${esc(patient?.patientNo)}</div></div>
    <div><div class="label">Appointment No</div><div class="value">${esc(appointment?.appointmentNo)}</div></div>
    <div><div class="label">Doctor</div><div class="value">${esc(doctorName(doctor))}</div></div>
  </div>

  <div class="section">
    <div class="label">Reason for Admission</div>
    <div class="value">${esc(record.reason || clinical['reasonForAdmission'])}</div>
    <div class="label">Chief Complaint / Symptoms</div>
    <div class="value">${esc(clinical['chiefComplaint'])} ${clinical['symptoms'] ? ` — ${esc(clinical['symptoms'])}` : ''}</div>
    <div class="label">Provisional Diagnosis</div>
    <div class="value">${esc(record.initialDiagnosis || clinical['provisionalDiagnosis'])}</div>
    <div class="label">Clinical Summary</div>
    <div class="value">${esc(clinical['relevantHistory'])} ${clinical['examinationFindings'] ? `<br/>Exam: ${esc(clinical['examinationFindings'])}` : ''}</div>
  </div>

  <div class="section grid">
    <div><div class="label">Recommended Level of Care</div><div class="value">${esc(decision['levelOfCare'])}</div></div>
    <div><div class="label">Priority</div><div class="value">${esc(record.priority || decision['priority'])}</div></div>
    <div><div class="label">Urgency</div><div class="value">${esc(decision['urgency'])}</div></div>
    <div><div class="label">Expected Timing</div><div class="value">${esc(decision['expectedTiming'])}</div></div>
  </div>

  <div class="section">
    <div class="label">Initial Treatment Plan</div>
    <div class="value">${esc(treatment['plan'])}</div>
    <div class="label">Clinical Goals</div>
    <div class="value">${esc(treatment['goals'])}</div>
  </div>

  <div class="section">
    <div class="label">Investigations</div>
    <div class="value">Lab: ${esc(Array.isArray(investigations['labTests']) ? (investigations['labTests'] as string[]).join(', ') : '')}<br/>
    Imaging: ${esc(Array.isArray(investigations['imaging']) ? (investigations['imaging'] as string[]).join(', ') : '')}<br/>
    Other: ${esc(investigations['other'])}</div>
  </div>

  ${medications.length ? `<div class="section"><div class="label">Medication Instructions</div><table><thead><tr><th>Medicine</th><th>Dose</th><th>Route</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${medRows}</tbody></table></div>` : ''}

  <div class="section grid">
    <div><div class="label">Diet</div><div class="value">${esc(diet['type'])} ${diet['custom'] ? `(${esc(diet['custom'])})` : ''}</div></div>
    <div><div class="label">Activity</div><div class="value">${esc(activity['order'])}</div></div>
    <div><div class="label">Monitoring</div><div class="value">Vitals: ${esc(nursing['vitalsFrequency'])}</div></div>
    <div><div class="label">Isolation</div><div class="value">${esc(isolation['required'])} ${isolation['type'] ? `(${esc(isolation['type'])})` : ''}</div></div>
  </div>

  <div class="section">
    <div class="label">Receiving Ward Instructions</div>
    <div class="value">${esc(handover['receivingWardInstructions'])}</div>
    <div class="label">Additional Instructions</div>
    <div class="value">${esc(handover['additionalInstructions'])}</div>
  </div>

  <div class="note">
    Admission recommendation — room/bed allocation and formal admission are completed by the hospital admission/ward desk.
  </div>

  <div class="footer">
    <div>Generated: ${esc(new Date().toLocaleString())}</div>
    <div>Authenticated Physician: ${esc(doctorName(doctor))}</div>
  </div>
</body>
</html>`;
}

export function printAdmissionRecommendationHtml(html: string): void {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
  if (!printWindow) {
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
