import { Component, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService, ApplicationWithRequirement } from '../../../core/services/creator.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApplicationStatus } from '../../../core/models/application.model';
import { Pagination } from '../../../shared/pagination/pagination';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';

type FilterTab = 'all' | ApplicationStatus;

@Component({
  selector: 'app-my-applications',
  templateUrl: './my-applications.html',
  styleUrl: './my-applications.scss',
  imports: [DatePipe, FormsModule, Pagination, RouterLink, InstagramLink],
})
export class MyApplications implements OnInit {
  applications = signal<ApplicationWithRequirement[]>([]);
  activeFilter = signal<FilterTab>('all');
  searchQuery = signal('');
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

  filtered = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();
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
  }

  async loadApplications() {
    this.loading.set(true);
    const { data, error } = await this.creatorService.getMyApplications();
    if (data && !error) {
      this.applications.set(data);
    } else if (error) {
      this.toast.error('Failed to load applications.');
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
    this.router.navigate(['/creator/browse', requirementId]);
  }

  viewBusiness(event: MouseEvent, app: ApplicationWithRequirement) {
    event.stopPropagation();
    const businessId = app.requirement?.business_id;
    if (businessId) this.router.navigate(['/creator/business', businessId]);
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
}
