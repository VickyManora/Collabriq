import { Component, computed, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { Toast } from '../../shared/toast/toast';
import { AuthService } from '../../core/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Header, Sidebar, Toast],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  sidebarOpen = signal(false);
  private currentUrl = signal('');

  showRejectedBanner = computed(() =>
    this.auth.isRejected() && !this.currentUrl().startsWith('/profile'),
  );

  constructor(
    protected auth: AuthService,
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
}
