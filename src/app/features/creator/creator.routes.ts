import { Routes } from '@angular/router';

export const CREATOR_ROUTES: Routes = [
  {
    path: 'browse',
    loadComponent: () =>
      import('./browse-requirements/browse-requirements').then((m) => m.BrowseRequirements),
  },
  {
    path: 'browse/:id',
    loadComponent: () =>
      import('./requirement-view/requirement-view').then((m) => m.RequirementView),
  },
  {
    path: 'applications',
    loadComponent: () =>
      import('./my-applications/my-applications').then((m) => m.MyApplications),
  },
  {
    path: 'deals',
    loadComponent: () =>
      import('./my-deals/my-deals').then((m) => m.MyDeals),
  },
  { path: '', redirectTo: 'browse', pathMatch: 'full' },
];
