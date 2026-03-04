import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-profile-edit',
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.scss',
  imports: [FormsModule],
})
export class ProfileEdit implements OnInit {
  saving = signal(false);
  error = signal('');
  success = signal('');

  full_name = '';
  phone = '';
  bio = '';
  city = '';
  portfolio_url = '';
  instagram_handle = '';
  business_name = '';
  business_category = '';

  private supabase;

  constructor(
    public auth: AuthService,
    private supabaseService: SupabaseService,
    private router: Router,
  ) {
    this.supabase = this.supabaseService.client;
  }

  ngOnInit() {
    const p = this.auth.profile();
    if (p) {
      this.full_name = p.full_name ?? '';
      this.phone = p.phone ?? '';
      this.bio = p.bio ?? '';
      this.city = p.city ?? '';
      this.portfolio_url = p.portfolio_url ?? '';
      this.instagram_handle = p.instagram_handle ?? '';
      this.business_name = p.business_name ?? '';
      this.business_category = p.business_category ?? '';
    }
  }

  get isValid(): boolean {
    if (!this.full_name.trim()) return false;
    if (this.auth.userRole() === 'business' && !this.business_name.trim()) return false;
    return true;
  }

  async saveProfile() {
    if (!this.isValid) return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    const profile = this.auth.profile();
    if (!profile) return;

    const updates: Record<string, string | null> = {
      full_name: this.full_name.trim(),
      phone: this.phone.trim() || null,
      bio: this.bio.trim() || null,
      city: this.city.trim(),
      portfolio_url: this.portfolio_url.trim() || null,
      instagram_handle: this.instagram_handle.trim() || null,
    };

    if (this.auth.userRole() === 'business') {
      updates['business_name'] = this.business_name.trim();
      updates['business_category'] = this.business_category.trim() || null;
    }

    const { error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) {
      this.error.set(error.message);
    } else {
      await this.auth.refreshProfile();
      this.success.set('Profile updated successfully.');
    }
    this.saving.set(false);
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }
}
