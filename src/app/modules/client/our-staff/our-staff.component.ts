import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '../../../shared/models/hospital.model';
import { WardDataService } from '../ward/services/ward-data.service';
import { WardPatient } from '../ward/ward-patient-list.models';
import { ImageViewerModalComponent } from '../../../shared/components/image-viewer-modal/image-viewer-modal.component';
import { initialsFromName, resolveAssetUrl } from '../../../core/utils/asset.util';

@Component({
  selector: 'app-our-staff',
  imports: [CommonModule, FormsModule, ImageViewerModalComponent],
  templateUrl: './our-staff.component.html',
  styleUrl: './our-staff.component.scss'
})
export class OurStaffComponent implements OnInit {
  loading = false;
  assigning = false;
  users: User[] = [];
  patients: WardPatient[] = [];
  search = '';
  selectedNurseId = '';
  contextAdmissionId = '';
  contextPatientId = '';
  contextPatient: WardPatient | null = null;
  viewerOpen = false;
  viewerSrc = '';
  viewerAlt = 'Staff photo';

  constructor(
    private wardData: WardDataService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.contextAdmissionId = params.get('admissionId') || '';
      this.contextPatientId = params.get('patientId') || '';
      this.syncContextPatient();
    });
    this.loadData();
  }

  get isWardAssignmentMode(): boolean {
    return Boolean(this.contextAdmissionId || this.contextPatientId);
  }

  get activeUsers(): User[] {
    return this.users.filter((user) => user.status !== 'inactive');
  }

  get nurseUsers(): User[] {
    const nurses = this.activeUsers.filter((user) => this.isNurse(user));
    return nurses.length ? nurses : this.activeUsers;
  }

  get filteredUsers(): User[] {
    const query = this.search.trim().toLowerCase();
    const list = this.isWardAssignmentMode ? this.nurseUsers : this.activeUsers;
    if (!query) {
      return list;
    }
    return list.filter((user) =>
      [user.name, user.email, user.phone || '', user.role?.name || '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }

  get assignedCount(): number {
    return this.patients.filter((patient) => patient.nurseName).length;
  }

  get unassignedCount(): number {
    return this.patients.filter((patient) => !patient.nurseName).length;
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      users: this.wardData.loadWardStaff().pipe(catchError(() => of([] as User[]))),
      patients: this.wardData.loadAdmittedPatients('').pipe(catchError(() => of([] as WardPatient[]))),
    }).subscribe({
      next: ({ users, patients }) => {
        this.users = users || [];
        this.patients = patients || [];
        this.syncContextPatient();
        this.loading = false;
      },
      error: () => {
        this.users = [];
        this.patients = [];
        this.loading = false;
        this.toastr.error('Failed to load nurses and staff.');
      },
    });
  }

  selectNurse(user: User): void {
    this.selectedNurseId = user._id;
  }

  assignSelectedNurse(): void {
    if (!this.contextAdmissionId) {
      this.toastr.warning('No active admission selected for nurse assignment.');
      return;
    }

    if (!this.selectedNurseId) {
      this.toastr.warning('Select a nurse first.');
      return;
    }

    this.assigning = true;
    this.wardData.assignNurse(this.contextAdmissionId, this.selectedNurseId).subscribe({
      next: () => {
        this.assigning = false;
        this.toastr.success('Nurse assigned successfully.');
        void this.router.navigate(['/ward/patient-list']);
      },
      error: (err) => {
        this.assigning = false;
        this.toastr.error(err?.error?.message || 'Failed to assign nurse.');
      },
    });
  }

  roleLabel(user: User): string {
    return user.role?.name || 'Staff';
  }

  isNurse(user: User): boolean {
    const roleName = String(user.role?.name || '').trim().toLowerCase();
    return roleName === 'nurse' || roleName === 'staff nurse' || roleName === 'ward admin';
  }

  trackUser(_index: number, user: User): string {
    return user._id;
  }

  photoUrl(user: User): string {
    return resolveAssetUrl(user.photoUrl);
  }

  initials(user: User): string {
    return initialsFromName(user.name);
  }

  openPhoto(user: User, event?: Event): void {
    event?.stopPropagation();
    const url = this.photoUrl(user);
    if (!url) {
      return;
    }
    this.viewerSrc = url;
    this.viewerAlt = user.name || 'Staff photo';
    this.viewerOpen = true;
  }

  private syncContextPatient(): void {
    if (!this.patients.length) {
      return;
    }
    this.contextPatient =
      this.patients.find((patient) => patient.admissionId === this.contextAdmissionId) ||
      this.patients.find((patient) => patient.patientId === this.contextPatientId) ||
      null;
    this.selectedNurseId = this.contextPatient?.nurseId || this.selectedNurseId;
  }
}
