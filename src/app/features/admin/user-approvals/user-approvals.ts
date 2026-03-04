import { Component, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { Profile, ApprovalStatus } from '../../../core/models/user.model';

type FilterTab = 'pending' | 'all';

@Component({
  selector: 'app-user-approvals',
  templateUrl: './user-approvals.html',
  styleUrl: './user-approvals.scss',
  imports: [DatePipe],
})
export class UserApprovals implements OnInit {
  users = signal<Profile[]>([]);
  activeFilter = signal<FilterTab>('pending');
  loading = signal(true);
  actionLoading = signal<string | null>(null);

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'All Users', value: 'all' },
  ];

  filtered = computed(() => {
    const filter = this.activeFilter();
    const u = this.users();
    if (filter === 'pending') return u.filter((user) => user.approval_status === 'pending');
    return u;
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.loading.set(true);
    const { data, error } = await this.adminService.getAllUsers();
    if (data && !error) {
      this.users.set(data);
    }
    this.loading.set(false);
  }

  setFilter(tab: FilterTab) {
    this.activeFilter.set(tab);
  }

  isPending(user: Profile): boolean {
    return user.approval_status === 'pending';
  }

  async approve(userId: string) {
    this.actionLoading.set(userId);
    const { error } = await this.adminService.approveUser(userId);
    if (!error) {
      await this.loadUsers();
    }
    this.actionLoading.set(null);
  }

  async reject(userId: string) {
    this.actionLoading.set(userId);
    const { error } = await this.adminService.rejectUser(userId);
    if (!error) {
      await this.loadUsers();
    }
    this.actionLoading.set(null);
  }

  statusLabel(status: ApprovalStatus): string {
    const labels: Record<ApprovalStatus, string> = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return labels[status];
  }
}
