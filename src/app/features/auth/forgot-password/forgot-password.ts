import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  email = '';
  loading = signal(false);
  submitted = signal(false);

  constructor(private auth: AuthService) {}

  async onSubmit() {
    if (!this.email.trim()) return;
    this.loading.set(true);
    await this.auth.resetPasswordForEmail(this.email.trim());
    this.loading.set(false);
    this.submitted.set(true);
  }
}
