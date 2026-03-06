import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RequirementService } from '../../core/services/requirement.service';
import { CreatorService, RequirementWithBusiness } from '../../core/services/creator.service';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { ClosesInPipe } from '../../shared/pipes/closes-in.pipe';
import { CategoryClassPipe } from '../../shared/pipes/category-class.pipe';
import { PendingBanner } from '../../shared/pending-banner/pending-banner';
import { InstagramLink } from '../../shared/instagram-link/instagram-link';

interface AppliedInfo {
  status: string;
  created_at: string;
}

interface ActivityItem {
  message: string;
  timestamp: string;
  icon: string;
}

interface RecentApplication {
  id: string;
  created_at: string;
  creator: { full_name: string };
  requirement: { title: string };
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  imports: [TitleCasePipe, RouterLink, ClosesInPipe, CategoryClassPipe, PendingBanner, InstagramLink],
})
export class Dashboard implements OnInit, OnDestroy {
  loading = signal(true);

  private routerSub?: Subscription;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') this.loadData();
  };
  activeRequirements = signal(0);
  activeDeals = signal(0);
  businessPendingApps = signal(0);
  businessRecentApps = signal<RecentApplication[]>([]);
  businessActivity = signal<ActivityItem[]>([]);

  // Creator counts
  openRequirements = signal(0);
  pendingApplications = signal(0);
  creatorActiveDeals = signal(0);
  latestOpportunities = signal<RequirementWithBusiness[]>([]);
  appliedMap = signal<Map<string, AppliedInfo>>(new Map());
  recentActivity = signal<ActivityItem[]>([]);

  // Admin counts
  pendingUsers = signal(0);
  pendingRequirements = signal(0);
  adminActiveDeals = signal(0);

  constructor(
    protected auth: AuthService,
    private reqService: RequirementService,
    private creatorService: CreatorService,
    private adminService: AdminService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadData();

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.loadData());
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  loadData() {
    if (this.auth.userRole() === 'business') {
      this.loadBusinessData();
    } else if (this.auth.userRole() === 'creator') {
      this.loadCreatorData();
    } else if (this.auth.userRole() === 'admin') {
      this.loadAdminData();
    }
  }

  private async loadBusinessData() {
    this.loading.set(true);
    try {
      const [counts, dealCount, pendingApps, recentApps, activity] = await Promise.race([
        Promise.all([
          this.reqService.getMyRequirementCounts(),
          this.reqService.getMyDealCount(),
          this.reqService.getPendingApplicationCount(),
          this.reqService.getRecentApplications(5),
          this.reqService.getBusinessRecentActivity(5),
        ]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      this.activeRequirements.set(counts.active);
      this.activeDeals.set(dealCount);
      this.businessPendingApps.set(pendingApps);
      this.businessRecentApps.set(recentApps);
      this.businessActivity.set(activity);
    } catch {
      // timeout or network error
    }
    this.loading.set(false);
  }

  private async loadCreatorData() {
    this.loading.set(true);
    try {
      const [counts, recentResult, appResult, activity] = await Promise.race([
        Promise.all([
          this.creatorService.getCreatorDashboardCounts(),
          this.creatorService.getRecentRequirements(3),
          this.creatorService.getMyApplicationsBrief(),
          this.creatorService.getRecentActivity(5),
        ]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
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

      this.recentActivity.set(activity);
    } catch {
      // timeout or network error
    }
    this.loading.set(false);
  }

  private async loadAdminData() {
    this.loading.set(true);
    try {
      const counts = await Promise.race([
        this.adminService.getDashboardCounts(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      this.pendingUsers.set(counts.pendingUsers);
      this.pendingRequirements.set(counts.pendingRequirements);
      this.adminActiveDeals.set(counts.activeDeals);
    } catch {
      // timeout or network error
    }
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
    return this.businessName(req).replace(/^@/, '').charAt(0).toUpperCase();
  }

  applicationsCount(req: RequirementWithBusiness): number {
    return req.applications?.[0]?.count ?? 0;
  }

  businessHandle(req: RequirementWithBusiness): string | null {
    return req.business?.instagram_handle?.replace(/^@/, '') || null;
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

  viewBusiness(event: MouseEvent, businessId: string) {
    event.stopPropagation();
    this.router.navigate(['/creator/business', businessId]);
  }

  timeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
