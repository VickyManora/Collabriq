import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ClosesInPipe } from '../../shared/pipes/closes-in.pipe';

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
  imports: [RouterLink, ClosesInPipe],
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
}
