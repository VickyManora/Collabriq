import { Injectable, signal, computed, effect, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Notification, NotificationType } from '../models/notification.model';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private notificationsSignal = signal<Notification[]>([]);
  private realtimeChannel: RealtimeChannel | null = null;
  private originalFavicon: string | null = null;
  private faviconEl: HTMLLinkElement | null = null;

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly unreadCount = computed(() =>
    this.notificationsSignal().filter((n) => !n.is_read).length,
  );

  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService,
  ) {
    this.supabase = this.supabaseService.client;

    effect(() => {
      this.updateFaviconBadge(this.unreadCount());
    });
  }

  private updateFaviconBadge(count: number) {
    if (typeof document === 'undefined') return;

    if (!this.faviconEl) {
      this.faviconEl = document.querySelector('link[rel="icon"]');
    }
    if (!this.faviconEl) return;

    if (!this.originalFavicon) {
      this.originalFavicon = this.faviconEl.href;
    }

    if (count === 0) {
      this.faviconEl.href = this.originalFavicon;
      document.title = document.title.replace(/^\(\d+\)\s*/, '');
      return;
    }

    // Update tab title
    const cleanTitle = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = `(${count}) ${cleanTitle}`;

    // Draw favicon with red dot
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 32;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      ctx.drawImage(img, 0, 0, size, size);

      // Red dot
      const dotRadius = 7;
      const x = size - dotRadius;
      const y = dotRadius;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Count number if <= 9
      if (count <= 9) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(count), x, y + 0.5);
      }

      this.faviconEl!.href = canvas.toDataURL('image/png');
    };
    img.src = this.originalFavicon;
  }

  async fetchNotifications() {
    const session = this.auth.session();
    if (!session) return;

    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data && !error) {
      this.notificationsSignal.set(data as Notification[]);
    }

    this.subscribeToRealtime(session.user.id);
  }

  private subscribeToRealtime(userId: string) {
    if (this.realtimeChannel) return;

    this.realtimeChannel = this.supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Notification }) => {
          this.notificationsSignal.update((list) => [payload.new as Notification, ...list].slice(0, 30));
        },
      )
      .subscribe();
  }

  async markAsRead(id: string) {
    this.notificationsSignal.update((list) =>
      list.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

    await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  }

  async markAllAsRead() {
    const unreadIds = this.notificationsSignal()
      .filter((n) => !n.is_read)
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    this.notificationsSignal.update((list) =>
      list.map((n) => ({ ...n, is_read: true })),
    );

    await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
  }

  getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      user_approved: 'check-circle',
      user_rejected: 'x-circle',
      requirement_approved: 'clipboard',
      application_received: 'file-plus',
      application_accepted: 'check-circle',
      application_rejected: 'x-circle',
      application_withdrawn: 'file-minus',
      deal_created: 'handshake',
      creator_marked_done: 'flag',
      business_marked_done: 'flag',
      deal_completed: 'star',
    };
    return icons[type] ?? 'bell';
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}
