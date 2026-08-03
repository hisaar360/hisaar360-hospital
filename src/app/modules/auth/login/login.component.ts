import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  loginForm: FormGroup;

  private readonly subscriptions = new Subscription();
  private hasStartedSsoLogin = false;

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toaster: ToastrService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  get showLocalLoginForm(): boolean {
    return this.authService.shouldUseLocalLogin() && !this.ssoCode;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const ssoCode = params.get('ssoCode');
        this.ssoCode = ssoCode;

        if (ssoCode) {
          const shouldStart =
            !this.hasStartedSsoLogin || this.ssoCode !== ssoCode;
          if (shouldStart) {
            this.hasStartedSsoLogin = true;
            this.startSsoLogin();
          }
          return;
        }

        this.hasStartedSsoLogin = false;
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
        next: (response) => {
          this.loading = false;
          this.toaster.success(response?.message || 'Login Successfully');
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
      next: (response) => {
        this.ssoLoading = false;
        this.toaster.success(response?.message || 'SSO login successful');
      },
      error: (err) => {
        this.ssoLoading = false;
        this.hasStartedSsoLogin = false;
        this.toaster.error(err?.error?.message || 'SSO login failed');
        console.error('SSO login failed:', err);

        if (this.authService.shouldUseLocalLogin()) {
          void this.router.navigate(['/login/access'], {
            queryParams: {},
            replaceUrl: true,
          });
        } else {
          this.authService.redirectToHostedLogin();
        }
      },
    });
  }
}
