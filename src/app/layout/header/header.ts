import { Component, ElementRef, HostListener, OnInit, output, signal, computed } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

type OpenPanel = 'notifications' | 'profile' | null;

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
  imports: [DatePipe, RouterLink],
})
export class Header implements OnInit {
  menuToggle = output<void>();
  openPanel = signal<OpenPanel>(null);
  themeExpanded = signal(false);

  userInitials = computed(() => {
    const name = this.auth.profile()?.full_name ?? '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  });

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

  toggleNotifications() {
    const opening = this.openPanel() !== 'notifications';
    this.openPanel.set(opening ? 'notifications' : null);
    this.themeExpanded.set(false);
    if (opening) {
      this.notificationSvc.fetchNotifications();
    }
  }

  toggleProfileMenu() {
    const opening = this.openPanel() !== 'profile';
    this.openPanel.set(opening ? 'profile' : null);
    this.themeExpanded.set(false);
  }

  closePanel() {
    this.openPanel.set(null);
    this.themeExpanded.set(false);
  }

  onNotificationClick(id: string) {
    this.notificationSvc.markAsRead(id);
  }

  onMarkAllRead() {
    this.notificationSvc.markAllAsRead();
  }

  toggleThemeExpanded() {
    this.themeExpanded.update(v => !v);
  }

  setTheme(mode: ThemeMode) {
    this.theme.setMode(mode);
  }

  onLogout() {
    this.closePanel();
    this.auth.signOut();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.closePanel();
    }
  }
}
