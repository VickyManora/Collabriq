import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-pending-approval',
  templateUrl: './pending-approval.html',
  styleUrl: './pending-approval.scss',
})
export class PendingApproval {
  checking = signal(false);

  constructor(
    protected auth: AuthService,
    private router: Router,
  ) {}

  async checkStatus() {
    this.checking.set(true);
    await this.auth.refreshProfile();
    this.checking.set(false);

    if (this.auth.isApproved()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLogout() {
    this.auth.signOut();
  }
}
