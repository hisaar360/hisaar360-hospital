import { HmsDocumentHospitalInfo } from '../services/hms-document.types';
import { Hospital } from '../../shared/models/hospital.model';

export function readCurrentUserName(): string {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null') as { name?: string; email?: string } | null;
    return user?.name || user?.email || 'System User';
  } catch {
    return 'System User';
  }
}

export function mapHospitalDocumentInfo(hospital?: Hospital | null): HmsDocumentHospitalInfo | null {
  if (!hospital) return null;
  return {
    name: hospital.name,
    address: hospital.address || undefined,
    city: hospital.city || undefined,
    phone: hospital.phone || undefined,
    email: hospital.email || undefined,
    logoUrl: hospital.logoUrl || undefined,
  };
}

export function readStoredHospitalDocumentInfo(): HmsDocumentHospitalInfo | null {
  try {
    const hospital = JSON.parse(localStorage.getItem('hospital') || 'null') as Hospital | null;
    return mapHospitalDocumentInfo(hospital);
  } catch {
    return null;
  }
}
