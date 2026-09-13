/* ============================================================
   AI ACADEMY — Netlify Serverless Function
   Visitor Notification via Resend API

   IMPORTANT RESEND FREE-TIER RULE:
   When using 'onboarding@resend.dev' as the sender, Resend can
   ONLY deliver to the email address that owns the Resend account.
   Set NOTIFICATION_EMAIL to that account-owner email in Netlify.
   ============================================================ */

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    let data = {};
    try {
      data = JSON.parse(event.body || '{}');
    } catch (parseErr) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const visitorName = (data.visitorName || '').trim();

    if (!visitorName || visitorName.length < 2 || visitorName.length > 60) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid visitor name. Must be between 2 and 60 characters.' })
      };
    }

    const sanitizedName = visitorName.replace(/[<>&"']/g, '');
    const resendKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.NOTIFICATION_EMAIL || 'agent.academyy@gmail.com';

    // Log for Netlify function log visibility
    console.log(`[visitor-notification] Name: "${sanitizedName}", To: "${recipientEmail}"`);

    if (!resendKey) {
      console.error('[visitor-notification] RESEND_API_KEY environment variable is not set in Netlify.');
      // Return 200 so the visitor experience is not broken
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ok', note: 'Notification skipped: no API key configured.' })
      };
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const pageUrl = (data.pageUrl || 'AI Academy Website').slice(0, 200);

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">New Website Visitor</h2>
        <p style="color: #374151; font-size: 15px;">A visitor has entered their name on <strong>AI Academy</strong>.</p>

        <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="margin: 6px 0; color: #111827;"><strong>Visitor Name:</strong> ${sanitizedName}</p>
          <p style="margin: 6px 0; color: #374151;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin: 6px 0; color: #374151;"><strong>Time:</strong> ${timeStr}</p>
          <p style="margin: 6px 0; color: #374151;"><strong>Page:</strong> ${pageUrl}</p>
        </div>

        <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">AI Academy Visitor Notification</p>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'AI Academy <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `New Website Visitor: ${sanitizedName}`,
        html: emailHtml
      })
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[visitor-notification] Resend API error:', JSON.stringify(resendResult));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ok', note: 'Email delivery failed silently.' })
      };
    }

    console.log(`[visitor-notification] Email sent successfully. Resend ID: ${resendResult.id}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'success', id: resendResult.id })
    };

  } catch (err) {
    console.error('[visitor-notification] Unexpected error:', err.message || err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'ok', note: 'Notification could not be sent.' })
    };
  }
};
