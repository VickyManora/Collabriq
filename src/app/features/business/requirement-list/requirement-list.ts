import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { RequirementService } from '../../../core/services/requirement.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
import { Requirement, RequirementStatus } from '../../../core/models/requirement.model';

type FilterTab = 'all' | RequirementStatus;

@Component({
  selector: 'app-requirement-list',
  templateUrl: './requirement-list.html',
  styleUrl: './requirement-list.scss',
  imports: [DatePipe, ClosesInPipe],
})
export class RequirementList implements OnInit {
  requirements = signal<Requirement[]>([]);
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
    private router: Router,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadRequirements();
  }

  async loadRequirements() {
    this.loading.set(true);
    const { data, error } = await this.reqService.getMyRequirements();
    if (data && !error) {
      this.requirements.set(data);
    } else if (error) {
      this.toast.error('Failed to load requirements.');
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
