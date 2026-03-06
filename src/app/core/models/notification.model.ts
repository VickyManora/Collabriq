export type NotificationType =
  | 'user_approved'
  | 'user_rejected'
  | 'requirement_approved'
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'application_withdrawn'
  | 'deal_created'
  | 'creator_marked_done'
  | 'business_marked_done'
  | 'deal_completed';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
}
