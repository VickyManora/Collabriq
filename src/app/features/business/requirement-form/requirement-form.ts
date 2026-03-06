import { Component, OnInit, signal, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RequirementService } from '../../../core/services/requirement.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PendingBanner } from '../../../shared/pending-banner/pending-banner';
import { ProfileGateModal } from '../../../shared/profile-gate-modal/profile-gate-modal';
import { Requirement } from '../../../core/models/requirement.model';

interface Suggestion {
  title: string;
  description: string;
}

@Component({
  selector: 'app-requirement-form',
  templateUrl: './requirement-form.html',
  styleUrl: './requirement-form.scss',
  imports: [FormsModule, PendingBanner, ProfileGateModal],
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
  location: string | null = 'Pune';
  creatorSlots = 3;
  compensationDetails = '';

  readonly locations = ['Pune', 'Mumbai', 'Remote'];

  // Generator state
  showGenerator = signal(false);
  generatorStep = signal<'options' | 'results'>('options');
  genContentType = '';
  genCompensationType = '';
  genGoal = '';
  suggestions = signal<Suggestion[]>([]);
  paidSelected = signal(false);
  categoryOpen = signal(false);
  locationOpen = signal(false);
  showProfileGate = signal(false);

  readonly contentTypes = ['Reel', 'Reel + Stories', 'Photoshoot', 'Social Media Post'];
  readonly compensationTypes = ['Barter', 'Free Product', 'Paid'];
  readonly goals = ['Promote new menu', 'Brand awareness', 'Product launch', 'General collaboration'];

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
    private auth: AuthService,
    private toast: ToastService,
    private elRef: ElementRef,
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const dropdowns = this.elRef.nativeElement.querySelectorAll('.req-form__dropdown');
    const clickedInside = Array.from(dropdowns).some((el: any) => el.contains(event.target as Node));
    if (!clickedInside) {
      this.categoryOpen.set(false);
      this.locationOpen.set(false);
    }
  }

  toggleCategory() {
    this.categoryOpen.set(!this.categoryOpen());
    this.locationOpen.set(false);
  }

  selectCategory(cat: string | null) {
    this.category = cat;
    this.categoryOpen.set(false);
  }

  get categoryLabel(): string {
    return this.category ?? 'Select category';
  }

  toggleLocation() {
    this.locationOpen.set(!this.locationOpen());
    this.categoryOpen.set(false);
  }

  selectLocation(loc: string) {
    this.location = loc;
    this.locationOpen.set(false);
  }

  get isPending(): boolean {
    return this.auth.isPending();
  }

  get isProfileComplete(): boolean {
    const p = this.auth.profile();
    return !!p?.phone?.trim() && (!!p?.instagram_handle?.trim() || !!p?.portfolio_url?.trim());
  }

  attemptSubmitForApproval() {
    if (this.isPending) {
      this.toast.error('Your account is pending approval. This action will unlock once your account is approved.');
      return;
    }
    if (!this.isProfileComplete) {
      this.showProfileGate.set(true);
      return;
    }
    this.submitForApproval();
  }

  onProfileGateClose() {
    this.showProfileGate.set(false);
  }

  onGoToProfile() {
    this.router.navigate(['/profile']);
  }

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
      this.location = data.location ?? 'Pune';
      this.creatorSlots = data.creator_slots;
      this.compensationDetails = data.compensation_details ?? '';
    } else {
      this.error.set('Requirement not found.');
    }
    this.loading.set(false);
  }

  get isValid(): boolean {
    const base =
      this.title.trim().length > 0 &&
      this.description.trim().length > 0 &&
      this.creatorSlots >= 1 &&
      this.creatorSlots <= 10;

    if (this.paidSelected()) {
      return base && this.compensationDetails.trim().length > 0;
    }
    return base;
  }

  async saveDraft() {
    if (!this.isValid) return;
    this.saving.set(true);
    this.error.set('');

    const payload = {
      title: this.title.trim(),
      description: this.description.trim(),
      category: this.category,
      location: this.location,
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
        location: this.location,
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
        location: this.location,
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

  openGenerator() {
    this.genContentType = '';
    this.genCompensationType = '';
    this.genGoal = '';
    this.generatorStep.set('options');
    this.suggestions.set([]);
    this.showGenerator.set(true);
  }

  closeGenerator() {
    this.showGenerator.set(false);
  }

  get canGenerate(): boolean {
    return !!this.genContentType && !!this.genCompensationType && !!this.genGoal;
  }

  generateSuggestions() {
    const biz = this.auth.profile()?.business_name || this.auth.profile()?.full_name || 'Our Business';
    const content = this.genContentType;
    const comp = this.genCompensationType;
    const goal = this.genGoal;

    const compDesc = comp === 'Barter' ? 'a barter (exchange-based)' : comp === 'Free Product' ? 'a complimentary product' : 'a paid';
    const compBrief = comp === 'Barter' ? 'Product exchange included' : comp === 'Free Product' ? 'Free product provided' : 'Paid collaboration';

    const goalMap: Record<string, string> = {
      'Promote new menu': 'showcasing our latest menu items',
      'Brand awareness': 'increasing brand visibility and reach',
      'Product launch': 'promoting our exciting new product launch',
      'General collaboration': 'creating engaging content together',
    };
    const goalPhrase = goalMap[goal] || 'creating great content';

    const contentLower = content.toLowerCase();

    const tasksByContent: Record<string, string[]> = {
      'Reel': [
        `Create 1 Instagram reel featuring ${biz}`,
        `Post the reel as a collab post with ${biz} on Instagram`,
        `Tag ${biz} and use provided hashtags`,
        'Post within the agreed timeline',
      ],
      'Reel + Stories': [
        `Create 1 Instagram reel and 2-3 stories featuring ${biz}`,
        `Post the reel as a collab post with ${biz} on Instagram`,
        `Tag ${biz} in all stories and use provided hashtags`,
        'Share a behind-the-scenes story during the visit',
      ],
      'Photoshoot': [
        `Create a photoshoot featuring ${biz}'s products/space`,
        'Deliver 5-8 high-quality edited photos',
        `Post 1 carousel as a collab post with ${biz} on Instagram`,
        `Tag ${biz} and use provided hashtags`,
      ],
      'Social Media Post': [
        `Create 1 Instagram post about ${biz}`,
        `Post it as a collab post with ${biz} on Instagram`,
        'Write an engaging caption with brand mentions',
        `Tag ${biz} and use provided hashtags`,
      ],
    };

    const tasks = tasksByContent[content] || [
      `Create ${contentLower} content for ${biz}`,
      `Post the content as a collab with ${biz} on Instagram`,
      `Tag ${biz} in the published content`,
      'Deliver within the agreed timeline',
    ];

    const compItems: string[] = [];
    if (comp === 'Paid') {
      compItems.push('Paid compensation (amount discussed on acceptance)');
    } else if (comp === 'Free Product') {
      compItems.push('Complimentary product/service from ' + biz);
    } else {
      compItems.push('Product/service exchange (barter)');
    }
    compItems.push('Exposure to ' + biz + "'s audience");
    if (goal === 'Product launch') compItems.push('Early access to new products');

    const buildDesc = (taskList: string[], getList: string[]): string => {
      return `What you'll do\n${taskList.map(t => '• ' + t).join('\n')}\n\nWhat you'll get\n${getList.map(g => '• ' + g).join('\n')}`;
    };

    const suggestions: Suggestion[] = [
      {
        title: `${content} Collaboration for ${biz}`,
        description: buildDesc(tasks, compItems),
      },
      {
        title: `Creators Wanted: ${content} - ${goal}`,
        description: buildDesc(
          [
            `Produce a ${contentLower} focused on ${goalPhrase}`,
            `Highlight ${biz}'s unique offerings authentically`,
            `Post as a collab with ${biz} on Instagram`,
            `Use our branded hashtags in the caption`,
          ],
          compItems,
        ),
      },
      {
        title: `${goal} - ${content} with ${biz}`,
        description: buildDesc(
          [
            `Visit ${biz} and create ${contentLower} content`,
            `Capture the experience with authentic storytelling`,
            `Publish as a collab post with ${biz} within 48 hours`,
            `Tag ${biz} and use provided hashtags`,
          ],
          [...compItems, 'Potential for ongoing collaboration'],
        ),
      },
    ];

    this.suggestions.set(suggestions);
    this.generatorStep.set('results');
  }

  useSuggestion(suggestion: Suggestion) {
    this.title = suggestion.title;
    this.description = suggestion.description;

    // Auto-set category based on content type
    const categoryMap: Record<string, string> = {
      'Reel': 'Reel',
      'Reel + Stories': 'Reel',
      'Photoshoot': 'Photoshoot',
      'Social Media Post': 'Social Media Post',
    };
    if (categoryMap[this.genContentType]) {
      this.category = categoryMap[this.genContentType];
    }

    this.paidSelected.set(this.genCompensationType === 'Paid');
    this.creatorSlots = 3;

    this.closeGenerator();
    this.toast.success('Suggestion applied!');
  }

  cancel() {
    this.router.navigate(['/business/requirements']);
  }
}
