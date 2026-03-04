export type UserRole = 'creator' | 'business' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  role: UserRole;
  approval_status: ApprovalStatus;
  email: string;
  full_name: string;
  phone: string | null;
  bio: string | null;
  city: string;
  business_name: string | null;
  business_category: string | null;
  instagram_handle: string | null;
  portfolio_url: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
