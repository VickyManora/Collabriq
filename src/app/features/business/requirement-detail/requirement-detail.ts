import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequirementService } from '../../../core/services/requirement.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PendingBanner } from '../../../shared/pending-banner/pending-banner';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
import { CategoryClassPipe } from '../../../shared/pipes/category-class.pipe';
import { CompClassPipe } from '../../../shared/pipes/comp-class.pipe';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { Pagination } from '../../../shared/pagination/pagination';
import { Requirement, RequirementStatus } from '../../../core/models/requirement.model';
import { Application } from '../../../core/models/application.model';

type ApplicationWithCreator = Application & {
  creator: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    instagram_handle: string | null;
    portfolio_url: string | null;
    bio: string | null;
    city: string | null;
  };
};

@Component({
  selector: 'app-requirement-detail',
  templateUrl: './requirement-detail.html',
  styleUrl: './requirement-detail.scss',
  imports: [DatePipe, DecimalPipe, TitleCasePipe, FormsModule, ClosesInPipe, CategoryClassPipe, CompClassPipe, ConfirmDialog, Pagination, PendingBanner, InstagramLink],
})
export class RequirementDetail implements OnInit {
  requirement = signal<Requirement | null>(null);
  applications = signal<ApplicationWithCreator[]>([]);
  avgRatings = signal<Map<string, { avg: number; count: number }>>(new Map());
  loading = signal(true);
  actionLoading = signal(false);
  error = signal('');
  confirmAction = signal<string | null>(null);
  appSearchQuery = signal('');
  appCurrentPage = signal(1);

  readonly appPageSize = 10;

  filteredApps = computed(() => {
    const query = this.appSearchQuery().toLowerCase().trim();
    const apps = this.applications();
    if (!query) return apps;
    return apps.filter(
      (a) =>
        a.creator.full_name.toLowerCase().includes(query) ||
        a.creator.email.toLowerCase().includes(query),
    );
  });

  pagedApps = computed(() => {
    const start = (this.appCurrentPage() - 1) * this.appPageSize;
    return this.filteredApps().slice(start, start + this.appPageSize);
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reqService: RequirementService,
    private auth: AuthService,
    private toast: ToastService,
  ) {}

  get isPending(): boolean {
    return this.auth.isPending();
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadData(id);
  }

  async loadData(id: string) {
    this.loading.set(true);
    const { data, error } = await this.reqService.getRequirement(id);
    if (data && !error) {
      this.requirement.set(data);
      if (this.showApplications(data.status)) {
        await this.loadApplications(id);
      }
    } else {
      this.error.set('Requirement not found.');
    }
    this.loading.set(false);
  }

  async loadApplications(id: string) {
    const { data, error } = await this.reqService.getApplicationsForRequirement(id);
    if (data && !error) {
      this.applications.set(data as ApplicationWithCreator[]);
      await this.loadAverageRatings(data as ApplicationWithCreator[]);
    }
  }

  private async loadAverageRatings(apps: ApplicationWithCreator[]) {
    const creatorIds = [...new Set(apps.map((a) => a.creator.id))];
    const avgMap = new Map<string, { avg: number; count: number }>();

    for (const id of creatorIds) {
      const result = await this.reqService.getCreatorAverageRating(id);
      if (result.count > 0) {
        avgMap.set(id, result);
      }
    }
    this.avgRatings.set(avgMap);
  }

  getAvgRating(creatorId: string): { avg: number; count: number } | undefined {
    return this.avgRatings().get(creatorId);
  }

  showApplications(status: RequirementStatus): boolean {
    return ['open', 'partially_filled', 'closed'].includes(status);
  }

  get canEdit(): boolean {
    return this.requirement()?.status === 'draft';
  }

  get canSubmit(): boolean {
    return this.requirement()?.status === 'draft';
  }

  get canCancel(): boolean {
    const s = this.requirement()?.status;
    return s === 'draft' || s === 'pending_approval';
  }

  edit() {
    this.router.navigate(['/business/requirements', this.requirement()!.id, 'edit']);
  }

  async submitForApproval() {
    if (this.isPending) {
      this.toast.error('Your account is pending approval. This action will unlock once your account is approved.');
      return;
    }
    this.actionLoading.set(true);
    this.error.set('');
    const { error } = await this.reqService.submitForApproval(this.requirement()!.id);
    if (error) {
      this.error.set(error.message);
      this.toast.error('Failed to submit.');
    } else {
      this.toast.success('Submitted for approval.');
      await this.loadData(this.requirement()!.id);
    }
    this.actionLoading.set(false);
  }

  promptCancel() {
    this.confirmAction.set('cancel');
  }

  async onConfirmCancel() {
    this.confirmAction.set(null);
    this.actionLoading.set(true);
    this.error.set('');
    const { error } = await this.reqService.cancelRequirement(this.requirement()!.id);
    if (error) {
      this.error.set(error.message);
      this.toast.error('Failed to cancel requirement.');
    } else {
      this.toast.success('Requirement cancelled.');
      await this.loadData(this.requirement()!.id);
    }
    this.actionLoading.set(false);
  }

  onCancelConfirm() {
    this.confirmAction.set(null);
  }

  async acceptApplication(appId: string) {
    if (this.isPending) {
      this.toast.error('Your account is pending approval. This action will unlock once your account is approved.');
      return;
    }
    this.actionLoading.set(true);
    this.error.set('');
    const { error } = await this.reqService.acceptApplication(appId);
    if (error) {
      this.error.set(error.message);
      this.toast.error('Failed to accept application.');
    } else {
      this.toast.success('Application accepted.');
      await this.loadData(this.requirement()!.id);
    }
    this.actionLoading.set(false);
  }

  async rejectApplication(appId: string) {
    this.actionLoading.set(true);
    this.error.set('');
    const { error } = await this.reqService.rejectApplication(appId);
    if (error) {
      this.error.set(error.message);
      this.toast.error('Failed to reject application.');
    } else {
      this.toast.success('Application rejected.');
      await this.loadData(this.requirement()!.id);
    }
    this.actionLoading.set(false);
  }

  onAppSearch(query: string) {
    this.appSearchQuery.set(query);
    this.appCurrentPage.set(1);
  }

  goBack() {
    this.router.navigate(['/business/requirements']);
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

  spotsRemaining(req: Requirement): number {
    return req.creator_slots - req.filled_slots;
  }

  creatorInitial(app: ApplicationWithCreator): string {
    return app.creator.full_name.replace(/^@/, '').charAt(0).toUpperCase();
  }

  appStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      applied: 'Applied',
      accepted: 'Accepted',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
    };
    return labels[status] ?? status;
  }
}
