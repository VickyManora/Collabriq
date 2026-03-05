import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  role: UserRole = 'creator';
  email = '';
  password = '';
  fullName = '';
  businessName = '';
  instagramHandle = '';
  error = signal('');
  loading = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
    protected theme: ThemeService,
  ) {}

  async onSubmit() {
    this.error.set('');
    this.loading.set(true);

    const metadata: Record<string, string> = {
      full_name: this.fullName,
      role: this.role,
    };

    if (this.role === 'business') {
      metadata['business_name'] = this.businessName;
    } else {
      metadata['instagram_handle'] = this.instagramHandle;
    }

    const { error } = await this.auth.signUp(this.email, this.password, metadata as any);

    if (error) {
      this.error.set(error.message);
      this.loading.set(false);
      return;
    }

    this.router.navigate(['/pending-approval']);
  }
}
