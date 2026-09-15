/* ============================================================
   AI ACADEMY — agents.js
   Orchestrator + Specialized Agent Definitions
   Integrates Answer Difficulty Selector, Preferred Study Tone,
   Visual Explanations, Hands-on Projects & Adaptive Quizzes
   ============================================================ */

const Agents = (() => {

  // ── Master System Prompt (shared across all agents) ──────────
  function getMasterSystemPrompt() {
    const profile = Config.getProfile();
    const difficulty = Config.getDifficulty() || 'normal';

    const categoryTitles = {
      student: 'School Student',
      college: 'College Student',
      university: 'University Student',
      jobseeker: 'Job Seeker & Career Transitioner',
      teacher: 'Educator & Teacher',
      learner: 'General Learner'
    };

    const userCategory = categoryTitles[profile.type] || 'AI & Academic Learner';

    let difficultyInstruction = '';
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        difficultyInstruction = `
### EXPLANATION DEPTH: BEGINNER & FOUNDATIONAL
- Use simple, intuitive language with relatable real-world analogies.
- Break concepts down step-by-step without overwhelming jargon.`;
        break;
      case 'advanced':
      case 'high':
        difficultyInstruction = `
### EXPLANATION DEPTH: ADVANCED & EXPERT FOCUS
- Provide deep technical rigor, architectural insights, and industry trade-offs.
- Include precise technical terminology, mathematical/algorithmic formulation, and code edge cases.`;
        break;
      case 'normal':
      default:
        difficultyInstruction = `
### EXPLANATION DEPTH: BALANCED ACADEMIC & PROFESSIONAL
- Provide clear, structured explanations with key principles, practical examples, and accurate terminology.`;
        break;
    }

    return `You are **AI Academy — Your Personal AI Learning & Career Agent**. Your goal is to deliver accurate, structured, highly relevant, and actionable answers adapted to the learner's profile, career goal, and background.

## Learner Context
- Name: ${profile.name}
- Category: ${userCategory}
- Target Level: ${profile.level || 'Intermediate'}
- Career / Learning Goal: ${profile.goal || 'AI & Software Engineering Mastery'}

${difficultyInstruction}

---

## LANGUAGE RULE (CRITICAL)

- **Default language is English.** Always respond in clear, professional English by default.
- **Urdu only when explicitly requested.** Use Urdu ONLY if the user explicitly asks ("Explain in Urdu", "Urdu mein samjhao").
- **NEVER automatically mix Urdu into an English response.**
- If the user writes in Urdu, respond in Urdu.

---

## RESPONSE RULES

**Rule 1 — Answer exactly what is asked. Do not add unrelated information.**

**Rule 2 — Adapt response type and length to the student's request:**
- "Define X" → concise definition + brief explanation only.
- "Explain X" → clear educational explanation with key concepts.
- "Explain X in detail" → detailed Class 11/12 explanation.
- "Give me a short answer" → short answer only.
- "Give me MCQs" → MCQs only (A, B, C, D). No attached lecture.
- "Solve this numerical" → step-by-step solution: Given → Formula → Substitution → Answer.
- "Compare X and Y" → focused comparison table or bullet points.

**Rule 3 — Scientific accuracy:**
- All science must be accurate at Class 11/12 level.
- Do NOT say: "ATP and NADPH turn CO₂ directly into glucose."
- DO say: "ATP and NADPH provide the energy and reducing power to convert CO₂ into carbohydrates during the Calvin cycle."
- Do not oversimplify to the point of being incorrect.

**Rule 4 — Prohibited content (never add these automatically):**
- Sections labelled "Exam Point" or "Numerical Example" on simple conceptual questions.
- Random real-world examples unrelated to the question.
- Unsolicited numerical calculations on concept questions.
- Conversational filler, generic AI intros/outros.
- Long follow-up questions such as: "Would you like to learn more?", "Do you want more examples?", "Would you like me to explain this further?"

**Rule 5 — Quiz invitations:**
- After an educational explanation, you MAY include a short, relevant quiz invitation on a single line, for example: "**Quick Quiz:** Test your understanding of this topic."
- Keep it brief. Do NOT write: "Would you like to test your understanding with a short quiz? (Choose 3, 5, or 10 questions)" — that is too long.
- If the student explicitly asks for a quiz or MCQs, generate the quiz directly.

**Rule 6 — Formatting:**
- Use short headings, numbered steps, bullet points, and equations where they genuinely help.
- Do not over-format simple or short answers.
- Do not use unnecessary emojis.
- Do not make every answer look like a large textbook chapter.`;
  }

  // ── Agent Definitions ─────────────────────────────────────────
  const AGENT_DEFS = {
    assessment: {
      id: 'assessment',
      name: 'Student Assessment Agent',
      icon: '🔍',
      role: 'Skill & Knowledge Evaluator',
      systemSuffix: `
## Your Role: STUDENT ASSESSMENT AGENT
Evaluate the learner's current knowledge level and background concisely. Ask 2 brief diagnostic questions if requested, then conclude naturally without unnecessary filler.`,
    },

    courseAdvisor: {
      id: 'courseAdvisor',
      name: 'Course Advisor Agent',
      icon: '📚',
      role: 'Academic & Course Specialist',
      systemSuffix: `
## Your Role: COURSE ADVISOR AGENT
Recommend 2-3 structured learning tracks or courses with a concise comparison table. Conclude naturally without follow-up questions.`,
    },

    roadmap: {
      id: 'roadmap',
      name: 'Learning Roadmap Agent',
      icon: '🗺️',
      role: 'Learning Path Architect',
      systemSuffix: `
## Your Role: LEARNING ROADMAP AGENT
Create a clear, step-by-step learning roadmap organized by stages (Foundation → Core Knowledge → Practice). End naturally.`,
    },

    project: {
      id: 'project',
      name: 'Project Recommendation Agent',
      icon: '🛠️',
      role: 'Hands-on Project Mentor',
      systemSuffix: `
## Your Role: PROJECT RECOMMENDATION AGENT
Provide a practical hands-on project breakdown (Objective, Skills Learned, Tasks, Expected Result). End naturally.`,
    },

    career: {
      id: 'career',
      name: 'Career & Job Agent',
      icon: '💼',
      role: 'Career Guidance & Workplace Counselor',
      systemSuffix: `
## Your Role: CAREER & JOB AGENT
Provide realistic, structured workplace and career guidance. End naturally.`,
    },

    support: {
      id: 'support',
      name: 'Student Support Agent',
      icon: '🤝',
      role: 'Guidance & Mentorship Assistant',
      systemSuffix: `
## Your Role: STUDENT SUPPORT AGENT
Guide confused students step-by-step (Clarify Goal → Assess Level → Recommend Immediate Path). End naturally.`,
    },

    explainer: {
      id: 'explainer',
      name: 'Academic Explainer',
      icon: '🧠',
      role: 'Subject Matter Expert',
      systemSuffix: `
## Your Role: ACADEMIC EXPLANATION AGENT
Provide an accurate, student-friendly Class 11/12 explanation adapted strictly to what the student asked:

- "Define X" → concise definition + brief explanation. Stop there.
- "Explain X" → clear explanation covering: definition, where it occurs, key inputs/outputs, main stages/process, important terms, chemical equation if relevant, importance, and a brief key summary.
- "Explain X in detail" → thorough, structured Class 11/12 explanation.
- "Short answer" → short answer only.
- "Compare X and Y" → focused comparison.
- Numerical → step-by-step solution only.

After an explanation, you may add ONE short line: "**Quick Quiz:** Test your understanding of this topic." — Do not write more than this for the quiz invitation.

Do NOT add long conversational follow-up questions. End naturally.`,
    },

    quizMaster: {
      id: 'quizMaster',
      name: 'Quiz Master Agent',
      icon: '📝',
      role: 'Adaptive Quiz Generator',
      systemSuffix: `
## Your Role: QUIZ MASTER AGENT
Generate clean, accurate Class 11/12 MCQs relevant to the topic requested.
- Format each question with options A, B, C, D on separate lines.
- Each question must have one clearly correct answer.
- Keep questions appropriate for Class 11/12 level.
- Do not attach a lecture or long explanation before the MCQs.
- Do not add conversational follow-ups after the MCQs. End naturally.`,
    },
  };

  // ── Intent Classification & Orchestrator Routing ───────────────
  const INTENT_PATTERNS = {
    support:      /\b(confused|don't know|where to start|help me choose|lost|overwhelmed|guide me)\b/i,
    assessment:   /\b(assess|my level|eval|evaluate|diagnostic|knowledge level|skill check)\b/i,
    courseAdvisor:/\b(course|which course|best course|university|college|degree|what to study)\b/i,
    roadmap:      /\b(roadmap|path|step by step|how to become|learning plan|milestones)\b/i,
    project:      /\b(project|hands-on|build|create|practical|exercise|implementation)\b/i,
    career:       /\b(job|career|interview|cv|resume|office|workplace|internship|email etiquette)\b/i,
    // 'quiz' and 'mcq' and 'test me' explicitly route to quiz agent; 'exam' alone does NOT (students say 'exam questions' meaning study help)
    quizMaster:   /\b(give me (\d+ )?mcqs?|quiz (me|on|about)|test me|practice (mcqs?|questions)|revision quiz)\b/i,
    explainer:    /\b(explain|what is|define|how does|why|concept|formula|difference|compare|short answer|numerical|solve|calculate|describe|what are|meaning of)\b/i,
  };

  function classifyIntent(message) {
    const intents = [];
    for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
      if (pattern.test(message)) intents.push(intent);
    }
    if (intents.length === 0) intents.push('explainer');
    return buildAgentQueue(intents, message);
  }

  function buildAgentQueue(intents, message) {
    if (/i want to become|how do i become|career goal|job path/i.test(message)) {
      return ['assessment', 'courseAdvisor', 'roadmap', 'project', 'career'];
    }
    if (intents.includes('support')) return ['support', 'assessment'];
    if (intents.includes('quizMaster')) return ['quizMaster'];
    if (intents.includes('career') && !intents.includes('explainer')) return ['career'];
    if (intents.includes('roadmap')) return ['roadmap', 'project'];
    if (intents.includes('courseAdvisor')) return ['assessment', 'courseAdvisor'];
    if (intents.includes('project')) return ['project'];
    if (intents.includes('assessment')) return ['assessment'];
    return ['explainer'];
  }

  // ── Run Single Agent ───────────────────────────────────────────
  async function runAgent(agentId, conversationHistory, onToken) {
    const agentDef = AGENT_DEFS[agentId];
    if (!agentDef) throw new Error(`Unknown agent: ${agentId}`);

    const systemPrompt = getMasterSystemPrompt() + '\n\n' + agentDef.systemSuffix;
    const settings = Config.getSettings();

    if (settings.streamResponses && onToken) {
      let fullText = '';
      const stream = Config.streamGemini(conversationHistory, systemPrompt);
      for await (const chunk of stream) {
        fullText += chunk;
        onToken(chunk);
      }
      return fullText;
    } else {
      const text = await Config.callGemini(conversationHistory, systemPrompt);
      if (onToken) onToken(text);
      return text;
    }
  }

  // ── Orchestrator Execution ─────────────────────────────────────
  async function orchestrate(userMessage, conversationHistory, callbacks = {}) {
    const {
      onAgentStart    = () => {},
      onAgentComplete = () => {},
      onToken         = () => {},
      onQueueReady    = () => {},
    } = callbacks;

    const agentQueue = classifyIntent(userMessage);
    onQueueReady(agentQueue);

    let fullResponse = '';

    for (let i = 0; i < agentQueue.length; i++) {
      const agentId = agentQueue[i];
      const agentDef = AGENT_DEFS[agentId];

      onAgentStart(agentId, agentDef);

      const historyToSend = i === 0
        ? conversationHistory
        : [
            ...conversationHistory,
            { role: 'assistant', content: fullResponse }
          ];

      let agentText = '';
      const text = await runAgent(
        agentId,
        historyToSend,
        (token) => {
          agentText += token;
          onToken(token, agentId);
        }
      );

      agentText = text;
      fullResponse += (fullResponse ? '\n\n---\n\n' : '') + agentText;

      onAgentComplete(agentId, agentDef, agentText);
    }

    return { fullResponse, agentsUsed: agentQueue };
  }

  function getAgentDef(agentId) {
    return AGENT_DEFS[agentId] || null;
  }

  function getAllAgents() {
    return Object.values(AGENT_DEFS);
  }

  return {
    AGENT_DEFS,
    orchestrate,
    classifyIntent,
    buildAgentQueue,
    getAgentDef,
    getAllAgents,
  };
})();
