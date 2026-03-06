import { Component, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, RequirementWithBusiness } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { RequirementStatus } from '../../../core/models/requirement.model';
import { RejectModal } from '../../../shared/reject-modal/reject-modal';
import { Pagination } from '../../../shared/pagination/pagination';
import { CategoryClassPipe } from '../../../shared/pipes/category-class.pipe';
import { CompClassPipe } from '../../../shared/pipes/comp-class.pipe';

type FilterTab = 'pending' | 'all';

@Component({
  selector: 'app-requirement-approvals',
  templateUrl: './requirement-approvals.html',
  styleUrl: './requirement-approvals.scss',
  imports: [DatePipe, FormsModule, RejectModal, Pagination, CategoryClassPipe, CompClassPipe],
})
export class RequirementApprovals implements OnInit {
  requirements = signal<RequirementWithBusiness[]>([]);
  activeFilter = signal<FilterTab>('pending');
  searchQuery = signal('');
  currentPage = signal(1);
  loading = signal(true);
  actionLoading = signal<string | null>(null);
  rejectingReqId = signal<string | null>(null);

  readonly pageSize = 10;

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'All Requirements', value: 'all' },
  ];

  filtered = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();
    let r = this.requirements();
    if (filter === 'pending') {
      r = r.filter((req) => req.status === 'pending_approval');
    }
    if (query) {
      r = r.filter(
        (req) =>
          req.title.toLowerCase().includes(query) ||
          (req.category?.toLowerCase().includes(query) ?? false),
      );
    }
    return r;
  });

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor(
    private adminService: AdminService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadRequirements();
  }

  async loadRequirements() {
    this.loading.set(true);
    const { data, error } = await this.adminService.getAllRequirements();
    if (data && !error) {
      this.requirements.set(data);
    } else if (error) {
      this.toast.error('Failed to load requirements.');
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

  isPending(req: RequirementWithBusiness): boolean {
    return req.status === 'pending_approval';
  }

  businessDisplayName(req: RequirementWithBusiness): string {
    return req.business?.business_name || req.business?.full_name || 'Unknown';
  }

  async approve(id: string) {
    this.actionLoading.set(id);
    const { error } = await this.adminService.approveRequirement(id);
    if (error) {
      this.toast.error('Failed to approve requirement.');
    } else {
      this.toast.success('Requirement approved.');
      await this.loadRequirements();
    }
    this.actionLoading.set(null);
  }

  promptReject(id: string) {
    this.rejectingReqId.set(id);
  }

  async onConfirmReject(reason: string) {
    const id = this.rejectingReqId();
    this.rejectingReqId.set(null);
    if (!id) return;
    this.actionLoading.set(id);
    const { error } = await this.adminService.rejectRequirement(id, reason);
    if (error) {
      this.toast.error('Failed to reject requirement.');
    } else {
      this.toast.success('Requirement rejected with feedback.');
      await this.loadRequirements();
    }
    this.actionLoading.set(null);
  }

  onCancelReject() {
    this.rejectingReqId.set(null);
  }

  async toggleFeatured(req: RequirementWithBusiness) {
    this.actionLoading.set(req.id);
    const { error } = await this.adminService.toggleFeatured(req.id, !req.is_featured);
    if (error) {
      this.toast.error('Failed to update featured status.');
    } else {
      this.toast.success(req.is_featured ? 'Removed from featured.' : 'Marked as featured.');
      await this.loadRequirements();
    }
    this.actionLoading.set(null);
  }

  isOpenOrPartial(req: RequirementWithBusiness): boolean {
    return req.status === 'open' || req.status === 'partially_filled';
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
