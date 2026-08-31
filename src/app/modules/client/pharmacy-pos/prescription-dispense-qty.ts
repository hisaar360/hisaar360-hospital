import { PrescriptionMedicine } from '../../../shared/models/hospital.model';
import {
  detectFrequencyKey,
  getFrequencySchedule,
} from '../prescription/medicine-instruction-formatter';

export interface DispenseQtyResult {
  dailyUnits: number;
  days: number;
  quantity: number;
  breakdown: string;
  durationLabel: string;
}

const SLOT_KEYS = ['morning', 'noon', 'evening', 'night'] as const;

const parseDoseAmount = (value: unknown): number => {
  const text = String(value || '').trim();
  const fraction = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    return denominator > 0 ? numerator / denominator : 0;
  }

  const decimal = text.match(/\d+(?:\.\d+)?/);
  return decimal ? Number(decimal[0]) : 0;
};

const countActiveSlots = (medicine: PrescriptionMedicine): number =>
  SLOT_KEYS.reduce((sum, slot) => {
    const doseKey = `${slot}Dose` as
      | 'morningDose'
      | 'noonDose'
      | 'eveningDose'
      | 'nightDose';
    const doseValue = parseDoseAmount(medicine[doseKey]);
    if (doseValue > 0) {
      return sum + doseValue;
    }
    return medicine[slot] ? sum + 1 : sum;
  }, 0);

const frequencyTimesPerDay = (frequency?: string): number => {
  const schedule = getFrequencySchedule(detectFrequencyKey(frequency || '') || '');
  if (!schedule) {
    return 0;
  }
  if (schedule.key === 'sos') {
    return 1;
  }
  return SLOT_KEYS.reduce((sum, slot) => sum + (schedule.slots[slot] ? 1 : 0), 0);
};

export const durationToDays = (duration?: string | null): number => {
  const raw = String(duration || '').trim().toLowerCase();
  if (!raw) {
    return 1;
  }
  if (raw === 'continue') {
    return 30;
  }

  const match = raw.match(/(\d+(?:\.\d+)?)\s*(day|days|d|week|weeks|w|month|months|m)\b/);
  if (!match) {
    return 1;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount) || amount <= 0) {
    return 1;
  }

  if (unit.startsWith('w')) {
    return Math.round(amount * 7);
  }
  if (unit.startsWith('m')) {
    return Math.round(amount * 30);
  }
  return Math.max(1, Math.round(amount));
};

export const prescriptionDispenseQty = (
  medicine: PrescriptionMedicine,
): DispenseQtyResult => {
  const fromSlots = countActiveSlots(medicine);
  const fromFrequency = frequencyTimesPerDay(medicine.frequency);
  const dailyUnits = fromSlots > 0 ? fromSlots : fromFrequency > 0 ? fromFrequency : 1;
  const days = durationToDays(medicine.duration);
  const quantity = Math.max(1, Math.ceil(dailyUnits * days));
  const durationLabel = String(medicine.duration || '').trim() || `${days} day`;
  const dayLabel = days === 1 ? '1 day' : `${days} days`;

  return {
    dailyUnits,
    days,
    quantity,
    breakdown: `${dailyUnits} / day × ${dayLabel}`,
    durationLabel,
  };
};
