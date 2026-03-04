import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Requirement } from '../models/requirement.model';
import { Application } from '../models/application.model';
import { Deal } from '../models/deal.model';
import { Rating } from '../models/rating.model';

export type BusinessDealWithDetails = Deal & {
  requirement: { title: string };
  creator: { full_name: string; email: string; phone: string | null; instagram_handle: string | null; portfolio_url: string | null };
};

@Injectable({ providedIn: 'root' })
export class RequirementService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService,
  ) {
    this.supabase = this.supabaseService.client;
  }

  async getMyRequirements() {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('requirements')
      .select('*')
      .eq('business_id', userId!)
      .order('created_at', { ascending: false })
      .returns<Requirement[]>();
  }

  async getRequirement(id: string) {
    return this.supabase
      .from('requirements')
      .select('*')
      .eq('id', id)
      .single<Requirement>();
  }

  async createRequirement(data: {
    title: string;
    description: string;
    category: string | null;
    creator_slots: number;
    compensation_details: string | null;
  }) {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('requirements')
      .insert({ ...data, business_id: userId!, status: 'draft' })
      .select()
      .single<Requirement>();
  }

  async updateRequirement(
    id: string,
    data: {
      title?: string;
      description?: string;
      category?: string | null;
      creator_slots?: number;
      compensation_details?: string | null;
    },
  ) {
    return this.supabase
      .from('requirements')
      .update(data)
      .eq('id', id)
      .select()
      .single<Requirement>();
  }

  async submitForApproval(id: string) {
    return this.supabase
      .from('requirements')
      .update({ status: 'pending_approval' })
      .eq('id', id)
      .select()
      .single<Requirement>();
  }

  async cancelRequirement(id: string) {
    return this.supabase
      .from('requirements')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single<Requirement>();
  }

  async getApplicationsForRequirement(id: string) {
    return this.supabase
      .from('applications')
      .select('*, creator:profiles!creator_id(id, full_name, email, phone, instagram_handle, portfolio_url)')
      .eq('requirement_id', id)
      .order('created_at', { ascending: false })
      .returns<(Application & { creator: { id: string; full_name: string; email: string; phone: string | null; instagram_handle: string | null; portfolio_url: string | null } })[]>();
  }

  async acceptApplication(id: string) {
    return this.supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', id)
      .select()
      .single<Application>();
  }

  async rejectApplication(id: string) {
    return this.supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single<Application>();
  }

  async getMyRequirementCounts() {
    const userId = this.auth.profile()?.id;
    const { data, error } = await this.supabase
      .from('requirements')
      .select('status')
      .eq('business_id', userId!);

    if (error || !data) return { active: 0, total: 0 };

    const active = data.filter((r: { status: string }) =>
      ['open', 'partially_filled', 'pending_approval'].includes(r.status),
    ).length;

    return { active, total: data.length };
  }

  async getMyDealCount() {
    const userId = this.auth.profile()?.id;
    const { count, error } = await this.supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', userId!)
      .in('status', ['active', 'creator_marked_done']);

    return error ? 0 : (count ?? 0);
  }

  async getMyDeals() {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('deals')
      .select('*, requirement:requirements!requirement_id(title), creator:profiles!creator_id(full_name, email, phone, instagram_handle, portfolio_url)')
      .eq('business_id', userId!)
      .order('created_at', { ascending: false })
      .returns<BusinessDealWithDetails[]>();
  }

  async markDealDone(id: string) {
    return this.supabase
      .from('deals')
      .update({ business_marked_done: true })
      .eq('id', id)
      .select()
      .single<Deal>();
  }

  async getMyRatingForDeal(dealId: string) {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('ratings')
      .select('*')
      .eq('deal_id', dealId)
      .eq('rater_id', userId!)
      .maybeSingle<Rating>();
  }

  async rateCreator(dealId: string, rateeId: string, stars: number) {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('ratings')
      .insert({
        deal_id: dealId,
        rater_id: userId!,
        ratee_id: rateeId,
        stars,
      })
      .select()
      .single<Rating>();
  }

  async getCreatorAverageRating(creatorId: string): Promise<{ avg: number; count: number }> {
    const { data, error } = await this.supabase
      .from('ratings')
      .select('stars')
      .eq('ratee_id', creatorId);

    if (error || !data || data.length === 0) return { avg: 0, count: 0 };

    const sum = data.reduce((acc: number, r: { stars: number }) => acc + r.stars, 0);
    return { avg: sum / data.length, count: data.length };
  }
}
