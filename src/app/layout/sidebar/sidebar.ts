import { Component, input, output } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { filter } from 'rxjs';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  isOpen = input(false);
  linkClicked = output<void>();

  private currentUrl = '';
  private fromParam = '';

  constructor(
    protected auth: AuthService,
    private router: Router,
  ) {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentUrl = e.urlAfterRedirects.split('?')[0];
      this.fromParam = new URLSearchParams(e.urlAfterRedirects.split('?')[1] || '').get('from') || '';
    });
  }

  onLinkClick() {
    this.linkClicked.emit();
  }

  isActive(path: string): boolean {
    // If we're on a detail page (browse/:id or business/:id) with a `from` param, highlight that source tab
    if (this.fromParam) {
      const fromPath = `/creator/${this.fromParam}`;
      if (path === fromPath) return true;
      // Don't highlight browse when `from` points elsewhere
      if (this.currentUrl.startsWith('/creator/browse/') || this.currentUrl.startsWith('/creator/business/')) {
        return false;
      }
    }

    if (path === '/dashboard') {
      return this.currentUrl === '/dashboard';
    }
    return this.currentUrl.startsWith(path);
  }

  get navItems(): NavItem[] {
    const role = this.auth.userRole();

    switch (role) {
      case 'business':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
          { label: 'My Requirements', path: '/business/requirements', icon: 'requirements' },
          { label: 'My Deals', path: '/business/deals', icon: 'deals' },
        ];
      case 'creator':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
          { label: 'Browse Requirements', path: '/creator/browse', icon: 'browse' },
          { label: 'Saved', path: '/creator/saved', icon: 'saved' },
          { label: 'My Applications', path: '/creator/applications', icon: 'applications' },
          { label: 'My Deals', path: '/creator/deals', icon: 'deals' },
        ];
      case 'admin':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
          { label: 'User Approvals', path: '/admin/users', icon: 'users' },
          { label: 'Requirement Approvals', path: '/admin/requirements', icon: 'requirements' },
          { label: 'Deals', path: '/admin/deals', icon: 'deals' },
        ];
      default:
        return [{ label: 'Dashboard', path: '/dashboard', icon: 'dashboard' }];
    }
  }
}
