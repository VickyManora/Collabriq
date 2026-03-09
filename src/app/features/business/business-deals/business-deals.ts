import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { RequirementService, BusinessDealWithDetails } from '../../../core/services/requirement.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PendingBanner } from '../../../shared/pending-banner/pending-banner';
import { DealStatus } from '../../../core/models/deal.model';
import { Rating } from '../../../core/models/rating.model';
import { Pagination } from '../../../shared/pagination/pagination';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

@Component({
  selector: 'app-business-deals',
  templateUrl: './business-deals.html',
  styleUrl: './business-deals.scss',
  imports: [DatePipe, DecimalPipe, TitleCasePipe, FormsModule, Pagination, InstagramLink, PendingBanner],
})
export class BusinessDeals implements OnInit, OnDestroy {
  deals = signal<BusinessDealWithDetails[]>([]);

  private routerSub?: Subscription;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') this.loadDeals();
  };
  ratings = signal<Map<string, Rating>>(new Map());
  avgRatings = signal<Map<string, { avg: number; count: number }>>(new Map());
  activeFilter = signal<FilterTab>('all');
  searchQuery = signal('');
  currentPage = signal(1);
  loading = signal(true);
  actionLoading = signal(false);

  // Rating form (on completed deals)
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
        (deal) => deal.creator?.full_name?.toLowerCase().includes(query),
      );
    }
    return d;
  });

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor(
    private reqService: RequirementService,
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
        this.reqService.getMyDeals(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      if (data && !error) {
        this.deals.set(data);
        await this.loadRatings(data);
        await this.loadAverageRatings(data);
      } else if (error) {
        this.toast.error('Failed to load deals.');
      }
    } catch {
      // timeout or network error
    }
    this.loading.set(false);
  }

  private async loadRatings(deals: BusinessDealWithDetails[]) {
    const ratedDeals = deals.filter((d) => d.status === 'completed' || d.status === 'creator_marked_done');
    const ratingsMap = new Map<string, Rating>();

    for (const deal of ratedDeals) {
      const { data } = await this.reqService.getMyRatingForDeal(deal.id);
      if (data) {
        ratingsMap.set(deal.id, data);
      }
    }
    this.ratings.set(ratingsMap);
  }

  private async loadAverageRatings(deals: BusinessDealWithDetails[]) {
    const creatorIds = [...new Set(deals.map((d) => d.creator_id))];
    const avgMap = new Map<string, { avg: number; count: number }>();

    for (const id of creatorIds) {
      const result = await this.reqService.getCreatorAverageRating(id);
      if (result.count > 0) {
        avgMap.set(id, result);
      }
    }
    this.avgRatings.set(avgMap);
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  setFilter(tab: FilterTab) {
    this.activeFilter.set(tab);
    this.currentPage.set(1);
  }

  /** Business can approve deal when creator has submitted content */
  canApproveDeal(deal: BusinessDealWithDetails): boolean {
    return deal.status === 'creator_marked_done' && !deal.business_marked_done;
  }

  /** Deal is active but creator hasn't submitted content yet */
  isWaitingForCreator(deal: BusinessDealWithDetails): boolean {
    return deal.status === 'active' && !deal.creator_marked_done;
  }

  hasRated(dealId: string): boolean {
    return this.ratings().has(dealId);
  }

  getRating(dealId: string): number {
    return this.ratings().get(dealId)?.stars ?? 0;
  }

  getAvgRating(creatorId: string): { avg: number; count: number } | undefined {
    return this.avgRatings().get(creatorId);
  }

  creatorInitial(deal: BusinessDealWithDetails): string {
    return (deal.creator?.full_name ?? 'U').charAt(0).toUpperCase();
  }

  viewCreator(creatorId: string) {
    this.router.navigate(['/business/creator', creatorId]);
  }

  // ─── Approve deal (mark business_marked_done) ───

  async approveDeal(deal: BusinessDealWithDetails) {
    if (this.isPending) {
      this.toast.error('Your account is pending approval.');
      return;
    }
    this.actionLoading.set(true);
    const { error } = await this.reqService.markDealDone(deal.id);
    if (error) {
      this.toast.error('Failed to approve deal.');
    } else {
      this.toast.success('Deal completed! Content approved.');
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

  async submitRating(deal: BusinessDealWithDetails) {
    if (this.ratingStars < 1 || this.ratingStars > 5) return;
    this.actionLoading.set(true);

    const { data: ratingData, error } = await this.reqService.rateCreator(
      deal.id,
      deal.creator_id,
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
      await this.loadAverageRatings(this.deals());
    }
    this.actionLoading.set(false);
  }

  // ─── Timeline ───

  timelineStep(deal: BusinessDealWithDetails): number {
    if (deal.status === 'completed') return 3;
    if (deal.status === 'creator_marked_done') return 1;
    if (deal.status === 'active') return 0;
    return 0;
  }

  cancellationLabel(deal: BusinessDealWithDetails): string {
    const by = deal.cancelled_by;
    if (by === 'business') return 'Cancelled by you';
    if (by === 'creator') return 'Cancelled by creator';
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
