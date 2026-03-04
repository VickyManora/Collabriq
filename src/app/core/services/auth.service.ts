import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private sessionSignal = signal<Session | null>(null);
  private profileSignal = signal<Profile | null>(null);
  private loadingSignal = signal(true);

  readonly session = this.sessionSignal.asReadonly();
  readonly profile = this.profileSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  readonly isAuthenticated = computed(() => !!this.sessionSignal());
  readonly userRole = computed(() => this.profileSignal()?.role ?? null);
  readonly isApproved = computed(() => this.profileSignal()?.approval_status === 'approved');

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
    }
    this.loadingSignal.set(false);

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      this.sessionSignal.set(session);
      if (session) {
        await this.loadProfile(session.user.id);
      } else {
        this.profileSignal.set(null);
      }
    });
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

  async refreshProfile() {
    const session = this.sessionSignal();
    if (session) {
      await this.loadProfile(session.user.id);
    }
  }
}
