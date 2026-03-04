import { Component, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService, DealWithDetails } from '../../../core/services/creator.service';
import { DealStatus } from '../../../core/models/deal.model';
import { Rating } from '../../../core/models/rating.model';

type FilterTab = 'all' | DealStatus;

@Component({
  selector: 'app-my-deals',
  templateUrl: './my-deals.html',
  styleUrl: './my-deals.scss',
  imports: [DatePipe, FormsModule],
})
export class MyDeals implements OnInit {
  deals = signal<DealWithDetails[]>([]);
  ratings = signal<Map<string, Rating>>(new Map());
  activeFilter = signal<FilterTab>('all');
  loading = signal(true);
  actionLoading = signal(false);
  ratingDealId = signal<string | null>(null);
  ratingStars = 0;

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  readonly starOptions = [1, 2, 3, 4, 5];

  filtered = computed(() => {
    const filter = this.activeFilter();
    const d = this.deals();
    if (filter === 'all') return d;
    if (filter === 'active') {
      return d.filter((deal) => deal.status === 'active' || deal.status === 'creator_marked_done');
    }
    return d.filter((deal) => deal.status === filter);
  });

  constructor(private creatorService: CreatorService) {}

  ngOnInit() {
    this.loadDeals();
  }

  async loadDeals() {
    this.loading.set(true);
    const { data, error } = await this.creatorService.getMyDeals();
    if (data && !error) {
      this.deals.set(data);
      await this.loadRatings(data);
    }
    this.loading.set(false);
  }

  private async loadRatings(deals: DealWithDetails[]) {
    const completedDeals = deals.filter((d) => d.status === 'completed');
    const ratingsMap = new Map<string, Rating>();

    for (const deal of completedDeals) {
      const { data } = await this.creatorService.getMyRatingForDeal(deal.id);
      if (data) {
        ratingsMap.set(deal.id, data);
      }
    }
    this.ratings.set(ratingsMap);
  }

  setFilter(tab: FilterTab) {
    this.activeFilter.set(tab);
  }

  businessDisplayName(deal: DealWithDetails): string {
    return deal.business?.business_name || deal.business?.full_name || 'Unknown';
  }

  canMarkDone(deal: DealWithDetails): boolean {
    return deal.status === 'active' && !deal.creator_marked_done;
  }

  canRate(deal: DealWithDetails): boolean {
    return deal.status === 'completed' && !this.ratings().has(deal.id);
  }

  hasRated(dealId: string): boolean {
    return this.ratings().has(dealId);
  }

  getRating(dealId: string): number {
    return this.ratings().get(dealId)?.stars ?? 0;
  }

  async markDone(dealId: string) {
    this.actionLoading.set(true);
    const { error } = await this.creatorService.markDealDone(dealId);
    if (!error) {
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

  async submitRating(deal: DealWithDetails) {
    if (this.ratingStars < 1 || this.ratingStars > 5) return;
    this.actionLoading.set(true);
    const { data, error } = await this.creatorService.rateBusiness(
      deal.id,
      deal.business_id,
      this.ratingStars,
    );
    if (!error && data) {
      const updated = new Map(this.ratings());
      updated.set(deal.id, data);
      this.ratings.set(updated);
      this.ratingDealId.set(null);
      this.ratingStars = 0;
    }
    this.actionLoading.set(false);
  }

  statusLabel(status: DealStatus): string {
    const labels: Record<DealStatus, string> = {
      active: 'Active',
      creator_marked_done: 'Marked Done',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status];
  }
}
