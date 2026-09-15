/* ============================================================
   AI ACADEMY — career.js
   Career Hub guidance, readiness score calculator,
   and interactive AI Interview Simulator engine
   ============================================================ */

const Career = (() => {

  const CAREER_PATHS = [
    {
      id: 'ai_engineer',
      title: 'AI Engineer',
      icon: '🤖',
      description: 'Build LLM applications, RAG pipelines, multi-agent workflows, and ML systems.',
      requiredSkills: ['Python Programming', 'AI & Machine Learning', 'Prompt Engineering', 'Agentic AI', 'APIs & Integration'],
      recommendedProjects: [
        'Multi-Agent Study Assistant',
        'RAG Knowledge Base System',
        'Autonomous Task Automation Agent'
      ],
      salaryRange: '$95,000 - $160,000 / yr'
    },
    {
      id: 'software_developer',
      title: 'Software Developer',
      icon: '💻',
      description: 'Develop full-stack web applications, scalable APIs, and modern frontend interfaces.',
      requiredSkills: ['Python Programming', 'Web Development', 'APIs & Integration', 'Problem Solving'],
      recommendedProjects: [
        'Full-Stack SaaS Dashboard',
        'RESTful API Microservice',
        'Real-time Collaborative App'
      ],
      salaryRange: '$80,000 - $145,000 / yr'
    },
    {
      id: 'data_analyst',
      title: 'Data Analyst & Scientist',
      icon: '📊',
      description: 'Extract insights from data, build predictive models, and create data visualizations.',
      requiredSkills: ['Python Programming', 'Data Science', 'AI & Machine Learning', 'Problem Solving'],
      recommendedProjects: [
        'Exploratory Data Analysis Dashboard',
        'Customer Churn Prediction Model',
        'Automated ETL Data Pipeline'
      ],
      salaryRange: '$75,000 - $130,000 / yr'
    },
    {
      id: 'cybersecurity',
      title: 'Cybersecurity Analyst',
      icon: '🛡️',
      description: 'Protect systems, secure web APIs, audit network traffic, and prevent cyber threats.',
      requiredSkills: ['Problem Solving', 'APIs & Integration', 'Web Development'],
      recommendedProjects: [
        'Vulnerability Scanner Script',
        'Secure API Authentication Gateway',
        'Log Audit Analysis Tool'
      ],
      salaryRange: '$85,000 - $150,000 / yr'
    }
  ];

  // ── Calculate Career Readiness from real progress skills ───────
  function calculateReadiness(pathId) {
    const path = CAREER_PATHS.find(p => p.id === pathId) || CAREER_PATHS[0];
    const progressData = Progress.getProgressData();
    const userSkills = progressData.skills || {};

    let totalScore = 0;
    const skillBreakdown = [];

    path.requiredSkills.forEach(skillName => {
      const score = userSkills[skillName] || 0;
      totalScore += score;
      skillBreakdown.push({
        skill: skillName,
        score: score,
        acquired: score >= 60
      });
    });

    const averageReadiness = Math.round(totalScore / path.requiredSkills.length);
    return {
      path,
      readinessPct: averageReadiness,
      skillsHave: skillBreakdown.filter(s => s.acquired),
      skillsToDevelop: skillBreakdown.filter(s => !s.acquired),
    };
  }

  // ── Render Career Hub View ────────────────────────────────────
  function renderCareerHub() {
    const container = document.getElementById('career-paths-container');
    if (!container) return;

    container.innerHTML = CAREER_PATHS.map(path => {
      const readiness = calculateReadiness(path.id);
      return `
        <div class="card career-path-card" style="margin-bottom: 20px;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 2rem; width: 48px; height: 48px; background: var(--primary-light); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; border: 1px solid var(--primary-border);">
                ${path.icon}
              </div>
              <div>
                <h3 style="font-size: 1.15rem; color: var(--text-primary); margin-bottom: 2px;">${path.title}</h3>
                <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Est. Range: ${path.salaryRange}</span>
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge ${readiness.readinessPct >= 70 ? 'badge-success' : readiness.readinessPct >= 40 ? 'badge-warning' : 'badge-muted'}" style="font-size: 0.85rem; padding: 4px 12px;">
                ${readiness.readinessPct}% Readiness
              </span>
            </div>
          </div>

          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 16px;">${path.description}</p>

          <!-- Readiness Progress Bar -->
          <div class="progress-bar-wrap" style="margin-bottom: 16px;">
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: ${readiness.readinessPct}%;"></div>
            </div>
          </div>

          <!-- Skills breakdown grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--success); text-transform: uppercase; margin-bottom: 6px;">
                ✓ Skills Mastered (${readiness.skillsHave.length})
              </div>
              <ul style="list-style: none; padding: 0;">
                ${readiness.skillsHave.length > 0 ? readiness.skillsHave.map(s => `
                  <li style="font-size: 0.8rem; color: var(--text-secondary); padding: 2px 0;">• ${s.skill} (${s.score}%)</li>
                `).join('') : '<li style="font-size: 0.8rem; color: var(--text-muted);">None yet. Start learning!</li>'}
              </ul>
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--warning); text-transform: uppercase; margin-bottom: 6px;">
                ○ Skills To Develop (${readiness.skillsToDevelop.length})
              </div>
              <ul style="list-style: none; padding: 0;">
                ${readiness.skillsToDevelop.map(s => `
                  <li style="font-size: 0.8rem; color: var(--text-secondary); padding: 2px 0;">• ${s.skill} (${s.score}%)</li>
                `).join('')}
              </ul>
            </div>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border);">
            <button class="btn btn-primary btn-sm" onclick="Career.startInterviewSimulation('${path.title}')">
              🎤 Start AI Interview →
            </button>
            <button class="btn btn-secondary btn-sm" onclick="Projects.generateForCareer('${path.title}')">
              🛠️ Generate Project
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── AI Interview Simulator State ──────────────────────────────
  let interviewState = {
    active: false,
    careerTitle: '',
    currentQuestionIndex: 0,
    questions: [],
    answers: [],
    evaluations: []
  };

  function startInterviewSimulation(careerTitle = 'AI Engineer') {
    interviewState = {
      active: true,
      careerTitle: careerTitle,
      currentQuestionIndex: 0,
      questions: [
        `Tell me about a technical project you built in ${careerTitle} and the biggest challenge you faced.`,
        `How do you handle error handling and edge cases when working with external APIs or asynchronous operations?`,
        `Explain how you would optimize a slow-performing system or algorithm in your workflow.`,
        `How do you keep your technical skills updated with fast-evolving AI tools and software standards?`
      ],
      answers: [],
      evaluations: []
    };

    UI.switchView('interview');
    renderInterviewQuestion();
  }

  function renderInterviewQuestion() {
    const cardEl = document.getElementById('interview-card');
    if (!cardEl) return;

    if (interviewState.currentQuestionIndex >= interviewState.questions.length) {
      renderInterviewReport();
      return;
    }

    const qNum = interviewState.currentQuestionIndex + 1;
    const total = interviewState.questions.length;
    const questionText = interviewState.questions[interviewState.currentQuestionIndex];

    cardEl.innerHTML = `
      <div class="card" style="max-width: 680px; margin: 0 auto;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
          <div>
            <span class="badge badge-indigo">Question ${qNum} of ${total}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 8px;">${interviewState.careerTitle} Mock Interview</span>
          </div>
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--primary);">AI Interviewer Active</span>
        </div>

        <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; line-height: 1.4;">
          💬 "${questionText}"
        </div>

        <form onsubmit="Career.submitInterviewAnswer(event)">
          <div style="margin-bottom: 16px;">
            <label class="label" for="interview-answer-input">Your Answer</label>
            <textarea id="interview-answer-input" rows="4" class="input-field" placeholder="Type your answer clearly. Explain your thinking and technical approach..." required></textarea>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.78rem; color: var(--text-muted);">AI will evaluate answer quality & technical communication</span>
            <button type="submit" class="btn btn-primary" id="interview-submit-btn">Submit Answer →</button>
          </div>
        </form>
      </div>
    `;
  }

  async function submitInterviewAnswer(e) {
    e.preventDefault();
    const input = document.getElementById('interview-answer-input');
    const answerText = (input?.value || '').trim();
    if (!answerText) return;

    const btn = document.getElementById('interview-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'AI Evaluating...';
    }

    const currentQ = interviewState.questions[interviewState.currentQuestionIndex];
    interviewState.answers.push(answerText);

    // Call AI to evaluate answer
    const evalPrompt = `
Career Role: ${interviewState.careerTitle}
Interview Question: "${currentQ}"
Candidate Answer: "${answerText}"

Evaluate this answer. Return JSON only:
{"score": 85, "feedback": "Good answer explaining technical steps.", "strengths": "Clear communication", "improvement": "Add specific metrics"}`;

    try {
      const response = await Config.callGemini(
        [{ role: 'user', content: evalPrompt }],
        'You are an expert technical interviewer. Output valid JSON only.'
      );
      let evalData = { score: 75, feedback: 'Good response.', strengths: 'Clear logic', improvement: 'Be more specific' };
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        try { evalData = JSON.parse(match[0]); } catch {}
      }
      interviewState.evaluations.push(evalData);
    } catch {
      interviewState.evaluations.push({ score: 70, feedback: 'Answer received and recorded.', strengths: 'Communicated approach', improvement: 'Practice detail' });
    }

    interviewState.currentQuestionIndex++;
    renderInterviewQuestion();
  }

  function renderInterviewReport() {
    const cardEl = document.getElementById('interview-card');
    if (!cardEl) return;

    const totalScore = Math.round(
      interviewState.evaluations.reduce((acc, curr) => acc + (curr.score || 70), 0) / (interviewState.evaluations.length || 1)
    );

    cardEl.innerHTML = `
      <div class="card" style="max-width: 680px; margin: 0 auto; text-align: left;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 2.5rem; margin-bottom: 6px;">🎉</div>
          <h2 style="font-size: 1.5rem; color: var(--text-primary); margin-bottom: 4px;">Interview Completed</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">AI Feedback Report for ${interviewState.careerTitle} Position</p>
        </div>

        <div style="background: var(--bg-surface-subtle); border-radius: var(--radius-lg); padding: 20px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Overall AI Interview Score</div>
            <div style="font-size: 2rem; font-weight: 800; color: var(--primary);">${totalScore}%</div>
          </div>
          <span class="badge ${totalScore >= 75 ? 'badge-success' : 'badge-warning'}" style="font-size: 0.9rem; padding: 6px 14px;">
            ${totalScore >= 75 ? 'High Interview Readiness' : 'Moderate Readiness'}
          </span>
        </div>

        <h3 style="font-size: 1rem; margin-bottom: 12px; color: var(--text-primary);">Detailed Question Feedback</h3>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
          ${interviewState.questions.map((q, idx) => {
            const ev = interviewState.evaluations[idx] || {};
            return `
              <div style="padding: 12px 16px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">Q${idx+1}: ${q}</span>
                  <span class="badge badge-indigo">${ev.score || 75}%</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${ev.feedback || ''}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-primary" onclick="Career.startInterviewSimulation('${interviewState.careerTitle}')">🔄 Practice Again</button>
          <button class="btn btn-secondary" onclick="UI.switchView('career')">Back to Career Hub</button>
        </div>
      </div>
    `;
  }

  return {
    CAREER_PATHS,
    calculateReadiness,
    renderCareerHub,
    startInterviewSimulation,
    submitInterviewAnswer,
    get interviewState() { return interviewState; }
  };
})();
