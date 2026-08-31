import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { WardModuleKey } from './ward-module.models';
import { WardDataService } from './services/ward-data.service';
import {
  Doctor,
  HospitalWard,
  Patient,
  Prescription,
  ProductCatalogItem,
  Room,
  RoomAllotment,
  Store,
} from '../../../shared/models/hospital.model';

@Component({
  selector: 'app-ward-action-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './ward-action-modal.component.html',
  styleUrl: './ward-action-modal.component.scss',
})
export class WardActionModalComponent implements OnChanges {
  @Input() open = false;
  @Input() moduleKey!: WardModuleKey;
  @Input() title = 'Action';
  @Input() preset: Record<string, string | number> = {};
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = false;
  saving = false;
  patients: Patient[] = [];
  rooms: Room[] = [];
  doctors: Doctor[] = [];
  prescriptions: Prescription[] = [];
  allotments: RoomAllotment[] = [];
  products: ProductCatalogItem[] = [];
  stores: Store[] = [];
  wards: HospitalWard[] = [];

  form: Record<string, string | number> = {
    admissionId: '',
    patientId: '',
    roomId: '',
    doctorId: '',
    consultantDoctorId: '',
    prescriptionId: '',
    title: '',
    description: '',
    notes: '',
    medicineName: '',
    dose: '',
    route: 'PO',
    fluidName: '',
    bloodPressure: '',
    temperature: '',
    pulse: '',
    weight: '',
    intake: '',
    output: '',
    balance: '',
    direction: 'INTAKE',
    ioCategory: 'Oral',
    volumeMl: '',
    shift: 'day',
    orderName: '',
    orderType: 'lab',
    priority: 'normal',
    bedNo: '',
    bedType: 'standard',
    dailyCharge: 0,
    admissionReason: '',
    bedLabel: '',
    category: 'Consumable',
    quantity: 0,
    reorderLevel: 5,
    location: 'Ward Store',
    productId: '',
    fromLocationId: '',
    wardId: '',
    nurseName: '',
    patientsCount: 1,
    pendingCount: 0,
    patientCondition: '',
    pendingMedicines: '',
    pendingLabs: '',
    runningDrips: '',
    specialInstructions: '',
    riskAlerts: '',
    marStatus: 'given',
    spo2: '',
    painScore: '',
    respiratoryRate: '',
    systolic: '',
    diastolic: '',
    bloodGlucose: '',
    noteType: 'routine',
    doctorInformed: 'no',
  };

  constructor(
    private wardData: WardDataService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private toastr: ToastrService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) {
      this.resetForm();
      Object.entries(this.preset).forEach(([key, value]) => {
        if (key in this.form) {
          this.form[key] = value;
        }
      });
      this.loadOptions();
    }
  }

  get shiftOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'day', label: 'Day Shift' },
      { value: 'evening', label: 'Evening Shift' },
      { value: 'night', label: 'Night Shift' },
    ];
  }

  patientLabel(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim() + (patient.patientNo ? ` (${patient.patientNo})` : '');
  }

  roomLabel(room: Room): string {
    return `${room.roomNo} · ${room.roomType} · ${room.status}`;
  }

  doctorLabel(doctor: Doctor): string {
    return doctor.user?.name || doctor.specialization || doctor._id;
  }

  productLabel(product: ProductCatalogItem): string {
    return `${product.name}${product.sku ? ` (${product.sku})` : ''}`.trim();
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (!this.moduleKey) {
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      if (this.moduleKey === 'inventory') {
        this.toastr.error('Select a product, store, ward, and quantity.');
      }
      return;
    }

    this.saving = true;
    this.wardData.submitModuleAction(this.moduleKey, payload).subscribe({
      next: () => this.zone.run(() => {
        this.saving = false;
        this.saved.emit();
        this.close();
        this.cdr.detectChanges();
      }),
      error: (err) => this.zone.run(() => {
        this.saving = false;
        this.toastr.error(err?.error?.message || 'Unable to save this ward entry.');
        this.cdr.detectChanges();
      }),
    });
  }

  onPatientChange(patientId: string | number): void {
    this.form['patientId'] = patientId;
    const match = this.allotments.find(
      (allotment) =>
        allotment.status === 'admitted' &&
        String(allotment.patientId) === String(patientId)
    );
    this.form['admissionId'] = match?._id || '';
  }

  private loadOptions(): void {
    this.loading = true;
    const inventory$ = this.moduleKey === 'inventory'
      ? this.wardData.loadInventoryFormOptions()
      : of({ products: [] as ProductCatalogItem[], stores: [] as Store[], wards: [] as HospitalWard[] });
    forkJoin({
      bundle: this.wardData.loadActionOptions(),
      inventory: inventory$,
    }).subscribe({
      next: ({ bundle, inventory }) => this.zone.run(() => {
        this.allotments = bundle.allotments.filter((allotment) => allotment.status === 'admitted');
        const admittedPatients = this.allotments
          .filter((allotment) => allotment.patient)
          .map((allotment) => allotment.patient as Patient);
        this.patients = admittedPatients.length ? admittedPatients : bundle.patients;
        this.rooms = bundle.rooms.filter((room) => room.status === 'available' || room.status === 'occupied');
        this.doctors = bundle.doctors;
        this.prescriptions = bundle.prescriptions;
        this.products = inventory.products;
        this.stores = inventory.stores;
        this.wards = inventory.wards.filter((ward) => ward.status !== 'inactive');
        if (!this.form['fromLocationId'] && this.stores.length === 1) {
          this.form['fromLocationId'] = this.stores[0]._id;
        }
        if (!this.form['wardId'] && this.wards.length === 1) {
          this.form['wardId'] = this.wards[0]._id;
        }
        if (admittedPatients.length === 1 && this.moduleKey !== 'admissions' && this.moduleKey !== 'inventory') {
          this.onPatientChange(admittedPatients[0]._id);
        }
        this.loading = false;
        this.cdr.detectChanges();
      }),
      error: () => this.zone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
    });
  }

  private resetForm(): void {
    Object.keys(this.form).forEach((key) => {
      if (typeof this.form[key] === 'number') {
        this.form[key] = 0;
      } else {
        this.form[key] = '';
      }
    });
    this.form['shift'] = 'day';
    this.form['route'] = 'PO';
    this.form['orderType'] = 'lab';
    this.form['priority'] = 'normal';
    this.form['marStatus'] = 'given';
    this.form['noteType'] = 'routine';
    this.form['doctorInformed'] = 'no';
    this.form['bedType'] = 'standard';
    this.form['category'] = 'Consumable';
    this.form['location'] = 'Ward Store';
    this.form['reorderLevel'] = 5;
    this.form['patientsCount'] = 1;
    this.form['direction'] = 'INTAKE';
    this.form['ioCategory'] = 'Oral';
    this.form['quantity'] = 1;
  }

  private compactValue(value: string | number | undefined): string | number | undefined {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return value;
  }

  private celsiusTemperature(raw: string | number | undefined): string | undefined {
    const text = String(raw ?? '').trim();
    if (!text) {
      return undefined;
    }
    const numeric = Number(text);
    if (!Number.isFinite(numeric)) {
      return text;
    }
    if (numeric > 45) {
      return String(Math.round((((numeric - 32) * 5) / 9) * 10) / 10);
    }
    return String(numeric);
  }

  private buildVitalsPayload(): Record<string, unknown> {
    const bp = String(this.form['bloodPressure'] || '').trim();
    const match = bp.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
    const systolic = this.compactValue(this.form['systolic']) ?? (match ? Number(match[1]) : undefined);
    const diastolic = this.compactValue(this.form['diastolic']) ?? (match ? Number(match[2]) : undefined);
    return {
      bloodPressure: this.compactValue(this.form['bloodPressure']),
      temperature: this.celsiusTemperature(this.form['temperature']),
      pulse: this.compactValue(this.form['pulse']),
      weight: this.compactValue(this.form['weight']),
      spo2: this.compactValue(this.form['spo2']),
      painScore: this.compactValue(this.form['painScore']),
      respiratoryRate: this.compactValue(this.form['respiratoryRate']),
      systolic,
      diastolic,
      bloodGlucose: this.compactValue(this.form['bloodGlucose']),
    };
  }

  private buildPayload(): Record<string, unknown> | null {
    switch (this.moduleKey) {
      case 'admissions':
        if (!this.form['patientId'] || !this.form['roomId']) return null;
        return {
          patientId: this.form['patientId'],
          roomId: this.form['roomId'],
          consultantDoctorId: this.form['consultantDoctorId'] || undefined,
          admissionReason: this.form['admissionReason'],
          bedLabel: this.form['bedLabel'],
          notes: this.form['notes'],
        };
      case 'nursing-care':
        if (!this.form['patientId'] || !this.form['title']) return null;
        return {
          patientId: this.form['patientId'],
          admissionId: this.form['admissionId'] || undefined,
          title: this.form['title'],
          description: this.form['description'],
          priority: this.form['priority'] || 'normal',
          shift: this.form['shift'],
          noteType: this.form['noteType'] || 'routine',
          activityType: this.form['noteType'] === 'care_plan' ? 'care_plan' : 'nursing_task',
        };
      case 'mar':
        if (!this.form['patientId'] || !this.form['medicineName']) return null;
        return {
          patientId: this.form['patientId'],
          admissionId: this.form['admissionId'] || undefined,
          prescriptionId: this.form['prescriptionId'] || undefined,
          medicineName: this.form['medicineName'],
          dose: this.form['dose'],
          route: this.form['route'],
          notes: this.form['notes'],
          shift: this.form['shift'],
          marStatus: this.form['marStatus'] || 'given',
        };
      case 'drips-iv':
        if (!this.form['prescriptionId']) return null;
        return {
          prescriptionId: this.form['prescriptionId'],
          patientId: this.form['patientId'] || undefined,
          admissionId: this.form['admissionId'] || undefined,
          fluidName: this.form['fluidName'] || undefined,
          notes: this.form['notes'],
        };
      case 'vitals':
        if (!this.form['patientId']) return null;
        return {
          patientId: this.form['patientId'],
          admissionId: this.form['admissionId'] || undefined,
          doctorId: this.form['doctorId'] || undefined,
          notes: this.form['notes'],
          shift: this.form['shift'],
          vitals: this.buildVitalsPayload(),
        };
      case 'io-chart':
        if (!this.form['patientId']) return null;
        return {
          patientId: this.form['patientId'],
          admissionId: this.form['admissionId'] || undefined,
          direction: this.form['direction'] || 'INTAKE',
          ioCategory: this.form['ioCategory'] || 'Other',
          volumeMl: this.form['volumeMl'] || this.form['intake'] || this.form['output'],
          shift: this.form['shift'],
          notes: this.form['notes'],
        };
      case 'orders-services':
        if (!this.form['patientId'] || !this.form['orderName']) return null;
        return {
          patientId: this.form['patientId'],
          admissionId: this.form['admissionId'] || undefined,
          orderType: this.form['orderType'],
          orderName: this.form['orderName'],
          doctorId: this.form['doctorId'] || undefined,
          notes: this.form['notes'],
          priority: this.form['priority'],
        };
      case 'shift-handover':
        if (!this.form['patientId'] || !this.form['patientCondition']) return null;
        return {
          patientId: this.form['patientId'],
          admissionId: this.form['admissionId'] || undefined,
          title: `Handover - ${this.form['shift']}`,
          description: this.form['description'],
          shift: this.form['shift'],
          nurseName: this.form['nurseName'],
          pending: this.form['pendingCount'],
          patientCondition: this.form['patientCondition'],
          pendingMedicines: this.form['pendingMedicines'],
          pendingLabs: this.form['pendingLabs'],
          runningDrips: this.form['runningDrips'],
          specialInstructions: this.form['specialInstructions'],
          riskAlerts: this.form['riskAlerts'],
          doctorInformed: this.form['doctorInformed'],
        };
      case 'inventory':
        if (!this.form['productId'] || !this.form['wardId'] || !this.form['fromLocationId'] || Number(this.form['quantity']) <= 0) {
          return null;
        }
        return {
          productId: this.form['productId'],
          quantity: Number(this.form['quantity']),
          wardId: this.form['wardId'],
          fromLocationId: this.form['fromLocationId'],
          fromLocationType: 'store',
          description: this.form['description'],
        };
      default:
        return null;
    }
  }
}
