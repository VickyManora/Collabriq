// Supabase Edge Function: send-notification-email
// Sends transactional email notifications for key platform events.
//
// Deploy: supabase functions deploy send-notification-email
// Set secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxxx
//   supabase secrets set FROM_EMAIL=noreply@collabriq.in

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@collabriq.in';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://collabriq.in';

interface EmailPayload {
  to: string;
  name: string;
  type: string;
  message: string;
}

const emailTemplates: Record<string, (name: string, message: string) => { subject: string; html: string }> = {
  user_approved: (name) => ({
    subject: 'Your Collabriq account has been approved!',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Welcome to Collabriq!</h2>
        <p style="color: #444; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #444; line-height: 1.6;">Great news! Your account has been approved. You can now start using all features on the platform.</p>
        <a href="${APP_URL}/dashboard" style="display: inline-block; background: #6c63ff; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Go to Dashboard</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">- The Collabriq Team</p>
      </div>
    `,
  }),

  user_rejected: (name) => ({
    subject: 'Update on your Collabriq account',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Account Update</h2>
        <p style="color: #444; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #444; line-height: 1.6;">Unfortunately, your account was not approved at this time. Please update your profile with complete information and resubmit for review.</p>
        <a href="${APP_URL}/profile" style="display: inline-block; background: #6c63ff; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Update Profile</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">- The Collabriq Team</p>
      </div>
    `,
  }),

  application_accepted: (name, message) => ({
    subject: 'Your application has been accepted!',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Application Accepted</h2>
        <p style="color: #444; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #444; line-height: 1.6;">${message}</p>
        <p style="color: #444; line-height: 1.6;">Head to your deals page to see the details and get started.</p>
        <a href="${APP_URL}/creator/deals" style="display: inline-block; background: #6c63ff; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">View Your Deals</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">- The Collabriq Team</p>
      </div>
    `,
  }),

  deal_created: (name, message) => ({
    subject: 'New deal started on Collabriq',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">New Deal</h2>
        <p style="color: #444; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #444; line-height: 1.6;">${message}</p>
        <a href="${APP_URL}/dashboard" style="display: inline-block; background: #6c63ff; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">View Deal</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">- The Collabriq Team</p>
      </div>
    `,
  }),

  deal_completed: (name, message) => ({
    subject: 'Deal completed on Collabriq',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Deal Completed!</h2>
        <p style="color: #444; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #444; line-height: 1.6;">${message}</p>
        <p style="color: #444; line-height: 1.6;">Don't forget to leave a rating for your experience!</p>
        <a href="${APP_URL}/dashboard" style="display: inline-block; background: #6c63ff; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Go to Dashboard</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">- The Collabriq Team</p>
      </div>
    `,
  }),
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { to, name, type, message } = payload;

    if (!to || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const templateFn = emailTemplates[type];
    if (!templateFn) {
      return new Response(JSON.stringify({ skipped: true, reason: `No email template for type: ${type}` }), { status: 200 });
    }

    const { subject, html } = templateFn(name || 'there', message);

    if (!RESEND_API_KEY) {
      console.log(`[Email] Would send to ${to}: ${subject}`);
      return new Response(JSON.stringify({ skipped: true, reason: 'No RESEND_API_KEY configured' }), { status: 200 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Collabriq <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Email] Resend error:', data);
      return new Response(JSON.stringify({ error: 'Email send failed', details: data }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), { status: 200 });
  } catch (err) {
    console.error('[Email] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
