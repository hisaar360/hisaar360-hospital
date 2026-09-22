import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { ListResult, Prescription } from '../../../shared/models/hospital.model';

/**
 * Facade so Clinical Workspace UI is not permanently coupled to "Prescription" naming.
 * Internally persists via existing Prescription APIs until a future Encounter-centric store.
 */
@Injectable({ providedIn: 'root' })
export class ClinicalWorkspaceFacade {
  readonly workspaceTitle = 'Consultation';
  readonly previousConsultationsLabel = 'Previous Consultations';
  readonly navGroupLabel = 'Clinical / OPD';

  constructor(private readonly backend: BackendService) {}

  createConsultation(payload: Record<string, unknown>): Observable<ApiResponse<Prescription>> {
    return this.backend.createPrescription(payload);
  }

  updateConsultation(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Prescription>> {
    return this.backend.updatePrescription(id, payload);
  }

  getConsultation(id: string): Observable<Prescription> {
    return this.backend.getPrescription(id);
  }

  listConsultations(params?: Record<string, unknown>): Observable<ListResult<Prescription>> {
    return this.backend.getPrescriptions(params);
  }
}
