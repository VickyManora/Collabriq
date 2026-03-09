export type DealStatus = 'active' | 'creator_marked_done' | 'completed' | 'cancelled';

export interface Deal {
  id: string;
  requirement_id: string;
  application_id: string;
  business_id: string;
  creator_id: string;
  status: DealStatus;
  creator_marked_done: boolean;
  business_marked_done: boolean;
  completed_at: string | null;
  cancelled_by: 'business' | 'creator' | 'admin' | null;
  created_at: string;
  updated_at: string;
}
