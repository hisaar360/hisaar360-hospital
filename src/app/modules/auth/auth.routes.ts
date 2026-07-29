import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { hostedLoginGuard } from './hosted-login.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    pathMatch: 'full',
    redirectTo: 'login/access',
  },
  {
    path: 'login/access',
    component: LoginComponent,
    canActivate: [hostedLoginGuard],
    data: { title: 'Log In' },
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    data: { title: 'Forgot Password' },
  },
];
