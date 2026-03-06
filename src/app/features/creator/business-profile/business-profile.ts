import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CreatorService, RequirementWithBusiness } from '../../../core/services/creator.service';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
import { CategoryClassPipe } from '../../../shared/pipes/category-class.pipe';
import { CompClassPipe } from '../../../shared/pipes/comp-class.pipe';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';

interface BusinessProfile {
  id: string;
  full_name: string;
  business_name: string | null;
  business_category: string | null;
  instagram_handle: string | null;
  portfolio_url: string | null;
  bio: string | null;
  city: string;
  created_at: string;
}

interface BusinessStats {
  completedDeals: number;
  totalRatings: number;
  avgRating: number;
  openRequirements: RequirementWithBusiness[];
}

@Component({
  selector: 'app-business-profile',
  templateUrl: './business-profile.html',
  styleUrl: './business-profile.scss',
  imports: [ClosesInPipe, CategoryClassPipe, CompClassPipe, InstagramLink],
})
export class BusinessProfileComponent implements OnInit {
  profile = signal<BusinessProfile | null>(null);
  stats = signal<BusinessStats | null>(null);
  loading = signal(true);
  error = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private creatorService: CreatorService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadProfile(id);
  }

  private async loadProfile(id: string) {
    this.loading.set(true);
    this.error.set('');

    const [profileResult, stats] = await Promise.all([
      this.creatorService.getBusinessProfile(id),
      this.creatorService.getBusinessStats(id),
    ]);

    if (profileResult.data && !profileResult.error) {
      this.profile.set(profileResult.data);
    } else {
      this.error.set('Business profile not found.');
    }

    this.stats.set(stats);
    this.loading.set(false);
  }

  displayName(): string {
    const p = this.profile();
    return p?.business_name || p?.full_name || 'Unknown';
  }

  initial(): string {
    return this.displayName().replace(/^@/, '').charAt(0).toUpperCase();
  }

  handle(): string | null {
    return this.profile()?.instagram_handle?.replace(/^@/, '') || null;
  }

  memberSince(): string {
    const p = this.profile();
    if (!p) return '';
    return new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  ratingStars(): number[] {
    const avg = this.stats()?.avgRating ?? 0;
    return [1, 2, 3, 4, 5].map((s) => (s <= Math.round(avg) ? 1 : 0));
  }

  spotsLeft(req: RequirementWithBusiness): string {
    const remaining = req.creator_slots - req.filled_slots;
    return remaining === 1 ? '1 spot left' : `${remaining} spots left`;
  }

  applicationsCount(req: RequirementWithBusiness): number {
    return req.applications?.[0]?.count ?? 0;
  }

  viewRequirement(id: string) {
    this.router.navigate(['/creator/browse', id]);
  }

  goBack() {
    this.router.navigate(['/creator/browse']);
  }
}
