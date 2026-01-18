import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend('re_D6PK4KFd_Esko9FUXNsiM2zxBBoxniAsk');

// Email recipients for emergency notifications
const NOTIFICATION_RECIPIENTS = [
  'j.mahmood098@gmail.com',
];

interface EmergencyNotification {
  type: string;
  description: string;
  confidence: number;
  location: string;
  timestamp: string;
}

export async function POST(request: Request) {
  try {
    const body: EmergencyNotification = await request.json();
    const { type, description, confidence, location, timestamp } = body;

    // Format the emergency type for display
    const emergencyLabel = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
    const confidencePercent = Math.round(confidence * 100);
    const formattedTime = new Date(timestamp).toLocaleString();

    // Create email HTML content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background-color: #dc2626; color: white; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .alert-icon { font-size: 48px; margin-bottom: 8px; }
            .content { padding: 24px; }
            .detail-row { display: flex; border-bottom: 1px solid #e5e7eb; padding: 12px 0; }
            .detail-label { font-weight: 600; color: #374151; width: 120px; }
            .detail-value { color: #1f2937; flex: 1; }
            .emergency-type { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
            .emergency-type h2 { color: #dc2626; margin: 0 0 8px 0; font-size: 20px; }
            .confidence { display: inline-block; background-color: #dc2626; color: white; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 600; }
            .description { background-color: #f9fafb; border-radius: 6px; padding: 16px; margin-top: 16px; }
            .footer { background-color: #f9fafb; padding: 16px 24px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="alert-icon">🚨</div>
              <h1>EMERGENCY ALERT</h1>
            </div>
            <div class="content">
              <div class="emergency-type">
                <h2>${emergencyLabel} Detected</h2>
                <span class="confidence">${confidencePercent}% Confidence</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${location}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${formattedTime}</span>
              </div>
              
              <div class="description">
                <strong>Description:</strong>
                <p style="margin: 8px 0 0 0;">${description}</p>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">This is an automated alert from MediWatch Emergency Detection System</p>
              <p style="margin: 8px 0 0 0;">Please respond immediately if this is a real emergency.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to all recipients
    const { data, error } = await resend.emails.send({
      from: 'MediWatch Alerts <onboarding@resend.dev>',
      to: NOTIFICATION_RECIPIENTS,
      subject: `🚨 EMERGENCY: ${emergencyLabel} detected at ${location}`,
      html: emailHtml,
    });

    if (error) {
      console.error('[Email] Resend API error:', JSON.stringify(error, null, 2));
      // Log the alert anyway so we don't lose the information
      console.log('[Email] Alert details (email failed):', {
        type: emergencyLabel,
        confidence: confidencePercent + '%',
        location,
        time: formattedTime,
        description,
      });
      return NextResponse.json({ 
        error: 'Failed to send email', 
        details: error 
      }, { status: 500 });
    }

    console.log('[Email] Emergency notification sent:', data?.id);
    return NextResponse.json({ success: true, emailId: data?.id });
  } catch (error) {
    console.error('[Email] Error:', error);
    // Log the alert details even if there's an error
    console.log('[Email] Alert attempted for:', { type, location, timestamp });
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
