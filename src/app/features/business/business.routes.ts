import { Routes } from '@angular/router';

export const BUSINESS_ROUTES: Routes = [
  {
    path: 'requirements',
    loadComponent: () =>
      import('./requirement-list/requirement-list').then((m) => m.RequirementList),
  },
  {
    path: 'requirements/new',
    loadComponent: () =>
      import('./requirement-form/requirement-form').then((m) => m.RequirementForm),
  },
  {
    path: 'requirements/:id/edit',
    loadComponent: () =>
      import('./requirement-form/requirement-form').then((m) => m.RequirementForm),
  },
  {
    path: 'requirements/:id',
    loadComponent: () =>
      import('./requirement-detail/requirement-detail').then((m) => m.RequirementDetail),
  },
  {
    path: 'deals',
    loadComponent: () =>
      import('./business-deals/business-deals').then((m) => m.BusinessDeals),
  },
  { path: '', redirectTo: 'requirements', pathMatch: 'full' },
];
