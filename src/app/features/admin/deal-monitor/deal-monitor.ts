import { Component, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, DealWithDetails } from '../../../core/services/admin.service';
import { DealStatus } from '../../../core/models/deal.model';

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

@Component({
  selector: 'app-deal-monitor',
  templateUrl: './deal-monitor.html',
  styleUrl: './deal-monitor.scss',
  imports: [DatePipe],
})
export class DealMonitor implements OnInit {
  deals = signal<DealWithDetails[]>([]);
  activeFilter = signal<FilterTab>('all');
  loading = signal(true);
  actionLoading = signal<string | null>(null);

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  filtered = computed(() => {
    const filter = this.activeFilter();
    const d = this.deals();
    if (filter === 'all') return d;
    if (filter === 'active') {
      return d.filter((deal) => deal.status === 'active' || deal.status === 'creator_marked_done');
    }
    return d.filter((deal) => deal.status === filter);
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadDeals();
  }

  async loadDeals() {
    this.loading.set(true);
    const { data, error } = await this.adminService.getAllDeals();
    if (data && !error) {
      this.deals.set(data);
    }
    this.loading.set(false);
  }

  setFilter(tab: FilterTab) {
    this.activeFilter.set(tab);
  }

  businessDisplayName(deal: DealWithDetails): string {
    return deal.business?.business_name || deal.business?.full_name || 'Unknown';
  }

  canCancel(deal: DealWithDetails): boolean {
    return deal.status === 'active' || deal.status === 'creator_marked_done';
  }

  async cancelDeal(dealId: string) {
    this.actionLoading.set(dealId);
    const { error } = await this.adminService.cancelDeal(dealId);
    if (!error) {
      await this.loadDeals();
    }
    this.actionLoading.set(null);
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
