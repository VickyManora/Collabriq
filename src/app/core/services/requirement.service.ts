import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Requirement } from '../models/requirement.model';
import { Application } from '../models/application.model';
import { Deal } from '../models/deal.model';
import { Rating } from '../models/rating.model';

export type RequirementWithApps = Requirement & {
  applications: { count: number }[];
};

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
      .select('*, applications(count)')
      .eq('business_id', userId!)
      .order('created_at', { ascending: false })
      .returns<RequirementWithApps[]>();
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
      .select('*, creator:profiles!creator_id(id, full_name, email, phone, instagram_handle, portfolio_url, bio, city)')
      .eq('requirement_id', id)
      .order('created_at', { ascending: false })
      .returns<(Application & { creator: { id: string; full_name: string; email: string; phone: string | null; instagram_handle: string | null; portfolio_url: string | null; bio: string | null; city: string | null } })[]>();
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

  async getPendingApplicationCount(): Promise<number> {
    const userId = this.auth.profile()?.id;
    const { data: reqs } = await this.supabase
      .from('requirements')
      .select('id')
      .eq('business_id', userId!);

    if (!reqs || reqs.length === 0) return 0;

    const reqIds = reqs.map((r: { id: string }) => r.id);
    const { count, error } = await this.supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .in('requirement_id', reqIds)
      .eq('status', 'applied');

    return error ? 0 : (count ?? 0);
  }

  async getRecentApplications(limit: number) {
    const userId = this.auth.profile()?.id;
    const { data: reqs } = await this.supabase
      .from('requirements')
      .select('id')
      .eq('business_id', userId!);

    if (!reqs || reqs.length === 0) return [];

    const reqIds = reqs.map((r: { id: string }) => r.id);
    const { data, error } = await this.supabase
      .from('applications')
      .select('id, created_at, status, creator:profiles!creator_id(full_name), requirement:requirements!requirement_id(title)')
      .in('requirement_id', reqIds)
      .eq('status', 'applied')
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<{
        id: string; created_at: string; status: string;
        creator: { full_name: string };
        requirement: { title: string };
      }[]>();

    return error ? [] : (data ?? []);
  }

  async getBusinessRecentActivity(limit: number) {
    const userId = this.auth.profile()?.id;

    const { data: reqs } = await this.supabase
      .from('requirements')
      .select('id')
      .eq('business_id', userId!);

    const reqIds = reqs?.map((r: { id: string }) => r.id) ?? [];

    const [appsResult, dealsResult, ratingsResult] = await Promise.all([
      reqIds.length > 0
        ? this.supabase
            .from('applications')
            .select('id, status, created_at, creator:profiles!creator_id(full_name), requirement:requirements!requirement_id(title)')
            .in('requirement_id', reqIds)
            .order('created_at', { ascending: false })
            .limit(limit * 2)
            .returns<{ id: string; status: string; created_at: string; creator: { full_name: string }; requirement: { title: string } }[]>()
        : Promise.resolve({ data: [] as any[], error: null }),
      this.supabase
        .from('deals')
        .select('id, status, created_at, creator:profiles!creator_id(full_name), requirement:requirements!requirement_id(title)')
        .eq('business_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<{ id: string; status: string; created_at: string; creator: { full_name: string }; requirement: { title: string } }[]>(),
      this.supabase
        .from('ratings')
        .select('id, stars, created_at, rater:profiles!rater_id(full_name)')
        .eq('ratee_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<{ id: string; stars: number; created_at: string; rater: { full_name: string } }[]>(),
    ]);

    const activities: { message: string; timestamp: string; icon: string }[] = [];

    if (appsResult.data) {
      for (const app of appsResult.data) {
        const name = app.creator?.full_name || 'A creator';
        activities.push({ message: `${name} applied to "${app.requirement?.title}"`, timestamp: app.created_at, icon: 'applied' });
      }
    }

    if (dealsResult.data) {
      for (const deal of dealsResult.data) {
        const name = deal.creator?.full_name || 'A creator';
        activities.push({ message: `Deal started with ${name}`, timestamp: deal.created_at, icon: 'deal' });
      }
    }

    if (ratingsResult.data) {
      for (const rating of ratingsResult.data) {
        const name = rating.rater?.full_name || 'A creator';
        activities.push({ message: `You received a ${rating.stars}-star rating from ${name}`, timestamp: rating.created_at, icon: 'rating' });
      }
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, limit);
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
