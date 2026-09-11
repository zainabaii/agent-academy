/* ============================================================
   AI ACADEMY — Netlify Serverless Function
   Chatbot API via Groq API (llama-3.3-70b-versatile)
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
      userApiKey = null
    } = payload;

    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Messages array is required' })
      };
    }

    const apiKey = userApiKey || process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'GROQ_API_KEY environment variable is not configured.' })
      };
    }

    const groqResponse = await callGroqAPI(messages, systemInstruction, stream, apiKey);

    // Handle Streaming SSE Response
    if (stream) {
      let sseBody = '';
      const reader = groqResponse.body.getReader();
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
            const text = chunk?.choices?.[0]?.delta?.content || '';
            if (text) {
              sseBody += `data: ${JSON.stringify({ text, provider: 'groq' })}\n\n`;
            }
          } catch (e) {
            // ignore incomplete chunk json parse errors
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
      const json = await groqResponse.json();
      const text = json?.choices?.[0]?.message?.content || '';

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, provider: 'groq' })
      };
    }
  } catch (err) {
    console.error('Netlify Chat Function Error:', err);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Groq AI service temporarily unavailable.' })
    };
  }
};

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
    model: 'llama-3.3-70b-versatile',
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
    throw new Error(`Groq API error ${response.status}: ${errText.slice(0, 150)}`);
  }

  return response;
}
