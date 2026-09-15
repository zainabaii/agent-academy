/* ============================================================
   AI ACADEMY — projects.js
   AI Project Builder engine: generates project blueprints,
   tracks completed projects, and links to user roadmap.
   ============================================================ */

const Projects = (() => {

  const SAMPLE_PROJECTS = [
    {
      id: 'proj_1',
      title: 'Autonomous Multi-Agent AI Assistant',
      difficulty: 'Intermediate',
      estimatedHours: 8,
      category: 'AI & Machine Learning',
      problem: 'Students waste time organizing materials across disparate topics.',
      whyItMatters: 'Demonstrates multi-agent routing, tool calling, and SSE streaming API architecture.',
      techStack: ['Python', 'FastAPI', 'Groq API', 'HTML/JS'],
      steps: [
        'Set up Python FastAPI backend with environment key isolation',
        'Implement router agent to categorize user intent',
        'Create specialized prompt templates for explainer & quiz generator',
        'Connect frontend UI with SSE streaming reader'
      ]
    },
    {
      id: 'proj_2',
      title: 'RAG Knowledge Search & QA System',
      difficulty: 'Advanced',
      estimatedHours: 12,
      category: 'Agentic AI',
      problem: 'Searching massive PDF documents for exact concepts is slow.',
      whyItMatters: 'RAG is the most requested enterprise AI engineering skill in industry.',
      techStack: ['Python', 'LangChain / LlamaIndex', 'ChromaDB', 'Gemini API'],
      steps: [
        'Parse document PDFs into chunks using sentence splitter',
        'Generate text embeddings and index into local vector store',
        'Build similarity retriever for input queries',
        'Synthesize final answer using Gemini Flash'
      ]
    },
    {
      id: 'proj_3',
      title: 'REST API Microservice with Rate Limiting',
      difficulty: 'Beginner',
      estimatedHours: 5,
      category: 'Web Development',
      problem: 'Building robust backend API services with proper error handling and auth.',
      whyItMatters: 'Foundational backend skill required for software developer roles.',
      techStack: ['Node.js', 'Express', 'JWT', 'PostgreSQL'],
      steps: [
        'Design database schema for users and resources',
        'Implement authentication middleware with JWT tokens',
        'Build CRUD REST endpoints with input validation',
        'Add error handling and express-rate-limit'
      ]
    }
  ];

  function renderProjectBuilder() {
    const container = document.getElementById('project-builder-container');
    if (!container) return;

    container.innerHTML = `
      <div class="card" style="margin-bottom: 24px;">
        <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 6px;">
          🛠️ AI Project Builder
        </div>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 16px;">
          Select your target skill or career goal and let AI construct a tailored practical project blueprint.
        </p>

        <form onsubmit="Projects.handleGenerateSubmit(event)">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 16px;">
            <div>
              <label class="label" for="proj-skill-select">Target Skill</label>
              <select id="proj-skill-select" class="input-field">
                <option value="Agentic AI">Agentic AI & LLMs</option>
                <option value="Python Programming">Python Programming</option>
                <option value="Web Development">Web Development & REST APIs</option>
                <option value="Data Science">Data Science & Analytics</option>
              </select>
            </div>
            <div>
              <label class="label" for="proj-diff-select">Difficulty Level</label>
              <select id="proj-diff-select" class="input-field">
                <option value="Beginner">Beginner (1-5 hrs)</option>
                <option value="Intermediate" selected>Intermediate (5-10 hrs)</option>
                <option value="Advanced">Advanced (10-20 hrs)</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" id="proj-generate-btn">
            ✨ Generate Project Blueprint →
          </button>
        </form>
      </div>

      <div id="project-results-area">
        ${SAMPLE_PROJECTS.map(p => renderProjectCard(p)).join('')}
      </div>
    `;
  }

  function renderProjectCard(project) {
    return `
      <div class="card" style="margin-bottom: 20px;" id="project-card-${project.id}">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span class="badge badge-indigo">${project.category || 'AI Project'}</span>
              <span class="badge badge-muted">${project.difficulty} • ~${project.estimatedHours} hrs</span>
            </div>
            <h3 style="font-size: 1.15rem; color: var(--text-primary); margin-top: 4px;">${project.title}</h3>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Projects.addToRoadmap('${project.title}')">
            + Add to Roadmap
          </button>
        </div>

        <div style="background: var(--bg-surface-subtle); border-radius: var(--radius-md); padding: 12px 16px; border: 1px solid var(--border); margin-bottom: 14px;">
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Problem Statement</div>
          <div style="font-size: 0.875rem; color: var(--text-primary); margin-top: 2px;">${project.problem}</div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Tech Stack Required</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${(project.techStack || []).map(t => `<span class="badge badge-muted">${t}</span>`).join('')}
          </div>
        </div>

        <div>
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Implementation Steps</div>
          <ol style="padding-left: 18px; margin: 0; font-size: 0.85rem; color: var(--text-secondary);">
            ${(project.steps || []).map(s => `<li style="padding: 2px 0;">${s}</li>`).join('')}
          </ol>
        </div>
      </div>
    `;
  }

  async function handleGenerateSubmit(e) {
    e.preventDefault();
    const skill = document.getElementById('proj-skill-select')?.value || 'AI';
    const diff = document.getElementById('proj-diff-select')?.value || 'Intermediate';

    const btn = document.getElementById('proj-generate-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'AI Generating Blueprint...';
    }

    const prompt = `Generate a realistic hands-on project blueprint for ${skill} at ${diff} level. Return ONLY JSON in this format:
{"title": "Project Title", "difficulty": "${diff}", "estimatedHours": 8, "category": "${skill}", "problem": "Clear problem statement", "whyItMatters": "Reason", "techStack": ["Tool1", "Tool2"], "steps": ["Step 1", "Step 2", "Step 3"]}`;

    try {
      const response = await Config.callGemini(
        [{ role: 'user', content: prompt }],
        'You are an expert project mentor. Return valid JSON only.'
      );
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const projData = JSON.parse(match[0]);
        projData.id = `proj_${Date.now()}`;
        const area = document.getElementById('project-results-area');
        if (area) {
          area.insertAdjacentHTML('afterbegin', renderProjectCard(projData));
        }
        UI.toast('New AI Project Blueprint generated!', 'success');
      }
    } catch (err) {
      UI.toast('Could not generate project. Please try again.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✨ Generate Project Blueprint →';
      }
    }
  }

  function generateForCareer(careerTitle) {
    UI.switchView('project-builder');
    UI.toast(`Project builder loaded for ${careerTitle}`, 'info');
  }

  function addToRoadmap(projectTitle) {
    Progress.addCompletedProject(projectTitle);
    UI.toast(`"${projectTitle}" added to your completed projects & progress!`, 'success');
  }

  return {
    renderProjectBuilder,
    handleGenerateSubmit,
    generateForCareer,
    addToRoadmap
  };
})();
