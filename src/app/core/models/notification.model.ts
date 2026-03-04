export type NotificationType =
  | 'user_approved'
  | 'requirement_approved'
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'deal_completed';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
}
