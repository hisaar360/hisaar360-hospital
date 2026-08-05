import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Canonical Hisaar360 password policy (UX only; Central Auth is authoritative). */
export const PASSWORD_POLICY = Object.freeze({
  minLength: 8,
  maxLength: 64,
});

const PASSWORD_SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/;

export interface PasswordPolicyCheck {
  key: string;
  label: string;
  met: boolean;
}

export function passwordPolicyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value : '';

    if (!value.length) {
      return null;
    }

    const errors: ValidationErrors = {};

    if (value !== value.trim()) {
      errors['passwordWhitespace'] = true;
    }
    if (value.length < PASSWORD_POLICY.minLength) {
      errors['passwordMinLength'] = { requiredLength: PASSWORD_POLICY.minLength };
    }
    if (value.length > PASSWORD_POLICY.maxLength) {
      errors['passwordMaxLength'] = { requiredLength: PASSWORD_POLICY.maxLength };
    }
    if (!/[A-Z]/.test(value)) {
      errors['passwordUppercase'] = true;
    }
    if (!/[a-z]/.test(value)) {
      errors['passwordLowercase'] = true;
    }
    if (!/[0-9]/.test(value)) {
      errors['passwordNumber'] = true;
    }
    if (!PASSWORD_SPECIAL_CHAR_PATTERN.test(value)) {
      errors['passwordSpecial'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  };
}

export function passwordNotEqualToValidator(
  getOtherValue: () => string,
  errorKey: string
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim().toLowerCase() : '';
    const other = String(getOtherValue() || '')
      .trim()
      .toLowerCase();

    if (!value || !other) {
      return null;
    }

    return value === other || value.includes(other) ? { [errorKey]: true } : null;
  };
}

export function fieldsMatchValidator(
  fieldName: string,
  matchFieldName: string,
  errorKey = 'fieldsMismatch'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup)) {
      return null;
    }

    const value = control.get(fieldName)?.value ?? '';
    const matchValue = control.get(matchFieldName)?.value ?? '';

    if (!matchValue) {
      return null;
    }

    return value === matchValue ? null : { [errorKey]: true };
  };
}

export function fieldsDifferentValidator(
  fieldName: string,
  otherFieldName: string,
  errorKey = 'fieldsMatch'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup)) {
      return null;
    }

    const value = control.get(fieldName)?.value ?? '';
    const otherValue = control.get(otherFieldName)?.value ?? '';

    if (!value || !otherValue) {
      return null;
    }

    return value === otherValue ? { [errorKey]: true } : null;
  };
}

export function passwordPolicyChecklist(password: string, email = ''): PasswordPolicyCheck[] {
  const value = password || '';
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  return [
    {
      key: 'length',
      label: `${PASSWORD_POLICY.minLength}-${PASSWORD_POLICY.maxLength} characters`,
      met:
        value.length >= PASSWORD_POLICY.minLength &&
        value.length <= PASSWORD_POLICY.maxLength,
    },
    { key: 'uppercase', label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(value) },
    { key: 'lowercase', label: 'One lowercase letter (a-z)', met: /[a-z]/.test(value) },
    { key: 'number', label: 'One number (0-9)', met: /[0-9]/.test(value) },
    {
      key: 'special',
      label: 'One special character (!@#$...)',
      met: PASSWORD_SPECIAL_CHAR_PATTERN.test(value),
    },
    {
      key: 'whitespace',
      label: 'No leading/trailing spaces',
      met: value.length > 0 && value === value.trim(),
    },
    {
      key: 'notEmail',
      label: 'Different from your email address',
      met:
        !normalizedEmail ||
        (value.length > 0 && !value.trim().toLowerCase().includes(normalizedEmail)),
    },
  ];
}

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  const value = password || '';

  if (!value.length) {
    return { score: 0, label: '' };
  }

  let signals = 0;
  if (value.length >= PASSWORD_POLICY.minLength) signals += 1;
  if (value.length >= 14) signals += 1;
  if (/[A-Z]/.test(value)) signals += 1;
  if (/[a-z]/.test(value)) signals += 1;
  if (/[0-9]/.test(value)) signals += 1;
  if (PASSWORD_SPECIAL_CHAR_PATTERN.test(value)) signals += 1;

  const score = Math.min(4, Math.round((signals / 6) * 4)) as 0 | 1 | 2 | 3 | 4;
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'] as const;

  return { score, label: labels[score] };
}
