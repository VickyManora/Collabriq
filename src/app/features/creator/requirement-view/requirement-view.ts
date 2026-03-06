import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CreatorService, RequirementWithBusiness } from '../../../core/services/creator.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { PendingBanner } from '../../../shared/pending-banner/pending-banner';
import { ProfileGateModal } from '../../../shared/profile-gate-modal/profile-gate-modal';
import { InstagramLink } from '../../../shared/instagram-link/instagram-link';
import { Application } from '../../../core/models/application.model';

@Component({
  selector: 'app-requirement-view',
  templateUrl: './requirement-view.html',
  styleUrl: './requirement-view.scss',
  imports: [FormsModule, DatePipe, ClosesInPipe, ConfirmDialog, RouterLink, PendingBanner, ProfileGateModal, InstagramLink],
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

  pitch = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private creatorService: CreatorService,
    private auth: AuthService,
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
    this.router.navigate(['/creator/browse']);
  }

  viewBusiness() {
    const id = this.requirement()?.business_id;
    if (id) this.router.navigate(['/creator/business', id]);
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
