import { Component } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-pending-approval',
  templateUrl: './pending-approval.html',
  styleUrl: './pending-approval.scss',
  imports: [TitleCasePipe],
})
export class PendingApproval {
  constructor(
    protected auth: AuthService,
    private router: Router,
  ) {}

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  onLogout() {
    this.auth.signOut();
  }
}
