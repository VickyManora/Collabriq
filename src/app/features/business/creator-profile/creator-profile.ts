import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Location } from '@angular/common';
import { RequirementService } from '../../../core/services/requirement.service';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';

interface CreatorProfileData {
  id: string;
  full_name: string;
  bio: string | null;
  city: string;
  instagram_handle: string | null;
  portfolio_url: string | null;
  creator_category: string | null;
  follower_count: number | null;
  created_at: string;
}

interface PortfolioItem {
  id: string;
  completed_at: string | null;
  content_proof_url: string | null;
  brandRating: number | null;
  requirement: { title: string; category: string | null; compensation_details: string | null } | null;
  business: { business_name: string | null; full_name: string; instagram_handle: string | null } | null;
}

interface Reputation {
  avgRating: number;
  totalRatings: number;
  completedDeals: number;
}

interface Reliability {
  completedDeals: number;
  totalDeals: number;
  percentage: number;
}

@Component({
  selector: 'app-creator-profile',
  templateUrl: './creator-profile.html',
  styleUrl: './creator-profile.scss',
  imports: [DatePipe, InstagramLink],
})
export class CreatorProfile implements OnInit {
  profile = signal<CreatorProfileData | null>(null);
  reputation = signal<Reputation | null>(null);
  reliability = signal<Reliability | null>(null);
  portfolio = signal<PortfolioItem[]>([]);
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
    private location: Location,
    private reqService: RequirementService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadProfile(id);
  }

  private async loadProfile(id: string) {
    this.loading.set(true);
    this.error.set('');

    const [profileResult, rep, portfolioResult, rel] = await Promise.all([
      this.reqService.getCreatorProfile(id),
      this.reqService.getCreatorReputation(id),
      this.reqService.getCreatorPortfolio(id),
      this.reqService.getCreatorReliability(id),
    ]);

    if (profileResult.data && !profileResult.error) {
      this.profile.set(profileResult.data);
    } else {
      this.error.set('Creator profile not found.');
    }

    this.reputation.set(rep);
    this.reliability.set(rel);

    if (portfolioResult.data && !portfolioResult.error) {
      this.portfolio.set(portfolioResult.data);
    }

    this.loading.set(false);
  }

  displayName(): string {
    return this.profile()?.full_name || 'Unknown';
  }

  initial(): string {
    return this.displayName().charAt(0).toUpperCase();
  }

  handle(): string | null {
    return this.profile()?.instagram_handle?.replace(/^@/, '') || null;
  }

  memberSince(): string {
    const p = this.profile();
    if (!p) return '';
    return new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  formattedFollowers(): string | null {
    const count = this.profile()?.follower_count;
    if (!count) return null;
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `${count}`;
  }

  ratingStars(): number[] {
    const avg = this.reputation()?.avgRating ?? 0;
    return [1, 2, 3, 4, 5].map((s) => (s <= Math.round(avg) ? 1 : 0));
  }

  reliabilityText(): string {
    const rel = this.reliability();
    if (!rel || rel.totalDeals === 0) return '';
    return `${rel.percentage}% collaborations delivered`;
  }

  categoryIcon(category: string | null): string {
    if (!category) return '📋';
    return this.categoryIcons[category] || '📋';
  }

  businessName(item: PortfolioItem): string {
    return item.business?.business_name || item.business?.full_name || 'Unknown';
  }

  businessHandle(item: PortfolioItem): string | null {
    return item.business?.instagram_handle?.replace(/^@/, '') || null;
  }

  goBack() {
    this.location.back();
  }
}
