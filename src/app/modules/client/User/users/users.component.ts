import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppDialogService } from '../../../../core/services/app-dialog.service';
import { BackendService } from '../../../../core/services/backend.service';
import { User } from '../../../../shared/models/hospital.model';
import { ImageViewerModalComponent } from '../../../../shared/components/image-viewer-modal/image-viewer-modal.component';
import { initialsFromName, resolveAssetUrl } from '../../../../core/utils/asset.util';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ImageViewerModalComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  search = '';
  roleFilter = '';
  statusFilter = '';
  loading = false;
  page = 1;
  pageSize = 10;
  permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];
  viewerOpen = false;
  viewerSrc = '';
  viewerAlt = 'Staff photo';

  constructor(
    private backend: BackendService,
    private toast: ToastrService,
    private router: Router,
    private dialog: AppDialogService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.backend.getUsers({ context: 'hospital' }).subscribe({
      next: (users) => {
        this.users = users || [];
        this.page = 1;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.users = [];
        this.toast.error(err?.error?.message || 'Something went wrong');
      },
    });
  }

  get roleOptions(): string[] {
    const names = new Set<string>();
    for (const user of this.users) {
      const name = String(user.role?.name || '').trim();
      if (name) {
        names.add(name);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  get kpiTotal(): number {
    return this.users.length;
  }

  get kpiActive(): number {
    return this.users.filter((user) => this.isActiveStatus(user.status)).length;
  }

  get kpiDoctors(): number {
    return this.users.filter((user) => this.isDoctorRole(user.role?.name)).length;
  }

  get kpiAdminStaff(): number {
    return Math.max(0, this.kpiTotal - this.kpiDoctors);
  }

  filteredUsers(): User[] {
    const searchValue = this.search.trim().toLowerCase();
    const role = this.roleFilter.trim().toLowerCase();
    const status = this.statusFilter.trim().toLowerCase();

    return this.users.filter((user) => {
      const matchesSearch =
        !searchValue ||
        [user.name, user.email, user.phone, user.role?.name, user.hospital?.name, user.status]
          .join(' ')
          .toLowerCase()
          .includes(searchValue);

      const matchesRole = !role || String(user.role?.name || '').trim().toLowerCase() === role;
      const matchesStatus =
        !status || String(user.status || '').trim().toLowerCase() === status;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  get totalFiltered(): number {
    return this.filteredUsers().length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalFiltered / this.pageSize));
  }

  pagedUsers(): User[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  }

  pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.page;
    const windowSize = 5;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    let end = Math.min(total, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const pages: number[] = [];
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }

  pageRangeLabel(): string {
    if (this.totalFiltered === 0) {
      return 'Showing 0 users';
    }
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, this.totalFiltered);
    return `Showing ${start} to ${end} of ${this.totalFiltered} users`;
  }

  onFiltersChanged(): void {
    this.page = 1;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.page = page;
  }

  percentOfTotal(count: number): string {
    if (!this.kpiTotal) {
      return '0% of total';
    }
    return `${Math.round((count / this.kpiTotal) * 100)}% of total`;
  }

  get canViewHospitalColumn(): boolean {
    return this.hasPermission('*');
  }

  canCreateUser(): boolean {
    return this.hasPermission('users.create');
  }

  canUpdateUser(): boolean {
    return this.hasPermission('users.update');
  }

  canDeleteUser(): boolean {
    return this.hasPermission('users.delete');
  }

  canViewUser(): boolean {
    return this.hasPermission('users.read') || this.canUpdateUser() || this.hasPermission('*');
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.canDeleteUser()) {
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: 'Delete User',
      message: 'Delete this user? This action cannot be undone.',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.backend.deleteUser(id, { context: 'hospital' }).subscribe({
      next: (resp) => {
        this.toast.success(resp.message || 'User deleted successfully');
        this.loadUsers();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Something went wrong');
      },
    });
  }

  viewUser(user: User): void {
    if (!this.canViewUser()) {
      return;
    }
    this.router.navigate(['/users', user._id, 'edit'], { state: { user } });
  }

  editUser(user: User): void {
    if (!this.canUpdateUser()) {
      return;
    }
    this.router.navigate(['/users', user._id, 'edit'], { state: { user } });
  }

  photoUrl(user: User): string {
    return resolveAssetUrl(user.photoUrl);
  }

  initials(user: User): string {
    return initialsFromName(user.name);
  }

  roleBadgeTone(roleName?: string | null): string {
    const name = String(roleName || '').trim().toLowerCase();
    if (!name) {
      return 'tone-0';
    }
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = (hash + name.charCodeAt(i) * (i + 1)) % 8;
    }
    return `tone-${hash}`;
  }

  isActiveStatus(status?: string | null): boolean {
    return String(status || '').trim().toLowerCase() === 'active';
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

  private isDoctorRole(roleName?: string | null): boolean {
    const normalized = String(roleName || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
    return (
      normalized === 'doctor' ||
      normalized.includes('doctor') ||
      normalized === 'pathologist' ||
      normalized.includes('pathologist')
    );
  }

  private hasPermission(permission: string): boolean {
    return this.permissions.includes('*') || this.permissions.includes(permission);
  }
}
