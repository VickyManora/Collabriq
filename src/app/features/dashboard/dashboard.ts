import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RequirementService } from '../../core/services/requirement.service';
import { CreatorService } from '../../core/services/creator.service';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  imports: [RouterLink],
})
export class Dashboard implements OnInit {
  activeRequirements = signal(0);
  activeDeals = signal(0);

  // Creator counts
  openRequirements = signal(0);
  pendingApplications = signal(0);
  creatorActiveDeals = signal(0);

  // Admin counts
  pendingUsers = signal(0);
  pendingRequirements = signal(0);
  adminActiveDeals = signal(0);

  constructor(
    protected auth: AuthService,
    private reqService: RequirementService,
    private creatorService: CreatorService,
    private adminService: AdminService,
  ) {}

  ngOnInit() {
    if (this.auth.userRole() === 'business') {
      this.loadBusinessCounts();
    } else if (this.auth.userRole() === 'creator') {
      this.loadCreatorCounts();
    } else if (this.auth.userRole() === 'admin') {
      this.loadAdminCounts();
    }
  }

  private async loadBusinessCounts() {
    const counts = await this.reqService.getMyRequirementCounts();
    this.activeRequirements.set(counts.active);

    const dealCount = await this.reqService.getMyDealCount();
    this.activeDeals.set(dealCount);
  }

  private async loadCreatorCounts() {
    const counts = await this.creatorService.getCreatorDashboardCounts();
    this.openRequirements.set(counts.openRequirements);
    this.pendingApplications.set(counts.pendingApplications);
    this.creatorActiveDeals.set(counts.activeDeals);
  }

  private async loadAdminCounts() {
    const counts = await this.adminService.getDashboardCounts();
    this.pendingUsers.set(counts.pendingUsers);
    this.pendingRequirements.set(counts.pendingRequirements);
    this.adminActiveDeals.set(counts.activeDeals);
  }
}
