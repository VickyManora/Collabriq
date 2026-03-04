export type ApplicationStatus = 'applied' | 'accepted' | 'rejected' | 'withdrawn';

export interface Application {
  id: string;
  requirement_id: string;
  creator_id: string;
  status: ApplicationStatus;
  pitch: string | null;
  created_at: string;
  updated_at: string;
}
