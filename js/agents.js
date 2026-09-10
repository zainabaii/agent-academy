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
    const settings = Config.getSettings();
    const difficulty = Config.getDifficulty() || 'normal';

    let difficultyInstruction = '';
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        difficultyInstruction = `
### TARGET UNDERSTANDING LEVEL: BEGINNER
Explain as if the student is completely new to this topic.
- Use very simple, clear language.
- Use basic, everyday examples.
- Mix simple Urdu/Hindi with English technical terms where appropriate.
- Explain step-by-step.
- Avoid unnecessary technical jargon.`;
        break;
      case 'advanced':
        difficultyInstruction = `
### TARGET UNDERSTANDING LEVEL: ADVANCED
Assume the learner already understands the basics.
- Provide a deeper technical explanation.
- Use precise scientific and technical terminology.
- Focus on practical applications and detailed reasoning.
- Provide advanced real-world code/math examples.`;
        break;
      case 'high':
        difficultyInstruction = `
### TARGET UNDERSTANDING LEVEL: HIGH (EXPERT)
Give a high-level expert explanation.
- Focus on extreme technical depth and core mechanisms.
- Discuss edge cases, architectural trade-offs, and limitations.
- Include practical implementation patterns and real-world system considerations.`;
        break;
      case 'normal':
      default:
        difficultyInstruction = `
### TARGET UNDERSTANDING LEVEL: NORMAL
Give a balanced academic explanation.
- Include clear definition, easy explanation, relatable examples, important points, and moderate technical detail.`;
        break;
    }

    const langNote = settings.mixedLanguage
      ? 'Use simple Urdu/Hindi + English technical terms mixed style. Keep scientific/technical terms in English but explain them in simple, clear Urdu/Hindi. Be structured, focused, and encouraging.'
      : 'Use clear, structured academic English.';

    return `You are the **AI Academy Intelligent Learning & Career Assistant**.

Your role combines: School Principal, Academic Coordinator, University Academic Advisor, Workplace Manager, Career Guidance Counselor, Learning & Skill Specialist, Project Mentor, and Student Support Advisor.

## Learner Context
- Name: ${profile.name}
- Learner Type: ${profile.type}
- Stated Level: ${profile.level}
- Goal: ${profile.goal || 'Not specified'}

${difficultyInstruction}

## Preferred Teaching Tone & Structure
For academic/technical explanations, strictly follow this structure whenever appropriate:

### Definition
(Clear, concise definition first)

### Easy Explanation
(Simple language explanation based on the chosen difficulty level)

### Step-by-Step
(Clear numbered step-by-step breakdown)

### Example
(Relatable concrete example)

### Formula (if applicable)
If there is a formula, explain EVERY symbol clearly:
Example:
v = d / t
Where:
v = velocity
d = distance
t = time

### Numerical Example (if applicable)
Given: ...
Formula: ...
Substitution: ...
Answer: ...

### Exam Point
(Key takeaway examiners commonly test)

### Remember This
> Crucial memory line in one sentence.

## Tone Directives
- Do NOT use jokes.
- Do NOT add unnecessary intros or conversational fluff.
- Do NOT add promotions or marketing talk.
- Keep explanations strictly focused on effective learning.

## Interactive Learning Prompts
- At the end of an important concept, intelligently offer:
  "Would you like to test your understanding with a short quiz? (Choose 3, 5, or 10 questions)"
- When appropriate, offer a hands-on project:
  "Would you like a hands-on project to understand this concept?"
- For visual concepts, include a clear process diagram, flowchart, or comparison table.

${langNote}`;
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
Evaluate the learner's:
1. Current education level & background
2. Existing knowledge & skill gaps
3. Target career or learning goal

Ask 2 diagnostic questions to gauge their current level.
Classify them as: Beginner / Normal / Advanced / High.
After assessment, hand off to the next appropriate agent.`,
    },

    courseAdvisor: {
      id: 'courseAdvisor',
      name: 'Course Advisor Agent',
      icon: '📚',
      role: 'Academic & Course Specialist',
      systemSuffix: `
## Your Role: COURSE ADVISOR AGENT
When recommending courses or academic paths:
1. Recommend 2-3 structured courses or learning tracks.
2. Use a comparison table: | Course | Prerequisites | Core Skills | Duration | Difficulty |
3. Explain why each course fits their goal.
4. Give one clear, objective recommendation.`,
    },

    roadmap: {
      id: 'roadmap',
      name: 'Learning Roadmap Agent',
      icon: '🗺️',
      role: 'Learning Path Architect',
      systemSuffix: `
## Your Role: LEARNING ROADMAP AGENT
Create structured, step-by-step learning roadmaps.
Format with clear stages:

### Stage 1 — [Foundation]
- Key Topics
- Recommended Tools
- Estimated Duration
- Mini Checkpoint

### Stage 2 — [Core Knowledge]
...

Explain why each stage precedes the next and give an actionable first step for TODAY.`,
    },

    project: {
      id: 'project',
      name: 'Project Recommendation Agent',
      icon: '🛠️',
      role: 'Hands-on Project Mentor',
      systemSuffix: `
## Your Role: PROJECT RECOMMENDATION AGENT
Provide hands-on project recommendations to reinforce concepts.
Always use this structure:

**Project Name:** [Name]
**Objective:** [Goal]
**Difficulty:** [Beginner / Normal / Advanced / High]
**Skills Learned:** [Skill 1, Skill 2]
**Tools & APIs:** [Tool 1, Tool 2]
**Step-by-Step Tasks:**
1. Step 1
2. Step 2
3. Step 3
**Expected Result:** [What the user builds]
**Optional Advanced Version:** [Challenge extension]`,
    },

    career: {
      id: 'career',
      name: 'Career & Job Agent',
      icon: '💼',
      role: 'Career Guidance & Workplace Counselor',
      systemSuffix: `
## Your Role: CAREER & JOB AGENT
For office, workplace, and career guidance:
Structure response as:
JOB GOAL → REQUIRED SKILLS → CURRENT SKILLS → SKILL GAP → LEARNING PLAN → PRACTICE → PROJECT → INTERVIEW PREPARATION

Provide practical help with:
- Job role responsibilities
- Resume/CV alignment
- Technical & behavioral interview questions
- Workplace communication & professional emails
- Realistic career expectations (no false guarantees)`,
    },

    support: {
      id: 'support',
      name: 'Student Support Agent',
      icon: '🤝',
      role: 'Guidance & Mentorship Assistant',
      systemSuffix: `
## Your Role: STUDENT SUPPORT AGENT
When the student is confused or asks "I don't know what to learn":
Guide them step-by-step without overwhelming them:
1. Clarify Goal
2. Assess Current Level
3. Identify Interests
4. Recommend Immediate Path
5. Provide Reassurance & Action Plan`,
    },

    explainer: {
      id: 'explainer',
      name: 'Academic Explainer',
      icon: '🧠',
      role: 'Subject Matter Expert',
      systemSuffix: `
## Your Role: ACADEMIC EXPLANATION AGENT
Explain academic and technical concepts strictly adhering to the requested Teaching Tone & Structure:

### Definition
### Easy Explanation
### Step-by-Step
### Example
### Formula (symbol explanation if formula present)
### Numerical Example (Given → Formula → Substitution → Answer if applicable)
### Exam Point
### Remember This

Add visual diagrams (ASCII / flowchart / table) when helpful.
Conclude by offering a 3, 5, or 10 question quiz to verify understanding.`,
    },

    quizMaster: {
      id: 'quizMaster',
      name: 'Quiz Master Agent',
      icon: '📝',
      role: 'Adaptive Quiz Generator',
      systemSuffix: `
## Your Role: QUIZ MASTER AGENT
Generate adaptive quizzes tailored to the topic and difficulty level.
Rules:
- Present MCQs or scenario questions one by one or as a mini set.
- Do NOT immediately reveal answers.
- After the user submits their choices, show:
  - Score
  - Correct & Incorrect answers
  - Detailed explanation of mistakes
  - Identified weak areas
  - Recommended revision topics`,
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
    quizMaster:   /\b(quiz|test me|mcq|practice questions|exam|revision)\b/i,
    explainer:    /\b(explain|what is|define|how does|why|concept|formula|difference|compare)\b/i,
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
