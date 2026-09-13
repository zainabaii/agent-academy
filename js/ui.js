/* ============================================================
   AI ACADEMY — ui.js
   DOM helpers, markdown rendering, clean message rendering,
   error handling & slide-over drawer UI (SaaS Minimalist)
   ============================================================ */

const UI = (() => {

  // ── Markdown renderer (uses marked.js CDN) ────────────────────
  function renderMarkdown(text) {
    if (!text || !text.trim()) return '';
    let parsed = '';
    if (typeof marked !== 'undefined') {
      try {
        parsed = marked.parse(text, {
          breaks: true,
          gfm: true,
        });
      } catch {
        parsed = text;
      }
    } else {
      parsed = text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    }

    if (parsed) {
      parsed = parsed
        .replace(/<h[234]>\s*(?:💡|📌|🧠)?\s*Remember This\s*:?\s*<\/h[234]>\s*<p>(.*?)<\/p>/gi, '<div class="ai-card-remember"><div class="ai-card-remember-title">💡 Remember This</div><p>$1</p></div>')
        .replace(/<h[234]>\s*(?:🎯|📝|⚠️)?\s*Exam Point\s*:?\s*<\/h[234]>\s*<p>(.*?)<\/p>/gi, '<div class="ai-card-exam"><div class="ai-card-exam-title">🎯 Exam Point</div><p>$1</p></div>');
    }

    return parsed;
  }

  // ── Toast Notifications ───────────────────────────────────────
  function toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${escapeHtml(message)}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, duration);
  }

  // ── View Switching ────────────────────────────────────────────
  function switchView(viewId) {
    document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('active');

    // Update sidebar nav
    document.querySelectorAll('.sidebar-nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.view === viewId);
    });

    if (viewId === 'progress') Progress.renderProgressDashboard();
    if (viewId === 'roadmap') Progress.renderRoadmap();
    if (viewId === 'settings') renderSettings();

    Config.set('aiacademy_current_view', viewId);
  }

  // ── Slide-Over Agent Activity Drawer ──────────────────────────
  function initAgentPanel() {
    const drawer = document.getElementById('agent-cards');
    if (!drawer) return;

    const agents = Agents.getAllAgents();
    drawer.innerHTML = agents.map((agent) => `
      <div class="card" id="agent_card_${agent.id}" style="padding:12px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <span style="font-weight:600;font-size:0.825rem;">${escapeHtml(agent.name)}</span>
          <span class="badge badge-muted" id="agent_status_${agent.id}">Waiting</span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted);" id="agent_task_${agent.id}">${escapeHtml(agent.role)}</div>
      </div>
    `).join('');
  }

  function setAgentStatus(agentId, status, taskText = '') {
    const statusEl = document.getElementById(`agent_status_${agentId}`);
    const taskEl = document.getElementById(`agent_task_${agentId}`);

    const statusConfig = {
      waiting:  { badge: 'badge-muted',    label: 'Waiting' },
      thinking: { badge: 'badge-warning',  label: 'Thinking' },
      working:  { badge: 'badge-indigo',   label: 'Working' },
      done:     { badge: 'badge-success',  label: 'Completed' },
    };

    const cfg = statusConfig[status] || statusConfig.waiting;
    if (statusEl) {
      statusEl.className = `badge ${cfg.badge}`;
      statusEl.textContent = cfg.label;
    }
    if (taskEl && taskText) taskEl.textContent = taskText;
  }

  function resetAllAgents() {
    Agents.getAllAgents().forEach(a => setAgentStatus(a.id, 'waiting'));
  }

  function highlightActiveAgents(agentQueue) {
    Agents.getAllAgents().forEach(a => {
      if (!agentQueue.includes(a.id)) {
        setAgentStatus(a.id, 'waiting');
      }
    });
  }

  function toggleAgentDrawer(open) {
    const drawer = document.getElementById('agent-drawer');
    if (!drawer) return;
    if (open !== undefined) {
      drawer.classList.toggle('open', open);
    } else {
      drawer.classList.toggle('open');
    }
  }

  // ── Chat Messages ─────────────────────────────────────────────
  function addUserMessage(text) {
    const profile = Config.getProfile();
    const initials = (profile.name || 'Learner').slice(0, 2).toUpperCase();
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;

    removeTypingIndicator();

    const el = document.createElement('div');
    el.className = 'message user';
    el.innerHTML = `
      <div class="message-avatar">${initials}</div>
      <div class="message-body">
        <div class="message-meta">
          <span>You</span> • <span>${formatTime()}</span>
        </div>
        <div class="message-bubble">${escapeHtml(text)}</div>
      </div>
    `;
    msgs.appendChild(el);
    scrollToBottom();
    return el;
  }

  function addAIMessage(agentId = 'explainer') {
    const agent = Agents.getAgentDef(agentId) || { name: 'AI Academy' };
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return null;

    removeTypingIndicator();

    const msgId = `ai_msg_${Date.now()}`;
    const el = document.createElement('div');
    el.className = 'message ai';
    el.id = msgId;
    el.innerHTML = `
      <div class="message-avatar" title="AI Academy Assistant">
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 4L5 26H10.2L13.5 19.2H18.5L21.8 26H27L16 4Z" fill="url(#ai-avatar-grad)" />
          <path d="M14.6 16.8H17.4L16 13.6L14.6 16.8Z" fill="#FFFFFF" />
          <circle cx="16" cy="4" r="2.2" fill="#818CF8" />
          <circle cx="5" cy="26" r="2.2" fill="#818CF8" />
          <circle cx="27" cy="26" r="2.2" fill="#818CF8" />
          <circle cx="13.5" cy="19.2" r="1.8" fill="#C7D2FE" />
          <circle cx="18.5" cy="19.2" r="1.8" fill="#C7D2FE" />
          <defs>
            <linearGradient id="ai-avatar-grad" x1="5" y1="4" x2="27" y2="26" gradientUnits="userSpaceOnUse">
              <stop stop-color="#818CF8"/>
              <stop offset="1" stop-color="#4F46E5"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="message-body">
        <div class="message-meta">
          <span style="font-weight:600;color:var(--text-primary)">AI Learning Assistant</span> • <span>${formatTime()}</span>
        </div>
        <div class="message-bubble md-content" id="${msgId}_content"></div>
        <div class="message-actions" id="${msgId}_actions" style="display:none;">
          <button class="msg-action-btn" onclick="UI.copyMessage('${msgId}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:-1px;margin-right:3px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy
          </button>
        </div>
        <div class="contextual-actions" id="${msgId}_contextual" style="display:none;">
          <button class="contextual-btn" onclick="UI.sendMessage('Give me a short quiz on this topic')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>Take Quiz</span>
          </button>
          <button class="contextual-btn" onclick="UI.sendMessage('Recommend a hands-on project for this')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            <span>Practice Project</span>
          </button>
          <button class="contextual-btn" onclick="UI.sendMessage('Explain this deeper with advanced examples')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span>Go Deeper</span>
          </button>
        </div>
      </div>
    `;
    msgs.appendChild(el);
    scrollToBottom();
    return msgId;
  }

  function appendToMessage(msgId, text) {
    const contentEl = document.getElementById(`${msgId}_content`);
    if (!contentEl) return;
    const current = contentEl.dataset.raw || '';
    const newText = current + text;
    contentEl.dataset.raw = newText;
    contentEl.innerHTML = renderMarkdown(newText);
    scrollToBottom();
  }

  function finalizeMessage(msgId, forceErrorMessage = null) {
    const contentEl = document.getElementById(`${msgId}_content`);
    if (!contentEl) return;

    let raw = forceErrorMessage || contentEl.dataset.raw || '';
    if (!raw.trim()) {
      raw = "Sorry, I couldn't generate a response. Please try again or check your settings.";
    }

    contentEl.innerHTML = renderMarkdown(raw);

    // Show actions
    const actionsEl = document.getElementById(`${msgId}_actions`);
    if (actionsEl) actionsEl.style.display = 'flex';

    // Show contextual action buttons if valid response
    const contextualEl = document.getElementById(`${msgId}_contextual`);
    if (contextualEl && !forceErrorMessage && raw.length > 50) {
      contextualEl.style.display = 'flex';
    }

    // Check for quiz content
    const parsed = Quiz.parseQuizFromText(raw);
    if (parsed && parsed.length > 0) {
      Quiz.startNewQuiz('general', parsed);
      const quizHtml = parsed.map((q, i) =>
        Quiz.renderQuizCard(q, i, parsed.length)
      ).join('');
      const quizEl = document.createElement('div');
      quizEl.innerHTML = quizHtml;
      const msgs = document.getElementById('chat-messages');
      if (msgs) msgs.appendChild(quizEl);
    }
    scrollToBottom();
  }

  function showTypingIndicator() {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    removeTypingIndicator();

    const el = document.createElement('div');
    el.className = 'message ai';
    el.id = 'typing-indicator';
    el.innerHTML = `
      <div class="message-avatar" title="AI Academy Assistant">
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 4L5 26H10.2L13.5 19.2H18.5L21.8 26H27L16 4Z" fill="url(#ai-type-grad)" />
          <path d="M14.6 16.8H17.4L16 13.6L14.6 16.8Z" fill="#FFFFFF" />
          <circle cx="16" cy="4" r="2.2" fill="#818CF8" />
          <circle cx="5" cy="26" r="2.2" fill="#818CF8" />
          <circle cx="27" cy="26" r="2.2" fill="#818CF8" />
          <defs>
            <linearGradient id="ai-type-grad" x1="5" y1="4" x2="27" y2="26" gradientUnits="userSpaceOnUse">
              <stop stop-color="#818CF8"/>
              <stop offset="1" stop-color="#4F46E5"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="message-body">
        <div class="message-meta">
          <span style="font-size:0.72rem;color:var(--text-muted)">AI Academy is thinking...</span>
        </div>
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    msgs.appendChild(el);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function copyMessage(msgId) {
    const contentEl = document.getElementById(`${msgId}_content`);
    if (!contentEl) return;
    const text = contentEl.dataset.raw || contentEl.innerText;
    navigator.clipboard.writeText(text).then(() => {
      toast('Copied to clipboard', 'info', 2000);
    });
  }

  function sendMessage(text) {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = text;
      document.getElementById('chat-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }

  function updateSessionStats() {
    const session = Config.getSession();
    const msgCountEl = document.getElementById('stat-messages');
    const quizCountEl = document.getElementById('stat-quizzes');
    const progressEl = document.getElementById('stat-overall-progress');
    if (msgCountEl) msgCountEl.textContent = session.messagesCount || 0;
    if (quizCountEl) quizCountEl.textContent = session.quizzesTaken || 0;
    if (progressEl && typeof Progress !== 'undefined') {
      progressEl.textContent = (Progress.getOverallProgress() || 0) + '%';
    }
  }

  function updateHeaderProfile() {
    const profile = Config.getProfile();
    const initials = (profile.name || 'Learner').slice(0, 2).toUpperCase();
    const avatarEl = document.getElementById('header-avatar');
    const nameEl   = document.getElementById('header-name');
    const welcomeNameEl = document.getElementById('landing-welcome-name');
    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl)   nameEl.textContent   = profile.name;
    if (welcomeNameEl) welcomeNameEl.textContent = profile.name || 'Learner';
  }

  function addChatHistoryItem(title) {
    const container = document.getElementById('chat-history-list');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'chat-history-item';
    el.textContent = title;
    el.onclick = () => {
      switchView('chat');
    };
    container.prepend(el);
  }

  function renderSettings() {
    const profile  = Config.getProfile();
    const settings = Config.getSettings();

    const nameEl    = document.getElementById('setting-name');
    const typeEl    = document.getElementById('setting-type');
    const levelEl   = document.getElementById('setting-level');
    const goalEl    = document.getElementById('setting-goal');
    const streamEl  = document.getElementById('setting-stream');
    const langEl    = document.getElementById('setting-language');

    if (nameEl)   nameEl.value   = profile.name;
    if (typeEl)   typeEl.value   = profile.type;
    if (levelEl)  levelEl.value  = profile.level;
    if (goalEl)   goalEl.value   = profile.goal;
    if (streamEl) streamEl.checked = settings.streamResponses;
    if (langEl)   langEl.checked   = settings.mixedLanguage;
  }

  function showWelcomeMessage() {
    const msgs = document.getElementById('chat-messages');
    if (!msgs || msgs.children.length > 0) return;

    const msgId = addAIMessage('explainer');
    if (!msgId) return;

    const profile = Config.getProfile();
    const name = profile.name !== 'Learner' ? profile.name : '';

    const welcomeText = `### Welcome to AI Academy${name ? ', ' + name : ''} 👋

I am your **AI Learning Assistant**. I can help you understand academic concepts, generate step-by-step learning roadmaps, create practice quizzes, and prepare for exams and technical careers.

**What would you like to learn today?**
- *"Explain Newton's second law of motion with formula and numerical example"*
- *"I want to become a Software Engineer — create a learning roadmap"*
- *"Give me a 5-question quiz on Python fundamentals"*`;

    appendToMessage(msgId, welcomeText);
    finalizeMessage(msgId);
  }

  function scrollToBottom() {
    const msgs = document.getElementById('chat-messages');
    if (msgs) {
      requestAnimationFrame(() => {
        msgs.scrollTop = msgs.scrollHeight;
      });
    }
  }

  function formatTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setSendButtonState(loading) {
    const btn = document.getElementById('send-btn');
    const input = document.getElementById('chat-input');
    if (btn) btn.disabled = loading;
    if (input) input.disabled = loading;
  }

  return {
    renderMarkdown,
    toast,
    switchView,
    initAgentPanel,
    setAgentStatus,
    resetAllAgents,
    highlightActiveAgents,
    toggleAgentDrawer,
    addUserMessage,
    addAIMessage,
    appendToMessage,
    finalizeMessage,
    showTypingIndicator,
    removeTypingIndicator,
    copyMessage,
    sendMessage,
    updateSessionStats,
    updateHeaderProfile,
    addChatHistoryItem,
    renderSettings,
    showWelcomeMessage,
    scrollToBottom,
    formatTime,
    escapeHtml,
    setSendButtonState,
  };
})();
