import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { approvalGuard } from './core/guards/approval.guard';
import { roleGuard } from './core/guards/role.guard';
import { landingGuard } from './core/guards/landing.guard';

export const routes: Routes = [
  // Public landing page
  {
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    loadComponent: () =>
      import('./features/landing/landing').then((m) => m.Landing),
  },

  // Public browse (no auth required)
  {
    path: 'browse',
    loadComponent: () =>
      import('./features/public-browse/public-browse').then((m) => m.PublicBrowse),
  },

  // Public auth routes
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Protected routes (requires login)
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      // Pending approval (shown if user not yet approved)
      {
        path: 'pending-approval',
        loadComponent: () =>
          import('./features/auth/pending-approval/pending-approval').then(
            (m) => m.PendingApproval,
          ),
      },

      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },

      // Profile editing
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile-edit/profile-edit').then((m) => m.ProfileEdit),
      },

      // Business routes (Phase 2)
      {
        path: 'business',
        canActivate: [roleGuard],
        data: { role: 'business' },
        loadChildren: () =>
          import('./features/business/business.routes').then((m) => m.BUSINESS_ROUTES),
      },

      // Creator routes (Phase 3)
      {
        path: 'creator',
        canActivate: [roleGuard],
        data: { role: 'creator' },
        loadChildren: () =>
          import('./features/creator/creator.routes').then((m) => m.CREATOR_ROUTES),
      },

      // Admin routes (Phase 4)
      {
        path: 'admin',
        canActivate: [approvalGuard, roleGuard],
        data: { role: 'admin' },
        loadChildren: () =>
          import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
    ],
  },

  { path: '**', redirectTo: 'auth/login' },
];
