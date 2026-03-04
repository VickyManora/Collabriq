import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  isOpen = input(false);

  constructor(protected auth: AuthService) {}

  get navItems(): NavItem[] {
    const role = this.auth.userRole();

    switch (role) {
      case 'business':
        return [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'My Requirements', path: '/business/requirements' },
          { label: 'My Deals', path: '/business/deals' },
        ];
      case 'creator':
        return [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Browse Requirements', path: '/creator/browse' },
          { label: 'My Applications', path: '/creator/applications' },
          { label: 'My Deals', path: '/creator/deals' },
        ];
      case 'admin':
        return [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'User Approvals', path: '/admin/users' },
          { label: 'Requirement Approvals', path: '/admin/requirements' },
          { label: 'Deals', path: '/admin/deals' },
        ];
      default:
        return [{ label: 'Dashboard', path: '/dashboard' }];
    }
  }
}
