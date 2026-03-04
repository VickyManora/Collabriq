import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CreatorService, RequirementWithBusiness } from '../../../core/services/creator.service';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';

type CategoryFilter = 'all' | string;

@Component({
  selector: 'app-browse-requirements',
  templateUrl: './browse-requirements.html',
  styleUrl: './browse-requirements.scss',
  imports: [ClosesInPipe],
})
export class BrowseRequirements implements OnInit {
  requirements = signal<RequirementWithBusiness[]>([]);
  activeFilter = signal<CategoryFilter>('all');
  loading = signal(true);

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
    const reqs = this.requirements();
    if (filter === 'all') return reqs;
    return reqs.filter((r) => r.category === filter);
  });

  constructor(
    private creatorService: CreatorService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadRequirements();
  }

  async loadRequirements() {
    this.loading.set(true);
    const { data, error } = await this.creatorService.getOpenRequirements();
    if (data && !error) {
      this.requirements.set(data);
    }
    this.loading.set(false);
  }

  setFilter(tab: CategoryFilter) {
    this.activeFilter.set(tab);
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
