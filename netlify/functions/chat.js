/* ============================================================
   AI ACADEMY — Netlify Serverless Function
   Multi-Provider Chatbot API (Gemini + Groq with automatic fallback)
   ============================================================ */

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const {
      messages = [],
      systemInstruction = '',
      stream = true,
      preferredProvider = 'gemini',
      userApiKey = null
    } = payload;

    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Messages array is required' })
      };
    }

    const geminiKey = userApiKey || process.env.GEMINI_API_KEY;
    const groqKey = userApiKey || process.env.GROQ_API_KEY;

    if (!geminiKey && !groqKey) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Neither GEMINI_API_KEY nor GROQ_API_KEY is configured in Netlify environment variables.' })
      };
    }

    let response = null;
    let providerUsed = preferredProvider;

    // Try primary provider first, fall back to secondary
    try {
      if (preferredProvider === 'groq' && groqKey) {
        response = await callGroqAPI(messages, systemInstruction, stream, groqKey);
        providerUsed = 'groq';
      } else if (geminiKey) {
        response = await callGeminiAPI(messages, systemInstruction, stream, geminiKey);
        providerUsed = 'gemini';
      } else if (groqKey) {
        response = await callGroqAPI(messages, systemInstruction, stream, groqKey);
        providerUsed = 'groq';
      }
    } catch (primaryErr) {
      console.warn(`Primary provider (${preferredProvider}) failed in Netlify function:`, primaryErr.message);
      // Fallback
      if (providerUsed === 'gemini' && groqKey) {
        try {
          response = await callGroqAPI(messages, systemInstruction, stream, groqKey);
          providerUsed = 'groq';
        } catch (fallbackErr) {
          throw new Error(`Gemini Error: ${primaryErr.message} | Groq Error: ${fallbackErr.message}`);
        }
      } else if (providerUsed === 'groq' && geminiKey) {
        try {
          response = await callGeminiAPI(messages, systemInstruction, stream, geminiKey);
          providerUsed = 'gemini';
        } catch (fallbackErr) {
          throw new Error(`Groq Error: ${primaryErr.message} | Gemini Error: ${fallbackErr.message}`);
        }
      } else {
        throw primaryErr;
      }
    }

    // Handle Streaming SSE Response
    if (stream) {
      let sseBody = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (providerUsed === 'gemini') {
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6).trim();
              try {
                const chunk = JSON.parse(jsonStr);
                const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  sseBody += `data: ${JSON.stringify({ text, provider: 'gemini' })}\n\n`;
                }
              } catch (e) {}
            }
          } else {
            // Groq SSE
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6).trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const chunk = JSON.parse(jsonStr);
                const text = chunk?.choices?.[0]?.delta?.content || '';
                if (text) {
                  sseBody += `data: ${JSON.stringify({ text, provider: 'groq' })}\n\n`;
                }
              } catch (e) {}
            }
          }
        }
      }

      sseBody += 'data: [DONE]\n\n';

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: sseBody
      };
    } else {
      // Non-streaming response
      const json = await response.json();
      let text = '';
      if (providerUsed === 'gemini') {
        text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        text = json?.choices?.[0]?.message?.content || '';
      }

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, provider: providerUsed })
      };
    }
  } catch (err) {
    console.error('Netlify Chat Function Error:', err);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'AI service temporarily unavailable.' })
    };
  }
};

// Helper: Gemini API
async function callGeminiAPI(messages, systemInstruction, stream, apiKey) {
  const model = 'gemini-2.0-flash';
  const apiEndpoint = stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${apiEndpoint}key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction || '' }]
    },
    contents: messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    })),
    generationConfig: {
      temperature: 0.7,
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

// Helper: Groq API
async function callGroqAPI(messages, systemInstruction, stream, apiKey) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const formattedMessages = [];

  if (systemInstruction && systemInstruction.trim()) {
    formattedMessages.push({ role: 'system', content: systemInstruction.trim() });
  }

  messages.forEach(m => {
    formattedMessages.push({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content || ''
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
