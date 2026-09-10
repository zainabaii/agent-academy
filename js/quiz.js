/* ============================================================
   AI ACADEMY — quiz.js
   Quiz state machine, MCQ renderer, adaptive difficulty,
   score tracker
   ============================================================ */

const Quiz = (() => {

  // ── Quiz State ────────────────────────────────────────────────
  let currentQuiz = null;
  let sessionScores = {};

  // ── Parse quiz from AI response ──────────────────────────────
  /**
   * Tries to extract MCQs from AI markdown text.
   * Returns array of question objects or null if not parseable.
   */
  function parseQuizFromText(text) {
    const questions = [];

    // Match patterns like:
    // **Question 1:** ... A) ... B) ... C) ... D) ...
    const qBlocks = text.split(/\*{0,2}Question\s+\d+[\*:.\)]/i).slice(1);

    for (const block of qBlocks) {
      try {
        const lines = block.trim().split('\n').filter(l => l.trim());

        // Question text (first non-empty line before options)
        let questionText = '';
        let optionStartIdx = -1;

        for (let i = 0; i < lines.length; i++) {
          if (/^[A-D][)\.]\s/i.test(lines[i].trim())) {
            optionStartIdx = i;
            break;
          }
          questionText += lines[i] + ' ';
        }

        if (optionStartIdx === -1) continue;

        questionText = questionText.replace(/\*\*/g, '').trim();

        // Parse options A-D
        const options = {};
        for (let i = optionStartIdx; i < lines.length; i++) {
          const line = lines[i].trim();
          const match = line.match(/^([A-D])[)\.]\s*(.+)/i);
          if (match) {
            options[match[1].toUpperCase()] = match[2].replace(/\*\*/g, '').trim();
          }
        }

        if (Object.keys(options).length >= 2 && questionText) {
          questions.push({
            id: `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            question: questionText,
            options,
            correctKey: null, // Will be determined by AI evaluation
            answered: false,
            userAnswer: null,
          });
        }
      } catch (e) {
        // skip malformed question
      }
    }

    return questions.length > 0 ? questions : null;
  }

  // ── Render a quiz question as HTML ────────────────────────────
  function renderQuizCard(qObj, qIndex, total) {
    const difficultyStars = ['', '⭐', '⭐⭐', '⭐⭐⭐'];
    const difficulty = qObj.difficulty || 1;

    const optionsHtml = Object.entries(qObj.options)
      .map(([key, text]) => `
        <button class="quiz-option"
                data-quiz-id="${qObj.id}"
                data-key="${key}"
                id="opt_${qObj.id}_${key}"
                aria-label="Option ${key}: ${text}">
          <span class="quiz-option-key">${key}</span>
          <span class="quiz-option-text">${escapeHtml(text)}</span>
        </button>
      `)
      .join('');

    return `
      <div class="quiz-card" id="quiz_${qObj.id}" role="region" aria-label="Quiz question ${qIndex + 1}">
        <div class="quiz-card-header">
          <span class="quiz-q-number">Question ${qIndex + 1} of ${total}</span>
          <span class="quiz-difficulty">${difficultyStars[difficulty] || '⭐'}</span>
        </div>
        <p class="quiz-question">${escapeHtml(qObj.question)}</p>
        <div class="quiz-options" role="radiogroup">
          ${optionsHtml}
        </div>
        <div class="quiz-explanation" id="exp_${qObj.id}" style="display:none;"></div>
      </div>
    `;
  }

  // ── Handle option click ────────────────────────────────────────
  async function handleOptionClick(button, quizId, selectedKey) {
    // Find the question
    if (!currentQuiz) return;
    const qObj = currentQuiz.questions.find(q => q.id === quizId);
    if (!qObj || qObj.answered) return;

    // Mark answered
    qObj.answered = true;
    qObj.userAnswer = selectedKey;

    // Disable all options for this question
    const card = document.getElementById(`quiz_${quizId}`);
    if (!card) return;
    card.querySelectorAll('.quiz-option').forEach(btn => {
      btn.disabled = true;
    });

    // Ask AI to evaluate
    const evalPrompt = `
Quiz Question: "${qObj.question}"
Options: ${Object.entries(qObj.options).map(([k,v]) => `${k}) ${v}`).join(', ')}
Student answered: ${selectedKey}) ${qObj.options[selectedKey]}

Is this correct? Reply in this EXACT JSON format only:
{"correct": true/false, "correctKey": "A/B/C/D", "explanation": "Brief explanation in simple terms"}`;

    try {
      // Show loading state
      const expEl = document.getElementById(`exp_${quizId}`);
      if (expEl) {
        expEl.style.display = 'block';
        expEl.innerHTML = '<div class="flex items-center gap-2"><div class="spinner-sm spinner"></div> <span style="color:var(--text-muted);font-size:0.8rem;">Evaluating...</span></div>';
      }

      const response = await Config.callGemini(
        [{ role: 'user', content: evalPrompt }],
        'You are a quiz evaluator. Return ONLY valid JSON. No markdown, no explanation outside JSON.'
      );

      // Parse response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let result = { correct: false, correctKey: '?', explanation: 'Could not evaluate.' };

      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch {}
      }

      qObj.correct = result.correct;
      qObj.correctKey = result.correctKey;

      // Style the buttons
      const userBtn = document.getElementById(`opt_${quizId}_${selectedKey}`);
      const correctBtn = document.getElementById(`opt_${quizId}_${result.correctKey}`);

      if (result.correct) {
        if (userBtn) userBtn.classList.add('correct');
        updateScore(currentQuiz.topic, true);
      } else {
        if (userBtn) userBtn.classList.add('incorrect');
        if (correctBtn) correctBtn.classList.add('correct');
        updateScore(currentQuiz.topic, false);
      }

      // Show explanation
      if (expEl) {
        const icon = result.correct ? '✅' : '❌';
        const color = result.correct ? 'var(--success)' : 'var(--danger)';
        expEl.innerHTML = `
          <div style="margin-bottom:var(--space-2);font-weight:700;color:${color}">${icon} ${result.correct ? 'Correct!' : 'Incorrect'}</div>
          <div>${result.explanation || ''}</div>
        `;
      }

      // Check if all answered → show summary
      const allAnswered = currentQuiz.questions.every(q => q.answered);
      if (allAnswered) {
        setTimeout(() => renderQuizSummary(), 800);
      }

    } catch (err) {
      const expEl = document.getElementById(`exp_${quizId}`);
      if (expEl) {
        expEl.style.display = 'block';
        expEl.innerHTML = '<span style="color:var(--text-muted)">Could not evaluate answer. Please check your API key.</span>';
      }
    }
  }

  // ── Quiz summary ──────────────────────────────────────────────
  function renderQuizSummary() {
    if (!currentQuiz) return;
    const correct = currentQuiz.questions.filter(q => q.correct).length;
    const total   = currentQuiz.questions.length;
    const pct     = Math.round((correct / total) * 100);

    const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '📚';
    const msg   = pct >= 80 ? 'Excellent! Bohat acha kiya!' : pct >= 60 ? 'Good job! Thoda aur practice karo.' : 'Concept dobara review karo aur retry karo!';

    const summaryHtml = `
      <div class="quiz-result-bar" id="quiz_summary_${currentQuiz.id}">
        <div class="quiz-score-circle" style="--pct:${pct}%">
          <div class="quiz-score-inner">${pct}%</div>
        </div>
        <div style="flex:1">
          <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px">${emoji} Quiz Complete!</div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:6px">${correct}/${total} correct — ${msg}</div>
          <div class="chip-row">
            <span class="chip" onclick="Quiz.startNewQuiz('${currentQuiz.topic}')">🔄 Retry Quiz</span>
            <span class="chip" onclick="UI.sendMessage('Give me a harder quiz on ${currentQuiz.topic}')">⬆️ Harder Level</span>
          </div>
        </div>
      </div>
    `;

    // Append summary after last quiz card
    const msgs = document.getElementById('chat-messages');
    if (msgs) {
      const div = document.createElement('div');
      div.innerHTML = summaryHtml;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    // Update progress
    Progress.updateSkillScore(currentQuiz.topic, pct);
    Config.incrementStat('quizzesTaken');
    UI.updateSessionStats();
  }

  // ── Score tracking ─────────────────────────────────────────────
  function updateScore(topic, correct) {
    if (!sessionScores[topic]) {
      sessionScores[topic] = { correct: 0, total: 0 };
    }
    sessionScores[topic].total++;
    if (correct) sessionScores[topic].correct++;
  }

  // ── Start a new quiz session ──────────────────────────────────
  function startNewQuiz(topic, questions = []) {
    currentQuiz = {
      id: `quiz_${Date.now()}`,
      topic,
      questions: questions.map((q, i) => ({ ...q, difficulty: Math.min(3, Math.floor(i / 2) + 1) })),
      startedAt: Date.now(),
    };
    Config.incrementStat('quizzesTaken');
    return currentQuiz;
  }

  // ── Utility ───────────────────────────────────────────────────
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getSessionScores() {
    return sessionScores;
  }

  return {
    parseQuizFromText,
    renderQuizCard,
    handleOptionClick,
    renderQuizSummary,
    startNewQuiz,
    getSessionScores,
    get currentQuiz() { return currentQuiz; },
  };
})();
