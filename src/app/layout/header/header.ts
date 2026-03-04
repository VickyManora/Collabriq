import { Component, ElementRef, HostListener, OnInit, output, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
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

  constructor(
    protected auth: AuthService,
    protected notificationSvc: NotificationService,
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.dropdownOpen() && !this.elRef.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }
}
