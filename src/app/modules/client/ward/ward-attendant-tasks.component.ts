import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { WardDataService } from './services/ward-data.service';
import { WardAttendantTask } from './ward-home.util';

@Component({
  selector: 'app-ward-attendant-tasks',
  imports: [CommonModule, FormsModule],
  templateUrl: './ward-attendant-tasks.component.html',
  styleUrl: './ward-attendant-tasks.component.scss',
})
export class WardAttendantTasksComponent implements OnInit {
  loading = false;
  error = false;
  tasks: WardAttendantTask[] = [];

  savingTaskId = '';
  unableTaskId = '';
  unableReason = '';

  readonly skeletonRows = [1, 2, 3];

  constructor(
    private wardData: WardDataService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.wardData
      .loadAttendantTasks()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (tasks) => (this.tasks = tasks),
        error: () => {
          this.tasks = [];
          this.error = true;
        },
      });
  }

  start(task: WardAttendantTask): void {
    this.submit(task, 'in_progress', '', 'Task started.');
  }

  markDone(task: WardAttendantTask): void {
    this.submit(task, 'completed', '', 'Task marked done.');
  }

  openUnable(task: WardAttendantTask): void {
    this.unableTaskId = task.id;
    this.unableReason = '';
  }

  cancelUnable(): void {
    this.unableTaskId = '';
    this.unableReason = '';
  }

  confirmUnable(task: WardAttendantTask): void {
    const reason = this.unableReason.trim();
    if (!reason) {
      this.toastr.error('Please write a short reason.');
      return;
    }
    this.submit(task, 'cancelled', reason, 'Task closed as not completed.');
  }

  private submit(
    task: WardAttendantTask,
    status: 'in_progress' | 'completed' | 'cancelled',
    reason: string,
    successMessage: string
  ): void {
    this.savingTaskId = task.id;
    this.wardData
      .updateAttendantTaskStatus(task.id, status, reason)
      .pipe(finalize(() => (this.savingTaskId = '')))
      .subscribe({
        next: () => {
          this.toastr.success(successMessage);
          this.cancelUnable();
          this.load();
        },
        error: () => this.toastr.error('Could not update the task. Please try again.'),
      });
  }
}
