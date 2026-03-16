import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup implements OnInit {
  role: UserRole = 'creator';
  email = '';
  password = '';
  fullName = '';
  businessName = '';
  city = '';
  phone = '';
  instagramHandle = '';
  error = signal('');
  loading = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    protected theme: ThemeService,
  ) {}

  ngOnInit() {
    const roleParam = this.route.snapshot.queryParamMap.get('role');
    if (roleParam === 'creator' || roleParam === 'business') {
      this.role = roleParam;
    }
  }

  get isValid(): boolean {
    const base =
      this.fullName.trim().length > 0 &&
      this.email.trim().length > 0 &&
      this.password.length >= 6;

    if (this.role === 'creator') {
      return base && this.instagramHandle.trim().length > 0;
    }

    // business
    return (
      base &&
      this.businessName.trim().length > 0 &&
      this.city.trim().length > 0 &&
      this.phone.trim().length > 0
    );
  }

  async onSubmit() {
    if (!this.isValid) return;
    this.error.set('');
    this.loading.set(true);

    const metadata: Record<string, string> = {
      full_name: this.fullName.trim(),
      role: this.role,
    };

    if (this.role === 'business') {
      metadata['business_name'] = this.businessName.trim();
      metadata['city'] = this.city.trim();
      metadata['phone'] = this.phone.trim();
      if (this.instagramHandle.trim()) {
        metadata['instagram_handle'] = this.instagramHandle.trim();
      }
    } else {
      metadata['instagram_handle'] = this.instagramHandle.trim();
    }

    const { error } = await this.auth.signUp(this.email, this.password, metadata as any);

    if (error) {
      this.error.set(error.message);
      this.loading.set(false);
      return;
    }

    this.router.navigate(['/dashboard']);
  }
}
