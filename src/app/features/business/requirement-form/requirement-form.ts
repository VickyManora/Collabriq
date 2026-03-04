import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RequirementService } from '../../../core/services/requirement.service';
import { ToastService } from '../../../core/services/toast.service';
import { Requirement } from '../../../core/models/requirement.model';

@Component({
  selector: 'app-requirement-form',
  templateUrl: './requirement-form.html',
  styleUrl: './requirement-form.scss',
  imports: [FormsModule],
})
export class RequirementForm implements OnInit {
  isEdit = false;
  requirementId: string | null = null;
  loading = signal(false);
  saving = signal(false);
  error = signal('');

  title = '';
  description = '';
  category: string | null = null;
  creatorSlots = 1;
  compensationDetails = '';

  readonly categories = [
    'Food Review',
    'Reel',
    'Photoshoot',
    'Blog Post',
    'Social Media Post',
    'Other',
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reqService: RequirementService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.requirementId = this.route.snapshot.paramMap.get('id');
    if (this.requirementId) {
      this.isEdit = true;
      this.loadRequirement(this.requirementId);
    }
  }

  async loadRequirement(id: string) {
    this.loading.set(true);
    const { data, error } = await this.reqService.getRequirement(id);
    if (data && !error) {
      if (data.status !== 'draft') {
        this.router.navigate(['/business/requirements', id]);
        return;
      }
      this.title = data.title;
      this.description = data.description;
      this.category = data.category;
      this.creatorSlots = data.creator_slots;
      this.compensationDetails = data.compensation_details ?? '';
    } else {
      this.error.set('Requirement not found.');
    }
    this.loading.set(false);
  }

  get isValid(): boolean {
    return (
      this.title.trim().length > 0 &&
      this.description.trim().length > 0 &&
      this.creatorSlots >= 1 &&
      this.creatorSlots <= 10
    );
  }

  async saveDraft() {
    if (!this.isValid) return;
    this.saving.set(true);
    this.error.set('');

    const payload = {
      title: this.title.trim(),
      description: this.description.trim(),
      category: this.category,
      creator_slots: this.creatorSlots,
      compensation_details: this.compensationDetails.trim() || null,
    };

    const result = this.isEdit
      ? await this.reqService.updateRequirement(this.requirementId!, payload)
      : await this.reqService.createRequirement(payload);

    if (result.error) {
      this.error.set(result.error.message);
      this.toast.error('Failed to save draft.');
    } else {
      this.toast.success('Draft saved.');
      this.router.navigate(['/business/requirements']);
    }
    this.saving.set(false);
  }

  async submitForApproval() {
    if (!this.isValid) return;
    this.saving.set(true);
    this.error.set('');

    let id = this.requirementId;

    if (!this.isEdit) {
      const payload = {
        title: this.title.trim(),
        description: this.description.trim(),
        category: this.category,
        creator_slots: this.creatorSlots,
        compensation_details: this.compensationDetails.trim() || null,
      };
      const { data, error } = await this.reqService.createRequirement(payload);
      if (error || !data) {
        this.error.set(error?.message ?? 'Failed to create requirement.');
        this.saving.set(false);
        return;
      }
      id = data.id;
    } else {
      const payload = {
        title: this.title.trim(),
        description: this.description.trim(),
        category: this.category,
        creator_slots: this.creatorSlots,
        compensation_details: this.compensationDetails.trim() || null,
      };
      const { error } = await this.reqService.updateRequirement(id!, payload);
      if (error) {
        this.error.set(error.message);
        this.saving.set(false);
        return;
      }
    }

    const { error } = await this.reqService.submitForApproval(id!);
    if (error) {
      this.error.set(error.message);
      this.toast.error('Failed to submit.');
    } else {
      this.toast.success('Submitted for approval.');
      this.router.navigate(['/business/requirements']);
    }
    this.saving.set(false);
  }

  cancel() {
    this.router.navigate(['/business/requirements']);
  }
}
