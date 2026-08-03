import { Routes } from '@angular/router';
import { authRoutes } from './modules/auth/auth.routes';
import { clientRoutes } from './modules/client/client.routes';

export const routes: Routes = [
  // Prefer auth routes first so /login/* is never swallowed by the app shell.
  ...authRoutes,
  ...clientRoutes,
  { path: '**', redirectTo: 'login/access' },
];
