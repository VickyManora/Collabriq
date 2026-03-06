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
    path: 'saved',
    loadComponent: () =>
      import('./saved-opportunities/saved-opportunities').then((m) => m.SavedOpportunities),
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
  {
    path: 'business/:id',
    loadComponent: () =>
      import('./business-profile/business-profile').then((m) => m.BusinessProfileComponent),
  },
  { path: '', redirectTo: 'browse', pathMatch: 'full' },
];
