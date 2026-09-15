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

    if (viewId === 'landing' || viewId === 'dashboard') renderDashboardWidgets();
    if (viewId === 'progress') Progress.renderProgressDashboard();
    if (viewId === 'roadmap') Progress.renderRoadmap();
    if (viewId === 'skill-scan') renderSkillScanView();
    if (viewId === 'weak-areas') renderWeakAreasView();
    if (viewId === 'career' && typeof Career !== 'undefined') Career.renderCareerHub();
    if (viewId === 'project-builder' && typeof Projects !== 'undefined') Projects.renderProjectBuilder();
    if (viewId === 'challenges') renderChallengesView();
    if (viewId === 'achievements') renderAchievementsView();
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
    switchView('chat');
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = text;
        document.getElementById('chat-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 50);
  }

  function updateSessionStats() {
    const session = Config.getSession();
    const streak = Config.getStreak ? Config.getStreak() : 0;
    const msgCountEl = document.getElementById('stat-messages');
    const quizCountEl = document.getElementById('stat-quizzes');
    const progressEl = document.getElementById('stat-overall-progress');
    const streakEl = document.getElementById('stat-streak');

    if (msgCountEl) msgCountEl.textContent = session.messagesCount || 0;
    if (quizCountEl) quizCountEl.textContent = session.quizzesTaken || 0;
    
    if (progressEl && typeof Progress !== 'undefined') {
      const overall = Progress.getOverallProgress ? Progress.getOverallProgress() : 0;
      progressEl.textContent = overall > 0 ? `${overall}%` : 'Not assessed yet';
    }
    
    if (streakEl) {
      streakEl.textContent = streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'}` : 'Start learning';
    }
  }

  function updateHeaderProfile() {
    const profile = Config.getProfile();
    const initials = (profile.name || 'Learner').slice(0, 2).toUpperCase();
    const avatarEl = document.getElementById('header-avatar');
    const nameEl   = document.getElementById('header-name');
    const welcomeNameEl = document.getElementById('landing-welcome-name');
    const subtitleEl = document.getElementById('landing-journey-subtitle');

    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl)   nameEl.textContent   = profile.name;
    if (welcomeNameEl) welcomeNameEl.textContent = profile.name || 'Learner';
    if (subtitleEl && profile.goal) {
      subtitleEl.textContent = `Goal: ${profile.goal} • Level: ${profile.level || 'Intermediate'}`;
    }
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

I am your **AI Learning & Career Agent**. I can help you evaluate your skills, build customized learning roadmaps, construct hands-on projects, and practice for technical interviews.

**What would you like to accomplish today?**
- *"Explain REST APIs and HTTP status codes"*
- *"I want to become an AI Engineer — create my skill roadmap"*
- *"Test my knowledge with a 5-question quiz"*`;

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

  // ── Dashboard Widgets ("WHAT SHOULD I DO NEXT?") ─────────────
  function renderDashboardWidgets() {
    const nextWidgetEl = document.getElementById('dashboard-next-step-widget');
    const journeyEl = document.getElementById('dashboard-active-journey');
    const profile = Config.getProfile();

    if (nextWidgetEl && typeof Progress !== 'undefined') {
      const next = Progress.getWhatShouldIDoNext ? Progress.getWhatShouldIDoNext() : Progress.generateSkillScan().nextStep;

      nextWidgetEl.innerHTML = `
        <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border: 1.5px solid var(--primary-border); border-radius: var(--radius-xl); padding: 22px 26px; box-shadow: var(--shadow-sm); position: relative; overflow: hidden;">
          <div style="position: absolute; right: -10px; top: -10px; font-size: 5.5rem; opacity: 0.06; pointer-events: none; font-weight: 900; color: var(--primary);">
            NEXT
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.06em;">
              <span>⚡</span> <span>SIGNATURE FEATURE: WHAT SHOULD I DO NEXT?</span>
            </div>
            <span class="badge badge-indigo" style="font-size:0.75rem;">AI Recommendation</span>
          </div>

          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
            ${escapeHtml(next.title)}
          </h3>

          <div style="background: rgba(255, 255, 255, 0.75); border-radius: var(--radius-md); padding: 10px 14px; border: 1px solid var(--primary-border); margin-bottom: 14px; font-size: 0.825rem; color: var(--text-primary);">
            <span style="font-weight: 700; color: var(--primary);">WHY THIS?</span> — ${escapeHtml(next.whyThis || next.description)}
          </div>

          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 16px; max-width: 680px;">
            ${escapeHtml(next.description)}
          </p>

          <button class="btn btn-primary" onclick="${next.actionPrompt ? `UI.sendMessage('${next.actionPrompt}')` : `UI.switchView('${next.actionView || 'chat'}')`}">
            ${escapeHtml(next.actionText || 'Start Now →')}
          </button>
        </div>
      `;
    }

    if (journeyEl && typeof Progress !== 'undefined') {
      const data = Progress.getProgressData();
      const userGoal = profile.goal || 'AI & Software Engineering';
      const completedCount = data.completedTopics.length;
      const overallPct = Progress.getOverallProgress ? Progress.getOverallProgress() : 0;

      journeyEl.innerHTML = `
        <div class="card" style="display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 240px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span class="badge badge-indigo">Connected Journey</span>
              <span style="font-size:0.78rem;color:var(--text-muted);font-weight:600;">Target Goal: ${escapeHtml(userGoal)}</span>
            </div>
            <h3 style="font-size: 1.15rem; color: var(--text-primary); margin-bottom: 4px;">
              LEARN → PRACTICE → ASSESS → IMPROVE → BUILD → PREPARE → ADVANCE
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
              ${completedCount > 0 ? `${completedCount} topics completed towards your career goal.` : 'Begin your journey by completing your first topic review or skill assessment.'}
            </p>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: ${Math.max(10, Math.min(100, (completedCount * 20) + (overallPct * 0.8)))}%;"></div>
            </div>
          </div>
          <button class="btn btn-secondary" onclick="UI.switchView('roadmap');">
            View Roadmap →
          </button>
        </div>
      `;
    }

    updateSessionStats();
  }

  // ── Render AI Skill Scan View ────────────────────────────────
  function renderSkillScanView() {
    const container = document.getElementById('skill-scan-container');
    if (!container) return;

    const scan = Progress.generateSkillScan();

    container.innerHTML = `
      <div class="card" style="margin-bottom: 24px; text-align: center; padding: 32px 24px;">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">🎯</div>
        <h2 style="font-size: 1.4rem; color: var(--text-primary); margin-bottom: 6px;">AI Skill Scan Engine</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 520px; margin: 0 auto 20px;">
          Analyzes your assessment quiz results, completed learning topics, and performance accuracy to diagnose strengths and gaps.
        </p>
        <button class="btn btn-primary" onclick="UI.toast('Skill scan refreshed!', 'info'); UI.switchView('skill-scan');">
          🔍 Refresh AI Skill Scan
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px;">
        <!-- Strengths -->
        <div class="card">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--success); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <span>💪</span> <span>Detected Strengths (${scan.strengths.length})</span>
          </div>
          ${scan.strengths.length > 0 ? scan.strengths.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
              <span style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">${escapeHtml(s.name)}</span>
              <span class="badge badge-success">${s.score}% Mastery</span>
            </div>
          `).join('') : '<p style="font-size: 0.85rem; color: var(--text-muted);">Complete quizzes and assessments to unlock your strengths list.</p>'}
        </div>

        <!-- Weak Areas -->
        <div class="card">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--warning); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <span>⚠️</span> <span>Areas Requiring Practice (${scan.weakAreas.length})</span>
          </div>
          ${scan.weakAreas.length > 0 ? scan.weakAreas.map(w => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
              <span style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">${escapeHtml(w.name)}</span>
              <span class="badge badge-warning">${w.score}%</span>
            </div>
          `).join('') : '<p style="font-size: 0.85rem; color: var(--text-muted);">No weak areas detected! Great work.</p>'}
        </div>
      </div>
    `;
  }

  // ── Render Weak Areas Page ────────────────────────────────────
  function renderWeakAreasView() {
    const container = document.getElementById('weak-areas-page-container');
    if (!container) return;

    const data = Progress.getProgressData();
    const weakList = data.weakAreas || [];

    if (weakList.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px 24px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🎉</div>
          <h2 style="font-size: 1.3rem; color: var(--text-primary); margin-bottom: 6px;">No Weak Areas Detected</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 480px; margin: 0 auto 20px;">
            You have no active weak areas recorded. Complete quizzes and assessments to discover topics that need extra practice.
          </p>
          <button class="btn btn-primary" onclick="UI.sendMessage('Give me a 5-question test on Python and APIs')">
            Take Assessment Quiz →
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${weakList.map(item => `
            <div class="card" style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
              <div>
                <span class="badge badge-warning" style="margin-bottom: 6px;">Weakness Detected</span>
                <h3 style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 4px;">${escapeHtml(item)}</h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary);">Targeted AI recommended practice available to improve score.</p>
              </div>
              <button class="btn btn-primary btn-sm" onclick="UI.sendMessage('Help me practice and master ${escapeHtml(item)}')">
                Practice Now →
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  // ── Render Daily Challenges ───────────────────────────────────
  function renderChallengesView() {
    const container = document.getElementById('challenges-container');
    if (!container) return;

    container.innerHTML = `
      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap;">
          <span class="badge badge-indigo">Daily Code & Logic Challenge</span>
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--success);">+50 XP Reward</span>
        </div>
        <h2 style="font-size: 1.25rem; color: var(--text-primary); margin-bottom: 6px;">
          ⚡ Challenge: Build an API Request in Python
        </h2>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 16px;">
          Write a Python function using <code>requests</code> that fetches data from a REST endpoint, handles HTTP 404/500 status codes, and returns parsed JSON.
        </p>
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <span class="badge badge-muted">Intermediate</span>
          <span class="badge badge-muted">⏱️ 15 min</span>
          <button class="btn btn-primary btn-sm" onclick="UI.sendMessage('Solve the Daily Challenge: Build a Python API request with error handling')">
            Start Challenge →
          </button>
        </div>
      </div>
    `;
  }

  // ── Render Achievements View ──────────────────────────────────
  function renderAchievementsView() {
    const container = document.getElementById('achievements-container');
    if (!container) return;

    const session = Config.getSession();
    const quizCount = session.quizzesTaken || 0;

    const badges = [
      { title: 'First Quiz', desc: 'Completed your first knowledge test', earned: quizCount >= 1, icon: '🎯' },
      { title: 'Learning Streak', desc: '5 consecutive days active', earned: true, icon: '🔥' },
      { title: 'Roadmap Milestone', desc: 'Completed Stage 1 Fundamentals', earned: true, icon: '🗺️' },
      { title: 'Project Builder', desc: 'Generated first project blueprint', earned: true, icon: '🛠️' },
      { title: 'Skill Master', desc: 'Reached 80%+ mastery in a skill', earned: false, icon: '⭐' },
      { title: 'Career Ready', desc: 'Scored 75%+ in AI Interview', earned: false, icon: '💼' },
    ];

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        ${badges.map(b => `
          <div class="card" style="text-align: center; opacity: ${b.earned ? '1' : '0.55'};">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">${b.icon}</div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 4px;">${b.title}</div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 10px;">${b.desc}</div>
            <span class="badge ${b.earned ? 'badge-success' : 'badge-muted'}" style="font-size: 0.7rem;">
              ${b.earned ? '✓ Unlocked' : 'Locked'}
            </span>
          </div>
        `).join('')}
      </div>
    `;
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
    renderDashboardWidgets,
    renderSkillScanView,
    renderWeakAreasView,
    renderChallengesView,
    renderAchievementsView,
    showWelcomeMessage,
    scrollToBottom,
    formatTime,
    escapeHtml,
    setSendButtonState,
  };
})();

