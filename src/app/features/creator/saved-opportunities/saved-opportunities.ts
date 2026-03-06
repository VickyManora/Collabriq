import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CreatorService, RequirementWithBusiness } from '../../../core/services/creator.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { CategoryClassPipe } from '../../../shared/pipes/category-class.pipe';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';

@Component({
  selector: 'app-saved-opportunities',
  templateUrl: './saved-opportunities.html',
  styleUrl: './saved-opportunities.scss',
  imports: [DatePipe, ClosesInPipe, TimeAgoPipe, CategoryClassPipe, InstagramLink],
})
export class SavedOpportunities implements OnInit {
  requirements = signal<RequirementWithBusiness[]>([]);
  loading = signal(true);

  constructor(
    private creatorService: CreatorService,
    private router: Router,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.loadSaved();
  }

  async loadSaved() {
    this.loading.set(true);
    const ids = this.getSavedIds();

    if (ids.length === 0) {
      this.loading.set(false);
      return;
    }

    const { data, error } = await this.creatorService.getRequirementsByIds(ids);
    if (data && !error) {
      this.requirements.set(data);
      // Clean up IDs for requirements that no longer exist or are closed
      const validIds = data.map(r => r.id);
      const cleanedIds = ids.filter(id => validIds.includes(id));
      if (cleanedIds.length !== ids.length) {
        localStorage.setItem('saved_requirements', JSON.stringify(cleanedIds));
      }
    }
    this.loading.set(false);
  }

  private getSavedIds(): string[] {
    try {
      return JSON.parse(localStorage.getItem('saved_requirements') || '[]');
    } catch {
      return [];
    }
  }

  unsave(event: Event, id: string) {
    event.stopPropagation();
    const ids = this.getSavedIds().filter(i => i !== id);
    localStorage.setItem('saved_requirements', JSON.stringify(ids));
    this.requirements.update(reqs => reqs.filter(r => r.id !== id));
    this.toast.success('Removed from saved');
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

  spotsRemaining(req: RequirementWithBusiness): number {
    return req.creator_slots - req.filled_slots;
  }

  isPaid(req: RequirementWithBusiness): boolean {
    const d = req.compensation_details ?? '';
    return /₹|\$|rs\.?\s?\d|inr|paid|payment|\d+[,.]?\d*\s*(per|\/)|^\d[\d,. ]*$/i.test(d.trim());
  }

  formatCompensation(details: string): string {
    const trimmed = details.trim();
    if (/^\d[\d,. ]*$/.test(trimmed)) return `₹${trimmed}`;
    if (/^rs\.?\s*\d/i.test(trimmed)) return trimmed.replace(/^rs\.?\s*/i, '₹');
    return trimmed;
  }

  formatBarter(details: string): string {
    const d = details.toLowerCase().trim();
    if (/free\s*meal|complimentary\s*meal|dinner|lunch|breakfast/i.test(d)) return 'Free meal';
    if (/free\s*product|sample|hamper|goodies|gift/i.test(d)) return 'Free product';
    if (/exchange|barter/i.test(d)) return 'Barter exchange';
    return details.trim();
  }

  isClosingSoon(req: RequirementWithBusiness): boolean {
    if (!req.closes_at) return false;
    return new Date(req.closes_at).getTime() - Date.now() < 48 * 60 * 60 * 1000;
  }

  applicationsCount(req: RequirementWithBusiness): number {
    return req.applications?.[0]?.count ?? 0;
  }

  browsePage() {
    this.router.navigate(['/creator/browse']);
  }
}
