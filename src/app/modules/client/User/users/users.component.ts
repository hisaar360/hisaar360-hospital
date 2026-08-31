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
  loading = false;
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
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.users = [];
        this.toast.error(err?.error?.message || 'Something went wrong');
      },
    });
  }

  filteredUsers(): User[] {
    const searchValue = this.search.toLowerCase();
    if (!searchValue) {
      return this.users;
    }

    return this.users.filter((user) =>
      [user.name, user.email, user.phone, user.role?.name, user.hospital?.name, user.status]
        .join(' ')
        .toLowerCase()
        .includes(searchValue)
    );
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

  editUser(user: User) {
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

  private hasPermission(permission: string): boolean {
    return this.permissions.includes('*') || this.permissions.includes(permission);
  }

}
