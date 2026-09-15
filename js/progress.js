/* ============================================================
   AI ACADEMY — progress.js
   Progress data model, skill tracking, roadmap stages
   ============================================================ */

const Progress = (() => {

  // ── Default skill categories ──────────────────────────────────
  const DEFAULT_SKILLS = {
    'Python Programming':  0,
    'AI & Machine Learning': 0,
    'Web Development':     0,
    'Data Science':        0,
    'Prompt Engineering':  0,
    'Agentic AI':          0,
    'APIs & Integration':  0,
    'Problem Solving':     0,
  };

  // ── Default roadmap stages ────────────────────────────────────
  const DEFAULT_ROADMAP = [
    {
      id: 'fundamentals',
      title: 'Stage 1 — Fundamentals',
      icon: '🔤',
      topics: ['Programming Basics', 'Python', 'Problem Solving', 'Data Structures'],
      completed: false,
      expanded: false,
    },
    {
      id: 'data',
      title: 'Stage 2 — Data & Tools',
      icon: '📊',
      topics: ['NumPy', 'Pandas', 'Data Visualization', 'Jupyter Notebooks'],
      completed: false,
      expanded: false,
    },
    {
      id: 'ai_core',
      title: 'Stage 3 — AI Core',
      icon: '🤖',
      topics: ['Machine Learning', 'Neural Networks', 'Deep Learning', 'NLP Basics'],
      completed: false,
      expanded: false,
    },
    {
      id: 'genai',
      title: 'Stage 4 — Generative AI',
      icon: '✨',
      topics: ['LLMs', 'Prompt Engineering', 'RAG', 'Fine-tuning'],
      completed: false,
      expanded: false,
    },
    {
      id: 'agentic',
      title: 'Stage 5 — Agentic AI',
      icon: '🕸️',
      topics: ['AI Agents', 'Tool Use', 'Multi-Agent Systems', 'LangGraph'],
      completed: false,
      expanded: false,
    },
    {
      id: 'projects',
      title: 'Stage 6 — Projects',
      icon: '🛠️',
      topics: ['AI Chatbot', 'AI Automation', 'Multi-Agent App', 'Portfolio'],
      completed: false,
      expanded: false,
    },
    {
      id: 'career',
      title: 'Stage 7 — Career',
      icon: '💼',
      topics: ['GitHub Portfolio', 'CV Writing', 'Interview Prep', 'Job Applications'],
      completed: false,
      expanded: false,
    },
  ];

  // ── Load/Save ─────────────────────────────────────────────────
  function getProgressData() {
    return Config.get(Config.STORAGE_KEYS.PROGRESS, {
      skills:  { ...DEFAULT_SKILLS },
      roadmap: DEFAULT_ROADMAP.map(s => ({ ...s })),
      completedTopics: [],
      completedProjects: [],
      weakAreas: [],
      lastUpdated: null,
    });
  }

  function saveProgressData(data) {
    data.lastUpdated = Date.now();
    Config.set(Config.STORAGE_KEYS.PROGRESS, data);
  }

  // ── Skill Score ───────────────────────────────────────────────
  function updateSkillScore(topicName, quizScore) {
    const data = getProgressData();

    // Find matching skill or create new
    const matchedKey = Object.keys(data.skills).find(k =>
      k.toLowerCase().includes(topicName.toLowerCase()) ||
      topicName.toLowerCase().includes(k.toLowerCase())
    );

    if (matchedKey) {
      // Weighted average: 70% existing + 30% new quiz score
      const existing = data.skills[matchedKey] || 0;
      data.skills[matchedKey] = Math.round(existing * 0.7 + quizScore * 0.3);
    } else if (topicName) {
      // Add as new skill
      data.skills[topicName] = quizScore;
    }

    // Update weak areas
    data.weakAreas = Object.entries(data.skills)
      .filter(([, v]) => v < 50)
      .map(([k]) => k);

    saveProgressData(data);
    renderSkillBars();
  }

  function setSkillScore(skillName, score) {
    const data = getProgressData();
    data.skills[skillName] = Math.max(0, Math.min(100, score));
    saveProgressData(data);
  }

  function addCompletedTopic(topic) {
    const data = getProgressData();
    if (!data.completedTopics.includes(topic)) {
      data.completedTopics.push(topic);
      saveProgressData(data);
    }
  }

  function addCompletedProject(project) {
    const data = getProgressData();
    if (!data.completedProjects.includes(project)) {
      data.completedProjects.push(project);
      saveProgressData(data);
    }
  }

  // ── Roadmap Stage Toggle ──────────────────────────────────────
  function toggleRoadmapStage(stageId) {
    const data = getProgressData();
    const stage = data.roadmap.find(s => s.id === stageId);
    if (stage) {
      stage.expanded = !stage.expanded;
      saveProgressData(data);
    }
  }

  function completeRoadmapStage(stageId) {
    const data = getProgressData();
    const stage = data.roadmap.find(s => s.id === stageId);
    if (stage) {
      stage.completed = true;
      saveProgressData(data);
      renderRoadmap();
    }
  }

  // ── Render Skill Bars ─────────────────────────────────────────
  function renderSkillBars() {
    const container = document.getElementById('skills-container');
    if (!container) return;

    const data = getProgressData();
    const skills = data.skills;

    container.innerHTML = Object.entries(skills).map(([name, score]) => `
      <div class="progress-bar-wrap">
        <div class="progress-bar-header">
          <span class="progress-bar-label">${escapeHtml(name)}</span>
          <span class="progress-bar-value">${score}%</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${score}%"></div>
        </div>
      </div>
    `).join('');
  }

  // ── Render Roadmap ────────────────────────────────────────────
  function renderRoadmap() {
    const container = document.getElementById('roadmap-container');
    if (!container) return;

    const data = getProgressData();

    container.innerHTML = `
      <div class="roadmap-timeline">
        ${data.roadmap.map(stage => `
          <div class="roadmap-stage">
            <div class="roadmap-stage-dot ${stage.completed ? 'completed' : ''}"></div>
            <div class="roadmap-stage-content">
              <div class="roadmap-stage-header" onclick="Progress.toggleRoadmapStage('${stage.id}')">
                <div class="flex items-center gap-3">
                  <span style="font-size:1.2rem">${stage.icon}</span>
                  <span style="font-weight:700;font-size:0.9rem;color:var(--text-primary)">${escapeHtml(stage.title)}</span>
                </div>
                <div class="flex items-center gap-2">
                  ${stage.completed
                    ? '<span class="badge badge-success">Completed ✓</span>'
                    : `<span class="badge badge-muted">${stage.topics.length} Topics</span>`
                  }
                  <span style="color:var(--text-faint);font-size:0.8rem">${stage.expanded ? '▲' : '▼'}</span>
                </div>
              </div>
              ${stage.expanded ? `
                <div class="roadmap-stage-body">
                  <ul style="list-style:none;padding:0;margin:var(--space-3) 0 var(--space-4)">
                    ${stage.topics.map(t => `
                      <li style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-1) 0;font-size:0.875rem;color:var(--text-secondary)">
                        <span style="color:var(--accent-cyan);font-size:0.75rem">▸</span> ${escapeHtml(t)}
                      </li>
                    `).join('')}
                  </ul>
                  ${!stage.completed ? `
                    <button class="btn btn-secondary btn-sm" onclick="Progress.completeRoadmapStage('${stage.id}')">
                      ✓ Mark as Complete
                    </button>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ── Render Progress Dashboard ─────────────────────────────────
  function renderProgressDashboard() {
    renderSkillBars();

    const data = getProgressData();

    // Completed topics list
    const topicsEl = document.getElementById('completed-topics');
    if (topicsEl) {
      if (data.completedTopics.length === 0) {
        topicsEl.innerHTML = '<p style="color:var(--text-faint);font-size:0.85rem">No topics completed yet. Start learning!</p>';
      } else {
        topicsEl.innerHTML = data.completedTopics.map(t => `
          <div class="flex items-center gap-2" style="padding:var(--space-1) 0">
            <span style="color:var(--success)">✓</span>
            <span style="font-size:0.875rem;color:var(--text-secondary)">${escapeHtml(t)}</span>
          </div>
        `).join('');
      }
    }

    // Weak areas
    const weakEl = document.getElementById('weak-areas');
    if (weakEl) {
      if (data.weakAreas.length === 0) {
        weakEl.innerHTML = '<p style="color:var(--success);font-size:0.85rem">🎉 No weak areas detected!</p>';
      } else {
        weakEl.innerHTML = data.weakAreas.map(a => `
          <div class="flex items-center gap-2" style="padding:var(--space-1) 0">
            <span style="color:var(--warning)">⚠</span>
            <span style="font-size:0.875rem;color:var(--text-secondary)">${escapeHtml(a)}</span>
            <button class="chip" style="font-size:0.7rem;padding:2px 8px" onclick="UI.sendMessage('Help me improve my ${a} skills')">Practice</button>
          </div>
        `).join('');
      }
    }

    // Completed projects
    const projEl = document.getElementById('completed-projects');
    if (projEl) {
      if (data.completedProjects.length === 0) {
        projEl.innerHTML = '<p style="color:var(--text-faint);font-size:0.85rem">No projects completed yet. Build something!</p>';
      } else {
        projEl.innerHTML = data.completedProjects.map(p => `
          <div class="flex items-center gap-2" style="padding:var(--space-1) 0">
            <span style="color:var(--accent-cyan)">🛠</span>
            <span style="font-size:0.875rem;color:var(--text-secondary)">${escapeHtml(p)}</span>
          </div>
        `).join('');
      }
    }
  }

  function getOverallProgress() {
    const data = getProgressData();
    const skills = data.skills || {};
    const entries = Object.entries(skills);
    
    // Filter only skills that have been evaluated (> 0)
    const evaluated = entries.filter(([, score]) => score > 0);
    if (evaluated.length === 0) return 0;
    
    const sum = evaluated.reduce((acc, [, score]) => acc + score, 0);
    return Math.round(sum / evaluated.length);
  }

  function getWhatShouldIDoNext() {
    const profile = Config.getProfile();
    const data = getProgressData();
    const session = Config.getSession();
    const skills = data.skills || {};
    const skillEntries = Object.entries(skills);
    const evaluatedSkills = skillEntries.filter(([, score]) => score > 0);
    const weakAreas = evaluatedSkills.filter(([, score]) => score < 60);

    // Case 1: Brand new user or no goal specified
    if (!profile.goal || profile.goal === 'Not specified') {
      return {
        title: "Set Your Primary Learning & Career Goal",
        whyThis: "AI Academy tailors roadmaps, quizzes, and project recommendations to your exact career objective.",
        description: "Choose whether you want to become an AI Engineer, Software Developer, Data Scientist, or pursue academic excellence.",
        actionText: "Set My Goal →",
        actionView: "settings",
        hasData: false
      };
    }

    // Case 2: Goal set, but 0 assessments/quizzes taken
    if (evaluatedSkills.length === 0 && (session.quizzesTaken || 0) === 0) {
      return {
        title: "Take Your First Skill Assessment",
        whyThis: `You haven't assessed your skills for your goal: "${profile.goal}". A baseline assessment identifies your current level and knowledge gaps.`,
        description: "Complete a 5-minute diagnostic quiz covering technical knowledge and problem solving.",
        actionText: "Start Assessment →",
        actionView: "assessment",
        hasData: false
      };
    }

    // Case 3: Detected Weak Area needing improvement
    if (weakAreas.length > 0) {
      const topWeakness = weakAreas[0];
      return {
        title: `Improve Your Weak Area: ${topWeakness[0]}`,
        whyThis: `Your recent score in ${topWeakness[0]} is ${topWeakness[1]}%, which is below the 60% mastery threshold required for ${profile.goal}.`,
        description: `Review key concepts and take targeted practice questions to boost your mastery score in ${topWeakness[0]}.`,
        actionText: `Practice ${topWeakness[0]} →`,
        actionPrompt: `Help me practice and master ${topWeakness[0]}`,
        hasData: true
      };
    }

    // Case 4: Skills assessed & strong, but 0 projects built
    if (data.completedProjects.length === 0) {
      return {
        title: "Build Your First Hands-On AI Project",
        whyThis: `You have completed topic reviews and quizzes. Constructing a resume-ready project proves practical execution for ${profile.goal}.`,
        description: "Select a guided project blueprint with step-by-step implementation tasks and tech stack.",
        actionText: "Explore Projects →",
        actionView: "project-builder",
        hasData: true
      };
    }

    // Case 5: Projects built, move to Interview Prep
    return {
      title: "Practice AI Technical Mock Interview",
      whyThis: `Your profile has mastered skills and project experience. Real-time interview simulation will prepare you for technical job questions.`,
      description: "Answer technical questions tailored to your role with instant AI feedback on communication and accuracy.",
      actionText: "Start Interview Simulation →",
      actionView: "interview",
      hasData: true
    };
  }

  function generateSkillScan() {
    const data = getProgressData();
    const skills = data.skills || {};
    const skillEntries = Object.entries(skills);
    
    const evaluated = skillEntries.filter(([, score]) => score > 0);
    const hasData = evaluated.length > 0 || data.completedTopics.length > 0;
    
    const overallScore = getOverallProgress();
    const strengths = skillEntries.filter(([, score]) => score >= 65).map(([name, score]) => ({ name, score }));
    const weakAreas = skillEntries.filter(([, score]) => score > 0 && score < 65).map(([name, score]) => ({ name, score }));
    
    const nextStep = getWhatShouldIDoNext();

    return {
      overallScore,
      strengths,
      weakAreas,
      nextStep,
      hasData
    };
  }

  return {
    getProgressData,
    updateSkillScore,
    setSkillScore,
    addCompletedTopic,
    addCompletedProject,
    toggleRoadmapStage,
    completeRoadmapStage,
    renderSkillBars,
    renderRoadmap,
    renderProgressDashboard,
    generateSkillScan,
    getOverallProgress,
    getWhatShouldIDoNext,
    DEFAULT_SKILLS,
    DEFAULT_ROADMAP,
  };
})();

