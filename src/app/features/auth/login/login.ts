import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  error = signal('');
  loading = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  async onSubmit() {
    this.error.set('');
    this.loading.set(true);

    const { error } = await this.auth.signIn(this.email, this.password);

    if (error) {
      this.error.set(error.message);
      this.loading.set(false);
      return;
    }

    this.router.navigate(['/dashboard']);
  }
}
