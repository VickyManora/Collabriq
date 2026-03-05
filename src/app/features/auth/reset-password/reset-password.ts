import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  password = '';
  confirmPassword = '';
  error = signal('');
  loading = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
  ) {}

  async onSubmit() {
    this.error.set('');

    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    try {
      const { error } = await this.auth.updatePassword(this.password);
      if (error) {
        this.error.set(error.message ?? 'Failed to update password. Please try again.');
        this.loading.set(false);
        return;
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'An unexpected error occurred.');
      this.loading.set(false);
      return;
    }
    this.loading.set(false);

    this.toast.success('Password reset successfully!');
    this.router.navigate(['/auth/login']);
  }
}
