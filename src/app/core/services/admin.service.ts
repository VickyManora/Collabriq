import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { EmailService } from './email.service';
import { Profile } from '../models/user.model';
import { Requirement } from '../models/requirement.model';
import { Deal } from '../models/deal.model';

export type ProfileWithRole = Profile;

export type RequirementWithBusiness = Requirement & {
  business: { business_name: string | null; full_name: string };
};

export type DealWithDetails = Deal & {
  requirement: { title: string };
  business: { business_name: string | null; full_name: string };
  creator: { full_name: string };
};

export type UserDeal = Deal & {
  requirement: { title: string };
  business: { business_name: string | null; full_name: string };
  creator: { full_name: string };
};

export type UserRequirement = Requirement & {
  business: { business_name: string | null; full_name: string };
};

@Injectable({ providedIn: 'root' })
export class AdminService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private emailService: EmailService,
  ) {
    this.supabase = this.supabaseService.client;
  }

  async getPendingUsers() {
    return this.supabase
      .from('profiles')
      .select('*')
      .eq('approval_status', 'pending')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .returns<Profile[]>();
  }

  async getAllUsers() {
    return this.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<Profile[]>();
  }

  async approveUser(id: string) {
    const result = await this.supabase
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('id', id)
      .select()
      .single<Profile>();

    if (result.data) {
      this.emailService.send(
        result.data.email,
        result.data.full_name,
        'user_approved',
      );
    }

    return result;
  }

  async rejectUser(id: string, rejectionReason: string) {
    const result = await this.supabase
      .from('profiles')
      .update({ approval_status: 'rejected', rejection_reason: rejectionReason })
      .eq('id', id)
      .select()
      .single<Profile>();

    if (result.data) {
      this.emailService.send(
        result.data.email,
        result.data.full_name,
        'user_rejected',
        rejectionReason,
      );
    }

    return result;
  }

  async getPendingRequirements() {
    return this.supabase
      .from('requirements')
      .select('*, business:profiles!business_id(business_name, full_name)')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false })
      .returns<RequirementWithBusiness[]>();
  }

  async getAllRequirements() {
    return this.supabase
      .from('requirements')
      .select('*, business:profiles!business_id(business_name, full_name)')
      .order('created_at', { ascending: false })
      .returns<RequirementWithBusiness[]>();
  }

  async approveRequirement(id: string) {
    return this.supabase
      .from('requirements')
      .update({ status: 'open', opened_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<Requirement>();
  }

  async rejectRequirement(id: string, rejectionReason: string) {
    return this.supabase
      .from('requirements')
      .update({ status: 'cancelled', rejection_reason: rejectionReason })
      .eq('id', id)
      .select()
      .single<Requirement>();
  }

  async getAllDeals() {
    return this.supabase
      .from('deals')
      .select('*, requirement:requirements!requirement_id(title), business:profiles!business_id(business_name, full_name), creator:profiles!creator_id(full_name)')
      .order('created_at', { ascending: false })
      .returns<DealWithDetails[]>();
  }

  async cancelDeal(id: string) {
    return this.supabase
      .from('deals')
      .update({ status: 'cancelled', cancelled_by: 'admin' })
      .eq('id', id)
      .select()
      .single<Deal>();
  }

  async getUserById(id: string) {
    return this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single<Profile>();
  }

  async getUserDeals(userId: string) {
    return this.supabase
      .from('deals')
      .select('*, requirement:requirements!requirement_id(title), business:profiles!business_id(business_name, full_name), creator:profiles!creator_id(full_name)')
      .or(`business_id.eq.${userId},creator_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .returns<UserDeal[]>();
  }

  async getUserRequirements(userId: string) {
    return this.supabase
      .from('requirements')
      .select('*, business:profiles!business_id(business_name, full_name)')
      .eq('business_id', userId)
      .order('created_at', { ascending: false })
      .returns<UserRequirement[]>();
  }

  async toggleFeatured(id: string, isFeatured: boolean) {
    return this.supabase
      .from('requirements')
      .update({ is_featured: isFeatured })
      .eq('id', id)
      .select()
      .single<Requirement>();
  }

  async deactivateUser(id: string) {
    return this.supabase
      .from('profiles')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<Profile>();
  }

  async getDashboardCounts() {
    const [usersResult, reqsResult, dealsResult] = await Promise.all([
      this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending')
        .eq('is_deleted', false),
      this.supabase
        .from('requirements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),
      this.supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'creator_marked_done']),
    ]);

    return {
      pendingUsers: usersResult.count ?? 0,
      pendingRequirements: reqsResult.count ?? 0,
      activeDeals: dealsResult.count ?? 0,
    };
  }
}
