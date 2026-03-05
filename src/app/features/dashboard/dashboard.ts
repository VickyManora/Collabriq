import { Component, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RequirementService } from '../../core/services/requirement.service';
import { CreatorService, RequirementWithBusiness } from '../../core/services/creator.service';
import { AdminService } from '../../core/services/admin.service';
import { ClosesInPipe } from '../../shared/pipes/closes-in.pipe';

interface AppliedInfo {
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  imports: [TitleCasePipe, RouterLink, ClosesInPipe],
})
export class Dashboard implements OnInit {
  loading = signal(true);
  activeRequirements = signal(0);
  activeDeals = signal(0);

  // Creator counts
  openRequirements = signal(0);
  pendingApplications = signal(0);
  creatorActiveDeals = signal(0);
  latestOpportunities = signal<RequirementWithBusiness[]>([]);
  appliedMap = signal<Map<string, AppliedInfo>>(new Map());

  // Admin counts
  pendingUsers = signal(0);
  pendingRequirements = signal(0);
  adminActiveDeals = signal(0);

  constructor(
    protected auth: AuthService,
    private reqService: RequirementService,
    private creatorService: CreatorService,
    private adminService: AdminService,
    private router: Router,
  ) {}

  ngOnInit() {
    if (this.auth.userRole() === 'business') {
      this.loadBusinessData();
    } else if (this.auth.userRole() === 'creator') {
      this.loadCreatorData();
    } else if (this.auth.userRole() === 'admin') {
      this.loadAdminData();
    }
  }

  private async loadBusinessData() {
    const [counts, dealCount] = await Promise.all([
      this.reqService.getMyRequirementCounts(),
      this.reqService.getMyDealCount(),
    ]);
    this.activeRequirements.set(counts.active);
    this.activeDeals.set(dealCount);
    this.loading.set(false);
  }

  private async loadCreatorData() {
    const [counts, recentResult, appResult] = await Promise.all([
      this.creatorService.getCreatorDashboardCounts(),
      this.creatorService.getRecentRequirements(3),
      this.creatorService.getMyApplicationsBrief(),
    ]);

    this.openRequirements.set(counts.openRequirements);
    this.pendingApplications.set(counts.pendingApplications);
    this.creatorActiveDeals.set(counts.activeDeals);

    if (recentResult.data && !recentResult.error) {
      this.latestOpportunities.set(recentResult.data);
    }

    if (appResult.data && !appResult.error) {
      const map = new Map<string, AppliedInfo>();
      for (const app of appResult.data) {
        map.set(app.requirement_id, { status: app.status, created_at: app.created_at });
      }
      this.appliedMap.set(map);
    }

    this.loading.set(false);
  }

  private async loadAdminData() {
    const counts = await this.adminService.getDashboardCounts();
    this.pendingUsers.set(counts.pendingUsers);
    this.pendingRequirements.set(counts.pendingRequirements);
    this.adminActiveDeals.set(counts.activeDeals);
    this.loading.set(false);
  }

  spotsLeft(req: RequirementWithBusiness): string {
    const remaining = req.creator_slots - req.filled_slots;
    return remaining === 1 ? '1 spot left' : `${remaining} spots left`;
  }

  businessName(req: RequirementWithBusiness): string {
    return req.business?.business_name || req.business?.full_name || 'Unknown';
  }

  businessInitial(req: RequirementWithBusiness): string {
    return this.businessName(req).charAt(0).toUpperCase();
  }

  businessHandle(req: RequirementWithBusiness): string | null {
    return req.business?.instagram_handle || null;
  }

  isNew(req: RequirementWithBusiness): boolean {
    return Date.now() - new Date(req.created_at).getTime() < 48 * 60 * 60 * 1000;
  }

  isClosingSoon(req: RequirementWithBusiness): boolean {
    if (!req.closes_at) return false;
    return new Date(req.closes_at).getTime() - Date.now() < 48 * 60 * 60 * 1000;
  }

  hasApplied(requirementId: string): boolean {
    return this.appliedMap().has(requirementId);
  }

  viewRequirement(id: string) {
    this.router.navigate(['/creator/browse', id]);
  }
}
