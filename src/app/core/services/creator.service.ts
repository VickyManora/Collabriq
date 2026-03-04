import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Requirement } from '../models/requirement.model';
import { Application } from '../models/application.model';
import { Deal } from '../models/deal.model';
import { Rating } from '../models/rating.model';

export type RequirementWithBusiness = Requirement & {
  business: { business_name: string | null; full_name: string };
};

export type ApplicationWithRequirement = Application & {
  requirement: { title: string; status: string; category: string | null };
};

export type DealWithDetails = Deal & {
  requirement: { title: string };
  business: { business_name: string | null; full_name: string; email: string; phone: string | null };
};

@Injectable({ providedIn: 'root' })
export class CreatorService {
  private supabase;

  constructor(
    private supabaseService: SupabaseService,
    private auth: AuthService,
  ) {
    this.supabase = this.supabaseService.client;
  }

  async getOpenRequirements() {
    return this.supabase
      .from('requirements')
      .select('*, business:profiles!business_id(business_name, full_name)')
      .in('status', ['open', 'partially_filled'])
      .order('created_at', { ascending: false })
      .returns<RequirementWithBusiness[]>();
  }

  async getRequirement(id: string) {
    return this.supabase
      .from('requirements')
      .select('*, business:profiles!business_id(business_name, full_name)')
      .eq('id', id)
      .in('status', ['open', 'partially_filled'])
      .single<RequirementWithBusiness>();
  }

  async getMyApplicationForRequirement(requirementId: string) {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('applications')
      .select('*')
      .eq('requirement_id', requirementId)
      .eq('creator_id', userId!)
      .maybeSingle<Application>();
  }

  async applyToRequirement(requirementId: string, pitch: string) {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('applications')
      .insert({
        requirement_id: requirementId,
        creator_id: userId!,
        status: 'applied',
        pitch: pitch.trim() || null,
      })
      .select()
      .single<Application>();
  }

  async getMyApplications() {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('applications')
      .select('*, requirement:requirements!requirement_id(title, status, category)')
      .eq('creator_id', userId!)
      .order('created_at', { ascending: false })
      .returns<ApplicationWithRequirement[]>();
  }

  async withdrawApplication(id: string) {
    return this.supabase
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', id)
      .select()
      .single<Application>();
  }

  async getMyDeals() {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('deals')
      .select('*, requirement:requirements!requirement_id(title), business:profiles!business_id(business_name, full_name, email, phone)')
      .eq('creator_id', userId!)
      .order('created_at', { ascending: false })
      .returns<DealWithDetails[]>();
  }

  async markDealDone(id: string) {
    return this.supabase
      .from('deals')
      .update({ creator_marked_done: true, status: 'creator_marked_done' })
      .eq('id', id)
      .select()
      .single<Deal>();
  }

  async rateBusiness(dealId: string, rateeId: string, stars: number) {
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

  async getMyRatingForDeal(dealId: string) {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('ratings')
      .select('*')
      .eq('deal_id', dealId)
      .eq('rater_id', userId!)
      .maybeSingle<Rating>();
  }

  async getCreatorDashboardCounts() {
    const userId = this.auth.profile()?.id;

    const [reqResult, appResult, dealResult] = await Promise.all([
      this.supabase
        .from('requirements')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'partially_filled']),
      this.supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId!)
        .eq('status', 'applied'),
      this.supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId!)
        .in('status', ['active', 'creator_marked_done']),
    ]);

    return {
      openRequirements: reqResult.count ?? 0,
      pendingApplications: appResult.count ?? 0,
      activeDeals: dealResult.count ?? 0,
    };
  }
}
