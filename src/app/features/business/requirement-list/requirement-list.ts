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

@Component({
  selector: 'app-requirement-list',
  templateUrl: './requirement-list.html',
  styleUrl: './requirement-list.scss',
  imports: [DatePipe, ClosesInPipe, CategoryClassPipe, PendingBanner],
})
export class RequirementList implements OnInit, OnDestroy {
  requirements = signal<RequirementWithApps[]>([]);

  private routerSub?: Subscription;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') this.loadRequirements();
  };
  activeFilter = signal<FilterTab>('all');
  loading = signal(true);

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Pending', value: 'pending_approval' },
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' },
  ];

  filtered = computed(() => {
    const filter = this.activeFilter();
    const reqs = this.requirements();
    if (filter === 'all') return reqs;
    return reqs.filter((r) => r.status === filter);
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

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.loadRequirements());
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
      } else if (error) {
        this.toast.error('Failed to load requirements.');
      }
    } catch {
      // timeout or network error
    }
    this.loading.set(false);
  }

  setFilter(tab: FilterTab) {
    this.activeFilter.set(tab);
  }

  viewDetail(id: string) {
    this.router.navigate(['/business/requirements', id]);
  }

  createNew() {
    this.router.navigate(['/business/requirements/new']);
  }

  applicationsCount(req: RequirementWithApps): number {
    return req.applications?.[0]?.count ?? 0;
  }

  isClosingSoon(req: RequirementWithApps): boolean {
    if (!req.closes_at) return false;
    return new Date(req.closes_at).getTime() - Date.now() < 48 * 60 * 60 * 1000;
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
}
