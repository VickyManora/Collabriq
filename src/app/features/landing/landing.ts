import { Component, OnInit, AfterViewInit, OnDestroy, signal, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { CategoryClassPipe } from '../../shared/pipes/category-class.pipe';

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
  imports: [RouterLink, TimeAgoPipe, CategoryClassPipe],
})
export class Landing implements OnInit, AfterViewInit, OnDestroy {
  private observer: IntersectionObserver | null = null;
  private countUpObserver: IntersectionObserver | null = null;

  constructor(
    protected theme: ThemeService,
    private supabaseService: SupabaseService,
    private el: ElementRef<HTMLElement>,
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

  scrollToHowItWorks() {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  }

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('in-view');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    this.countUpObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateCountUp(entry.target as HTMLElement);
            this.countUpObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 },
    );

    const animatedEls = this.el.nativeElement.querySelectorAll('[data-animate]');
    animatedEls.forEach((el) => this.observer!.observe(el));

    const countUpEls = this.el.nativeElement.querySelectorAll('[data-countup]');
    countUpEls.forEach((el) => this.countUpObserver!.observe(el));
  }

  private animateCountUp(el: HTMLElement) {
    const target = parseInt(el.getAttribute('data-countup') || '0', 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const prefix = el.getAttribute('data-prefix') || '';
    const duration = 1500;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = prefix + current.toLocaleString('en-IN') + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.countUpObserver?.disconnect();
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

    // Re-observe any new animated elements rendered after async data load
    setTimeout(() => {
      const newEls = this.el.nativeElement.querySelectorAll('[data-animate]:not(.in-view)');
      newEls.forEach((el) => this.observer?.observe(el));
      const newCountEls = this.el.nativeElement.querySelectorAll('[data-countup]:not(.counted)');
      newCountEls.forEach((el) => this.countUpObserver?.observe(el));
    });
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
    const real = req.applications?.[0]?.count ?? 0;
    if (real > 0) return real;
    // Stable pseudo-random 1–5 based on ID
    let hash = 0;
    for (let i = 0; i < req.id.length; i++) hash = (hash * 31 + req.id.charCodeAt(i)) | 0;
    return (Math.abs(hash) % 5) + 1;
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

  isPaid(comp: string | null): boolean {
    if (!comp) return false;
    const l = comp.toLowerCase();
    return l.includes('paid') || l.includes('₹') || l.includes('rs') || l.includes('inr') || /\d/.test(l);
  }

  isBarter(comp: string | null): boolean {
    if (!comp) return false;
    const l = comp.toLowerCase();
    return l.includes('barter') || l.includes('free product') || l.includes('free meal');
  }

  isHybrid(comp: string | null): boolean {
    return this.isPaid(comp) && this.isBarter(comp);
  }

  compBadgeClass(comp: string | null): string {
    if (this.isHybrid(comp)) return 'ex-card__comp ex-card__comp--hybrid';
    if (this.isPaid(comp)) return 'ex-card__comp ex-card__comp--paid';
    if (this.isBarter(comp)) return 'ex-card__comp ex-card__comp--barter';
    return 'ex-card__comp ex-card__comp--paid';
  }

  formatComp(comp: string | null): string {
    if (!comp) return 'Barter';
    const trimmed = comp.trim();
    if (this.isHybrid(comp)) return trimmed;
    if (this.isPaid(comp)) {
      if (/^\d[\d,. ]*$/.test(trimmed)) return `₹${trimmed} Paid`;
      if (/^rs\.?\s*\d/i.test(trimmed)) return trimmed.replace(/^rs\.?\s*/i, '₹');
      return trimmed;
    }
    if (this.isBarter(comp)) {
      const d = trimmed.toLowerCase();
      if (/free\s*meal|complimentary\s*meal|dinner|lunch|breakfast/i.test(d)) return 'Free meal';
      if (/free\s*product|sample|hamper|goodies|gift/i.test(d)) return 'Free products';
      if (/exchange|barter/i.test(d)) return 'Barter exchange';
      return trimmed;
    }
    return trimmed;
  }

  compIcon(comp: string | null): string {
    if (this.isHybrid(comp)) return '🍽';
    if (this.isPaid(comp)) return '💰';
    return '🎁';
  }

  // Static example opportunities (fallback if DB is empty)
  readonly opportunities = [
    {
      business: 'The Brew Studio',
      handle: '@brewstudio',
      initial: 'T',
      category: 'Food Review',
      title: 'Looking for food bloggers to review our new menu',
      compensation: 'Free meal + \u20B92,000 per reel',
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
      compensation: '\u20B95,000 per reel',
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
      compensation: 'Barter \u2014 free meal for two',
      spots: '\uD83D\uDD25 1 spot left',
      applicants: 8,
      location: 'Pune',
      postedAgo: '1 day ago',
      isNew: true,
    },
  ];
}
