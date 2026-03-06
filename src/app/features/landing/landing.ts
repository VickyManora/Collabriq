import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { CategoryClassPipe } from '../../shared/pipes/category-class.pipe';
import { CompClassPipe } from '../../shared/pipes/comp-class.pipe';

interface FeaturedRequirement {
  id: string;
  title: string;
  category: string | null;
  compensation_details: string | null;
  creator_slots: number;
  filled_slots: number;
  created_at: string;
  business: { business_name: string | null; full_name: string; instagram_handle: string | null; city: string | null };
  applications: { count: number }[];
}

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  imports: [RouterLink, TimeAgoPipe, CategoryClassPipe, CompClassPipe],
})
export class Landing implements OnInit {
  constructor(
    protected theme: ThemeService,
    private supabaseService: SupabaseService,
  ) {}

  mobileMenuOpen = signal(false);
  activePreview = signal<'creator' | 'business'>('creator');
  featuredRequirements = signal<FeaturedRequirement[]>([]);
  featuredLoading = signal(true);

  toggleMobileMenu() {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  async ngOnInit() {
    // Try featured first, fallback to newest
    const { data: featured } = await this.supabaseService.client
      .from('requirements')
      .select('id, title, category, compensation_details, creator_slots, filled_slots, created_at, business:profiles!business_id(business_name, full_name, instagram_handle, city), applications(count)')
      .eq('is_featured', true)
      .in('status', ['open', 'partially_filled'])
      .order('created_at', { ascending: false })
      .limit(6);

    if (featured && featured.length > 0) {
      this.featuredRequirements.set(featured as unknown as FeaturedRequirement[]);
    } else {
      // Fallback to newest
      const { data: newest } = await this.supabaseService.client
        .from('requirements')
        .select('id, title, category, compensation_details, creator_slots, filled_slots, created_at, business:profiles!business_id(business_name, full_name, instagram_handle, city), applications(count)')
        .in('status', ['open', 'partially_filled'])
        .order('created_at', { ascending: false })
        .limit(6);

      if (newest) {
        this.featuredRequirements.set(newest as unknown as FeaturedRequirement[]);
      }
    }
    this.featuredLoading.set(false);
  }

  featuredBusinessName(req: FeaturedRequirement): string {
    return req.business?.business_name || req.business?.full_name || 'Unknown';
  }

  featuredBusinessInitial(req: FeaturedRequirement): string {
    return this.featuredBusinessName(req).replace(/^@/, '').charAt(0).toUpperCase();
  }

  featuredBusinessHandle(req: FeaturedRequirement): string | null {
    const handle = req.business?.instagram_handle;
    if (!handle) return null;
    return handle.startsWith('@') ? handle : `@${handle}`;
  }

  featuredSpotsLeft(req: FeaturedRequirement): number {
    return req.creator_slots - req.filled_slots;
  }

  featuredSpotsText(req: FeaturedRequirement): string {
    const remaining = this.featuredSpotsLeft(req);
    return remaining === 1 ? '1 spot left' : `${remaining} spots left`;
  }

  featuredApplicants(req: FeaturedRequirement): number {
    return req.applications?.[0]?.count ?? 0;
  }

  featuredIsNew(req: FeaturedRequirement): boolean {
    return Date.now() - new Date(req.created_at).getTime() < 48 * 60 * 60 * 1000;
  }

  featuredCity(req: FeaturedRequirement): string {
    return req.business?.city || 'Pune';
  }

  spotsUrgencyClass(req: FeaturedRequirement): string {
    const remaining = this.featuredSpotsLeft(req);
    if (remaining <= 1) return 'ex-card__spots--urgent';
    if (remaining <= 3) return 'ex-card__spots--warning';
    return '';
  }

  // Static example opportunities (fallback if DB is empty)
  readonly opportunities = [
    {
      business: 'The Brew Studio',
      handle: '@brewstudio',
      initial: 'T',
      category: 'Food Review',
      title: 'Looking for food bloggers to review our new menu',
      compensation: '\uD83C\uDF81 Free meal + \u20B92,000 per reel',
      spots: '\uD83D\uDD25 3 spots left',
      applicants: 5,
      location: 'Pune',
      postedAgo: '2 days ago',
      isNew: true,
    },
    {
      business: 'Urban Threads',
      handle: '@urbanthreads',
      initial: 'U',
      category: 'Reel',
      title: 'Instagram Reel collaboration for summer collection launch',
      compensation: '\uD83C\uDF81 \u20B95,000 per reel',
      spots: '\uD83D\uDD25 2 spots left',
      applicants: 12,
      location: 'Pune',
      postedAgo: '5 days ago',
      isNew: false,
    },
    {
      business: 'Caf\u00E9 Mosaic',
      handle: '@cafemosaic',
      initial: 'C',
      category: 'Photoshoot',
      title: 'Photoshoot for cafe ambience and signature drinks',
      compensation: '\uD83C\uDF81 Barter \u2014 free meal for two',
      spots: '\uD83D\uDD25 1 spot left',
      applicants: 8,
      location: 'Pune',
      postedAgo: '1 day ago',
      isNew: true,
    },
  ];
}
