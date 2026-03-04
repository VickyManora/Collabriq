import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CreatorService, RequirementWithBusiness } from '../../../core/services/creator.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
import { Pagination } from '../../../shared/pagination/pagination';

type CategoryFilter = 'all' | string;

@Component({
  selector: 'app-browse-requirements',
  templateUrl: './browse-requirements.html',
  styleUrl: './browse-requirements.scss',
  imports: [FormsModule, ClosesInPipe, Pagination],
})
export class BrowseRequirements implements OnInit {
  requirements = signal<RequirementWithBusiness[]>([]);
  activeFilter = signal<CategoryFilter>('all');
  searchQuery = signal('');
  currentPage = signal(1);
  loading = signal(true);

  readonly pageSize = 10;

  readonly tabs: { label: string; value: CategoryFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Food Review', value: 'Food Review' },
    { label: 'Reel', value: 'Reel' },
    { label: 'Photoshoot', value: 'Photoshoot' },
    { label: 'Blog Post', value: 'Blog Post' },
    { label: 'Social Media Post', value: 'Social Media Post' },
    { label: 'Other', value: 'Other' },
  ];

  filtered = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();
    let reqs = this.requirements();
    if (filter !== 'all') {
      reqs = reqs.filter((r) => r.category === filter);
    }
    if (query) {
      reqs = reqs.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          (r.category?.toLowerCase().includes(query) ?? false),
      );
    }
    return reqs;
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
    this.loadRequirements();
  }

  async loadRequirements() {
    this.loading.set(true);
    const { data, error } = await this.creatorService.getOpenRequirements();
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

  setFilter(tab: CategoryFilter) {
    this.activeFilter.set(tab);
    this.currentPage.set(1);
  }

  viewRequirement(id: string) {
    this.router.navigate(['/creator/browse', id]);
  }

  businessDisplayName(req: RequirementWithBusiness): string {
    return req.business?.business_name || req.business?.full_name || 'Unknown';
  }

  slotsAvailable(req: RequirementWithBusiness): number {
    return req.creator_slots - req.filled_slots;
  }
}
