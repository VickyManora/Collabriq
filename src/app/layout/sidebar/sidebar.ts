import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  isOpen = input(false);
  linkClicked = output<void>();

  constructor(protected auth: AuthService) {}

  onLinkClick() {
    this.linkClicked.emit();
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
