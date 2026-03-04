import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CreatorService, ApplicationWithRequirement } from '../../../core/services/creator.service';
import { ApplicationStatus } from '../../../core/models/application.model';

type FilterTab = 'all' | ApplicationStatus;

@Component({
  selector: 'app-my-applications',
  templateUrl: './my-applications.html',
  styleUrl: './my-applications.scss',
  imports: [DatePipe],
})
export class MyApplications implements OnInit {
  applications = signal<ApplicationWithRequirement[]>([]);
  activeFilter = signal<FilterTab>('all');
  loading = signal(true);
  actionLoading = signal(false);

  readonly tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Applied', value: 'applied' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Withdrawn', value: 'withdrawn' },
  ];

  filtered = computed(() => {
    const filter = this.activeFilter();
    const apps = this.applications();
    if (filter === 'all') return apps;
    return apps.filter((a) => a.status === filter);
  });

  constructor(
    private creatorService: CreatorService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadApplications();
  }

  async loadApplications() {
    this.loading.set(true);
    const { data, error } = await this.creatorService.getMyApplications();
    if (data && !error) {
      this.applications.set(data);
    }
    this.loading.set(false);
  }

  setFilter(tab: FilterTab) {
    this.activeFilter.set(tab);
  }

  viewRequirement(requirementId: string) {
    this.router.navigate(['/creator/browse', requirementId]);
  }

  async withdraw(appId: string) {
    this.actionLoading.set(true);
    const { error } = await this.creatorService.withdrawApplication(appId);
    if (!error) {
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
}
