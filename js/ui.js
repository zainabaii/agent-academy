/* ============================================================
   AI ACADEMY — ui.js
   DOM helpers, markdown rendering, clean message rendering,
   error handling & slide-over drawer UI (SaaS Minimalist)
   ============================================================ */

const UI = (() => {

  // ── Markdown renderer (uses marked.js CDN) ────────────────────
  function renderMarkdown(text) {
    if (!text || !text.trim()) return '';
    if (typeof marked !== 'undefined') {
      try {
        return marked.parse(text, {
          breaks: true,
          gfm: true,
        });
      } catch {}
    }
    // Fallback: basic formatting
    return text
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
      <div class="message-avatar">AI</div>
      <div class="message-body">
        <div class="message-meta">
          <span style="font-weight:600;color:var(--text-primary)">AI Learning Assistant</span> • <span>${formatTime()}</span>
        </div>
        <div class="message-bubble md-content" id="${msgId}_content"></div>
        <div class="message-actions" id="${msgId}_actions" style="display:none;">
          <button class="msg-action-btn" onclick="UI.copyMessage('${msgId}')">Copy</button>
        </div>
        <div class="contextual-actions" id="${msgId}_contextual" style="display:none;">
          <button class="contextual-btn" onclick="UI.sendMessage('Give me a short quiz on this topic')">📝 Take Quiz</button>
          <button class="contextual-btn" onclick="UI.sendMessage('Recommend a hands-on project for this')">🛠️ Practice Project</button>
          <button class="contextual-btn" onclick="UI.sendMessage('Explain this deeper with advanced examples')">🔍 Go Deeper</button>
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
      <div class="message-avatar">AI</div>
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
    if (msgCountEl) msgCountEl.textContent = session.messagesCount || 0;
    if (quizCountEl) quizCountEl.textContent = session.quizzesTaken || 0;
  }

  function updateHeaderProfile() {
    const profile = Config.getProfile();
    const initials = (profile.name || 'Learner').slice(0, 2).toUpperCase();
    const avatarEl = document.getElementById('header-avatar');
    const nameEl   = document.getElementById('header-name');
    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl)   nameEl.textContent   = profile.name;
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
