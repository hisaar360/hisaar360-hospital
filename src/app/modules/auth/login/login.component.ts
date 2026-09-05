import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  showNewPassword = false;
  loading = false;
  ssoLoading = false;
  ssoCode: string | null = null;
  allowLocalLogin = false;
  loginForm: FormGroup;

  private readonly subscriptions = new Subscription();
  private hasStartedSsoLogin = false;
  private lastSsoCode: string | null = null;

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private route: ActivatedRoute,
    private toaster: ToastrService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  get showLocalLoginForm(): boolean {
    return this.allowLocalLogin && !this.ssoCode;
  }

  /** SSO handoff: only verification UI — never the hospital login form. */
  get showSsoVerification(): boolean {
    return Boolean(this.ssoCode);
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const ssoCode = params.get('ssoCode');
        this.ssoCode = ssoCode;
        this.allowLocalLogin = params.get('localLogin') === '1';

        if (ssoCode) {
          const shouldStart =
            !this.hasStartedSsoLogin || this.lastSsoCode !== ssoCode;
          if (shouldStart) {
            this.hasStartedSsoLogin = true;
            this.lastSsoCode = ssoCode;
            this.startSsoLogin();
          }
          return;
        }

        this.hasStartedSsoLogin = false;
        this.lastSsoCode = null;

        // No SSO code → Central Auth portal (local: :4200/login, prod: hisaar360.com).
        if (!this.allowLocalLogin) {
          this.authService.redirectToHostedLogin();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  togglePasswordVisibility(field: 'password') {
    if (field === 'password') {
      this.showNewPassword = !this.showNewPassword;
    }
  }

  onSubmit() {
    if (!this.showLocalLoginForm) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    this.authService
      .login(this.loginForm.value.email, this.loginForm.value.password)
      .subscribe({
        next: () => {
          this.loading = false;
          this.toaster.success(this.welcomeMessage());
        },
        error: (err) => {
          this.loading = false;
          this.toaster.error(err?.error?.message || 'Something went wrong!');
          console.error('Login failed:', err);
        },
      });
  }

  private startSsoLogin(): void {
    if (!this.ssoCode) {
      return;
    }

    this.ssoLoading = true;

    this.authService.ssoLogin(this.ssoCode).subscribe({
      next: () => {
        this.ssoLoading = false;
        this.toaster.success(this.welcomeMessage());
      },
      error: (err) => {
        this.ssoLoading = false;
        this.hasStartedSsoLogin = false;
        this.toaster.error(err?.error?.message || 'SSO login failed');
        console.error('SSO login failed:', err);
        this.authService.redirectToHostedLogin();
      },
    });
  }

  private welcomeMessage(): string {
    const name = String(this.authService.getCurrentUser()?.name || '').trim();
    return name ? `Welcome, ${name}` : 'Welcome';
  }
}
