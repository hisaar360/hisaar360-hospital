import { LabOrder, LabOrderItem, LabSample } from '../../../shared/models/hospital.model';

export function canEditLabOrder(order: LabOrder | null | undefined): boolean {
  if (!order) {
    return false;
  }

  if (['verified', 'completed', 'cancelled'].includes(order.status)) {
    return false;
  }

  return (order.items || []).every(
    (item) =>
      item.status === 'cancelled' ||
      item.status === 'ordered' ||
      item.status === 'sample_collected'
  );
}

export function hasPendingSampleCollection(order: LabOrder | null | undefined): boolean {
  return (order?.items || []).some((item) => item.status === 'ordered');
}

export function activeLabSamples(order: LabOrder | null | undefined): LabSample[] {
  return (order?.samples || []).filter((sample) => sample.status !== 'rejected');
}

export function sampleStatusLabel(status?: string): string {
  return String(status || 'collected').replace(/_/g, ' ');
}

const hasFilledValue = (value: unknown): boolean => String(value ?? '').trim() !== '';

export function hasLabItemResultData(item: LabOrderItem | null | undefined): boolean {
  if (!item || item.status === 'cancelled') {
    return false;
  }

  const files = (item.reportFiles || []).filter((file) => hasFilledValue(file.fileUrl));
  const parameters = item.parameters || [];
  const allParametersFilled =
    parameters.length > 0 && parameters.every((parameter) => hasFilledValue(parameter.resultValue));
  const mode = item.resultMode || 'structured';

  if (mode === 'uploaded_report') {
    return files.length > 0;
  }

  if (mode === 'both') {
    return allParametersFilled || files.length > 0;
  }

  if (parameters.length > 0) {
    return allParametersFilled;
  }

  return files.length > 0;
}

export function isLabItemVerified(item: LabOrderItem | null | undefined): boolean {
  return item?.status === 'verified' || item?.status === 'completed';
}

export function canVerifyLabItem(item: LabOrderItem | null | undefined): boolean {
  if (!item || isLabItemVerified(item) || item.status === 'cancelled') {
    return false;
  }

  if (['ordered', 'sample_collected'].includes(item.status)) {
    return false;
  }

  return hasLabItemResultData(item);
}

export function labItemVerifyBlockReason(item: LabOrderItem | null | undefined): string {
  if (!item || isLabItemVerified(item)) {
    return '';
  }

  if (item.status === 'ordered') {
    return 'Waiting for sample collection.';
  }

  if (!hasLabItemResultData(item)) {
    return 'Sample in process — results are not entered yet.';
  }

  if (['sample_collected'].includes(item.status)) {
    return 'Sample in process — results are not entered yet.';
  }

  return '';
}
