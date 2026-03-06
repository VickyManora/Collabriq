import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AdminService, DealWithDetails } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { DealStatus } from '../../../core/models/deal.model';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { Pagination } from '../../../shared/pagination/pagination';

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

@Component({
  selector: 'app-deal-monitor',
  templateUrl: './deal-monitor.html',
  styleUrl: './deal-monitor.scss',
  imports: [DatePipe, TitleCasePipe, FormsModule, ConfirmDialog, Pagination],
})
export class DealMonitor implements OnInit, OnDestroy {
  deals = signal<DealWithDetails[]>([]);

  private routerSub?: Subscription;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') this.loadDeals();
  };
  activeFilter = signal<FilterTab>('all');
  searchQuery = signal('');
  currentPage = signal(1);
  loading = signal(true);
  actionLoading = signal<string | null>(null);
  confirmAction = signal<string | null>(null);

  readonly pageSize = 10;

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

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
          deal.creator.full_name.toLowerCase().includes(query) ||
          (deal.business?.business_name?.toLowerCase().includes(query) ?? false) ||
          (deal.business?.full_name?.toLowerCase().includes(query) ?? false),
      );
    }
    return d;
  });

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor(
    private adminService: AdminService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

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
        this.adminService.getAllDeals(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      if (data && !error) {
        this.deals.set(data);
      } else if (error) {
        this.toast.error('Failed to load deals.');
      }
    } catch {
      // timeout or network error
    }
    this.loading.set(false);
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

  canCancel(deal: DealWithDetails): boolean {
    return deal.status === 'active' || deal.status === 'creator_marked_done';
  }

  promptCancelDeal(dealId: string) {
    this.confirmAction.set(dealId);
  }

  async onConfirmCancel() {
    const dealId = this.confirmAction();
    this.confirmAction.set(null);
    if (!dealId) return;
    this.actionLoading.set(dealId);
    const { error } = await this.adminService.cancelDeal(dealId);
    if (error) {
      this.toast.error('Failed to cancel deal.');
    } else {
      this.toast.success('Deal cancelled.');
      await this.loadDeals();
    }
    this.actionLoading.set(null);
  }

  onCancelConfirm() {
    this.confirmAction.set(null);
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
