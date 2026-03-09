import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService, ApplicationWithRequirement } from '../../../core/services/creator.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApplicationStatus } from '../../../core/models/application.model';
import { Pagination } from '../../../shared/pagination/pagination';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';
import { CategoryClassPipe } from '../../../shared/pipes/category-class.pipe';

type FilterTab = 'all' | ApplicationStatus;
type SortOption = 'newest' | 'payment' | 'status';

@Component({
  selector: 'app-my-applications',
  templateUrl: './my-applications.html',
  styleUrl: './my-applications.scss',
  imports: [DatePipe, FormsModule, Pagination, RouterLink, InstagramLink, CategoryClassPipe],
})
export class MyApplications implements OnInit, OnDestroy {
  applications = signal<ApplicationWithRequirement[]>([]);

  private routerSub?: Subscription;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') this.loadApplications();
  };
  activeFilter = signal<FilterTab>('all');
  searchQuery = signal('');
  sortBy = signal<SortOption>('newest');
  currentPage = signal(1);
  loading = signal(true);
  actionLoading = signal(false);

  readonly pageSize = 10;

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Applied', value: 'applied' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Withdrawn', value: 'withdrawn' },
  ];

  readonly sortOptions: { label: string; value: SortOption }[] = [
    { label: 'Newest', value: 'newest' },
    { label: 'Highest Payment', value: 'payment' },
    { label: 'Status', value: 'status' },
  ];

  filtered = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();
    const sort = this.sortBy();
    let apps = this.applications();
    if (filter !== 'all') {
      apps = apps.filter((a) => a.status === filter);
    }
    if (query) {
      apps = apps.filter(
        (a) =>
          a.requirement.title.toLowerCase().includes(query) ||
          (a.requirement.category?.toLowerCase().includes(query) ?? false),
      );
    }
    if (sort === 'payment') {
      apps = [...apps].sort((a, b) => this.extractAmount(b.requirement.compensation_details) - this.extractAmount(a.requirement.compensation_details));
    } else if (sort === 'status') {
      apps = [...apps].sort((a, b) => this.sortPriority(a) - this.sortPriority(b));
    } else {
      // Default (newest): still push completed/cancelled deals to bottom
      apps = [...apps].sort((a, b) => {
        const pa = this.isDealFinished(a) ? 1 : 0;
        const pb = this.isDealFinished(b) ? 1 : 0;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    return apps;
  });

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor(
    private creatorService: CreatorService,
    private router: Router,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadApplications();

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.loadApplications());
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  async loadApplications() {
    this.loading.set(true);
    try {
      const { data, error } = await Promise.race([
        this.creatorService.getMyApplications(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      if (data && !error) {
        this.applications.set(data);
      } else if (error) {
        this.toast.error('Failed to load applications.');
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

  viewRequirement(requirementId: string) {
    this.router.navigate(['/creator/browse', requirementId], { queryParams: { from: 'applications' } });
  }

  viewBusiness(event: MouseEvent, app: ApplicationWithRequirement) {
    event.stopPropagation();
    const businessId = app.requirement?.business_id;
    if (businessId) this.router.navigate(['/creator/business', businessId], { queryParams: { from: 'applications' } });
  }

  async withdraw(appId: string) {
    this.actionLoading.set(true);
    const { error } = await this.creatorService.withdrawApplication(appId);
    if (error) {
      this.toast.error('Failed to withdraw application.');
    } else {
      this.toast.success('Application withdrawn.');
      await this.loadApplications();
    }
    this.actionLoading.set(false);
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      applied: 'Applied',
      accepted: 'Accepted',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
    };
    return labels[status] ?? status;
  }

  pitchPreview(pitch: string | null): string {
    if (!pitch) return '';
    return pitch.length > 100 ? pitch.substring(0, 100) + '...' : pitch;
  }

  businessDisplayName(app: ApplicationWithRequirement): string {
    return app.requirement?.business?.business_name || app.requirement?.business?.full_name || 'Unknown';
  }

  businessInitial(app: ApplicationWithRequirement): string {
    return this.businessDisplayName(app).replace(/^@/, '').charAt(0).toUpperCase();
  }

  businessHandle(app: ApplicationWithRequirement): string | null {
    return app.requirement?.business?.instagram_handle?.replace(/^@/, '') || null;
  }

  isPaid(app: ApplicationWithRequirement): boolean {
    const d = app.requirement?.compensation_details ?? '';
    return /₹|\$|rs\.?\s?\d|inr|paid|payment|\d+[,.]?\d*\s*(per|\/)|^\d[\d,. ]*$/i.test(d.trim());
  }

  formatComp(app: ApplicationWithRequirement): string {
    const d = app.requirement?.compensation_details?.trim() ?? '';
    if (!d) return 'Barter';
    if (/^\d[\d,. ]*$/.test(d)) return `₹${d}`;
    if (/^rs\.?\s*\d/i.test(d)) return d.replace(/^rs\.?\s*/i, '₹');
    return d;
  }

  applicantsCount(app: ApplicationWithRequirement): number {
    const real = app.requirement?.applications?.[0]?.count ?? 0;
    if (real > 0) return real;
    const id = app.requirement_id ?? '';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 5) + 1;
  }

  /** Supabase returns deal as an array; extract first entry */
  getDeal(app: ApplicationWithRequirement) {
    return app.deal?.[0] ?? null;
  }

  dealStatus(app: ApplicationWithRequirement): string | null {
    return this.getDeal(app)?.status ?? null;
  }

  isDealActive(app: ApplicationWithRequirement): boolean {
    const ds = this.getDeal(app)?.status;
    return ds === 'active' || ds === 'creator_marked_done';
  }

  isDealFinished(app: ApplicationWithRequirement): boolean {
    const ds = this.getDeal(app)?.status;
    return ds === 'completed' || ds === 'cancelled';
  }

  /** Card is muted when deal is in progress or finished */
  isCardMuted(app: ApplicationWithRequirement): boolean {
    return this.isDealActive(app) || this.isDealFinished(app);
  }

  statusIcon(app: ApplicationWithRequirement): string {
    const ds = this.getDeal(app)?.status;
    if (ds === 'completed') return '\u2705';
    if (ds === 'cancelled') return '\u26AB';
    if (ds === 'active' || ds === 'creator_marked_done') return '\u{1F4BC}';
    const icons: Record<string, string> = {
      applied: '\u{1F7E1}',
      accepted: '\u{1F7E2}',
      rejected: '\u{1F534}',
      withdrawn: '\u26AB',
    };
    return icons[app.status] ?? '';
  }

  statusDetail(app: ApplicationWithRequirement): string {
    const ds = this.getDeal(app)?.status;
    if (ds === 'completed') return 'Deal Completed';
    if (ds === 'cancelled') return 'Deal Cancelled';
    if (ds === 'active' || ds === 'creator_marked_done') return 'Deal in Progress';
    const labels: Record<string, string> = {
      applied: 'Under Review',
      accepted: 'Accepted',
      rejected: 'Not Selected',
      withdrawn: 'Withdrawn',
    };
    return labels[app.status] ?? app.status;
  }

  badgeClass(app: ApplicationWithRequirement): string {
    const ds = this.getDeal(app)?.status;
    if (ds === 'completed') return 'app-card__badge--completed';
    if (ds === 'cancelled') return 'app-card__badge--withdrawn';
    if (ds === 'active' || ds === 'creator_marked_done') return 'app-card__badge--deal-active';
    return `app-card__badge--${app.status}`;
  }

  private sortPriority(app: ApplicationWithRequirement): number {
    if (app.status === 'applied') return 0;
    if (app.status === 'accepted' && !this.getDeal(app)) return 1;
    if (this.isDealActive(app)) return 2;
    if (this.getDeal(app)?.status === 'completed') return 3;
    if (this.getDeal(app)?.status === 'cancelled') return 4;
    if (app.status === 'rejected') return 5;
    if (app.status === 'withdrawn') return 6;
    return 9;
  }

  isClosingSoon(app: ApplicationWithRequirement): boolean {
    const closes = app.requirement?.closes_at;
    if (!closes) return false;
    return new Date(closes).getTime() - Date.now() < 48 * 60 * 60 * 1000;
  }

  closingLabel(closesAt: string): string {
    const diff = new Date(closesAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Less than an hour left';
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} left`;
    const days = Math.ceil(hours / 24);
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  earningsLabel(app: ApplicationWithRequirement): string {
    if (this.isPaid(app)) return `Expected earnings: ${this.formatComp(app)}`;
    const d = app.requirement?.compensation_details?.trim().toLowerCase() ?? '';
    if (/free\s*meal|dinner|lunch|breakfast/i.test(d)) return 'Free meal included';
    if (/free\s*product|sample|hamper|goodies|gift/i.test(d)) return 'Free product included';
    return 'Barter collaboration';
  }

  /** Timeline step index: applied=0, under_review=0, accepted=1, deal=2 */
  timelineStep(status: string): number {
    if (status === 'accepted') return 2;
    return 0; // applied = step 0 (only "Applied" is done)
  }

  private extractAmount(comp: string | null): number {
    if (!comp) return 0;
    const match = comp.replace(/,/g, '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
