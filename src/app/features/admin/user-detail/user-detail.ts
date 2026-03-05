import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { AdminService, UserDeal, UserRequirement } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Profile, ApprovalStatus } from '../../../core/models/user.model';
import { RequirementStatus } from '../../../core/models/requirement.model';
import { DealStatus } from '../../../core/models/deal.model';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-user-detail',
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.scss',
  imports: [DatePipe, TitleCasePipe, ConfirmDialog, Pagination],
})
export class UserDetail implements OnInit {
  user = signal<Profile | null>(null);
  deals = signal<UserDeal[]>([]);
  requirements = signal<UserRequirement[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  error = signal('');
  confirmAction = signal<string | null>(null);

  dealsPage = signal(1);
  reqsPage = signal(1);
  readonly pageSize = 10;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadUser(id);
  }

  async loadUser(id: string) {
    this.loading.set(true);
    const { data, error } = await this.adminService.getUserById(id);
    if (data && !error) {
      this.user.set(data);
      await this.loadRelatedData(id, data.role);
    } else {
      this.error.set('User not found.');
    }
    this.loading.set(false);
  }

  private async loadRelatedData(userId: string, role: string) {
    const [dealsResult, reqsResult] = await Promise.all([
      this.adminService.getUserDeals(userId),
      role === 'business' ? this.adminService.getUserRequirements(userId) : Promise.resolve({ data: null, error: null }),
    ]);

    if (dealsResult.data) this.deals.set(dealsResult.data);
    if (reqsResult.data) this.requirements.set(reqsResult.data);
  }

  get canApprove(): boolean {
    return this.user()?.approval_status === 'pending';
  }

  get canReject(): boolean {
    return this.user()?.approval_status === 'pending';
  }

  get canDeactivate(): boolean {
    const u = this.user();
    return !!u && !u.is_deleted;
  }

  async approve() {
    const u = this.user();
    if (!u) return;
    this.actionLoading.set(true);
    const { data, error } = await this.adminService.approveUser(u.id);
    if (error) {
      this.toast.error('Failed to approve user.');
    } else if (data) {
      this.toast.success('User approved.');
      this.user.set(data);
    }
    this.actionLoading.set(false);
  }

  promptReject() {
    this.confirmAction.set('reject');
  }

  async onConfirmReject() {
    this.confirmAction.set(null);
    const u = this.user();
    if (!u) return;
    this.actionLoading.set(true);
    const { data, error } = await this.adminService.rejectUser(u.id);
    if (error) {
      this.toast.error('Failed to reject user.');
    } else if (data) {
      this.toast.success('User rejected.');
      this.user.set(data);
    }
    this.actionLoading.set(false);
  }

  promptDeactivate() {
    this.confirmAction.set('deactivate');
  }

  async onConfirmDeactivate() {
    this.confirmAction.set(null);
    const u = this.user();
    if (!u) return;
    this.actionLoading.set(true);
    const { data, error } = await this.adminService.deactivateUser(u.id);
    if (error) {
      this.toast.error('Failed to deactivate user.');
    } else if (data) {
      this.toast.success('User deactivated.');
      this.user.set(data);
    }
    this.actionLoading.set(false);
  }

  onCancelConfirm() {
    this.confirmAction.set(null);
  }

  get confirmMessage(): string {
    if (this.confirmAction() === 'deactivate') {
      return 'Are you sure you want to deactivate this user? This will soft-delete their account.';
    }
    return 'Are you sure you want to reject this user?';
  }

  onConfirm() {
    if (this.confirmAction() === 'deactivate') {
      this.onConfirmDeactivate();
    } else {
      this.onConfirmReject();
    }
  }

  pagedDeals(): UserDeal[] {
    const start = (this.dealsPage() - 1) * this.pageSize;
    return this.deals().slice(start, start + this.pageSize);
  }

  pagedRequirements(): UserRequirement[] {
    const start = (this.reqsPage() - 1) * this.pageSize;
    return this.requirements().slice(start, start + this.pageSize);
  }

  goBack() {
    this.router.navigate(['/admin/users']);
  }

  statusLabel(status: ApprovalStatus): string {
    const labels: Record<ApprovalStatus, string> = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return labels[status];
  }

  dealStatusLabel(status: DealStatus): string {
    const labels: Record<DealStatus, string> = {
      active: 'Active',
      creator_marked_done: 'Marked Done',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status];
  }

  reqStatusLabel(status: RequirementStatus): string {
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

  dealBusinessName(deal: UserDeal): string {
    return deal.business?.business_name || deal.business?.full_name || 'Unknown';
  }
}
