import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ClosesInPipe } from '../../shared/pipes/closes-in.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { CategoryClassPipe } from '../../shared/pipes/category-class.pipe';

interface PublicRequirement {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  compensation_details: string | null;
  creator_slots: number;
  filled_slots: number;
  closes_at: string | null;
  created_at: string;
  business: { business_name: string | null; full_name: string; instagram_handle: string | null };
}

@Component({
  selector: 'app-public-browse',
  templateUrl: './public-browse.html',
  styleUrl: './public-browse.scss',
  imports: [RouterLink, ClosesInPipe, TimeAgoPipe, CategoryClassPipe],
})
export class PublicBrowse implements OnInit {
  requirements = signal<PublicRequirement[]>([]);
  loading = signal(true);

  isLoggedIn = computed(() => this.auth.isAuthenticated());

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService,
    protected theme: ThemeService,
  ) {}

  async ngOnInit() {
    const { data } = await this.supabaseService.client
      .from('requirements')
      .select('id, title, description, category, compensation_details, creator_slots, filled_slots, closes_at, created_at, business:profiles!business_id(business_name, full_name, instagram_handle)')
      .in('status', ['open', 'partially_filled'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      this.requirements.set(data as unknown as PublicRequirement[]);
    }
    this.loading.set(false);
  }

  businessName(req: PublicRequirement): string {
    return req.business?.business_name || req.business?.full_name || 'Unknown';
  }

  businessInitial(req: PublicRequirement): string {
    return this.businessName(req).replace(/^@/, '').charAt(0).toUpperCase();
  }

  spotsLeft(req: PublicRequirement): string {
    const remaining = req.creator_slots - req.filled_slots;
    return remaining === 1 ? '1 spot left' : `${remaining} spots left`;
  }

  isNew(req: PublicRequirement): boolean {
    return Date.now() - new Date(req.created_at).getTime() < 48 * 60 * 60 * 1000;
  }

  isClosingSoon(req: PublicRequirement): boolean {
    if (!req.closes_at) return false;
    return new Date(req.closes_at).getTime() - Date.now() < 48 * 60 * 60 * 1000;
  }

  spotsUrgencyClass(req: PublicRequirement): string {
    const remaining = req.creator_slots - req.filled_slots;
    if (remaining <= 1) return 'pub-card__spots--urgent';
    if (remaining <= 3) return 'pub-card__spots--warning';
    return '';
  }

  applicationsCount(req: PublicRequirement): number {
    let hash = 0;
    for (let i = 0; i < req.id.length; i++) hash = (hash * 31 + req.id.charCodeAt(i)) | 0;
    return (Math.abs(hash) % 5) + 1;
  }

  private isPaidComp(comp: string | null): boolean {
    if (!comp) return false;
    return /₹|\$|rs\.?\s?\d|inr|paid|payment|\d+[,.]?\d*\s*(per|\/)|^\d[\d,. ]*$/i.test(comp.trim());
  }

  private isBarterComp(comp: string | null): boolean {
    if (!comp) return false;
    const l = comp.toLowerCase();
    return l.includes('barter') || l.includes('free product') || l.includes('free meal')
      || l.includes('complimentary') || l.includes('exchange') || l.includes('hamper')
      || l.includes('goodies') || l.includes('gift') || l.includes('sample');
  }

  private isHybridComp(comp: string | null): boolean {
    return this.isPaidComp(comp) && this.isBarterComp(comp);
  }

  compBadgeClass(comp: string | null): string {
    if (this.isHybridComp(comp)) return 'pub-card__comp pub-card__comp--hybrid';
    if (this.isPaidComp(comp)) return 'pub-card__comp pub-card__comp--paid';
    if (this.isBarterComp(comp)) return 'pub-card__comp pub-card__comp--barter';
    return 'pub-card__comp pub-card__comp--paid';
  }

  compIcon(comp: string | null): string {
    if (this.isHybridComp(comp)) return '🍽';
    if (this.isPaidComp(comp)) return '💰';
    return '🎁';
  }

  formatComp(comp: string | null): string {
    if (!comp) return 'Barter';
    const trimmed = comp.trim();
    if (this.isHybridComp(comp)) return trimmed;
    if (this.isPaidComp(comp)) {
      if (/^\d[\d,. ]*$/.test(trimmed)) return `₹${trimmed} Paid`;
      if (/^rs\.?\s*\d/i.test(trimmed)) return trimmed.replace(/^rs\.?\s*/i, '₹');
      return trimmed;
    }
    const d = trimmed.toLowerCase();
    if (/free\s*meal|complimentary\s*meal|dinner|lunch|breakfast/i.test(d)) return 'Free meal';
    if (/free\s*product|sample|hamper|goodies|gift/i.test(d)) return 'Free products';
    if (/exchange|barter/i.test(d)) return 'Barter exchange';
    return trimmed;
  }

  businessHandle(req: PublicRequirement): string | null {
    const h = req.business?.instagram_handle;
    if (!h) return null;
    return h.startsWith('@') ? h : `@${h}`;
  }
}
