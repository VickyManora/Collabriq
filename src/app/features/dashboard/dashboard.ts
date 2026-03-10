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

  // Business
  activeRequirements = signal(0);
  totalRequirements = signal(0);
  activeDeals = signal(0);
  businessPendingApps = signal(0);
  businessRecentApps = signal<RecentApplication[]>([]);
  businessActivity = signal<ActivityItem[]>([]);
  businessCompletedDeals = signal(0);
  businessAvgRating = signal(0);
  businessTotalRatings = signal(0);

  // Creator
  openRequirements = signal(0);
  pendingApplications = signal(0);
  creatorActiveDeals = signal(0);
  creatorTotalApplications = signal(0);
  creatorCompletedDeals = signal(0);
  creatorAvgRating = signal(0);
  creatorTotalRatings = signal(0);
  latestOpportunities = signal<RequirementWithBusiness[]>([]);
  appliedMap = signal<Map<string, AppliedInfo>>(new Map());
  recentActivity = signal<ActivityItem[]>([]);

  // Admin
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
      const [counts, dealCount, pendingApps, recentApps, activity, ratingStats] = await Promise.race([
        Promise.all([
          this.reqService.getMyRequirementCounts(),
          this.reqService.getMyDealCount(),
          this.reqService.getPendingApplicationCount(),
          this.reqService.getRecentApplications(5),
          this.reqService.getBusinessRecentActivity(5),
          this.reqService.getBusinessRatingStats(),
        ]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      this.activeRequirements.set(counts.active);
      this.totalRequirements.set(counts.total);
      this.activeDeals.set(dealCount);
      this.businessPendingApps.set(pendingApps);
      this.businessRecentApps.set(recentApps);
      this.businessActivity.set(activity);
      this.businessCompletedDeals.set(ratingStats.completedDeals);
      this.businessAvgRating.set(ratingStats.avgRating);
      this.businessTotalRatings.set(ratingStats.totalRatings);
    } catch {
      // timeout or network error
    }
    this.loading.set(false);
  }

  private async loadCreatorData() {
    this.loading.set(true);
    try {
      const [counts, recentResult, appResult, activity, perfStats] = await Promise.race([
        Promise.all([
          this.creatorService.getCreatorDashboardCounts(),
          this.creatorService.getRecentRequirements(3),
          this.creatorService.getMyApplicationsBrief(),
          this.creatorService.getRecentActivity(5),
          this.creatorService.getCreatorPerformanceStats(),
        ]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);

      this.openRequirements.set(counts.openRequirements);
      this.pendingApplications.set(counts.pendingApplications);
      this.creatorActiveDeals.set(counts.activeDeals);
      this.creatorTotalApplications.set(perfStats.totalApplications);
      this.creatorCompletedDeals.set(perfStats.completedDeals);
      this.creatorAvgRating.set(perfStats.avgRating);
      this.creatorTotalRatings.set(perfStats.totalRatings);

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
    const real = req.applications?.[0]?.count ?? 0;
    if (real > 0) return real;
    const id = req.id ?? '';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 5) + 1;
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

  isPaid(req: RequirementWithBusiness): boolean {
    const d = req.compensation_details ?? '';
    return /₹|\$|rs\.?\s?\d|inr|paid|payment|\d+[,.]?\d*\s*(per|\/)|^\d[\d,. ]*$/i.test(d.trim());
  }

  formatCompensation(details: string): string {
    const trimmed = details.trim();
    if (/^\d[\d,. ]*$/.test(trimmed)) return `₹${trimmed}`;
    if (/^rs\.?\s*\d/i.test(trimmed)) return trimmed.replace(/^rs\.?\s*/i, '₹');
    return trimmed;
  }

  formatBarter(details: string): string {
    const d = details.toLowerCase().trim();
    if (/free\s*meal|complimentary\s*meal|dinner|lunch|breakfast/i.test(d)) return 'Free meal';
    if (/free\s*product|sample|hamper|goodies|gift/i.test(d)) return 'Free product';
    if (/exchange|barter/i.test(d)) return 'Barter exchange';
    return details.trim();
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
