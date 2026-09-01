import { Prescription, PrescriptionMedicine } from '../../../shared/models/hospital.model';
import { WardActivityRecord } from './services/ward-api.mapper';
import { MarDosePresentationStatus, MarDoseSlot, MarMedicineCard } from './ward-mar.models';

const SCHEDULE_DEFS: Array<{ key: keyof PrescriptionMedicine; hour: number; minute: number; label: string }> = [
  { key: 'morning', hour: 8, minute: 0, label: '08:00 AM' },
  { key: 'noon', hour: 14, minute: 0, label: '02:00 PM' },
  { key: 'evening', hour: 20, minute: 0, label: '08:00 PM' },
  { key: 'night', hour: 21, minute: 0, label: '09:00 PM' },
];

function sameDayDate(base: Date, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function formatSlotLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function normalizeMarStatus(value?: string | null): MarDosePresentationStatus {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'given' || key === 'late') return key === 'late' ? 'Late' : 'Given';
  if (key === 'missed') return 'Missed';
  if (key === 'held') return 'Held';
  if (key === 'refused') return 'Refused';
  if (key === 'not_available' || key === 'not available') return 'Not Available';
  return 'Due';
}

function doseMatchesActivity(
  activity: WardActivityRecord,
  medicineName: string,
  scheduledAt?: string | null
): boolean {
  const meta = activity.metadata || {};
  if (String(meta['medicineName'] || '').toLowerCase() !== medicineName.toLowerCase()) {
    return false;
  }
  if (!scheduledAt || !activity.scheduledAt) {
    return true;
  }
  return new Date(activity.scheduledAt).getTime() === new Date(scheduledAt).getTime();
}

export function buildMarMedicineCards(input: {
  prescriptions: Prescription[];
  marActivities: WardActivityRecord[];
  medicineRequests?: Array<{ status?: string; items?: Array<{ productName?: string }>; issuedByUserId?: string; requestedByUserId?: string }>;
  userNames?: Map<string, string>;
  admissionId?: string;
  patientId?: string;
}): MarMedicineCard[] {
  const cards: MarMedicineCard[] = [];
  const now = Date.now();

  for (const prescription of input.prescriptions) {
    const medicines = prescription.medicines || [];
    medicines.forEach((medicine, index) => {
      if (!String(medicine.name || '').trim()) return;

      const startBase = prescription.createdAt ? new Date(prescription.createdAt) : new Date();
      const slots: MarDoseSlot[] = [];

      for (const def of SCHEDULE_DEFS) {
        if (!medicine[def.key]) continue;
        const scheduled = sameDayDate(startBase, def.hour, def.minute);
        const scheduledIso = scheduled.toISOString();
        const activity = input.marActivities.find((item) =>
          item.activityType === 'mar_dose' && doseMatchesActivity(item, medicine.name, scheduledIso)
        );

        let status: MarDosePresentationStatus = 'Upcoming';
        if (activity) {
          status = normalizeMarStatus(String(activity.metadata?.['marStatus'] || 'given'));
        } else if (scheduled.getTime() < now - 30 * 60 * 1000) {
          status = 'Late';
        } else if (scheduled.getTime() <= now + 30 * 60 * 1000) {
          status = 'Due';
        }

        slots.push({
          id: `${prescription._id}-${index}-${def.label}`,
          label: def.label,
          scheduledAt: scheduledIso,
          status,
          administeredAt: String(activity?.metadata?.['administeredAt'] || activity?.completedAt || '') || null,
          administeredBy: activity?.metadata?.['administeredBy']
            ? input.userNames?.get(String(activity.metadata['administeredBy'])) || 'Nurse'
            : null,
          activityId: activity?._id || null,
        });
      }

      if (!slots.length) {
        slots.push({
          id: `${prescription._id}-${index}-default`,
          label: formatSlotLabel(startBase),
          scheduledAt: startBase.toISOString(),
          status: 'Due',
        });
      }

      const givenSlots = slots.filter((slot) => slot.status === 'Given' || slot.status === 'Late');
      const pendingSlots = slots.filter((slot) => ['Due', 'Late', 'Upcoming'].includes(slot.status));
      pendingSlots.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      givenSlots.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

      const lastGiven = givenSlots[0];
      const nextDue = pendingSlots.find((slot) => slot.status === 'Due' || slot.status === 'Late') || pendingSlots[0];

      cards.push({
        id: `${prescription._id}-${index}`,
        medicine: medicine.name,
        dose: medicine.dosage || medicine.frequency || '—',
        route: 'PO',
        frequency: [medicine.morning && 'Morning', medicine.noon && 'Afternoon', medicine.evening && 'Evening', medicine.night && 'Night']
          .filter(Boolean)
          .join(', ') || 'Scheduled',
        recommendedBy: prescription.doctor?.name || 'Doctor',
        startAt: prescription.createdAt,
        duration: medicine.duration || '',
        pharmacyStatus: input.medicineRequests?.some((req) =>
          (req.items || []).some((item) => String(item.productName || '').toLowerCase().includes(medicine.name.toLowerCase()))
        )
          ? input.medicineRequests?.find((req) =>
              (req.items || []).some((item) => String(item.productName || '').toLowerCase().includes(medicine.name.toLowerCase()))
            )?.status || 'REQUESTED'
          : 'ORDERED',
        lastGivenAt: lastGiven?.administeredAt || lastGiven?.scheduledAt || null,
        lastGivenBy: lastGiven?.administeredBy || null,
        nextDueAt: nextDue?.scheduledAt || null,
        nextDueLabel: nextDue?.label || undefined,
        prescriptionId: prescription._id,
        patientId: input.patientId || prescription.patientId,
        admissionId: input.admissionId,
        slots,
      });
    });
  }

  return cards;
}
