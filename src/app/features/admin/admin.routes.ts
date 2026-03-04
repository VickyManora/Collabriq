import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'users',
    loadComponent: () =>
      import('./user-approvals/user-approvals').then((m) => m.UserApprovals),
  },
  {
    path: 'requirements',
    loadComponent: () =>
      import('./requirement-approvals/requirement-approvals').then((m) => m.RequirementApprovals),
  },
  {
    path: 'deals',
    loadComponent: () =>
      import('./deal-monitor/deal-monitor').then((m) => m.DealMonitor),
  },
  { path: '', redirectTo: 'users', pathMatch: 'full' },
];
