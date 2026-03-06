export type RequirementStatus =
  | 'draft'
  | 'pending_approval'
  | 'open'
  | 'partially_filled'
  | 'closed'
  | 'cancelled';

export interface Requirement {
  id: string;
  business_id: string;
  title: string;
  description: string;
  category: string | null;
  creator_slots: number;
  filled_slots: number;
  status: RequirementStatus;
  compensation_details: string | null;
  rejection_reason: string | null;
  is_featured: boolean;
  opened_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
}
