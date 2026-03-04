import { Component, OnInit, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequirementService, BusinessDealWithDetails } from '../../../core/services/requirement.service';
import { ToastService } from '../../../core/services/toast.service';
import { DealStatus } from '../../../core/models/deal.model';
import { Rating } from '../../../core/models/rating.model';
import { Pagination } from '../../../shared/pagination/pagination';

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

@Component({
  selector: 'app-business-deals',
  templateUrl: './business-deals.html',
  styleUrl: './business-deals.scss',
  imports: [DatePipe, DecimalPipe, FormsModule, Pagination],
})
export class BusinessDeals implements OnInit {
  deals = signal<BusinessDealWithDetails[]>([]);
  ratings = signal<Map<string, Rating>>(new Map());
  avgRatings = signal<Map<string, { avg: number; count: number }>>(new Map());
  activeFilter = signal<FilterTab>('all');
  searchQuery = signal('');
  currentPage = signal(1);
  loading = signal(true);
  actionLoading = signal(false);
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
        (deal) => deal.creator.full_name.toLowerCase().includes(query),
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
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadDeals();
  }

  async loadDeals() {
    this.loading.set(true);
    const { data, error } = await this.reqService.getMyDeals();
    if (data && !error) {
      this.deals.set(data);
      await this.loadRatings(data);
      await this.loadAverageRatings(data);
    } else if (error) {
      this.toast.error('Failed to load deals.');
    }
    this.loading.set(false);
  }

  private async loadRatings(deals: BusinessDealWithDetails[]) {
    const completedDeals = deals.filter((d) => d.status === 'completed');
    const ratingsMap = new Map<string, Rating>();

    for (const deal of completedDeals) {
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

  canMarkDone(deal: BusinessDealWithDetails): boolean {
    return (deal.status === 'active' || deal.status === 'creator_marked_done') && !deal.business_marked_done;
  }

  canRate(deal: BusinessDealWithDetails): boolean {
    return deal.status === 'completed' && !this.ratings().has(deal.id);
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

  async markDone(dealId: string) {
    this.actionLoading.set(true);
    const { error } = await this.reqService.markDealDone(dealId);
    if (error) {
      this.toast.error('Failed to mark deal as done.');
    } else {
      this.toast.success('Deal marked as done.');
      await this.loadDeals();
    }
    this.actionLoading.set(false);
  }

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
    const { data, error } = await this.reqService.rateCreator(
      deal.id,
      deal.creator_id,
      this.ratingStars,
    );
    if (error) {
      this.toast.error('Failed to submit rating.');
    } else if (data) {
      this.toast.success('Rating submitted!');
      const updated = new Map(this.ratings());
      updated.set(deal.id, data);
      this.ratings.set(updated);
      this.ratingDealId.set(null);
      this.ratingStars = 0;
      await this.loadAverageRatings(this.deals());
    }
    this.actionLoading.set(false);
  }

  statusLabel(status: DealStatus): string {
    const labels: Record<DealStatus, string> = {
      active: 'Active',
      creator_marked_done: 'Creator Done',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status];
  }
}
