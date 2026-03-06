import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Session, RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private sessionSignal = signal<Session | null>(null);
  private profileSignal = signal<Profile | null>(null);
  private loadingSignal = signal(true);
  private profileChannel: RealtimeChannel | null = null;

  readonly session = this.sessionSignal.asReadonly();
  readonly profile = this.profileSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  readonly isAuthenticated = computed(() => !!this.sessionSignal());
  readonly userRole = computed(() => this.profileSignal()?.role ?? null);
  readonly isApproved = computed(() => this.profileSignal()?.approval_status === 'approved');
  readonly isPending = computed(() => this.profileSignal()?.approval_status === 'pending');
  readonly isRejected = computed(() => this.profileSignal()?.approval_status === 'rejected');
  readonly rejectionReason = computed(() => this.profileSignal()?.rejection_reason ?? null);

  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
  ) {
    this.supabase = this.supabaseService.client;
    this.initAuthListener();
  }

  private async initAuthListener() {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    this.sessionSignal.set(session);
    if (session) {
      await this.loadProfile(session.user.id);
      this.subscribeToProfileChanges(session.user.id);
    }
    this.loadingSignal.set(false);

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      this.sessionSignal.set(session);
      if (session) {
        await this.loadProfile(session.user.id);
        this.subscribeToProfileChanges(session.user.id);
      } else {
        this.profileSignal.set(null);
        this.unsubscribeFromProfile();
      }
    });
  }

  private subscribeToProfileChanges(userId: string) {
    if (this.profileChannel) return;

    this.profileChannel = this.supabase
      .channel('profile-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          this.profileSignal.set(payload.new as unknown as Profile);
        },
      )
      .subscribe();
  }

  private unsubscribeFromProfile() {
    if (this.profileChannel) {
      this.supabase.removeChannel(this.profileChannel);
      this.profileChannel = null;
    }
  }

  private async loadProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('is_deleted', false)
      .single();

    if (data && !error) {
      this.profileSignal.set(data as Profile);
    }
  }

  async signUp(email: string, password: string, metadata: { full_name: string; role: UserRole; [key: string]: string }) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
  }

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    await this.supabase.auth.signOut();
    this.router.navigate(['/auth/login']);
  }

  async deactivateMyAccount(): Promise<{ error: Error | null }> {
    const profile = this.profileSignal();
    if (!profile) return { error: new Error('No profile loaded') };

    const { error } = await this.supabase
      .from('profiles')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (error) return { error };

    await this.signOut();
    return { error: null };
  }

  async resetPasswordForEmail(email: string) {
    return this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
  }

  async updatePassword(newPassword: string) {
    return this.supabase.auth.updateUser({ password: newPassword });
  }

  async reapplyForApproval(): Promise<{ error: Error | null }> {
    const profile = this.profileSignal();
    if (!profile) return { error: new Error('No profile loaded') };

    const { error } = await this.supabase
      .from('profiles')
      .update({ approval_status: 'pending', rejection_reason: null })
      .eq('id', profile.id);

    if (error) return { error };

    await this.refreshProfile();
    return { error: null };
  }

  async refreshProfile() {
    const session = this.sessionSignal();
    if (session) {
      await this.loadProfile(session.user.id);
    }
  }
}
