import { Component, ElementRef, HostListener, OnInit, output, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
  imports: [DatePipe, RouterLink],
})
export class Header implements OnInit {
  menuToggle = output<void>();
  dropdownOpen = signal(false);
  themeMenuOpen = signal(false);

  constructor(
    protected auth: AuthService,
    protected notificationSvc: NotificationService,
    protected theme: ThemeService,
    private elRef: ElementRef,
  ) {}

  ngOnInit() {
    this.notificationSvc.fetchNotifications();
  }

  onToggleMenu() {
    this.menuToggle.emit();
  }

  onLogout() {
    this.auth.signOut();
  }

  toggleDropdown() {
    const opening = !this.dropdownOpen();
    this.dropdownOpen.set(opening);
    if (opening) {
      this.notificationSvc.fetchNotifications();
    }
  }

  onNotificationClick(id: string) {
    this.notificationSvc.markAsRead(id);
  }

  onMarkAllRead() {
    this.notificationSvc.markAllAsRead();
  }

  toggleThemeMenu() {
    this.themeMenuOpen.update(v => !v);
  }

  setTheme(mode: ThemeMode) {
    this.theme.setMode(mode);
    this.themeMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
      this.themeMenuOpen.set(false);
    }
  }
}
