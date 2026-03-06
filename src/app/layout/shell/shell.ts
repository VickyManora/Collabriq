import { Component, computed, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { Toast } from '../../shared/toast/toast';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Header, Sidebar, Toast],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  sidebarOpen = signal(false);
  reapplying = signal(false);
  private currentUrl = signal('');

  showRejectedBanner = computed(() =>
    this.auth.isRejected() && !this.currentUrl().startsWith('/profile'),
  );

  constructor(
    protected auth: AuthService,
    private toast: ToastService,
    private router: Router,
  ) {
    this.currentUrl.set(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.currentUrl.set(e.urlAfterRedirects));
  }

  onMenuToggle() {
    this.sidebarOpen.update((v) => !v);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  async reapply() {
    this.reapplying.set(true);
    const { error } = await this.auth.reapplyForApproval();
    if (error) {
      this.toast.error('Failed to reapply. Please try again.');
    } else {
      this.toast.success('Your profile has been resubmitted for approval.');
    }
    this.reapplying.set(false);
  }
}
