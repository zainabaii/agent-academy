/* ============================================================
   AI ACADEMY — config.js
   API key management, backend integration, model config, localStorage helpers
   ============================================================ */

const Config = (() => {
  const STORAGE_KEYS = {
    API_KEY:          'aiacademy_api_key',
    USER_NAME:        'aiacademy_user_name',
    USER_TYPE:        'aiacademy_user_type',
    USER_LEVEL:       'aiacademy_user_level',
    USER_DIFFICULTY:  'aiacademy_user_difficulty', // beginner | normal | advanced | high
    USER_GOAL:        'aiacademy_user_goal',
    CHAT_HISTORY:     'aiacademy_chat_history',
    PROGRESS:         'aiacademy_progress',
    SETTINGS:         'aiacademy_settings',
    SESSION:          'aiacademy_session',
    CAREER_PROFILE:   'aiacademy_career_profile',
    ACHIEVEMENTS:     'aiacademy_achievements',
    DAILY_CHALLENGE:  'aiacademy_daily_challenge',
  };

  const MODEL = 'gemini-2.0-flash';

  // ── LocalStorage helpers ─────────────────────────────────────
  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write failed:', e);
    }
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  // ── API Key ──────────────────────────────────────────────────
  function getApiKey() {
    return get(STORAGE_KEYS.API_KEY, '');
  }

  function setApiKey(key) {
    set(STORAGE_KEYS.API_KEY, key ? key.trim() : '');
  }

  function hasApiKey() {
    return true; // Server-side environment provides key fallback
  }

  // ── User Profile ─────────────────────────────────────────────
  function getProfile() {
    return {
      name:       get(STORAGE_KEYS.USER_NAME, 'Learner'),
      type:       get(STORAGE_KEYS.USER_TYPE, 'student'),
      level:      get(STORAGE_KEYS.USER_LEVEL, 'beginner'),
      difficulty: get(STORAGE_KEYS.USER_DIFFICULTY, 'normal'),
      goal:       get(STORAGE_KEYS.USER_GOAL, ''),
    };
  }

  function setProfile(profile) {
    if (profile.name       !== undefined) set(STORAGE_KEYS.USER_NAME,       profile.name);
    if (profile.type       !== undefined) set(STORAGE_KEYS.USER_TYPE,       profile.type);
    if (profile.level      !== undefined) set(STORAGE_KEYS.USER_LEVEL,      profile.level);
    if (profile.difficulty !== undefined) set(STORAGE_KEYS.USER_DIFFICULTY, profile.difficulty);
    if (profile.goal       !== undefined) set(STORAGE_KEYS.USER_GOAL,       profile.goal);
  }

  function getDifficulty() {
    return get(STORAGE_KEYS.USER_DIFFICULTY, 'normal');
  }

  function setDifficulty(diff) {
    set(STORAGE_KEYS.USER_DIFFICULTY, diff);
  }

  // ── Settings ─────────────────────────────────────────────────
  function getSettings() {
    return get(STORAGE_KEYS.SETTINGS, {
      streamResponses: true,
      mixedLanguage:   true,
      autoQuiz:        true,
      soundEffects:    false,
      provider:        'gemini',
    });
  }

  function setSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    set(STORAGE_KEYS.SETTINGS, s);
  }

  // ── Session ──────────────────────────────────────────────────
  function getSession() {
    return get(STORAGE_KEYS.SESSION, {
      messagesCount: 0,
      quizzesTaken:  0,
      topicsStudied: [],
      startedAt: Date.now(),
    });
  }

  function updateSession(updates) {
    const s = getSession();
    const merged = { ...s, ...updates };
    set(STORAGE_KEYS.SESSION, merged);
    return merged;
  }

  function incrementStat(key, amount = 1) {
    const s = getSession();
    s[key] = (s[key] || 0) + amount;
    set(STORAGE_KEYS.SESSION, s);
    return s[key];
  }

  // ── API Call via Secure Backend Server ───────────────────────
  async function callGemini(messages, systemInstruction = '') {
    const settings = getSettings();
    const localKey = getApiKey();

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        systemInstruction,
        stream: false,
        preferredProvider: settings.provider || 'gemini',
        userApiKey: localKey || undefined
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMessage = `API error ${response.status}`;
      try {
        const json = JSON.parse(errText);
        if (json.error) errMessage = json.error;
      } catch {}
      throw new Error(errMessage);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text || '';
  }

  // ── Streaming Call via Secure Backend Server ──────────────────
  async function* streamGemini(messages, systemInstruction = '') {
    const settings = getSettings();
    const localKey = getApiKey();

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        systemInstruction,
        stream: true,
        preferredProvider: settings.provider || 'gemini',
        userApiKey: localKey || undefined
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMessage = `API error ${response.status}`;
      try {
        const json = JSON.parse(errText);
        if (json.error) errMessage = json.error;
      } catch {}
      throw new Error(errMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') return;

        let chunk = null;
        try {
          chunk = JSON.parse(jsonStr);
        } catch {
          continue; // partial JSON line chunk
        }

        if (chunk && chunk.error) {
          throw new Error(chunk.error);
        }

        if (chunk && chunk.text) {
          yield chunk.text;
        }
      }
    }
  }

  return {
    STORAGE_KEYS,
    MODEL,
    get, set, remove,
    getApiKey, setApiKey, hasApiKey,
    getProfile, setProfile,
    getDifficulty, setDifficulty,
    getSettings, setSetting,
    getSession, updateSession, incrementStat,
    callGemini, streamGemini,
  };
})();
