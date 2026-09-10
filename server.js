/* ============================================================
   AI ACADEMY — server.js
   Secure Node.js / Express backend server layer.
   - Hides Gemini, Groq, and Resend API keys securely using .env
   - Handlers for AI chat with automatic fallback (Gemini -> Groq -> Gemini)
   - Handler for Visitor Name Notification via Resend API
   - Supports Server-Sent Events (SSE) streaming
   ============================================================ */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve static frontend files
app.use(express.static(__dirname));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const geminiAvailable = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  const groqAvailable = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 5);
  const resendAvailable = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 5);
  res.json({
    status: 'ok',
    service: 'AI Academy Backend Server',
    geminiConfigured: geminiAvailable,
    groqConfigured: groqAvailable,
    resendConfigured: resendAvailable
  });
});

// Helper: Call Google Gemini REST API (gemini-3.6-flash)
async function callGemini(messages, systemInstruction, stream = false, overrideKey = null) {
  const apiKey = overrideKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_KEY_MISSING');

  const model = 'gemini-3.6-flash';
  const apiEndpoint = stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${apiEndpoint}key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction || '' }]
    },
    contents: messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })),
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini status ${response.status}: ${errText.slice(0, 150)}`);
  }

  return response;
}

// Helper: Call Groq OpenAI-compatible Chat Completions API (openai/gpt-oss-20b)
async function callGroq(messages, systemInstruction, stream = false, overrideKey = null) {
  const apiKey = overrideKey || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_KEY_MISSING');

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const formattedMessages = [];

  if (systemInstruction) {
    formattedMessages.push({ role: 'system', content: systemInstruction });
  }

  messages.forEach(m => {
    formattedMessages.push({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    });
  });

  const body = {
    model: 'openai/gpt-oss-20b',
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 4096,
    stream: stream
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq status ${response.status}: ${errText.slice(0, 150)}`);
  }

  return response;
}

// POST /api/chat endpoint
app.post('/api/chat', async (req, res) => {
  const { messages = [], systemInstruction = '', stream = true, preferredProvider = 'gemini', userApiKey = null } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  let providerUsed = preferredProvider;
  let responseStream = null;

  try {
    if (preferredProvider === 'groq') {
      responseStream = await callGroq(messages, systemInstruction, stream, userApiKey);
    } else {
      responseStream = await callGemini(messages, systemInstruction, stream, userApiKey);
    }
  } catch (err1) {
    console.warn(`Primary provider (${preferredProvider}) failed:`, err1.message);
    const fallbackProvider = preferredProvider === 'gemini' ? 'groq' : 'gemini';
    try {
      if (fallbackProvider === 'groq') {
        responseStream = await callGroq(messages, systemInstruction, stream, userApiKey);
      } else {
        responseStream = await callGemini(messages, systemInstruction, stream, userApiKey);
      }
      providerUsed = fallbackProvider;
    } catch (err2) {
      console.error(`Fallback provider (${fallbackProvider}) also failed:`, err2.message);
      const userErr = 'AI service temporarily unavailable. Please verify your API key in Settings or try again.';
      if (stream) {
        res.write(`data: ${JSON.stringify({ error: userErr })}\n\n`);
        return res.end();
      } else {
        return res.status(500).json({ error: userErr });
      }
    }
  }

  if (stream) {
    try {
      if (providerUsed === 'gemini') {
        const reader = responseStream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const chunk = JSON.parse(jsonStr);
              const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                res.write(`data: ${JSON.stringify({ text, provider: 'gemini' })}\n\n`);
              }
            } catch (e) {}
          }
        }
      } else {
        const reader = responseStream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            try {
              const chunk = JSON.parse(jsonStr);
              const text = chunk?.choices?.[0]?.delta?.content;
              if (text) {
                res.write(`data: ${JSON.stringify({ text, provider: 'groq' })}\n\n`);
              }
            } catch (e) {}
          }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamErr) {
      console.error('Streaming error:', streamErr);
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted. Please try again.' })}\n\n`);
      res.end();
    }
  } else {
    const json = await responseStream.json();
    let text = '';
    if (providerUsed === 'gemini') {
      text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      text = json?.choices?.[0]?.message?.content || '';
    }
    res.json({ text, provider: providerUsed });
  }
});

// POST /api/visitor-notification endpoint (Resend API Integration)
app.post('/api/visitor-notification', async (req, res) => {
  try {
    const visitorName = (req.body?.visitorName || '').trim();

    if (!visitorName || visitorName.length < 2 || visitorName.length > 60) {
      return res.status(400).json({ error: 'Invalid visitor name. Must be between 2 and 60 characters.' });
    }

    const sanitizedName = visitorName.replace(/[<>&"']/g, '');
    const resendKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.NOTIFICATION_EMAIL || 'agent.academyy@gmail.com';

    if (!resendKey) {
      console.warn('RESEND_API_KEY missing in environment.');
      return res.json({ status: 'ok', note: 'Notification logged locally' });
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const pageUrl = req.body?.pageUrl || 'AI Academy Website';

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">New Website Visitor Notification</h2>
        <p style="color: #374151; font-size: 15px;">A visitor has entered their name on <strong>AI Academy</strong>.</p>

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
      return res.status(500).json({ error: 'Failed to send notification email' });
    }

    const resendResult = await resendResponse.json();
    res.json({ status: 'success', id: resendResult.id });
  } catch (err) {
    console.error('Visitor notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI Academy Server running on http://localhost:${PORT}`);
});
