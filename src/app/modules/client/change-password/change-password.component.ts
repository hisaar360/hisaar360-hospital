import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import {
  extractApiErrorCode,
  extractApiErrorMessage,
} from '../../../core/utils/api-error';
import {
  PASSWORD_POLICY,
  PasswordPolicyCheck,
  fieldsDifferentValidator,
  fieldsMatchValidator,
  passwordNotEqualToValidator,
  passwordPolicyChecklist,
  passwordPolicyValidator,
  passwordStrength,
} from '../../../core/utils/password-validators';

const CURRENT_PASSWORD_FIELD_CODES = new Set(['CURRENT_PASSWORD_INCORRECT']);
const CONFIRM_PASSWORD_FIELD_CODES = new Set(['PASSWORD_CONFIRMATION_MISMATCH']);

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly policy = PASSWORD_POLICY;

  saving = false;
  completed = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  formErrorMessage = '';
  fieldErrors: Record<string, string> = {};

  private readonly userEmail = String(
    this.authService.getCurrentUser()?.email || ''
  );

  readonly form = this.formBuilder.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: [
        '',
        [
          Validators.required,
          passwordPolicyValidator(),
          passwordNotEqualToValidator(() => this.userEmail, 'passwordMatchesEmail'),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [
        fieldsMatchValidator('newPassword', 'confirmPassword', 'passwordMismatch'),
        fieldsDifferentValidator(
          'newPassword',
          'currentPassword',
          'passwordMatchesCurrent'
        ),
      ],
    }
  );

  get policyChecklist(): PasswordPolicyCheck[] {
    return passwordPolicyChecklist(
      this.form.controls.newPassword.value,
      this.userEmail
    );
  }

  get strength(): { score: 0 | 1 | 2 | 3 | 4; label: string } {
    return passwordStrength(this.form.controls.newPassword.value);
  }

  readonly strengthSegments = [0, 1, 2, 3] as const;

  constructor() {
    this.form.controls.newPassword.valueChanges.subscribe(() => this.render());
    this.form.controls.confirmPassword.valueChanges.subscribe(() => this.render());
    this.form.controls.currentPassword.valueChanges.subscribe(() => this.render());
  }

  segmentClass(segment: number): string {
    const { score } = this.strength;

    if (segment > score || score === 0) {
      return 'segment-idle';
    }

    if (score <= 1) {
      return 'segment-danger';
    }

    if (score === 2) {
      return 'segment-warning';
    }

    return 'segment-success';
  }

  toggleShowCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleShowNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submit(): void {
    if (this.saving || this.completed) {
      return;
    }

    this.formErrorMessage = '';
    this.fieldErrors = {};

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.render();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } =
      this.form.getRawValue();

    this.saving = true;
    this.authService
      .changePassword({ currentPassword, newPassword, confirmPassword })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.render();
        })
      )
      .subscribe({
        next: () => {
          this.completed = true;
          this.form.reset({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          this.render();
          setTimeout(() => this.authService.signOutAfterPasswordChange(), 1600);
        },
        error: (error) => {
          this.applyServerError(error);
          this.render();
        },
      });
  }

  fieldError(
    fieldName: 'currentPassword' | 'newPassword' | 'confirmPassword'
  ): string {
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    const control = this.form.get(fieldName);

    if (
      fieldName === 'confirmPassword' &&
      this.form.errors?.['passwordMismatch'] &&
      (control?.touched || control?.dirty)
    ) {
      return 'Confirm password must match the new password.';
    }

    if (
      fieldName === 'newPassword' &&
      this.form.errors?.['passwordMatchesCurrent'] &&
      (control?.touched || control?.dirty)
    ) {
      return 'New password must be different from your current password.';
    }

    if (!control || !(control.touched || control.dirty) || !control.errors) {
      return '';
    }

    return this.messageForErrors(control.errors);
  }

  private messageForErrors(errors: ValidationErrors): string {
    if (errors['required']) {
      return 'This field is required.';
    }
    if (errors['passwordMinLength']) {
      return `Must be at least ${errors['passwordMinLength'].requiredLength} characters.`;
    }
    if (errors['passwordMaxLength']) {
      return `Must be at most ${errors['passwordMaxLength'].requiredLength} characters.`;
    }
    if (errors['passwordWhitespace']) {
      return 'Must not start or end with a space.';
    }
    if (errors['passwordUppercase']) {
      return 'Add at least one uppercase letter.';
    }
    if (errors['passwordLowercase']) {
      return 'Add at least one lowercase letter.';
    }
    if (errors['passwordNumber']) {
      return 'Add at least one number.';
    }
    if (errors['passwordSpecial']) {
      return 'Add at least one special character.';
    }
    if (errors['passwordMatchesEmail']) {
      return 'New password must not match your email address.';
    }
    return '';
  }

  private applyServerError(error: unknown): void {
    const code = extractApiErrorCode(error);
    const message = extractApiErrorMessage(
      error,
      'Unable to change password. Please try again.'
    );

    if (CURRENT_PASSWORD_FIELD_CODES.has(code)) {
      this.fieldErrors = { currentPassword: message };
      return;
    }

    if (CONFIRM_PASSWORD_FIELD_CODES.has(code)) {
      this.fieldErrors = { confirmPassword: message };
      return;
    }

    if (code.startsWith('PASSWORD_')) {
      this.fieldErrors = { newPassword: message };
      return;
    }

    this.formErrorMessage = message;
  }

  private render(): void {
    this.changeDetector.detectChanges();
  }
}
