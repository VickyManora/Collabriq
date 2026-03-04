import { Component, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, RequirementWithBusiness } from '../../../core/services/admin.service';
import { RequirementStatus } from '../../../core/models/requirement.model';

type FilterTab = 'pending' | 'all';

@Component({
  selector: 'app-requirement-approvals',
  templateUrl: './requirement-approvals.html',
  styleUrl: './requirement-approvals.scss',
  imports: [DatePipe],
})
export class RequirementApprovals implements OnInit {
  requirements = signal<RequirementWithBusiness[]>([]);
  activeFilter = signal<FilterTab>('pending');
  loading = signal(true);
  actionLoading = signal<string | null>(null);

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'All Requirements', value: 'all' },
  ];

  filtered = computed(() => {
    const filter = this.activeFilter();
    const r = this.requirements();
    if (filter === 'pending') return r.filter((req) => req.status === 'pending_approval');
    return r;
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadRequirements();
  }

  async loadRequirements() {
    this.loading.set(true);
    const { data, error } = await this.adminService.getAllRequirements();
    if (data && !error) {
      this.requirements.set(data);
    }
    this.loading.set(false);
  }

  setFilter(tab: FilterTab) {
    this.activeFilter.set(tab);
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
    if (!error) {
      await this.loadRequirements();
    }
    this.actionLoading.set(null);
  }

  async reject(id: string) {
    this.actionLoading.set(id);
    const { error } = await this.adminService.rejectRequirement(id);
    if (!error) {
      await this.loadRequirements();
    }
    this.actionLoading.set(null);
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
