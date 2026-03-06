import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Requirement } from '../models/requirement.model';
import { Application } from '../models/application.model';
import { Deal } from '../models/deal.model';
import { Rating } from '../models/rating.model';

export type RequirementWithBusiness = Requirement & {
  business: { business_name: string | null; full_name: string; instagram_handle: string | null };
  applications: { count: number }[];
};

export type ApplicationWithRequirement = Application & {
  requirement: {
    title: string;
    status: string;
    category: string | null;
    business_id: string;
    business: { business_name: string | null; full_name: string; instagram_handle: string | null } | null;
  };
};

export type DealWithDetails = Deal & {
  requirement: { title: string } | null;
  business: { business_name: string | null; full_name: string; email: string; phone: string | null; instagram_handle: string | null } | null;
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
      .select('*, business:profiles!business_id(business_name, full_name, instagram_handle), applications(count)')
      .in('status', ['open', 'partially_filled'])
      .order('created_at', { ascending: false })
      .returns<RequirementWithBusiness[]>();
  }

  async getRequirementsByIds(ids: string[]) {
    if (ids.length === 0) return { data: [] as RequirementWithBusiness[], error: null };
    return this.supabase
      .from('requirements')
      .select('*, business:profiles!business_id(business_name, full_name, instagram_handle), applications(count)')
      .in('id', ids)
      .in('status', ['open', 'partially_filled'])
      .order('created_at', { ascending: false })
      .returns<RequirementWithBusiness[]>();
  }

  async getRequirement(id: string) {
    return this.supabase
      .from('requirements')
      .select('*, business:profiles!business_id(business_name, full_name, instagram_handle), applications(count)')
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
      .select('*, requirement:requirements!requirement_id(title, status, category, business_id, business:profiles!business_id(business_name, full_name, instagram_handle))')
      .eq('creator_id', userId!)
      .order('created_at', { ascending: false })
      .returns<ApplicationWithRequirement[]>();
  }

  async getMyApplicationsBrief() {
    const userId = this.auth.profile()?.id;
    return this.supabase
      .from('applications')
      .select('requirement_id, status, created_at')
      .eq('creator_id', userId!)
      .returns<{ requirement_id: string; status: string; created_at: string }[]>();
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
      .select('*, requirement:requirements!requirement_id(title), business:profiles!business_id(business_name, full_name, email, phone, instagram_handle)')
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

  async getRecentRequirements(limit: number) {
    return this.supabase
      .from('requirements')
      .select('*, business:profiles!business_id(business_name, full_name, instagram_handle), applications(count)')
      .in('status', ['open', 'partially_filled'])
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<RequirementWithBusiness[]>();
  }

  async getBusinessProfile(businessId: string) {
    return this.supabase
      .from('profiles')
      .select('id, full_name, business_name, business_category, instagram_handle, portfolio_url, bio, city, created_at')
      .eq('id', businessId)
      .eq('role', 'business')
      .eq('is_deleted', false)
      .single<{
        id: string; full_name: string; business_name: string | null;
        business_category: string | null; instagram_handle: string | null;
        portfolio_url: string | null; bio: string | null; city: string; created_at: string;
      }>();
  }

  async getBusinessStats(businessId: string) {
    const [dealsResult, ratingsResult, reqsResult] = await Promise.all([
      this.supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'completed'),
      this.supabase
        .from('ratings')
        .select('stars')
        .eq('ratee_id', businessId),
      this.supabase
        .from('requirements')
        .select('*, business:profiles!business_id(business_name, full_name, instagram_handle), applications(count)')
        .eq('business_id', businessId)
        .in('status', ['open', 'partially_filled'])
        .order('created_at', { ascending: false })
        .returns<RequirementWithBusiness[]>(),
    ]);

    const completedDeals = dealsResult.count ?? 0;
    const ratings = ratingsResult.data ?? [];
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
      : 0;

    return {
      completedDeals,
      totalRatings: ratings.length,
      avgRating: Math.round(avgRating * 10) / 10,
      openRequirements: reqsResult.data ?? [],
    };
  }

  async getRecentActivity(limit: number) {
    const userId = this.auth.profile()?.id;

    const [appsResult, dealsResult, ratingsResult] = await Promise.all([
      this.supabase
        .from('applications')
        .select('id, status, created_at, updated_at, requirement:requirements!requirement_id(title, business:profiles!business_id(business_name, full_name))')
        .eq('creator_id', userId!)
        .in('status', ['accepted', 'rejected', 'applied'])
        .order('updated_at', { ascending: false })
        .limit(limit)
        .returns<{
          id: string; status: string; created_at: string; updated_at: string;
          requirement: { title: string; business: { business_name: string | null; full_name: string } };
        }[]>(),
      this.supabase
        .from('deals')
        .select('id, status, created_at, business:profiles!business_id(business_name, full_name)')
        .eq('creator_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<{
          id: string; status: string; created_at: string;
          business: { business_name: string | null; full_name: string };
        }[]>(),
      this.supabase
        .from('ratings')
        .select('id, stars, created_at, ratee:profiles!ratee_id(business_name, full_name)')
        .eq('rater_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<{
          id: string; stars: number; created_at: string;
          ratee: { business_name: string | null; full_name: string };
        }[]>(),
    ]);

    const activities: { message: string; timestamp: string; icon: string }[] = [];

    if (appsResult.data) {
      for (const app of appsResult.data) {
        const biz = app.requirement?.business?.business_name || app.requirement?.business?.full_name || 'a business';
        if (app.status === 'accepted') {
          activities.push({ message: `Your application to ${biz} was accepted`, timestamp: app.updated_at, icon: 'accepted' });
        } else if (app.status === 'rejected') {
          activities.push({ message: `Your application to ${biz} was not selected`, timestamp: app.updated_at, icon: 'rejected' });
        } else if (app.status === 'applied') {
          activities.push({ message: `You applied to "${app.requirement?.title}"`, timestamp: app.created_at, icon: 'applied' });
        }
      }
    }

    if (dealsResult.data) {
      for (const deal of dealsResult.data) {
        const biz = deal.business?.business_name || deal.business?.full_name || 'a business';
        activities.push({ message: `Deal started with ${biz}`, timestamp: deal.created_at, icon: 'deal' });
      }
    }

    if (ratingsResult.data) {
      for (const rating of ratingsResult.data) {
        const biz = rating.ratee?.business_name || rating.ratee?.full_name || 'a business';
        activities.push({ message: `You rated ${biz} ${rating.stars} stars`, timestamp: rating.created_at, icon: 'rating' });
      }
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
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
