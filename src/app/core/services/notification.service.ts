import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationsSignal = signal<Notification[]>([]);

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
  }

  async markAsRead(id: string) {
    // Optimistic update
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

    // Optimistic update
    this.notificationsSignal.update((list) =>
      list.map((n) => ({ ...n, is_read: true })),
    );

    await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
  }
}
