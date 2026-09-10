/* ============================================================
   AI ACADEMY — Netlify Serverless Function
   Visitor Notification via Resend API
   ============================================================ */

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const visitorName = (data.visitorName || '').trim();

    // Server-side validation & sanitization
    if (!visitorName || visitorName.length < 2 || visitorName.length > 60) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid visitor name. Must be between 2 and 60 characters.' })
      };
    }

    const sanitizedName = visitorName.replace(/[<>&"']/g, '');
    const resendKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.NOTIFICATION_EMAIL || 'agent.academyy@gmail.com';

    if (!resendKey) {
      console.warn('RESEND_API_KEY is missing in server environment.');
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok', note: 'Notification logged locally' })
      };
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const pageUrl = data.pageUrl || 'AI Academy Website';

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">New Website Visitor Notification</h2>
        <p style="color: #374151; font-size: 15px;">A new visitor has entered their name on <strong>AI Academy</strong>.</p>
        
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="margin: 6px 0; color: #111827;"><strong>Visitor Name:</strong> ${sanitizedName}</p>
          <p style="margin: 6px 0; color: #374151;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin: 6px 0; color: #374151;"><strong>Time:</strong> ${timeStr}</p>
          <p style="margin: 6px 0; color: #374151;"><strong>Page URL:</strong> ${pageUrl}</p>
        </div>

        <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">AI Academy Visitor Notification System</p>
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

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error('Resend API error:', errBody);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to send notification email' })
      };
    }

    const resendResult = await resendResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success', id: resendResult.id })
    };
  } catch (err) {
    console.error('Visitor notification function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
