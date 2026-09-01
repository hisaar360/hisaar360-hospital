import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { BackendService } from './backend.service';
import { NotificationSoundService } from './notification-sound.service';
import {
  isClinicalModuleEnabled,
  isLaboratoryModuleEnabled,
  isPharmacyModuleEnabled,
  isWardModuleEnabled,
} from '../../modules/auth/hospital-modules';
import { hasPermission, readStoredPermissions } from '../../modules/auth/access-control';

export interface HospitalNotificationItem {
  _id: string;
  type: string;
  module: string;
  priority: string;
  title: string;
  message: string;
  patientId?: string;
  encounterId?: string;
  admissionId?: string;
  sourceId?: string;
  actionRoute?: string;
  actionLabel?: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class HospitalNotificationService {
  private backend = inject(BackendService);
  private sound = inject(NotificationSoundService);

  private readonly itemsSubject = new BehaviorSubject<HospitalNotificationItem[]>([]);
  private readonly unreadSubject = new BehaviorSubject<number>(0);
  private knownIds = new Set<string>();
  private bootstrapped = false;

  readonly items$ = this.itemsSubject.asObservable();
  readonly unreadCount$ = this.unreadSubject.asObservable();

  startPolling(intervalMs = 45000): void {
    interval(intervalMs)
      .pipe(switchMap(() => this.refresh()))
      .subscribe();
    this.refresh().subscribe();
  }

  refresh(): Observable<HospitalNotificationItem[]> {
    return this.backend.listNotifications({ limit: 50 }).pipe(
      map((data) => (Array.isArray(data?.items) ? data.items : []) as HospitalNotificationItem[]),
      map((items) => items.filter((item) => this.isModuleVisible(item))),
      tap((items) => {
        const actionableTypes = new Set([
          'ADMISSION_RECOMMENDED',
          'MEDICINE_REQUEST_CREATED',
          'LAB_ORDER_CREATED',
          'IMAGING_ORDER_CREATED',
        ]);
        if (this.bootstrapped) {
          for (const item of items) {
            if (!item.isRead && !this.knownIds.has(item._id) && actionableTypes.has(item.type)) {
              this.sound.playOnce(item._id);
            }
          }
        } else {
          this.bootstrapped = true;
        }
        items.forEach((item) => this.knownIds.add(item._id));
        this.itemsSubject.next(items);
        this.unreadSubject.next(items.filter((item) => !item.isRead).length);
      }),
      catchError(() => {
        this.itemsSubject.next([]);
        this.unreadSubject.next(0);
        return of([]);
      })
    );
  }

  markRead(id: string): Observable<unknown> {
    return this.backend.markNotificationRead(id).pipe(tap(() => this.refresh().subscribe()));
  }

  markAllRead(): Observable<unknown> {
    return this.backend.markAllNotificationsRead().pipe(tap(() => this.refresh().subscribe()));
  }

  private isModuleVisible(item: HospitalNotificationItem): boolean {
    const permissions = readStoredPermissions();
    if (permissions.includes('*')) {
      return true;
    }
    switch (item.module) {
      case 'ward':
        return isWardModuleEnabled();
      case 'laboratory':
        return isLaboratoryModuleEnabled();
      case 'pharmacy':
        return isPharmacyModuleEnabled();
      case 'clinical':
        return isClinicalModuleEnabled();
      default:
        return true;
    }
  }

  canSeeNotifications(): boolean {
    const permissions = readStoredPermissions();
    return (
      permissions.includes('*') ||
      hasPermission('ward.read', permissions) ||
      hasPermission('lab_orders.read', permissions) ||
      hasPermission('pharmacy.ward_requests.read', permissions) ||
      hasPermission('room_allotments.create', permissions)
    );
  }
}
