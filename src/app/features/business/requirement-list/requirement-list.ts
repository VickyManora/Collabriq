import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { DatePipe } from '@angular/common';
import { RequirementService, RequirementWithApps } from '../../../core/services/requirement.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PendingBanner } from '../../../shared/pending-banner/pending-banner';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
import { CategoryClassPipe } from '../../../shared/pipes/category-class.pipe';
import { RequirementStatus } from '../../../core/models/requirement.model';

type FilterTab = 'all' | RequirementStatus;

interface SummaryStats {
  totalRequirements: number;
  totalApplications: number;
  pendingApprovals: number;
  completedDeals: number;
  avgRating: number;
  totalRatings: number;
}

@Component({
  selector: 'app-requirement-list',
  templateUrl: './requirement-list.html',
  styleUrl: './requirement-list.scss',
  imports: [DatePipe, ClosesInPipe, CategoryClassPipe, PendingBanner],
})
export class RequirementList implements OnInit, OnDestroy {
  requirements = signal<RequirementWithApps[]>([]);
  pendingCounts = signal<Map<string, number>>(new Map());

  private routerSub?: Subscription;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') this.loadRequirements();
  };
  activeFilter = signal<FilterTab>('all');
  loading = signal(true);
  actionLoading = signal(false);
  stats = signal<SummaryStats | null>(null);

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Pending', value: 'pending_approval' },
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' },
  ];

  /** Filtered + sorted by urgency: cards needing action first */
  filtered = computed(() => {
    const f = this.activeFilter();
    const reqs = this.requirements();
    const pending = this.pendingCounts();

    let list: RequirementWithApps[];
    if (f === 'all') list = [...reqs];
    else if (f === 'open') list = reqs.filter((r) => r.status === 'open' || r.status === 'partially_filled');
    else list = reqs.filter((r) => r.status === f);

    // Sort: pending approvals first, then by pending app count desc, then by date
    return list.sort((a, b) => {
      const aPending = pending.get(a.id) || 0;
      const bPending = pending.get(b.id) || 0;
      const aActive = this.isActive(a) ? 1 : 0;
      const bActive = this.isActive(b) ? 1 : 0;

      // Active cards with pending apps first
      if (aActive !== bActive) return bActive - aActive;
      if (aPending !== bPending) return bPending - aPending;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  });

  /** Total pending approvals across all requirements */
  totalPendingApprovals = computed(() => {
    let total = 0;
    for (const count of this.pendingCounts().values()) total += count;
    return total;
  });

  /** Count for each tab */
  tabCount = computed(() => {
    const reqs = this.requirements();
    const counts: Record<string, number> = { all: reqs.length };
    for (const req of reqs) {
      if (req.status === 'open' || req.status === 'partially_filled') {
        counts['open'] = (counts['open'] || 0) + 1;
      } else {
        counts[req.status] = (counts[req.status] || 0) + 1;
      }
    }
    return counts;
  });

  constructor(
    private reqService: RequirementService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
  ) {}

  get isPending(): boolean {
    return this.auth.isPending();
  }

  ngOnInit() {
    this.loadRequirements();
    this.loadStats();

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => { this.loadRequirements(); this.loadStats(); });
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  async loadRequirements() {
    this.loading.set(true);
    try {
      const { data, error } = await Promise.race([
        this.reqService.getMyRequirements(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      if (data && !error) {
        this.requirements.set(data);
        this.loadPendingCounts();
      } else if (error) {
        this.toast.error('Failed to load requirements.');
      }
    } catch {
      // timeout or network error
    }
    this.loading.set(false);
  }

  private async loadPendingCounts() {
    const counts = await this.reqService.getPendingApplicationCountsByRequirement();
    this.pendingCounts.set(counts);
  }

  private async loadStats() {
    const userId = this.auth.profile()?.id;
    if (!userId) return;

    const [reqCounts, dealCount, ratingsResult, pendingCounts] = await Promise.all([
      this.reqService.getMyRequirementCounts(),
      this.reqService.getMyDealCount(),
      this.reqService.getBusinessRatingStats(),
      this.reqService.getPendingApplicationCountsByRequirement(),
    ]);

    const totalApps = this.requirements().reduce((sum, r) => sum + this.applicationsCount(r), 0);

    let totalPending = 0;
    for (const count of pendingCounts.values()) totalPending += count;

    this.stats.set({
      totalRequirements: reqCounts.total,
      totalApplications: totalApps,
      pendingApprovals: totalPending,
      completedDeals: ratingsResult.completedDeals,
      avgRating: ratingsResult.avgRating,
      totalRatings: ratingsResult.totalRatings,
    });
  }

  setFilter(tab: FilterTab) {
    this.activeFilter.set(tab);
  }

  viewDetail(id: string) {
    this.router.navigate(['/business/requirements', id]);
  }

  editRequirement(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.router.navigate(['/business/requirements', id, 'edit']);
  }

  reviewApplications(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.router.navigate(['/business/requirements', id]);
  }

  async closeRequirement(event: MouseEvent, req: RequirementWithApps) {
    event.stopPropagation();
    this.actionLoading.set(true);
    const { error } = await this.reqService.cancelRequirement(req.id);
    if (error) {
      this.toast.error('Failed to close requirement.');
    } else {
      this.toast.success('Requirement closed.');
      await this.loadRequirements();
    }
    this.actionLoading.set(false);
  }

  createNew() {
    this.router.navigate(['/business/requirements/new']);
  }

  applicationsCount(req: RequirementWithApps): number {
    return req.applications?.[0]?.count ?? 0;
  }

  pendingCount(req: RequirementWithApps): number {
    return this.pendingCounts().get(req.id) || 0;
  }

  needsAction(req: RequirementWithApps): boolean {
    return this.isActive(req) && this.pendingCount(req) > 0;
  }

  slotsPercent(req: RequirementWithApps): number {
    if (req.creator_slots === 0) return 0;
    return Math.round((req.filled_slots / req.creator_slots) * 100);
  }

  isFilled(req: RequirementWithApps): boolean {
    return req.filled_slots >= req.creator_slots;
  }

  isClosingSoon(req: RequirementWithApps): boolean {
    if (!req.closes_at) return false;
    return new Date(req.closes_at).getTime() - Date.now() < 48 * 60 * 60 * 1000;
  }

  isDraft(req: RequirementWithApps): boolean {
    return req.status === 'draft';
  }

  isActive(req: RequirementWithApps): boolean {
    return req.status === 'open' || req.status === 'partially_filled';
  }

  canEdit(req: RequirementWithApps): boolean {
    return req.status === 'draft';
  }

  canClose(req: RequirementWithApps): boolean {
    return req.status === 'open' || req.status === 'partially_filled';
  }

  statusLabel(status: RequirementStatus): string {
    const labels: Record<RequirementStatus, string> = {
      draft: 'Draft',
      pending_approval: 'Pending Approval',
      open: 'Open',
      partially_filled: 'Partially Filled',
      closed: 'Closed',
      cancelled: 'Cancelled',
    };
    return labels[status];
  }

  scrollToFirstActionCard() {
    const el = document.querySelector('.req-card--action');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
