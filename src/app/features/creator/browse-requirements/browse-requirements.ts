import { Component, OnInit, signal, computed, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CreatorService, RequirementWithBusiness } from '../../../core/services/creator.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
import { Pagination } from '../../../shared/pagination/pagination';

type CategoryFilter = 'all' | string;
type CompensationFilter = 'all' | 'paid' | 'barter';
type SortBy = 'newest' | 'closing_soon' | 'slots_available';
type DropdownId = 'category' | 'compensation' | 'slots' | 'sort' | null;

interface AppliedInfo {
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-browse-requirements',
  templateUrl: './browse-requirements.html',
  styleUrl: './browse-requirements.scss',
  imports: [FormsModule, DatePipe, ClosesInPipe, Pagination],
})
export class BrowseRequirements implements OnInit {
  requirements = signal<RequirementWithBusiness[]>([]);
  appliedMap = signal<Map<string, AppliedInfo>>(new Map());
  searchQuery = signal('');
  categoryFilter = signal<CategoryFilter>('all');
  compensationFilter = signal<CompensationFilter>('all');
  slotsFilter = signal<number>(0);
  sortBy = signal<SortBy>('newest');
  currentPage = signal(1);
  loading = signal(true);
  openDropdown = signal<DropdownId>(null);

  readonly pageSize = 10;

  readonly categories: { label: string; value: CategoryFilter }[] = [
    { label: 'All Categories', value: 'all' },
    { label: 'Food Review', value: 'Food Review' },
    { label: 'Reel', value: 'Reel' },
    { label: 'Photoshoot', value: 'Photoshoot' },
    { label: 'Blog Post', value: 'Blog Post' },
    { label: 'Social Media Post', value: 'Social Media Post' },
    { label: 'Other', value: 'Other' },
  ];

  readonly compensationOptions: { label: string; value: CompensationFilter }[] = [
    { label: 'Any Compensation', value: 'all' },
    { label: 'Paid', value: 'paid' },
    { label: 'Barter', value: 'barter' },
  ];

  readonly slotsOptions: { label: string; value: number }[] = [
    { label: 'Any Slots', value: 0 },
    { label: '1+ slots', value: 1 },
    { label: '3+ slots', value: 3 },
    { label: '5+ slots', value: 5 },
  ];

  readonly sortOptions: { label: string; value: SortBy }[] = [
    { label: 'Newest', value: 'newest' },
    { label: 'Closing soon', value: 'closing_soon' },
    { label: 'Slots available', value: 'slots_available' },
  ];

  categoryLabel = computed(() => this.categories.find((c) => c.value === this.categoryFilter())?.label ?? 'All Categories');
  compensationLabel = computed(() => this.compensationOptions.find((o) => o.value === this.compensationFilter())?.label ?? 'Any Compensation');
  slotsLabel = computed(() => this.slotsOptions.find((o) => o.value === this.slotsFilter())?.label ?? 'Any Slots');
  sortLabel = computed(() => this.sortOptions.find((o) => o.value === this.sortBy())?.label ?? 'Newest');

  hasActiveFilters = computed(() =>
    this.categoryFilter() !== 'all' ||
    this.compensationFilter() !== 'all' ||
    this.slotsFilter() !== 0 ||
    this.searchQuery().trim() !== '',
  );

  activeChips = computed(() => {
    const chips: { label: string; key: string }[] = [];
    if (this.searchQuery().trim()) {
      chips.push({ label: `"${this.searchQuery().trim()}"`, key: 'search' });
    }
    if (this.categoryFilter() !== 'all') {
      chips.push({ label: this.categoryFilter(), key: 'category' });
    }
    if (this.compensationFilter() !== 'all') {
      const label = this.compensationOptions.find(o => o.value === this.compensationFilter())?.label ?? this.compensationFilter();
      chips.push({ label, key: 'compensation' });
    }
    if (this.slotsFilter() !== 0) {
      const label = this.slotsOptions.find(o => o.value === this.slotsFilter())?.label ?? `${this.slotsFilter()}+`;
      chips.push({ label, key: 'slots' });
    }
    return chips;
  });

  filtered = computed(() => {
    let reqs = this.requirements();
    const category = this.categoryFilter();
    const query = this.searchQuery().toLowerCase().trim();
    const compensation = this.compensationFilter();
    const slots = this.slotsFilter();
    const sort = this.sortBy();

    if (category !== 'all') {
      reqs = reqs.filter((r) => r.category === category);
    }

    if (query) {
      reqs = reqs.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          (r.description?.toLowerCase().includes(query) ?? false) ||
          (r.category?.toLowerCase().includes(query) ?? false) ||
          (r.compensation_details?.toLowerCase().includes(query) ?? false),
      );
    }

    if (compensation !== 'all') {
      reqs = reqs.filter((r) => {
        const details = (r.compensation_details ?? '').toLowerCase();
        if (compensation === 'paid') {
          return /\d|₹|\$|rs\.?|inr|paid|payment|amount/i.test(details);
        }
        // barter
        return /free|barter|exchange|complimentary/i.test(details);
      });
    }

    if (slots > 0) {
      reqs = reqs.filter((r) => r.creator_slots - r.filled_slots >= slots);
    }

    reqs = [...reqs].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'closing_soon': {
          if (!a.closes_at && !b.closes_at) return 0;
          if (!a.closes_at) return 1;
          if (!b.closes_at) return -1;
          return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime();
        }
        case 'slots_available':
          return (b.creator_slots - b.filled_slots) - (a.creator_slots - a.filled_slots);
        default:
          return 0;
      }
    });

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
    private elRef: ElementRef,
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.openDropdown() && !this.elRef.nativeElement.querySelector('.browse__filters')?.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);

    const [reqResult, appResult] = await Promise.all([
      this.creatorService.getOpenRequirements(),
      this.creatorService.getMyApplicationsBrief(),
    ]);

    if (reqResult.data && !reqResult.error) {
      this.requirements.set(reqResult.data);
    } else if (reqResult.error) {
      this.toast.error('Failed to load requirements.');
    }

    if (appResult.data && !appResult.error) {
      const map = new Map<string, AppliedInfo>();
      for (const app of appResult.data) {
        map.set(app.requirement_id, { status: app.status, created_at: app.created_at });
      }
      this.appliedMap.set(map);
    }

    this.loading.set(false);
  }

  getAppliedInfo(requirementId: string): AppliedInfo | undefined {
    return this.appliedMap().get(requirementId);
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onFilterChange() {
    this.currentPage.set(1);
  }

  toggleDropdown(id: DropdownId) {
    this.openDropdown.set(this.openDropdown() === id ? null : id);
  }

  closeDropdown() {
    this.openDropdown.set(null);
  }

  removeChip(key: string) {
    switch (key) {
      case 'search': this.searchQuery.set(''); break;
      case 'category': this.categoryFilter.set('all'); break;
      case 'compensation': this.compensationFilter.set('all'); break;
      case 'slots': this.slotsFilter.set(0); break;
    }
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.categoryFilter.set('all');
    this.compensationFilter.set('all');
    this.slotsFilter.set(0);
    this.sortBy.set('newest');
    this.currentPage.set(1);
  }

  viewRequirement(id: string) {
    this.router.navigate(['/creator/browse', id]);
  }

  viewBusiness(event: MouseEvent, businessId: string) {
    event.stopPropagation();
    this.router.navigate(['/creator/business', businessId]);
  }

  businessDisplayName(req: RequirementWithBusiness): string {
    return req.business?.business_name || req.business?.full_name || 'Unknown';
  }

  businessInitial(req: RequirementWithBusiness): string {
    return this.businessDisplayName(req).replace(/^@/, '').charAt(0).toUpperCase();
  }

  businessHandle(req: RequirementWithBusiness): string | null {
    return req.business?.instagram_handle?.replace(/^@/, '') || null;
  }

  slotsAvailable(req: RequirementWithBusiness): number {
    return req.creator_slots - req.filled_slots;
  }

  spotsLeftText(req: RequirementWithBusiness): string {
    const remaining = this.slotsAvailable(req);
    return remaining === 1 ? '1 spot left' : `${remaining} spots left`;
  }

  isNew(req: RequirementWithBusiness): boolean {
    return Date.now() - new Date(req.created_at).getTime() < 48 * 60 * 60 * 1000;
  }

  isClosingSoon(req: RequirementWithBusiness): boolean {
    if (!req.closes_at) return false;
    return new Date(req.closes_at).getTime() - Date.now() < 48 * 60 * 60 * 1000;
  }

  applicationsCount(req: RequirementWithBusiness): number {
    return req.applications?.[0]?.count ?? 0;
  }
}
