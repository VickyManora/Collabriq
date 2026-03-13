import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type EmailType =
  | 'user_approved'
  | 'user_rejected'
  | 'application_accepted'
  | 'deal_created'
  | 'deal_completed';

@Injectable({ providedIn: 'root' })
export class EmailService {
  constructor(private supabaseService: SupabaseService) {}

  async send(to: string, name: string, type: EmailType, message = ''): Promise<boolean> {
    console.log('[EmailService] Sending:', { to, name, type });
    try {
      const { data: { session } } = await this.supabaseService.client.auth.getSession();
      const { data, error } = await this.supabaseService.client.functions.invoke(
        'send-notification-email',
        {
          body: { to, name, type, message },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        },
      );
      console.log('[EmailService] Response:', { data, error });

      if (error) {
        console.error('[EmailService] Edge function error:', error);
        return false;
      }

      if (data?.skipped) {
        console.warn('[EmailService] Skipped:', data.reason);
      }

      return true;
    } catch (err) {
      console.error('[EmailService] Failed to send email:', err);
      return false;
    }
  }
}
