import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CreatorService, RequirementWithBusiness } from '../../../core/services/creator.service';
import { RequirementService } from '../../../core/services/requirement.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { CategoryClassPipe } from '../../../shared/pipes/category-class.pipe';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { PendingBanner } from '../../../shared/pending-banner/pending-banner';
import { ProfileGateModal } from '../../../shared/profile-gate-modal/profile-gate-modal';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';
import { Application } from '../../../core/models/application.model';

@Component({
  selector: 'app-requirement-view',
  templateUrl: './requirement-view.html',
  styleUrl: './requirement-view.scss',
  imports: [FormsModule, DatePipe, ClosesInPipe, TimeAgoPipe, CategoryClassPipe, ConfirmDialog, RouterLink, PendingBanner, ProfileGateModal, InstagramLink],
})
export class RequirementView implements OnInit {
  requirement = signal<RequirementWithBusiness | null>(null);
  existingApplication = signal<Application | null>(null);
  loading = signal(true);
  applying = signal(false);
  withdrawing = signal(false);
  error = signal('');
  confirmAction = signal<string | null>(null);
  showProfileGate = signal(false);
  ratingInfo = signal<{ avg: number; count: number }>({ avg: 0, count: 0 });
  saved = signal(false);

  pitch = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private creatorService: CreatorService,
    private reqService: RequirementService,
    protected auth: AuthService,
    private toast: ToastService,
  ) {}

  get isPending(): boolean {
    return this.auth.isPending();
  }

  get isProfileComplete(): boolean {
    const p = this.auth.profile();
    return !!p?.instagram_handle?.trim() && !!p?.phone?.trim();
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadData(id);
  }

  async loadData(id: string) {
    this.loading.set(true);
    this.error.set('');

    const [reqResult, appResult] = await Promise.all([
      this.creatorService.getRequirement(id),
      this.creatorService.getMyApplicationForRequirement(id),
    ]);

    if (reqResult.data && !reqResult.error) {
      this.requirement.set(reqResult.data);
    } else {
      this.error.set('Requirement not found or no longer open.');
    }

    if (appResult.data && !appResult.error) {
      this.existingApplication.set(appResult.data);
    }

    // Load creator rating
    const userId = this.auth.profile()?.id;
    if (userId) {
      this.reqService.getCreatorAverageRating(userId).then(r => this.ratingInfo.set(r));
    }

    // Load saved state from localStorage
    this.saved.set(this.getSavedIds().includes(id));

    this.loading.set(false);
  }

  businessDisplayName(): string {
    const req = this.requirement();
    return req?.business?.business_name || req?.business?.full_name || 'Unknown';
  }

  businessInitial(): string {
    return this.businessDisplayName().replace(/^@/, '').charAt(0).toUpperCase();
  }

  businessHandle(): string | null {
    return this.requirement()?.business?.instagram_handle?.replace(/^@/, '') || null;
  }

  spotsRemaining(): number {
    const req = this.requirement();
    return req ? req.creator_slots - req.filled_slots : 0;
  }

  applicationsCount(): number {
    return this.requirement()?.applications?.[0]?.count ?? 0;
  }

  displayApplicants(): number {
    const real = this.applicationsCount();
    if (real > 0) return real;
    // Seed a consistent pseudo-random number (1-5) based on requirement ID
    const id = this.requirement()?.id ?? '';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 5) + 1;
  }

  get canApply(): boolean {
    return !this.existingApplication() && !!this.requirement();
  }

  get canWithdraw(): boolean {
    return this.existingApplication()?.status === 'applied';
  }

  attemptApply() {
    if (this.isPending) {
      this.toast.error('Your account is pending approval. This action will unlock once your account is approved.');
      return;
    }
    if (!this.isProfileComplete) {
      this.showProfileGate.set(true);
      return;
    }
    this.apply();
  }

  onProfileGateClose() {
    this.showProfileGate.set(false);
  }

  onGoToProfile() {
    this.router.navigate(['/profile']);
  }

  async apply() {
    if (!this.canApply) return;
    this.applying.set(true);
    this.error.set('');

    const { data, error } = await this.creatorService.applyToRequirement(
      this.requirement()!.id,
      this.pitch,
    );

    if (error) {
      this.error.set(error.message);
      this.toast.error('Failed to submit application.');
    } else if (data) {
      this.existingApplication.set(data);
      this.toast.success('Application submitted!');
      this.pitch = '';
    }
    this.applying.set(false);
  }

  promptWithdraw() {
    this.confirmAction.set('withdraw');
  }

  async onConfirmWithdraw() {
    this.confirmAction.set(null);
    if (!this.canWithdraw) return;
    this.withdrawing.set(true);
    this.error.set('');

    const { data, error } = await this.creatorService.withdrawApplication(
      this.existingApplication()!.id,
    );

    if (error) {
      this.error.set(error.message);
      this.toast.error('Failed to withdraw application.');
    } else if (data) {
      this.existingApplication.set(data);
      this.toast.success('Application withdrawn.');
    }
    this.withdrawing.set(false);
  }

  onCancelWithdraw() {
    this.confirmAction.set(null);
  }

  goBack() {
    this.location.back();
  }

  viewBusiness() {
    const id = this.requirement()?.business_id;
    if (id) this.router.navigate(['/creator/business', id]);
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

  parsedSections(): { doItems: string[]; getItems: string[]; remaining: string } {
    const desc = this.requirement()?.description ?? '';
    const doItems: string[] = [];
    const getItems: string[] = [];
    let remaining = '';

    const doMatch = desc.match(/What you['']ll do\s*\n([\s\S]*?)(?=What you['']ll get|$)/i);
    const getMatch = desc.match(/What you['']ll get\s*\n([\s\S]*?)$/i);

    if (doMatch) {
      doItems.push(...this.extractBullets(doMatch[1]));
    }
    if (getMatch) {
      getItems.push(...this.extractBullets(getMatch[1]));
    }

    if (doItems.length === 0 && getItems.length === 0) {
      remaining = desc;
    }

    return { doItems, getItems, remaining };
  }

  private extractBullets(text: string): string[] {
    return text
      .split('\n')
      .map(line => line.replace(/^[\s•\-\*]+/, '').trim())
      .filter(line => line.length > 0);
  }

  creatorInitial(): string {
    return (this.auth.profile()?.full_name ?? '?').charAt(0).toUpperCase();
  }

  creatorHandle(): string | null {
    return this.auth.profile()?.instagram_handle?.replace(/^@/, '') || null;
  }

  creatorRating(): string | null {
    const info = this.ratingInfo();
    if (info.count === 0) return null;
    return `${info.avg.toFixed(1)} (${info.count})`;
  }

  isSaved(): boolean {
    return this.saved();
  }

  toggleSave(event: Event) {
    event.stopPropagation();
    const id = this.requirement()?.id;
    if (!id) return;
    const ids = this.getSavedIds();
    if (ids.includes(id)) {
      this.saved.set(false);
      localStorage.setItem('saved_requirements', JSON.stringify(ids.filter(i => i !== id)));
      this.toast.success('Removed from saved');
    } else {
      this.saved.set(true);
      localStorage.setItem('saved_requirements', JSON.stringify([...ids, id]));
      this.toast.success('Saved for later');
    }
  }

  private getSavedIds(): string[] {
    try {
      return JSON.parse(localStorage.getItem('saved_requirements') || '[]');
    } catch {
      return [];
    }
  }

  scrollToApply() {
    document.getElementById('apply-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  appStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      applied: 'Applied',
      accepted: 'Accepted',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
    };
    return labels[status] ?? status;
  }
}
