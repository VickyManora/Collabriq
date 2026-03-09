import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { CreatorService, DealWithDetails } from '../../../core/services/creator.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PendingBanner } from '../../../shared/pending-banner/pending-banner';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';
import { DealStatus } from '../../../core/models/deal.model';
import { Rating } from '../../../core/models/rating.model';
import { Pagination } from '../../../shared/pagination/pagination';

type FilterTab = 'all' | DealStatus;

@Component({
  selector: 'app-my-deals',
  templateUrl: './my-deals.html',
  styleUrl: './my-deals.scss',
  imports: [DatePipe, FormsModule, RouterLink, Pagination, PendingBanner, InstagramLink],
})
export class MyDeals implements OnInit, OnDestroy {
  deals = signal<DealWithDetails[]>([]);

  private routerSub?: Subscription;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') this.loadDeals();
  };
  ratings = signal<Map<string, Rating>>(new Map());
  activeFilter = signal<FilterTab>('all');
  searchQuery = signal('');
  currentPage = signal(1);
  loading = signal(true);
  actionLoading = signal(false);

  // Submit content form
  submitDealId = signal<string | null>(null);
  proofUrl = '';

  // Rating form (now on completed deals)
  ratingDealId = signal<string | null>(null);
  ratingStars = 0;

  readonly pageSize = 10;

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  readonly starOptions = [1, 2, 3, 4, 5];

  // ─── Earnings summary ───

  totalEarnings = computed(() => {
    return this.deals()
      .filter((d) => d.status === 'completed' && this.isPaid(d))
      .reduce((sum, d) => sum + this.extractAmount(d.requirement?.compensation_details), 0);
  });

  completedCount = computed(() => {
    return this.deals().filter((d) => d.status === 'completed').length;
  });

  activeCount = computed(() => {
    return this.deals().filter((d) => d.status === 'active' || d.status === 'creator_marked_done').length;
  });

  avgRating = computed(() => {
    const ratingsMap = this.ratings();
    if (ratingsMap.size === 0) return 0;
    let total = 0;
    ratingsMap.forEach((r) => (total += r.stars));
    return Math.round((total / ratingsMap.size) * 10) / 10;
  });

  barterCount = computed(() => {
    return this.deals()
      .filter((d) => d.status === 'completed' && !this.isPaid(d))
      .length;
  });

  filtered = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();
    let d = this.deals();
    if (filter !== 'all') {
      if (filter === 'active') {
        d = d.filter((deal) => deal.status === 'active' || deal.status === 'creator_marked_done');
      } else {
        d = d.filter((deal) => deal.status === filter);
      }
    }
    if (query) {
      d = d.filter(
        (deal) =>
          (deal.business?.business_name?.toLowerCase().includes(query) ?? false) ||
          (deal.business?.full_name?.toLowerCase().includes(query) ?? false) ||
          (deal.requirement?.title?.toLowerCase().includes(query) ?? false),
      );
    }
    return d;
  });

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor(
    private creatorService: CreatorService,
    private auth: AuthService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  get isPending(): boolean {
    return this.auth.isPending();
  }

  ngOnInit() {
    const tab = this.route.snapshot.queryParamMap.get('tab') as FilterTab | null;
    if (tab && this.tabs.some((t) => t.value === tab)) {
      this.activeFilter.set(tab);
    }
    this.loadDeals();

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.loadDeals());
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  async loadDeals() {
    this.loading.set(true);
    try {
      const { data, error } = await Promise.race([
        this.creatorService.getMyDeals(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      if (data && !error) {
        this.deals.set(data);
        await this.loadRatings(data);
      } else if (error) {
        this.toast.error('Failed to load deals.');
      }
    } catch {
      // timeout or network error
    }
    this.loading.set(false);
  }

  private async loadRatings(deals: DealWithDetails[]) {
    const ratedDeals = deals.filter((d) => d.status === 'completed' || d.status === 'creator_marked_done');
    const ratingsMap = new Map<string, Rating>();

    for (const deal of ratedDeals) {
      const { data } = await this.creatorService.getMyRatingForDeal(deal.id);
      if (data) {
        ratingsMap.set(deal.id, data);
      }
    }
    this.ratings.set(ratingsMap);
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  setFilter(tab: FilterTab) {
    this.activeFilter.set(tab);
    this.currentPage.set(1);
  }

  businessDisplayName(deal: DealWithDetails): string {
    return deal.business?.business_name || deal.business?.full_name || 'Unknown';
  }

  businessInitial(deal: DealWithDetails): string {
    return this.businessDisplayName(deal).replace(/^@/, '').charAt(0).toUpperCase();
  }

  businessHandle(deal: DealWithDetails): string | null {
    return deal.business?.instagram_handle?.replace(/^@/, '') || null;
  }

  viewRequirement(deal: DealWithDetails) {
    if (deal.requirement_id) {
      this.router.navigate(['/creator/browse', deal.requirement_id], { queryParams: { from: 'deals' } });
    }
  }

  viewBusiness(event: MouseEvent, deal: DealWithDetails) {
    event.stopPropagation();
    if (deal.business_id) {
      this.router.navigate(['/creator/business', deal.business_id], { queryParams: { from: 'deals' } });
    }
  }

  canSubmitContent(deal: DealWithDetails): boolean {
    return deal.status === 'active' && !deal.creator_marked_done;
  }

  hasRated(dealId: string): boolean {
    return this.ratings().has(dealId);
  }

  getRating(dealId: string): number {
    return this.ratings().get(dealId)?.stars ?? 0;
  }

  // ─── Submit Content flow (no rating) ───

  openSubmitForm(dealId: string) {
    if (this.isPending) {
      this.toast.error('Your account is pending approval. This action will unlock once your account is approved.');
      return;
    }
    this.submitDealId.set(dealId);
    this.proofUrl = '';
  }

  cancelSubmit() {
    this.submitDealId.set(null);
    this.proofUrl = '';
  }

  async submitContent(deal: DealWithDetails) {
    this.actionLoading.set(true);
    const url = this.proofUrl.trim() || undefined;
    const { error } = await this.creatorService.markDealDone(deal.id, url);
    if (error) {
      this.toast.error('Failed to submit content.');
    } else {
      this.toast.success('Content submitted! Waiting for brand approval.');
      this.submitDealId.set(null);
      this.proofUrl = '';
      await this.loadDeals();
    }
    this.actionLoading.set(false);
  }

  // ─── Rating flow (on completed deals only) ───

  startRating(dealId: string) {
    this.ratingDealId.set(dealId);
    this.ratingStars = 0;
  }

  cancelRating() {
    this.ratingDealId.set(null);
    this.ratingStars = 0;
  }

  async submitRating(deal: DealWithDetails) {
    if (this.ratingStars < 1 || this.ratingStars > 5) return;
    this.actionLoading.set(true);

    const { data: ratingData, error } = await this.creatorService.rateBusiness(
      deal.id,
      deal.business_id,
      this.ratingStars,
    );
    if (error) {
      this.toast.error('Failed to submit rating.');
    } else {
      if (ratingData) {
        const updated = new Map(this.ratings());
        updated.set(deal.id, ratingData);
        this.ratings.set(updated);
      }
      this.ratingDealId.set(null);
      this.ratingStars = 0;
      this.toast.success('Rating submitted! Thank you.');
    }
    this.actionLoading.set(false);
  }

  // ─── Helpers ───

  isPaid(deal: DealWithDetails): boolean {
    const d = deal.requirement?.compensation_details ?? '';
    return /₹|\$|rs\.?\s?\d|inr|paid|payment|\d+[,.]?\d*\s*(per|\/)|^\d[\d,. ]*$/i.test(d.trim());
  }

  formatComp(deal: DealWithDetails): string {
    const d = deal.requirement?.compensation_details?.trim() ?? '';
    if (!d) return 'Barter';
    if (/^\d[\d,. ]*$/.test(d)) return `₹${d}`;
    if (/^rs\.?\s*\d/i.test(d)) return d.replace(/^rs\.?\s*/i, '₹');
    return d;
  }

  formatBarter(deal: DealWithDetails): string {
    const d = deal.requirement?.compensation_details?.toLowerCase().trim() ?? '';
    if (/free\s*meal|complimentary\s*meal|dinner|lunch|breakfast/i.test(d)) return 'Free Meal Collaboration';
    if (/free\s*product|sample|hamper|goodies|gift/i.test(d)) return 'Free Product Collaboration';
    if (/exchange|barter/i.test(d)) return 'Barter Exchange';
    return deal.requirement?.compensation_details?.trim() || 'Barter Collaboration';
  }

  private extractAmount(comp: string | null | undefined): number {
    if (!comp) return 0;
    const match = comp.replace(/,/g, '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  formatEarnings(amount: number): string {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
    return `₹${amount}`;
  }

  /** Days since deal started */
  daysSinceStart(deal: DealWithDetails): number {
    return Math.floor((Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24));
  }

  /** Show nudge if active deal is 5+ days old without content submission */
  shouldNudge(deal: DealWithDetails): boolean {
    return deal.status === 'active' && !deal.creator_marked_done && this.daysSinceStart(deal) >= 5;
  }

  nudgeMessage(deal: DealWithDetails): string {
    const days = this.daysSinceStart(deal);
    if (days >= 10) return `This deal started ${days} days ago. Submit your content to keep things moving!`;
    return `It's been ${days} days since this deal started. Ready to submit your content?`;
  }

  /** Timeline step: 0=started, 1=content submitted, 2=brand approval, 3=completed */
  timelineStep(deal: DealWithDetails): number {
    if (deal.status === 'completed') return 3;
    if (deal.status === 'creator_marked_done') return 1;
    if (deal.status === 'active' && deal.creator_marked_done) return 1;
    if (deal.status === 'active') return 0;
    return 0;
  }

  cancellationLabel(deal: DealWithDetails): string {
    const by = deal.cancelled_by;
    if (by === 'business') return 'Cancelled by business';
    if (by === 'creator') return 'Cancelled by you';
    if (by === 'admin') return 'Cancelled by admin';
    return 'Deal was cancelled';
  }

  statusLabel(status: DealStatus): string {
    const labels: Record<DealStatus, string> = {
      active: 'Active',
      creator_marked_done: 'Content Submitted',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status];
  }
}
