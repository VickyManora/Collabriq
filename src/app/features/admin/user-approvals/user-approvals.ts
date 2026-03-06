import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Profile, ApprovalStatus } from '../../../core/models/user.model';
import { RejectModal } from '../../../shared/reject-modal/reject-modal';
import { Pagination } from '../../../shared/pagination/pagination';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';

type FilterTab = 'pending' | 'all' | 'deactivated';

@Component({
  selector: 'app-user-approvals',
  templateUrl: './user-approvals.html',
  styleUrl: './user-approvals.scss',
  imports: [DatePipe, TitleCasePipe, FormsModule, RejectModal, Pagination, InstagramLink],
})
export class UserApprovals implements OnInit, OnDestroy {
  users = signal<Profile[]>([]);

  private routerSub?: Subscription;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') this.loadUsers();
  };
  activeFilter = signal<FilterTab>('pending');
  searchQuery = signal('');
  currentPage = signal(1);
  loading = signal(true);
  actionLoading = signal<string | null>(null);
  rejectingUserId = signal<string | null>(null);

  readonly pageSize = 10;

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'All Users', value: 'all' },
    { label: 'Deactivated', value: 'deactivated' },
  ];

  filtered = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();
    let u = this.users();
    if (filter === 'pending') {
      u = u.filter((user) => !user.is_deleted && user.approval_status === 'pending');
    } else if (filter === 'deactivated') {
      u = u.filter((user) => user.is_deleted);
    } else {
      u = u.filter((user) => !user.is_deleted);
    }
    if (query) {
      u = u.filter(
        (user) =>
          (user.full_name?.toLowerCase().includes(query) ?? false) ||
          user.email.toLowerCase().includes(query) ||
          (user.business_name?.toLowerCase().includes(query) ?? false),
      );
    }
    return u;
  });

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor(
    private adminService: AdminService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadUsers();

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.loadUsers());
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  async loadUsers() {
    this.loading.set(true);
    try {
      const { data, error } = await Promise.race([
        this.adminService.getAllUsers(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      if (data && !error) {
        this.users.set(data);
      } else if (error) {
        this.toast.error('Failed to load users.');
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

  viewUser(userId: string) {
    this.router.navigate(['/admin/users', userId]);
  }

  isPending(user: Profile): boolean {
    return user.approval_status === 'pending';
  }

  async approve(userId: string) {
    this.actionLoading.set(userId);
    const { error } = await this.adminService.approveUser(userId);
    if (error) {
      this.toast.error('Failed to approve user.');
    } else {
      this.toast.success('User approved.');
      await this.loadUsers();
    }
    this.actionLoading.set(null);
  }

  promptReject(userId: string) {
    this.rejectingUserId.set(userId);
  }

  async onConfirmReject(reason: string) {
    const userId = this.rejectingUserId();
    this.rejectingUserId.set(null);
    if (!userId) return;
    this.actionLoading.set(userId);
    const { error } = await this.adminService.rejectUser(userId, reason);
    if (error) {
      this.toast.error('Failed to reject user.');
    } else {
      this.toast.success('User rejected with feedback.');
      await this.loadUsers();
    }
    this.actionLoading.set(null);
  }

  onCancelReject() {
    this.rejectingUserId.set(null);
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
