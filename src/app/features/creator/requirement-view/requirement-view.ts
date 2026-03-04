import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CreatorService, RequirementWithBusiness } from '../../../core/services/creator.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClosesInPipe } from '../../../shared/pipes/closes-in.pipe';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { Application } from '../../../core/models/application.model';

@Component({
  selector: 'app-requirement-view',
  templateUrl: './requirement-view.html',
  styleUrl: './requirement-view.scss',
  imports: [FormsModule, DatePipe, ClosesInPipe, ConfirmDialog],
})
export class RequirementView implements OnInit {
  requirement = signal<RequirementWithBusiness | null>(null);
  existingApplication = signal<Application | null>(null);
  loading = signal(true);
  applying = signal(false);
  withdrawing = signal(false);
  error = signal('');
  confirmAction = signal<string | null>(null);

  pitch = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private creatorService: CreatorService,
    private toast: ToastService,
  ) {}

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

  get canApply(): boolean {
    return !this.existingApplication() && !!this.requirement();
  }

  get canWithdraw(): boolean {
    return this.existingApplication()?.status === 'applied';
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
