import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
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

interface RecentCollab {
  id: string;
  status: string;
  created_at: string;
  creator: { full_name: string; instagram_handle: string | null };
  requirement: { title: string; category: string | null };
  rating: number | null;
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
  recentCollabs = signal<RecentCollab[]>([]);
  responseTime = signal<string | null>(null);
  loading = signal(true);
  error = signal('');

  private categoryIcons: Record<string, string> = {
    'Reel': '🎬',
    'Photoshoot': '📸',
    'Story': '📱',
    'Post': '📝',
    'Video': '🎥',
    'Review': '⭐',
    'Event': '🎪',
    'Unboxing': '📦',
    'Tutorial': '🎓',
    'Podcast': '🎙️',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private creatorService: CreatorService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadProfile(id);
  }

  private async loadProfile(id: string) {
    this.loading.set(true);
    this.error.set('');

    const [profileResult, stats, collabs, respTime] = await Promise.all([
      this.creatorService.getBusinessProfile(id),
      this.creatorService.getBusinessStats(id),
      this.creatorService.getBusinessRecentCollabs(id),
      this.creatorService.getBusinessResponseTime(id),
    ]);

    if (profileResult.data && !profileResult.error) {
      this.profile.set(profileResult.data);
    } else {
      this.error.set('Business profile not found.');
    }

    this.stats.set(stats);
    this.recentCollabs.set(collabs);
    this.responseTime.set(respTime);
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

  spotsProgress(req: RequirementWithBusiness): string {
    const filled = req.filled_slots;
    const total = req.creator_slots;
    const filledBlocks = '■'.repeat(filled);
    const emptyBlocks = '□'.repeat(total - filled);
    return `[${filledBlocks}${emptyBlocks}]`;
  }

  applicationsCount(req: RequirementWithBusiness): number {
    return req.applications?.[0]?.count ?? 0;
  }

  categoryIcon(category: string | null): string {
    if (!category) return '📋';
    return this.categoryIcons[category] || '📋';
  }

  collabInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  collabDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  collabHandle(collab: RecentCollab): string | null {
    return collab.creator.instagram_handle?.replace(/^@/, '') || null;
  }

  viewRequirement(id: string) {
    this.router.navigate(['/creator/browse', id]);
  }

  goBack() {
    this.location.back();
  }
}
