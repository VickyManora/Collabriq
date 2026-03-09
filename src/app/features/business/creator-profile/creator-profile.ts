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
  created_at: string;
}

interface PortfolioItem {
  id: string;
  completed_at: string | null;
  content_proof_url: string | null;
  requirement: { title: string; category: string | null; compensation_details: string | null } | null;
  business: { business_name: string | null; full_name: string; instagram_handle: string | null } | null;
}

interface Reputation {
  avgRating: number;
  totalRatings: number;
  completedDeals: number;
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
  portfolio = signal<PortfolioItem[]>([]);
  loading = signal(true);
  error = signal('');

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

    const [profileResult, rep, portfolioResult] = await Promise.all([
      this.reqService.getCreatorProfile(id),
      this.reqService.getCreatorReputation(id),
      this.reqService.getCreatorPortfolio(id),
    ]);

    if (profileResult.data && !profileResult.error) {
      this.profile.set(profileResult.data);
    } else {
      this.error.set('Creator profile not found.');
    }

    this.reputation.set(rep);

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

  ratingStars(): number[] {
    const avg = this.reputation()?.avgRating ?? 0;
    return [1, 2, 3, 4, 5].map((s) => (s <= Math.round(avg) ? 1 : 0));
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
