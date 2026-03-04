import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RequirementService } from '../../../core/services/requirement.service';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
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
  };
};

@Component({
  selector: 'app-requirement-detail',
  templateUrl: './requirement-detail.html',
  styleUrl: './requirement-detail.scss',
  imports: [DatePipe, DecimalPipe, ClosesInPipe],
})
export class RequirementDetail implements OnInit {
  requirement = signal<Requirement | null>(null);
  applications = signal<ApplicationWithCreator[]>([]);
  avgRatings = signal<Map<string, { avg: number; count: number }>>(new Map());
  loading = signal(true);
  actionLoading = signal(false);
  error = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reqService: RequirementService,
  ) {}

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
    this.actionLoading.set(true);
    this.error.set('');
    const { error } = await this.reqService.submitForApproval(this.requirement()!.id);
    if (error) {
      this.error.set(error.message);
    } else {
      await this.loadData(this.requirement()!.id);
    }
    this.actionLoading.set(false);
  }

  async cancelRequirement() {
    this.actionLoading.set(true);
    this.error.set('');
    const { error } = await this.reqService.cancelRequirement(this.requirement()!.id);
    if (error) {
      this.error.set(error.message);
    } else {
      await this.loadData(this.requirement()!.id);
    }
    this.actionLoading.set(false);
  }

  async acceptApplication(appId: string) {
    this.actionLoading.set(true);
    this.error.set('');
    const { error } = await this.reqService.acceptApplication(appId);
    if (error) {
      this.error.set(error.message);
    } else {
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
    } else {
      await this.loadData(this.requirement()!.id);
    }
    this.actionLoading.set(false);
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
