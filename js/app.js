/* ============================================================
   AI ACADEMY — app.js
   Entry point: initialization, event listeners, routing,
   chat orchestration, onboarding flow, Visitor Name System (SaaS Minimalist)
   ============================================================ */

let conversationHistory = [];
let isProcessing = false;
let currentView = 'chat';

// ── Initialize App ────────────────────────────────────────────
function initApp() {
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true,
      sanitize: false,
    });
  }

  // Initialize agent drawer cards
  UI.initAgentPanel();

  // Check visitor notification status
  checkVisitorNotification();

  // Restore saved difficulty level UI
  const currentDiff = Config.getDifficulty();
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === currentDiff);
  });

  // Switch to default view
  const lastView = Config.get('aiacademy_current_view', 'landing');
  UI.switchView(lastView);
  if (lastView === 'chat') {
    UI.showWelcomeMessage();
  }

  // Update header, dashboard widgets, and session statistics
  UI.updateHeaderProfile();
  UI.renderDashboardWidgets();
  UI.updateSessionStats();

  // Bind event listeners
  bindEvents();
}

// ── Visitor Welcome System ────────────────────────────────────
function checkVisitorNotification() {
  const isNotified = localStorage.getItem('aiacademy_visitor_notified');
  if (!isNotified) {
    const modal = document.getElementById('visitor-modal');
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => {
        document.getElementById('visitor-name-input')?.focus();
      }, 150);
    }
  }
}

function handleVisitorSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('visitor-name-input');
  const name = (input?.value || '').trim();

  if (!name || name.length < 2 || name.length > 50) {
    UI.toast('Please enter a valid name (2-50 characters)', 'error');
    return;
  }

  const sanitizedName = name.replace(/[<>&"']/g, '');

  // Update user profile and storage
  Config.setProfile({ name: sanitizedName });
  localStorage.setItem('aiacademy_visitor_notified', 'true');
  UI.updateHeaderProfile();

  // Hide modal
  const modal = document.getElementById('visitor-modal');
  if (modal) modal.style.display = 'none';

  UI.toast(`Welcome to AI Academy, ${sanitizedName}!`, 'info', 2000);

  // Send email notification asynchronously in background
  fetch('/api/visitor-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorName: sanitizedName,
      pageUrl: window.location.href
    })
  })
  .then(res => res.json())
  .then(data => console.log('Visitor notification sent:', data))
  .catch(err => console.warn('Visitor notification log:', err));
}

// ── Event Listeners ───────────────────────────────────────────
function bindEvents() {
  // Sidebar navigation items
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.view) {
        UI.switchView(item.dataset.view);
        closeMobileSidebar();
      }
    });
  });

  // Difficulty Selector buttons
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const level = btn.dataset.level;
      Config.setDifficulty(level);
      UI.toast(`Understanding level set to: ${level.toUpperCase()}`, 'info', 2000);
    });
  });

  // New Chat button
  const newChatBtn = document.getElementById('new-chat-btn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      startNewChat();
    });
  }

  // Landing form submission
  const landingForm = document.getElementById('landing-form');
  if (landingForm) {
    landingForm.addEventListener('submit', handleLandingSubmit);
  }

  const landingInput = document.getElementById('landing-input');
  if (landingInput) {
    landingInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        landingForm?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });
  }

  // Chat form submission
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
  }

  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });
    chatInput.addEventListener('input', () => autoResizeTextarea(chatInput));
  }

  // User profile cards on landing
  document.querySelectorAll('.user-type-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.user-type-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      Config.setProfile({ type: card.dataset.type });
      UI.updateHeaderProfile();
    });
  });

  // Settings save buttons
  const saveProfileBtn = document.getElementById('save-profile-btn');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfile);
  }

  // Settings toggles
  const streamToggle = document.getElementById('setting-stream');
  if (streamToggle) {
    streamToggle.addEventListener('change', (e) => Config.setSetting('streamResponses', e.target.checked));
  }

  const langToggle = document.getElementById('setting-language');
  if (langToggle) {
    langToggle.addEventListener('change', (e) => Config.setSetting('mixedLanguage', e.target.checked));
  }

  // Mobile menu toggle
  const mobileBtn = document.getElementById('mobile-menu-toggle');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      document.getElementById('app-sidebar')?.classList.toggle('mobile-open');
    });
  }

  // AI Activity drawer trigger
  const activityBtn = document.getElementById('ai-activity-btn');
  if (activityBtn) {
    activityBtn.addEventListener('click', () => UI.toggleAgentDrawer(true));
  }
}

function closeMobileSidebar() {
  document.getElementById('app-sidebar')?.classList.remove('mobile-open');
}

// ── Landing Submit Handler ────────────────────────────────────
async function handleLandingSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('landing-input');
  const text = input?.value?.trim();
  if (!text) return;

  const selectedType = document.querySelector('.user-type-card.selected');
  if (selectedType) {
    Config.setProfile({ type: selectedType.dataset.type });
  }

  switchToChat(text);
}

// ── Switch to Chat View ───────────────────────────────────────
function switchToChat(initialMessage) {
  UI.switchView('chat');
  currentView = 'chat';

  const msgs = document.getElementById('chat-messages');
  if (msgs && msgs.children.length === 0) {
    UI.showWelcomeMessage();
  }

  if (initialMessage) {
    setTimeout(() => {
      const chatInput = document.getElementById('chat-input');
      if (chatInput) {
        chatInput.value = initialMessage;
        document.getElementById('chat-form')?.dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true })
        );
      }
    }, 100);
  }
}

// ── Chat Submit Handler ───────────────────────────────────────
async function handleChatSubmit(e) {
  e.preventDefault();

  if (isProcessing) return;

  const input = document.getElementById('chat-input');
  const text = input?.value?.trim();
  if (!text) return;

  // Clear input
  input.value = '';
  input.style.height = 'auto';

  // Add to conversation history
  conversationHistory.push({ role: 'user', content: text });

  // Update session stats
  Config.incrementStat('messagesCount');
  UI.updateSessionStats();

  // Display user message in UI
  UI.addUserMessage(text);

  // Add to sidebar history
  if (conversationHistory.filter(m => m.role === 'user').length === 1) {
    const title = text.slice(0, 32) + (text.length > 32 ? '...' : '');
    UI.addChatHistoryItem(title);
  }

  // Start processing
  isProcessing = true;
  UI.setSendButtonState(true);

  // Show loading state
  UI.showTypingIndicator();

  // Reset agent panel status
  UI.resetAllAgents();

  let currentMsgId = null;

  try {
    const result = await Agents.orchestrate(text, conversationHistory, {
      onQueueReady(agentQueue) {
        UI.highlightActiveAgents(agentQueue);
      },

      onAgentStart(agentId, agentDef) {
        UI.setAgentStatus(agentId, 'thinking', `Analyzing query...`);
        UI.removeTypingIndicator();

        currentMsgId = UI.addAIMessage(agentId);
        UI.setAgentStatus(agentId, 'working', 'Generating answer...');
      },

      onToken(token, agentId) {
        if (currentMsgId) {
          UI.appendToMessage(currentMsgId, token);
        }
      },

      onAgentComplete(agentId, agentDef, responseText) {
        if (currentMsgId) {
          if (!responseText || !responseText.trim()) {
            UI.finalizeMessage(currentMsgId, "Sorry, I couldn't generate a response. Please try asking again.");
          } else {
            UI.finalizeMessage(currentMsgId);
          }
        }
        UI.setAgentStatus(agentId, 'done', 'Completed');

        if (responseText && responseText.trim()) {
          conversationHistory.push({ role: 'assistant', content: responseText });
        }

        if (conversationHistory.length > 20) {
          conversationHistory = conversationHistory.slice(-20);
        }
      },
    });

  } catch (err) {
    UI.removeTypingIndicator();
    UI.resetAllAgents();
    console.error('Orchestration error:', err);

    if (currentMsgId) {
      UI.finalizeMessage(currentMsgId, `Sorry, I couldn't generate a response. ${err.message || 'Please try again.'}`);
    } else {
      const errId = UI.addAIMessage('explainer');
      UI.finalizeMessage(errId, `Sorry, I couldn't generate a response. ${err.message || 'Please try again.'}`);
    }

    UI.toast(err.message || 'AI request failed', 'error');
  } finally {
    isProcessing = false;
    UI.setSendButtonState(false);
    UI.removeTypingIndicator();
  }
}

// ── New Chat Session ──────────────────────────────────────────
function startNewChat() {
  conversationHistory = [];
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
  UI.resetAllAgents();
  UI.switchView('chat');
  UI.showWelcomeMessage();
  UI.toast('New chat session started', 'info', 2000);
}

// ── Profile Save Handler ──────────────────────────────────────
function saveProfile() {
  const name  = document.getElementById('setting-name')?.value?.trim();
  const type  = document.getElementById('setting-type')?.value;
  const level = document.getElementById('setting-level')?.value;
  const goal  = document.getElementById('setting-goal')?.value?.trim();

  Config.setProfile({ name, type, level, goal });
  UI.updateHeaderProfile();
  UI.toast('Profile saved', 'success');
}

// ── Auto-resize Textarea ──────────────────────────────────────
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function escapeHtml(text) {
  return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', initApp);
