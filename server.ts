import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Lazy initialization helper for Gemini
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = (process.env.JournalH2S || process.env.GEMINI_API_KEY)?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is missing or empty. Please ensure GEMINI_API_KEY or JournalH2S is configured in Google AI Studio Settings > Secrets."
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

const RECOVERABLE_STATUS_CODES = [404, 429, 500, 502, 503, 504];

interface ModelAttemptDiagnostic {
  model: string;
  reachedSdk: boolean;
  status: number | null;
  category: "authentication" | "quota" | "invalid_model" | "malformed_request" | "network_or_service_error" | "api_error";
  isRecoverable: boolean;
  error: string;
}

function classifyGeminiError(err: any): {
  status: number | null;
  category: ModelAttemptDiagnostic["category"];
  isRecoverable: boolean;
  safeMessage: string;
} {
  const rawStatus = err?.status || err?.statusCode || err?.response?.status || err?.cause?.status;
  const status = typeof rawStatus === "number" ? rawStatus : null;
  const rawMsg = String(err?.message || err?.statusText || err || "");

  // Sanitize message: strip potential API key strings or tokens
  const safeMessage = rawMsg
    .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_KEY]")
    .replace(/key=[^&\s]+/gi, "key=[REDACTED]")
    .slice(0, 300);

  const lower = safeMessage.toLowerCase();

  // 1. Authentication / Permission errors (401, 403, missing/invalid key)
  if (
    status === 401 ||
    status === 403 ||
    lower.includes("api_key") ||
    lower.includes("api key") ||
    lower.includes("permission_denied") ||
    lower.includes("unauthenticated")
  ) {
    return {
      status: status || 401,
      category: "authentication",
      isRecoverable: false, // Switching models will not fix invalid/missing API key
      safeMessage,
    };
  }

  // 2. Quota / Rate limit (429)
  if (status === 429 || lower.includes("resource_exhausted") || lower.includes("quota")) {
    return {
      status: status || 429,
      category: "quota",
      isRecoverable: true,
      safeMessage,
    };
  }

  // 3. Invalid model / Not found (404)
  if (status === 404 || lower.includes("not_found") || lower.includes("not found") || lower.includes("is not supported")) {
    return {
      status: status || 404,
      category: "invalid_model",
      isRecoverable: true,
      safeMessage,
    };
  }

  // 4. Malformed request / Invalid argument (400)
  if (status === 400 || lower.includes("invalid_argument")) {
    return {
      status: status || 400,
      category: "malformed_request",
      isRecoverable: false,
      safeMessage,
    };
  }

  // 5. Network or server error (500, 502, 503, 504)
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lower.includes("unavailable") ||
    lower.includes("internal")
  ) {
    return {
      status: status || 503,
      category: "network_or_service_error",
      isRecoverable: true,
      safeMessage,
    };
  }

  // Generic / other API error
  const isRecoverable = status !== null ? RECOVERABLE_STATUS_CODES.includes(status) : true;
  return {
    status,
    category: "api_error",
    isRecoverable,
    safeMessage,
  };
}

// Fallback intelligent reflection response if API key has 429 quota exhaustion
function generateLocalReflection(messages: any[], promptType: string): string {
  const userMessages = messages.filter((m: any) => m.role === "user");
  const latestMsg = userMessages[userMessages.length - 1]?.content || "";
  const clean = latestMsg.trim();
  const lower = clean.toLowerCase();

  // 1. Mindful Stoic perspective
  if (promptType === "Mindful Stoic") {
    if (lower.includes("stress") || lower.includes("anxious") || lower.includes("worry") || lower.includes("overwhelm") || lower.includes("fear")) {
      return "Notice where your energy is flowing right now. Distinguish between what is within your direct volition and what belongs to external circumstances. When you release what you cannot control, what single constructive action remains?";
    }
    return "Stepping back to view this with objective equanimity: what core principle or virtue matters most to you in how you navigate this situation?";
  }

  // 2. Devil's Advocate perspective
  if (promptType === "Devil's Advocate") {
    return "That is a well-defined premise. If a trusted mentor who genuinely cares about your long-term success challenged your foundational assumption here, what counter-argument or blind spot would they ask you to examine?";
  }

  // 3. Brainstorm perspective
  if (promptType === "Brainstorm") {
    if (lower.includes("idea") || lower.includes("app") || lower.includes("project") || lower.includes("build") || lower.includes("design")) {
      return "This concept has real creative potential. If you removed all technical limitations, budget boundaries, and timeline constraints, what would the most audacious and delightful version of this look like?";
    }
    return "Let's expand the possibilities: what are two unconventional angles or complementary concepts that could take this in an unexpected, high-leverage direction?";
  }

  // 4. Deep Dive perspective
  if (promptType === "Deep Dive") {
    return "Peeling back the top layer of this thought: what is the fundamental motivation, core desire, or tension beneath the surface here?";
  }

  // 5. Default "Thinking Partner"
  if (clean.length < 30) {
    return "That's an insightful starting point. What brought this specific thought to mind today, and which part feels most important to explore next?";
  }

  if (lower.includes("?") || lower.includes("wonder") || lower.includes("should i") || lower.includes("decide")) {
    return "You're weighing a pivotal question. Deep down, which path aligns most cleanly with your long-term vision, and what hesitation are you noticing?";
  }

  return "Thank you for putting this into words. Reflecting on what you just wrote, what stands out as the most meaningful realization or immediate next step for you?";
}

function generateLocalSummary(messages: any[], rawText: string): any {
  const content = rawText || messages.map((m: any) => m.content).join(" ");
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const lower = content.toLowerCase();

  let category: 'Brainstorm' | 'Journal' | 'Reflective' = 'Journal';
  if (lower.includes('idea') || lower.includes('project') || lower.includes('build') || lower.includes('brainstorm') || lower.includes('concept') || lower.includes('app') || lower.includes('feature')) {
    category = 'Brainstorm';
  } else if (lower.includes('feel') || lower.includes('why') || lower.includes('learn') || lower.includes('realize') || lower.includes('grateful') || lower.includes('perspective')) {
    category = 'Reflective';
  }
  
  return {
    title: "Personal Reflection & Awareness",
    category,
    summary: `You explored your thoughts across ${messages.length || 1} exchange(s) (${wordCount} words), focusing on finding clarity, processing emotions, and identifying constructive perspectives.`,
    keyInsights: [
      "Dedication to regular self-reflection fosters mental clarity and emotional equilibrium.",
      "Articulating complex thoughts in writing helps separate urgent noise from core priorities.",
      "Incremental daily adjustments create meaningful long-term personal momentum."
    ],
    sentiment: "Reflective",
    actionItems: [
      "Take 5 minutes to revisit what brought you energy today.",
      "Note down one specific intention for tomorrow morning."
    ],
    structuredTasks: [
      {
        id: `tsk_local_${Date.now()}_1`,
        text: "Take 5 minutes to revisit what brought you energy today.",
        priority: "Medium",
        status: "pending",
        isCompleted: false,
        deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        suggestedOrder: 1,
        orderReason: "Reflective foundation task",
      },
      {
        id: `tsk_local_${Date.now()}_2`,
        text: "Note down one specific intention for tomorrow morning.",
        priority: "Medium",
        status: "pending",
        isCompleted: false,
        deadline: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        suggestedOrder: 2,
        orderReason: "Follows reflection practice",
      }
    ]
  };
}

async function generateContentWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
}): Promise<{ text: string; usedModel: string; attempts: ModelAttemptDiagnostic[] }> {
  const attempts: ModelAttemptDiagnostic[] = [];

  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient();
  } catch (clientErr: any) {
    const diagnostic: ModelAttemptDiagnostic = {
      model: "none",
      reachedSdk: false,
      status: null,
      category: "authentication",
      isRecoverable: false,
      error: clientErr.message || "GEMINI_API_KEY is not configured.",
    };
    attempts.push(diagnostic);
    const err = new Error(diagnostic.error);
    (err as any).diagnostics = attempts;
    throw err;
  }

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.7,
        },
      });

      if (response && response.text) {
        return {
          text: response.text,
          usedModel: modelName,
          attempts,
        };
      }
      throw new Error(`Model ${modelName} returned empty response text.`);
    } catch (err: any) {
      const classification = classifyGeminiError(err);
      const diagnostic: ModelAttemptDiagnostic = {
        model: modelName,
        reachedSdk: true,
        status: classification.status,
        category: classification.category,
        isRecoverable: classification.isRecoverable,
        error: classification.safeMessage,
      };
      attempts.push(diagnostic);

      // If prepayment credits are depleted for the project, all models share the same billing state
      const isPrepaymentDepleted = classification.safeMessage.toLowerCase().includes("prepayment credits are depleted");
      if (isPrepaymentDepleted) {
        console.log(`[Gemini Info] Prepayment balance depleted on project. Engaging local thinking partner.`);
        break;
      }

      console.log(
        `[Gemini Info] Model "${modelName}" unavailable [Status: ${classification.status || "N/A"}]. Proceeding to next candidate.`
      );

      // If error is not recoverable (e.g. authentication error), do not repeatedly hammer the API
      if (!classification.isRecoverable) {
        console.log(`[Gemini Info] Halting fallback ladder early due to non-recoverable status (${classification.category}).`);
        break;
      }
    }
  }

  const finalError = new Error("All Gemini candidate models were exhausted.");
  (finalError as any).diagnostics = attempts;
  throw finalError;
}

// API Routes
app.get("/api/health", (req, res) => {
  const hasKey = Boolean(
    (process.env.JournalH2S && process.env.JournalH2S.trim()) ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())
  );
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    hasGeminiKey: hasKey,
  });
});

// Endpoint: Multi-turn Reflection & Conversational Guidance
app.post("/api/gemini/reflect", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { messages = [], promptType = "reflection", context = "" } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "At least one message is required." });
    }

    const systemInstruction = `You are a contextual thinking partner and personal journaling assistant powered by Gemini.
Your purpose is to help the user explore ideas, brainstorm, organize thoughts, and reflect naturally.

Guidelines:
1. Context is Key: Treat this as a continuous multi-turn conversation. Understand short replies (e.g., 'this project') in the context of previous messages. Do NOT treat every message as an independent entry.
2. Adapt to the User: If they are brainstorming, help expand or connect ideas. If they are journaling, acknowledge and help organize without forcing emotional analysis. If they ask a direct question, answer it. If giving a short update, respond appropriately to the context.
3. Natural & Conversational: Avoid overly formal, therapeutic, or motivational clichés (e.g., 'Thank you for articulating', 'Taking the time to reflect'). Be direct, conversational, and helpful.
4. No Forced Questions: Do not ask a question after every single user message. Sometimes an observation, summary, or idea is the best response. If the intent is unclear, ask a concise clarification instead of inventing an emotional interpretation.
5. Neutral Framing: Do not assume the user has an emotional problem or needs self-reflection unless explicitly stated. Do not label responses as "Thoughtful Reflection".
6. Format: Use clean Markdown. Keep responses concise and relevant to the user's exact input. Do not unnecessarily repeat their entire message back to them.
7. Persona Context: Prompt mode is '${promptType}'. Additional context provided: '${context || "None"}'.`;

    // Convert messages into Gemini contents format
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: String(m.content || "") }],
    }));

    try {
      const result = await generateContentWithFallback({
        contents,
        systemInstruction,
        temperature: 0.7,
      });

      return res.json({
        reply: result.text,
        modelUsed: result.usedModel,
        fallback: false,
      });
    } catch (geminiError: any) {
      const diagnostics: ModelAttemptDiagnostic[] = geminiError?.diagnostics || [];
      console.log("[Gemini Reflect] Models unavailable. Engaging local thinking partner.");

      const hasKey = Boolean(
        (process.env.JournalH2S && process.env.JournalH2S.trim()) ||
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())
      );

      // Return clean JSON marked as fallback so reverse proxy does not intercept with HTML error
      return res.json({
        reply: generateLocalReflection(messages, promptType),
        modelUsed: "local-fallback",
        fallback: true,
        notice: "Reflecting with local thinking partner.",
        diagnostics: {
          hasGeminiKey: hasKey,
          attempts: diagnostics.map((d) => ({
            model: d.model,
            reachedSdk: d.reachedSdk,
            status: d.status,
            category: d.category,
            error: d.error,
          })),
        },
      });
    }
  } catch (error: any) {
    console.log("[Gemini Reflect Route] Caught exception, returning safe reflection fallback.");
    return res.json({
      reply: "I'm reflecting with you on this entry. Tell me more about what's currently on your mind.",
      modelUsed: "local-fallback",
      fallback: true,
      notice: "Reflecting with local thinking partner.",
    });
  }
});

// Endpoint: Session Summarization, Title Generation, Auto-Categorization & Insights
app.post("/api/gemini/summarize", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { messages = [], rawText = "" } = body;

    let fullTranscript = rawText;
    if (!fullTranscript && Array.isArray(messages)) {
      fullTranscript = messages
        .map((m: any) => `${m.role === "user" ? "User" : "Gemini"}: ${m.content}`)
        .join("\n\n");
    }

    if (!fullTranscript || fullTranscript.trim().length === 0) {
      return res.status(400).json({ error: "Content is required for summarization." });
    }

    const systemInstruction = `You are an expert executive coach and mindfulness synthesizer. 
Analyze the provided journal entry or reflection conversation and return a JSON object with:
1. "title": A succinct, poetic, or clear 3-7 word title capturing the core theme.
2. "category": Automatically categorize the entry as strictly one of ["Brainstorm", "Journal", "Reflective", "Books", "Movies", "Study", "Projects"] based on the content.
3. "summary": A 2-3 sentence coherent summary of the reflection.
4. "keyInsights": An array of 2 to 4 bullet-point insight statements.
5. "sentiment": One of ["Calm", "Reflective", "Optimistic", "Challenging", "Energized", "Grounded", "Contemplative"].
6. "structuredTasks": An array of extracted action items or tasks from the session. Each object in the array should have:
   - "id": A random unique string (e.g., "tsk_abc123").
   - "text": The task description.
   - "isCompleted": boolean (always false).
   - "priority": strictly one of ["High", "Medium", "Low"].
   - "createdAt": The current ISO timestamp (e.g., "${new Date().toISOString()}").
   - "deadline": An actionable deadline in "YYYY-MM-DD" format. If the entry mentions a timeframe (e.g., "by Friday", "next week", "in 3 days"), infer the approximate date; otherwise assign a realistic near-term deadline between 2 to 14 days from now so it is actionable.
   - "subtasks": An optional array of objects [{"id": "sub_1", "text": "Sub-action step"}] if the task naturally divides into sequential or parallel parts.

Output strictly valid JSON with no markdown backticks or commentary.`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `Please synthesize the following journal session into structured JSON:\n\n${fullTranscript}`,
          },
        ],
      },
    ];

    try {
      const result = await generateContentWithFallback({
        contents,
        systemInstruction,
        temperature: 0.4,
      });

      let cleaned = result.text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      try {
        const parsed = JSON.parse(cleaned);
        return res.json({
          ...parsed,
          modelUsed: result.usedModel,
          fallback: false,
        });
      } catch (parseError) {
        return res.json({
          title: "Reflection Session",
          category: "Journal",
          summary: cleaned.slice(0, 200),
          keyInsights: ["Deep self-reflection captured in this session."],
          sentiment: "Reflective",
          actionItems: [],
          rawOutput: cleaned,
          modelUsed: result.usedModel,
          fallback: false,
        });
      }
    } catch (geminiError: any) {
      const diagnostics: ModelAttemptDiagnostic[] = geminiError?.diagnostics || [];
      console.log("[Gemini Summarize] Activating local synthesizer fallback.");
      const fallbackSummary = generateLocalSummary(messages, fullTranscript);
      const hasKey = Boolean(
        (process.env.JournalH2S && process.env.JournalH2S.trim()) ||
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())
      );
      return res.json({
        ...fallbackSummary,
        modelUsed: "local-fallback",
        fallback: true,
        notice: "Generated by local synthesis engine.",
        diagnostics: {
          hasGeminiKey: hasKey,
          attempts: diagnostics.map((d) => ({
            model: d.model,
            reachedSdk: d.reachedSdk,
            status: d.status,
            category: d.category,
          })),
        },
      });
    }
  } catch (error: any) {
    console.log("[Gemini Summarize Route] Caught exception, returning safe local summary.");
    const fallbackSummary = generateLocalSummary([], "");
    return res.json({
      ...fallbackSummary,
      modelUsed: "local-fallback",
      fallback: true,
      notice: "Generated by local synthesis engine.",
    });
  }
});

// Stage determination helper
const EVOLUTION_STAGES = [
  'Original Thought',
  'Exploration',
  'Refinement',
  'New Direction',
  'Outcome',
] as const;

// Stopword filter for semantic overlap detection
const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'were', 'been',
  'about', 'into', 'what', 'some', 'there', 'they', 'your', 'just', 'more',
  'will', 'when', 'them', 'then', 'than', 'over', 'also', 'their', 'very'
]);

function extractMeaningfulKeywords(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
  return new Set(words.filter((w) => w.length > 3 && !STOPWORDS.has(w)));
}

// Local fallback for Idea Evolution, Connect the Dots, Mind Map, Flowchart, & Action Intelligence
function generateLocalEvolutionGraph(sessions: any[]): any {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      nodes: [],
      links: [],
      evolutionStories: [],
      overallInsights: ["Begin writing journal and brainstorm entries to see your idea network grow."],
      clusters: ["General"],
      mindMap: [],
      flowchart: {
        hasProcess: false,
        nodes: [],
        explanation: "No sequential process or workflow described in these journal entries.",
      },
      taskOrdering: {
        orderedTasks: [],
        explanation: "No tasks to order.",
        dependenciesFound: false,
      },
      lastAnalyzed: new Date().toISOString(),
    };
  }

  // Sort sessions chronologically ascending
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );

  const clusters = ["Creative Brainstorms", "Mindset & Habits", "Life Milestones", "Personal Growth"];
  
  const nodes = sorted.map((s, index) => {
    let stage: 'Original Thought' | 'Exploration' | 'Refinement' | 'New Direction' | 'Outcome' = 'Original Thought';
    const total = sorted.length;
    if (total > 1) {
      const progress = index / (total - 1);
      if (progress < 0.2) stage = 'Original Thought';
      else if (progress < 0.45) stage = 'Exploration';
      else if (progress < 0.7) stage = 'Refinement';
      else if (progress < 0.9) stage = 'New Direction';
      else stage = 'Outcome';
    }

    let assignedCluster = clusters[0];
    const cat = s.category || 'Journal';
    if (cat === 'Brainstorm' || cat === 'Projects') assignedCluster = 'Creative Brainstorms';
    else if (cat === 'Reflective' || cat === 'Study') assignedCluster = 'Mindset & Habits';
    else if (s.actionItems && s.actionItems.length > 0) assignedCluster = 'Life Milestones';
    else assignedCluster = 'Personal Growth';

    const title = s.title || `Reflection #${index + 1}`;
    const summary = s.summary || (s.messages?.[0]?.content?.slice(0, 150) || 'Journal entry recorded.');

    return {
      id: s.id,
      sourceEntryId: s.id,
      title,
      label: title,
      category: s.category || 'Journal',
      date: s.createdAt,
      timestamp: s.createdAt,
      mood: s.mood || 'Reflective',
      summary,
      cluster: assignedCluster,
      evolutionStage: stage,
      stage,
      keyInsights: s.keyInsights && s.keyInsights.length > 0 ? s.keyInsights : ["Captured introspective thoughts and observations."],
      actionItems: s.actionItems || [],
    };
  });

  // Phase 1: Connect meaningful relationships without forcing unrelated entries
  const links: any[] = [];
  const nodeKeywords = nodes.map((n) =>
    extractMeaningfulKeywords(`${n.title} ${n.summary} ${n.category} ${n.keyInsights.join(' ')}`)
  );

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const wordsA = nodeKeywords[i];
      const wordsB = nodeKeywords[j];
      
      // Calculate intersection
      let overlapCount = 0;
      wordsA.forEach((w) => {
        if (wordsB.has(w)) overlapCount++;
      });

      const sameCategory = nodes[i].category === nodes[j].category;
      const sameCluster = nodes[i].cluster === nodes[j].cluster;

      // Only establish link if genuine semantic connection exists
      if (overlapCount >= 2 || (sameCategory && sameCluster && overlapCount >= 1)) {
        let relType: 'related' | 'evolved_from' | 'refined_from' | 'expands' | 'leads_to' | 'diverges_from' = 'related';
        let relDesc = 'Thematic relation';
        let strength = 3;

        if (nodes[j].evolutionStage === 'Outcome' || (nodes[j].actionItems && nodes[j].actionItems.length > 0)) {
          relType = 'leads_to';
          relDesc = 'Leads to tangible execution';
          strength = 5;
        } else if (nodes[j].evolutionStage === 'New Direction') {
          relType = 'diverges_from';
          relDesc = 'Diverges into new direction';
          strength = 4;
        } else if (nodes[j].evolutionStage === 'Refinement') {
          relType = 'refined_from';
          relDesc = 'Refines earlier exploration';
          strength = 4;
        } else if (nodes[i].evolutionStage === 'Original Thought' && nodes[j].evolutionStage === 'Exploration') {
          relType = 'expands';
          relDesc = 'Expands core concept';
          strength = 4;
        } else if (j === i + 1) {
          relType = 'evolved_from';
          relDesc = 'Evolves previous reflection';
          strength = 3;
        }

        links.push({
          id: `link-${nodes[i].id}-${nodes[j].id}`,
          source: nodes[i].id,
          target: nodes[j].id,
          relationship: relDesc,
          relationshipType: relType,
          explanation: `"${nodes[j].title}" connects with "${nodes[i].title}" through shared focus on ${nodes[i].cluster}.`,
          reason: `Shared conceptual theme in ${nodes[i].cluster}.`,
          strength,
          confidence: Math.min(1.0, 0.5 + overlapCount * 0.1),
        });
      }
    }
  }

  // If graph has nodes but zero links because of high divergence, add at least 1 chronological bridge if consecutive
  if (links.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({
        id: `link-chron-${nodes[i].id}-${nodes[i + 1].id}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        relationship: 'Sequential Thought Stream',
        relationshipType: 'evolved_from',
        explanation: `Sequential progression of thought from ${new Date(nodes[i].date).toLocaleDateString()} to ${new Date(nodes[i + 1].date).toLocaleDateString()}`,
        reason: 'Sequential journaling timeline',
        strength: 2,
        confidence: 0.7,
      });
    }
  }

  // Phase 4A: Hierarchical Mind Map (Central Thought -> Major Themes -> Related Ideas -> Sub-Ideas)
  const mindMap: any[] = [];
  const centralId = "mm-central";
  mindMap.push({
    id: centralId,
    label: "Personal Reflection & Idea Web",
    type: "central",
    parentId: null,
  });

  const uniqueClusters = Array.from(new Set(nodes.map((n) => n.cluster)));
  uniqueClusters.forEach((cl, clIdx) => {
    const themeId = `mm-theme-${clIdx}`;
    mindMap.push({
      id: themeId,
      label: cl,
      type: "theme",
      parentId: centralId,
    });

    // Add nodes in this theme
    const clusterNodes = nodes.filter((n) => n.cluster === cl);
    clusterNodes.forEach((cn) => {
      const ideaId = `mm-idea-${cn.id}`;
      mindMap.push({
        id: ideaId,
        label: cn.title,
        type: "idea",
        parentId: themeId,
        sourceEntryId: cn.id,
      });

      // Add sub-ideas from key insights or action items
      if (cn.keyInsights && cn.keyInsights.length > 0) {
        cn.keyInsights.slice(0, 2).forEach((ins: string, insIdx: number) => {
          mindMap.push({
            id: `mm-sub-${cn.id}-${insIdx}`,
            label: ins,
            type: "sub_idea",
            parentId: ideaId,
            sourceEntryId: cn.id,
          });
        });
      }
    });
  });

  // Phase 4B: Genuine Process Flowchart (Only if actual actions/steps/workflow exist)
  // Check if any entries contain sequential tasks or action steps
  const allExtractedActions: { text: string; sourceEntryId: string; priority: string }[] = [];
  nodes.forEach((n) => {
    if (Array.isArray(n.actionItems)) {
      n.actionItems.forEach((act: string) => {
        if (act && act.trim()) {
          allExtractedActions.push({
            text: act.trim(),
            sourceEntryId: n.id,
            priority: 'Medium',
          });
        }
      });
    }
  });

  let flowchart: { hasProcess: boolean; nodes: any[]; explanation?: string };
  if (allExtractedActions.length >= 2 || nodes.some((n) => n.category === 'Projects' || n.category === 'Brainstorm')) {
    // There is reasonable evidence of a process or sequential workflow
    const fcNodes: any[] = [];
    const startNode = {
      id: "fc-start",
      label: nodes[0]?.title ? `Start: ${nodes[0].title}` : "Initial Intention",
      type: "start",
      next: ["fc-step-1"],
      reason: "Starting entry of the thought stream",
      sourceEntryId: nodes[0]?.id,
    };
    fcNodes.push(startNode);

    const steps = allExtractedActions.length > 0 
      ? allExtractedActions.slice(0, 4)
      : nodes.slice(0, 4).map((n) => ({ text: n.title, sourceEntryId: n.id, priority: 'Medium' }));

    steps.forEach((step, sIdx) => {
      const nodeId = `fc-step-${sIdx + 1}`;
      const isLast = sIdx === steps.length - 1;
      const nextId = isLast ? "fc-outcome" : `fc-step-${sIdx + 2}`;

      if (sIdx === 1 && steps.length > 2) {
        // Form a decision node for direction
        fcNodes.push({
          id: nodeId,
          label: `Evaluate: ${step.text.slice(0, 45)}`,
          type: "decision",
          condition: "If verified & viable",
          next: [nextId],
          reason: "Validation check before proceeding",
          sourceEntryId: step.sourceEntryId,
        });
      } else {
        fcNodes.push({
          id: nodeId,
          label: step.text.slice(0, 50),
          type: "action",
          next: [nextId],
          reason: `Step ${sIdx + 1} execution`,
          sourceEntryId: step.sourceEntryId,
        });
      }
    });

    fcNodes.push({
      id: "fc-outcome",
      label: "Intended Breakthrough & Reflection Closure",
      type: "outcome",
      next: [],
      reason: "Completed cycle of action and reflection",
    });

    flowchart = {
      hasProcess: true,
      nodes: fcNodes,
      explanation: `Sequential execution path constructed from ${steps.length} identified actions and project milestones.`,
    };
  } else {
    // If journal content does not describe a process, do NOT invent one!
    flowchart = {
      hasProcess: false,
      nodes: [],
      explanation: "No sequential process or workflow was described in these journal entries. (Flowcharts are only generated when thoughts describe a process, sequence, or decision path.)",
    };
  }

  // Phase 3: Task Dependencies & Intelligent Ordering
  const rawTasks = allExtractedActions.map((act, idx) => ({
    id: `task_auto_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    text: act.text,
    sourceEntryId: act.sourceEntryId,
    priority: act.priority as any,
    status: 'pending' as const,
    isCompleted: false,
    createdAt: new Date().toISOString(),
  }));

  // Helper stage ranks for prerequisites
  const verbPatterns = [
    { rank: 1, regex: /\b(research|investigate|study|explore|gather|read|brainstorm|plan)\b/i },
    { rank: 2, regex: /\b(setup|configure|install|scaffold|design)\b/i },
    { rank: 3, regex: /\b(build|develop|create|code|implement|write)\b/i },
    { rank: 4, regex: /\b(test|verify|validate|review|audit|debug)\b/i },
    { rank: 5, regex: /\b(deploy|launch|publish|release|ship)\b/i },
  ];

  const orderedTasks = rawTasks.map((t, idx) => {
    let assignedRank = 3;
    for (const p of verbPatterns) {
      if (p.regex.test(t.text)) {
        assignedRank = p.rank;
        break;
      }
    }
    return {
      ...t,
      rank: assignedRank,
      suggestedOrder: idx + 1,
      orderReason: 'Standard priority reflection action',
    };
  });

  // Sort by stage rank (Prerequisite verb ladder)
  orderedTasks.sort((a, b) => a.rank - b.rank);
  orderedTasks.forEach((t, i) => {
    t.suggestedOrder = i + 1;
    if (i === 0 && orderedTasks.length > 1) {
      t.orderReason = `Foundational prerequisite for subsequent actions`;
    } else if (i > 0) {
      t.orderReason = `Follows step ${i} ("${orderedTasks[i - 1].text.slice(0, 20)}...")`;
    }
  });

  const evolutionStories = [
    {
      id: "story-1",
      theme: "Creative Ideation & Execution Trajectory",
      narrative: `Across ${nodes.length} recorded entries, your journaling demonstrates a transition from initial brainstorming sparks into grounded, actionable reflections.`,
      milestoneNodeIds: nodes.slice(0, 3).map((n) => n.id),
      cluster: "Creative Brainstorms",
    },
    {
      id: "story-2",
      theme: "Mindset Stability & Introspective Clarity",
      narrative: "Regular recording has formed a solid reflective feedback loop, clarifying priorities and reducing decision fatigue over time.",
      milestoneNodeIds: nodes.slice(-2).map((n) => n.id),
      cluster: "Mindset & Habits",
    },
  ];

  return {
    nodes,
    links,
    evolutionStories,
    overallInsights: [
      `Your journal network connects ${nodes.length} nodes across ${links.length} semantic relationships.`,
      "Ideas recorded in earlier sessions consistently serve as foundations for subsequent breakthroughs.",
      "Cross-category reflections frequently reveal constructive solutions for creative blocks."
    ],
    clusters: uniqueClusters,
    mindMap,
    flowchart,
    taskOrdering: {
      orderedTasks: orderedTasks.map(({ rank, ...rest }) => rest),
      explanation: orderedTasks.length > 0 
        ? "Tasks sequenced using prerequisite relationships and stage dependency hierarchy."
        : "No tasks found across current sessions.",
      dependenciesFound: orderedTasks.length > 1,
    },
    lastAnalyzed: new Date().toISOString(),
  };
}

// Endpoint: Companion Chat ("Chat with Your Journal")
app.post("/api/gemini/companion-chat", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { messages = [], journalContext = "" } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "At least one message is required." });
    }

    const systemInstruction = `You are a personalized AI Journal Companion & Memory Synthesizer.
You have access to the user's recorded journal entries, brainstorms, and reflections provided in the context below.

Your goal is to:
1. Answer the user's questions about their past entries, trends in their thinking, key milestones, and recurring brainstorm topics.
2. Offer compassionate, encouraging, and highly specific reflections grounded directly in their real journal history.
3. Be conversational, warm, and helpful. Format your responses with clean Markdown.

User's Journal Context:
${journalContext || "No previous journal entries found."}`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: String(m.content || "") }],
    }));

    try {
      const result = await generateContentWithFallback({
        contents,
        systemInstruction,
        temperature: 0.7,
      });

      return res.json({
        reply: result.text,
        modelUsed: result.usedModel,
        fallback: false,
      });
    } catch (geminiError: any) {
      const diagnostics: ModelAttemptDiagnostic[] = geminiError?.diagnostics || [];
      console.log("[Gemini Companion] Activating local companion synthesizer.");
      const userLast = messages[messages.length - 1]?.content || "";
      const fallbackReply = `Reflecting on your journal history and your note "${userLast.slice(0, 40)}...", there is a clear theme of intentional thought and personal discovery. What aspect of this realization would you like to build on next?`;
      const hasKey = Boolean(
        (process.env.JournalH2S && process.env.JournalH2S.trim()) ||
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())
      );
      return res.json({
        reply: fallbackReply,
        modelUsed: "local-fallback",
        fallback: true,
        notice: "Reflecting with local journal companion.",
        diagnostics: {
          hasGeminiKey: hasKey,
          attempts: diagnostics.map((d) => ({
            model: d.model,
            reachedSdk: d.reachedSdk,
            status: d.status,
            category: d.category,
          })),
        },
      });
    }
  } catch (error: any) {
    console.log("[Gemini Companion Route] Caught exception, returning safe companion fallback.");
    return res.json({
      reply: "I'm listening and tracking along with your journal entries. What feels most important to focus on right now?",
      modelUsed: "local-fallback",
      fallback: true,
      notice: "Reflecting with local journal companion.",
    });
  }
});

// Endpoint: Connect the Dots & Idea Evolution Graph Engine
app.post("/api/gemini/connect-dots", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { sessions = [] } = body;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.json(generateLocalEvolutionGraph([]));
    }

    // Format sessions for Gemini analysis
    const formattedSessions = sessions.map((s: any, idx: number) => ({
      id: s.id,
      index: idx + 1,
      title: s.title || `Entry ${idx + 1}`,
      category: s.category || "Journal",
      date: s.createdAt,
      mood: s.mood || "Reflective",
      summary: s.summary || s.messages?.[0]?.content?.slice(0, 200) || "",
      keyInsights: s.keyInsights || [],
      actionItems: s.actionItems || [],
    }));

    const systemInstruction = `You are an elite Thought Architect, Cognitive Network Engine, and Action Strategist powered by Gemini.
Your mission is to perform deep semantic graph analysis on the user's journal entries to "Connect the Dots", chart their "Idea Evolution", structure a hierarchical "Mind Map", map sequential "Flowchart" processes, and deduce explainable "Task Dependencies".

Analyze all provided journal entries and return a strictly valid JSON object with the following structure:
{
  "nodes": [
    {
      "id": "original session id string",
      "sourceEntryId": "original session id string",
      "title": "Clear concise entry title",
      "label": "Same as title",
      "category": "Brainstorm | Journal | Reflective | Books | Movies | Study | Projects",
      "date": "ISO date string",
      "mood": "Mood descriptor string",
      "summary": "1-2 sentence core idea summary",
      "cluster": "Name of thematic cluster (e.g., 'Creative Tech', 'Mindset & Habits', 'Personal Growth', 'Life Milestones', 'Philosophy')",
      "evolutionStage": "Strictly one of ['Original Thought', 'Exploration', 'Refinement', 'New Direction', 'Outcome'] representing how mature or actionable this thought is in their trajectory",
      "keyInsights": ["Array of 1-3 takeaways"],
      "actionItems": ["Array of action items if any"]
    }
  ],
  "links": [
    {
      "id": "link-nodeId1-nodeId2",
      "source": "source node id string",
      "target": "target node id string",
      "relationship": "Short natural relationship label (e.g., 'Expands architecture', 'Refines thesis', 'Leads to prototype', 'Pivots direction')",
      "relationshipType": "Strictly one of ['related', 'evolved_from', 'refined_from', 'expands', 'leads_to', 'diverges_from']",
      "explanation": "Clear 1-2 sentence explanation of why and how these two thoughts connect or evolve across time.",
      "reason": "Clear concise rationale",
      "strength": 4 // integer between 1 and 5
    }
  ],
  "evolutionStories": [
    {
      "id": "story-1",
      "theme": "Theme title (e.g. 'From Wild Idea to Daily Habit')",
      "narrative": "A vivid 2-3 sentence narrative chronicling how the user's ideas progressed from early seed thoughts to modern execution.",
      "milestoneNodeIds": ["id1", "id2", "id3"],
      "cluster": "Name of the thematic cluster"
    }
  ],
  "overallInsights": [
    "3-4 overarching strategic cognitive insights regarding recurring motifs, blind spots, creative breakthroughs, and personal momentum."
  ],
  "clusters": ["Unique list of cluster names detected"],
  "mindMap": [
    {
      "id": "mm-central",
      "label": "Central overarching thought or core thesis across the entries",
      "type": "central",
      "parentId": null
    },
    {
      "id": "mm-theme-1",
      "label": "Major theme or cluster name",
      "type": "theme",
      "parentId": "mm-central"
    },
    {
      "id": "mm-idea-1",
      "label": "Related idea or reflection title",
      "type": "idea",
      "parentId": "mm-theme-1",
      "sourceEntryId": "session-id"
    },
    {
      "id": "mm-sub-1",
      "label": "Sub-idea or specific takeaway",
      "type": "sub_idea",
      "parentId": "mm-idea-1"
    }
  ],
  "flowchart": {
    "hasProcess": true, // Set to true ONLY if the journal content genuinely describes a process, sequence, workflow, or decision path. If not, set to false!
    "nodes": [
      {
        "id": "fc-start",
        "label": "Starting intent or trigger",
        "type": "start",
        "next": ["fc-act-1"]
      },
      {
        "id": "fc-act-1",
        "label": "Concrete action or step description",
        "type": "action",
        "next": ["fc-dec-1"],
        "reason": "Prerequisite execution step"
      },
      {
        "id": "fc-dec-1",
        "label": "Direction evaluation or decision point",
        "type": "decision",
        "condition": "If viable",
        "next": ["fc-out-1"]
      },
      {
        "id": "fc-out-1",
        "label": "Outcome, deliverable, or breakthrough",
        "type": "outcome",
        "next": []
      }
    ],
    "explanation": "Summary of sequential flow detected (or note why no process exists)"
  },
  "taskOrdering": {
    "dependenciesFound": true,
    "explanation": "Clear explanation of how tasks were sequenced based on prerequisites, deadlines, and priorities",
    "orderedTasks": [
      {
        "id": "tsk_1",
        "text": "Action item description",
        "sourceEntryId": "session-id",
        "priority": "High | Medium | Low",
        "status": "pending",
        "isCompleted": false,
        "dependsOn": [], // Array of task IDs this task depends on
        "suggestedOrder": 1,
        "orderReason": "Explainable reason why this task was suggested before others (e.g. 'Prerequisite for build step')"
      }
    ]
  }
}

CRITICAL RULES:
1. Do NOT force relationships. If two entries are unrelated, they should remain unrelated. Prioritize meaningful connections rather than creating a dense graph just to make the visualization look full.
2. Supported relationship types: strictly 'related', 'evolved_from', 'refined_from', 'expands', 'leads_to', 'diverges_from'.
3. Supported stages: strictly 'Original Thought', 'Exploration', 'Refinement', 'New Direction', 'Outcome'.
4. Mind Map: Must be strictly hierarchical (Central Thought -> Major Themes -> Related Ideas -> Sub-Ideas) using parentId. Do NOT output a generic network graph.
5. Flowchart: Must represent a genuine process/sequence. If the journal content does not describe a process or sequence, do NOT invent one; set hasProcess: false and nodes: [].
6. Task Dependencies: Priority ordering must strictly follow: (1) Explicit dependencies, (2) Explicit deadlines, (3) Clear prerequisite relationships (Research before Build before Test), (4) Existing task priority.
7. Output strictly pure JSON with no markdown backticks or commentary.`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `Analyze these ${formattedSessions.length} journal sessions and generate the unified intelligence layer (Connect the Dots, Idea Evolution, Mind Map, Flowchart, and Task Dependencies):\n\n${JSON.stringify(
              formattedSessions,
              null,
              2
            )}`,
          },
        ],
      },
    ];

    try {
      const result = await generateContentWithFallback({
        contents,
        systemInstruction,
        temperature: 0.4,
      });

      let cleaned = result.text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      try {
        const parsed = JSON.parse(cleaned);

        // Fallback-fill any partial schemas from local generator if omitted by Gemini
        const localBaseline = generateLocalEvolutionGraph(sessions);
        const enrichedMindMap = Array.isArray(parsed.mindMap) && parsed.mindMap.length > 0 
          ? parsed.mindMap 
          : localBaseline.mindMap;

        const enrichedFlowchart = parsed.flowchart && typeof parsed.flowchart === "object"
          ? parsed.flowchart
          : localBaseline.flowchart;

        const enrichedTaskOrdering = parsed.taskOrdering && typeof parsed.taskOrdering === "object"
          ? parsed.taskOrdering
          : localBaseline.taskOrdering;

        return res.json({
          ...parsed,
          mindMap: enrichedMindMap,
          flowchart: enrichedFlowchart,
          taskOrdering: enrichedTaskOrdering,
          lastAnalyzed: new Date().toISOString(),
          modelUsed: result.usedModel,
          fallback: false,
        });
      } catch (parseErr) {
        console.log("[Gemini Graph] Parsing completed with local schema synthesizer.");
        const fallbackGraph = generateLocalEvolutionGraph(sessions);
        return res.json({
          ...fallbackGraph,
          modelUsed: result.usedModel,
          fallback: true,
          notice: "Generated by local graph synthesizer.",
        });
      }
    } catch (geminiErr: any) {
      const diagnostics: ModelAttemptDiagnostic[] = geminiErr?.diagnostics || [];
      console.log("[Gemini Graph] Activating local graph generator fallback.");
      const fallbackGraph = generateLocalEvolutionGraph(sessions);
      const hasKey = Boolean(
        (process.env.JournalH2S && process.env.JournalH2S.trim()) ||
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())
      );
      return res.json({
        ...fallbackGraph,
        modelUsed: "local-fallback",
        fallback: true,
        notice: "Generated by local graph synthesizer.",
        diagnostics: {
          hasGeminiKey: hasKey,
          attempts: diagnostics.map((d) => ({
            model: d.model,
            reachedSdk: d.reachedSdk,
            status: d.status,
            category: d.category,
          })),
        },
      });
    }
  } catch (error: any) {
    console.log("[Gemini Graph Route] Caught exception, returning safe local graph.");
    const fallbackGraph = generateLocalEvolutionGraph([]);
    return res.json({
      ...fallbackGraph,
      modelUsed: "local-fallback",
      fallback: true,
      notice: "Generated by local graph synthesizer.",
    });
  }
});

// Endpoint: Analyze Task Dependencies & Intelligent Ordering directly
app.post("/api/gemini/task-dependencies", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { tasks = [] } = body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.json({
        orderedTasks: [],
        explanation: "No tasks provided.",
        dependenciesFound: false,
      });
    }

    const systemInstruction = `You are an expert project sequencing and dependency strategist.
Analyze the following list of tasks and order them intelligently.
Rules:
1. Detect dependencies only when reasonable evidence exists (e.g. Research topic -> Build prototype -> Test prototype).
2. Supported relationship types: 'depends_on', 'prerequisite', 'follows'.
3. Ordering priority:
   - 1. Explicit dependencies
   - 2. Explicit deadlines (earliest first)
   - 3. Clear prerequisite relationships
   - 4. Existing task priority (High > Medium > Low)
4. Do NOT create artificial dependencies or a complicated calendar scheduler.
5. Provide a clear, explainable orderReason for each task explaining why it appears in that position.

Return strictly JSON:
{
  "dependenciesFound": boolean,
  "explanation": "Clear explanation of the ordering logic",
  "orderedTasks": [
    {
      "id": "task-id",
      "text": "Task text",
      "priority": "High | Medium | Low",
      "status": "pending | completed",
      "isCompleted": boolean,
      "dependsOn": ["ids of prerequisite tasks"],
      "suggestedOrder": number,
      "orderReason": "Why this task was placed here"
    }
  ]
}`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `Analyze and order these tasks:\n\n${JSON.stringify(tasks, null, 2)}`,
          },
        ],
      },
    ];

    try {
      const result = await generateContentWithFallback({
        contents,
        systemInstruction,
        temperature: 0.3,
      });

      let cleaned = result.text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(cleaned);
      return res.json({
        ...parsed,
        modelUsed: result.usedModel,
        fallback: false,
      });
    } catch (err) {
      // Local fallback ordering
      const ordered = tasks.map((t: any, idx: number) => ({
        ...t,
        suggestedOrder: idx + 1,
        orderReason: t.priority === 'High' ? 'High priority' : 'Standard priority',
      }));
      return res.json({
        dependenciesFound: false,
        explanation: "Ordered by priority and registration order.",
        orderedTasks: ordered,
        modelUsed: "local-fallback",
        fallback: true,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to order tasks" });
  }
});

// Phase 1 — Journal Intelligence: Unfinished Thought Detection Engine
const UNRESOLVED_INDICATOR_PATTERNS = [
  { regex: /i need to think about\s+([^.?!;]+)/i, type: "consideration" },
  { regex: /not sure (?:whether|if|about)\s+([^.?!;]+)/i, type: "uncertainty" },
  { regex: /maybe i should\s+([^.?!;]+)/i, type: "hesitation" },
  { regex: /(?:still haven't|haven't yet) decided\s*([^.?!;]*)/i, type: "decision" },
  { regex: /want to explore (?:this|these)?\s*(?:more|further)/i, type: "exploration" },
  { regex: /(?:i'll|will) come back to this/i, type: "postponed" },
  { regex: /(?:don't|do not) know how to\s+([^.?!;]+)/i, type: "blocker" },
  { regex: /what should i do (?:about\s+)?([^.?!;]+)/i, type: "question" },
  { regex: /wondering (?:whether|if|how)\s+([^.?!;]+)/i, type: "wondering" },
  { regex: /torn between\s+([^.?!;]+)/i, type: "dilemma" },
  { regex: /weighing (?:between|whether|options)?\s*([^.?!;]+)/i, type: "weighing" },
  { regex: /haven't resolved\s+([^.?!;]+)/i, type: "unresolved" },
  { regex: /trying to figure out\s+([^.?!;]+)/i, type: "exploration" },
];

function generateLocalUnfinishedThreads(
  sessions: any[],
  dismissedIds: string[] = [],
  continuedIds: string[] = []
): any[] {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];

  // Sort newest first
  const sorted = [...sessions]
    .filter((s) => !s.isArchived)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const candidateThreads: any[] = [];
  const dismissedSet = new Set(dismissedIds);
  const continuedSet = new Set(continuedIds);

  for (const session of sorted.slice(0, 10)) {
    const threadId = `thread-${session.id}`;
    if (dismissedSet.has(threadId) || continuedSet.has(threadId)) {
      continue;
    }

    // Check if tasks exist and are ALL completed
    const structuredTasks = Array.isArray(session.structuredTasks) ? session.structuredTasks : [];
    if (structuredTasks.length > 0 && structuredTasks.every((t: any) => t.isCompleted)) {
      // Completed tasks should not be treated as unfinished thoughts
      continue;
    }

    const messages = Array.isArray(session.messages) ? session.messages : [];
    const userMessages = messages.filter((m: any) => m.role === "user");
    if (userMessages.length === 0) continue;

    // Scan user messages from the end backwards for genuine unresolved signals
    let detectedSignal: { match: string; patternType: string; fullSentence: string } | null = null;

    for (let i = userMessages.length - 1; i >= 0; i--) {
      const text = String(userMessages[i].content || "");
      const sentences = text.split(/(?<=[.?!])\s+/);

      for (const sentence of sentences) {
        for (const pat of UNRESOLVED_INDICATOR_PATTERNS) {
          const match = sentence.match(pat.regex);
          if (match) {
            detectedSignal = {
              match: match[1]?.trim() || match[0].trim(),
              patternType: pat.type,
              fullSentence: sentence.trim(),
            };
            break;
          }
        }
        if (detectedSignal) break;

        // Also check direct open questions asked by the user with interrogatives
        if (
          sentence.includes("?") &&
          (sentence.toLowerCase().startsWith("should i") ||
            sentence.toLowerCase().startsWith("how can i") ||
            sentence.toLowerCase().startsWith("what if") ||
            sentence.toLowerCase().startsWith("where do i"))
        ) {
          detectedSignal = {
            match: sentence.replace(/\?+$/, "").trim(),
            patternType: "question",
            fullSentence: sentence.trim(),
          };
          break;
        }
      }
      if (detectedSignal) break;
    }

    if (detectedSignal) {
      const rawTopic = session.title && session.title !== "New Reflection" 
        ? session.title 
        : detectedSignal.match.slice(0, 45);
      
      const topic = rawTopic.length > 50 ? `${rawTopic.slice(0, 47)}...` : rawTopic;
      const context = detectedSignal.fullSentence.slice(0, 160);
      const question = detectedSignal.match.length > 10 ? detectedSignal.match : detectedSignal.fullSentence;

      candidateThreads.push({
        id: threadId,
        sessionId: session.id,
        sessionTitle: session.title || "Personal Reflection",
        topic,
        lastMeaningfulContext: context,
        unresolvedQuestion: question,
        openingPrompt: `You were exploring ${topic}. Last time, you were considering "${context}", but hadn't reached a conclusion. Would you like to continue from there?`,
        suggestedStarterReply: `Continuing on ${topic}: I've been reflecting further on this...`,
        confidence: 0.86,
        lastInteractionTimestamp: session.updatedAt || session.createdAt,
        status: "active",
        detectedAt: new Date().toISOString(),
      });

      // We focus on the most relevant candidate(s)
      if (candidateThreads.length >= 2) break;
    }
  }

  return candidateThreads;
}

// Endpoint: Detect Unfinished Threads (Continue Where I Left Off)
app.post("/api/gemini/unfinished-threads", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { sessions = [], dismissedIds = [], continuedIds = [] } = body;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.json({ threads: [], modelUsed: "none", fallback: false });
    }

    // 1. Deterministic Heuristic Pre-Filter
    // Identify top candidate sessions that exhibit genuine unresolved signals
    const localCandidates = generateLocalUnfinishedThreads(sessions, dismissedIds, continuedIds);

    if (localCandidates.length === 0) {
      // No candidate sessions had unresolved signals
      return res.json({ threads: [], modelUsed: "deterministic-filter", fallback: false });
    }

    // 2. Prepare candidate data for Gemini AI synthesis
    const candidateSessionIds = new Set(localCandidates.map((c) => c.sessionId));
    const sessionsToSend = sessions
      .filter((s: any) => candidateSessionIds.has(s.id))
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        category: s.category,
        summary: s.summary,
        keyInsights: s.keyInsights,
        // Include only the last 3-4 user/model turns to keep token usage lean and avoid false memory
        recentMessages: (Array.isArray(s.messages) ? s.messages : [])
          .slice(-4)
          .map((m: any) => ({ role: m.role, content: m.content })),
        tasks: Array.isArray(s.structuredTasks)
          ? s.structuredTasks.map((t: any) => ({ text: t.text, isCompleted: t.isCompleted }))
          : [],
      }));

    const systemInstruction = `You are the Thought Memory engine for Personal Gemini Journal ("An AI journal that remembers how you think").
Your core philosophy is: Understand → Remember → Connect → Reflect → Develop → Act.

Your objective is to identify whether the user left a meaningful line of thought, question, idea, decision, or reflection genuinely UNFINISHED.

CRITICAL DIRECTIVES:
1. ZERO FALSE MEMORY: Strictly ground your analysis in the explicit statements in the provided session excerpts. NEVER hallucinate, assume, or invent previous thoughts or questions that are not present. If there is no clear unfinished thread, return an empty array {"threads": []}.
2. GENUINELY UNRESOLVED: Identify:
   - A question the user raised but never answered.
   - A decision they were weighing without reaching a conclusion.
   - A brainstorming idea that stopped midway.
   - A personal reflection that ended with uncertainty, hesitation, or "I need to think about...".
   - A problem or goal they were discussing but did not finish exploring.
3. EXCLUDE RESOLVED THOUGHTS & COMPLETED TASKS:
   - If the user settled a decision or reached a conclusion in the entry, do NOT surface it.
   - If all tasks in the session are completed, do NOT treat it as unfinished merely because it exists.
4. TONE & INVITATION FORMAT:
   - "openingPrompt": Write a concise, warm, empathetic invitation:
     "You were exploring whether you should pursue [topic]. Last time, you were considering [important context], but hadn't reached a conclusion. Would you like to continue from there?"
   - "suggestedStarterReply": A natural, conversational starter reply the user might say to continue.
5. CONFIDENCE: Assign a score from 0.0 to 1.0. ONLY return threads with confidence >= 0.75.
6. RANKING: Select only the single most relevant or at most 2 candidate threads.

Return strictly valid JSON format:
{
  "threads": [
    {
      "id": "thread-[sessionId]",
      "sessionId": "[sessionId]",
      "sessionTitle": "[session title]",
      "topic": "[concise 3-6 word topic]",
      "lastMeaningfulContext": "[the key consideration or hesitation]",
      "unresolvedQuestion": "[the exact unresolved question or dilemma]",
      "openingPrompt": "[contextual invitation]",
      "suggestedStarterReply": "[starter phrase]",
      "confidence": 0.88
    }
  ]
}`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `Analyze these ${sessionsToSend.length} candidate journal sessions for genuinely unfinished threads:\n\n${JSON.stringify(
              sessionsToSend,
              null,
              2
            )}`,
          },
        ],
      },
    ];

    try {
      const result = await generateContentWithFallback({
        contents,
        systemInstruction,
        temperature: 0.3,
      });

      let cleaned = result.text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(cleaned);
      const rawThreads = Array.isArray(parsed.threads) ? parsed.threads : [];
      
      // Filter out low confidence threads and ensure strict grounding
      const verifiedThreads = rawThreads
        .filter((t: any) => typeof t.confidence === "number" && t.confidence >= 0.75 && t.sessionId)
        .map((t: any) => ({
          ...t,
          status: "active",
          detectedAt: new Date().toISOString(),
          lastInteractionTimestamp:
            sessions.find((s: any) => s.id === t.sessionId)?.updatedAt || new Date().toISOString(),
        }));

      // If Gemini returned empty or all low confidence, fallback to the pre-filtered local candidate
      const finalThreads = verifiedThreads.length > 0 ? verifiedThreads : localCandidates.slice(0, 1);

      return res.json({
        threads: finalThreads,
        modelUsed: result.usedModel,
        fallback: verifiedThreads.length === 0,
      });
    } catch (err: any) {
      console.log("[Unfinished Threads] Engaging local fallback engine.");
      return res.json({
        threads: localCandidates.slice(0, 1),
        modelUsed: "local-fallback",
        fallback: true,
        notice: "Detected via local semantic thought memory.",
      });
    }
  } catch (error: any) {
    console.error("[Unfinished Threads Route] Error:", error);
    return res.json({ threads: [], modelUsed: "error-fallback", fallback: true });
  }
});

/**
 * Phase 1 Feature 2: Deterministic Mood + Context Correlation Analyzer
 * Grounds analysis strictly in real stored sessions without hallucination
 */
function analyzeLocalMoodCorrelations(sessions: any[]): {
  hasSufficientData: boolean;
  totalAnalyzedEntries: number;
  message?: string;
  correlations: any[];
  lastAnalyzed: string;
} {
  const now = new Date().toISOString();
  if (!Array.isArray(sessions) || sessions.length < 2) {
    return {
      hasSufficientData: false,
      totalAnalyzedEntries: Array.isArray(sessions) ? sessions.length : 0,
      message: "I don't have enough journal history to identify a meaningful pattern yet. Write at least two entries to uncover your personal patterns.",
      correlations: [],
      lastAnalyzed: now,
    };
  }

  // Filter valid sessions that contain content or title
  const validSessions = sessions.filter(
    (s: any) => s && s.id && (s.title || (Array.isArray(s.messages) && s.messages.length > 0) || s.summary)
  );

  if (validSessions.length < 2) {
    return {
      hasSufficientData: false,
      totalAnalyzedEntries: validSessions.length,
      message: "I don't have enough journal history to identify a meaningful pattern yet. Write at least two entries to uncover your personal patterns.",
      correlations: [],
      lastAnalyzed: now,
    };
  }

  // Helper to extract clean mood and valence
  const getSessionMoodInfo = (s: any) => {
    const rawMood = String(s.mood || s.sentiment || "").trim();
    const cleanMood = rawMood.replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim() || "Reflective";
    const lower = cleanMood.toLowerCase();

    let valence: "positive" | "challenging" | "contemplative" = "contemplative";
    if (
      lower.includes("calm") ||
      lower.includes("energized") ||
      lower.includes("optimistic") ||
      lower.includes("grateful") ||
      lower.includes("grounded") ||
      lower.includes("focused") ||
      lower.includes("happy") ||
      lower.includes("peace")
    ) {
      valence = "positive";
    } else if (
      lower.includes("challenge") ||
      lower.includes("overwhelmed") ||
      lower.includes("tired") ||
      lower.includes("anxious") ||
      lower.includes("stress") ||
      lower.includes("frustrat") ||
      lower.includes("exhaust")
    ) {
      valence = "challenging";
    }

    return { rawMood: s.mood || s.sentiment || "Reflective", cleanMood, valence };
  };

  const correlations: any[] = [];

  // Group 1: By Category
  const categoryMap = new Map<string, any[]>();
  for (const s of validSessions) {
    const cat = s.category || "Journal";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(s);
  }

  for (const [category, catSessions] of categoryMap.entries()) {
    // Strict Minimum Evidence: At least 2 sessions under this category
    if (catSessions.length >= 2) {
      const positiveCount = catSessions.filter((s) => getSessionMoodInfo(s).valence === "positive").length;
      const challengingCount = catSessions.filter((s) => getSessionMoodInfo(s).valence === "challenging").length;
      const total = catSessions.length;

      // Check for recurring pattern vs contradictory evidence
      let isAmbiguous = false;
      let observation = "";
      let associatedMood = "";
      let matchedSessions: any[] = [];

      if (positiveCount >= 2 && challengingCount >= 2) {
        // Contradictory evidence (Test 3)
        isAmbiguous = true;
        associatedMood = "Dynamic / Varied";
        observation = `Your entries suggest varied reflections around ${category.toLowerCase()}. While several days you noted feeling energized or calm, other entries describe feeling stretched or challenged.`;
        matchedSessions = catSessions;
      } else if (positiveCount >= 2 && positiveCount >= total * 0.5) {
        // Repeated positive pattern (Test 1)
        const sampleMood = catSessions.find((s) => getSessionMoodInfo(s).valence === "positive");
        associatedMood = sampleMood?.mood || "Focused & Energized";
        observation = `You've often described feeling more ${associatedMood.toLowerCase().replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim()} on days when you write about ${category.toLowerCase()}.`;
        matchedSessions = catSessions.filter((s) => getSessionMoodInfo(s).valence === "positive");
      } else if (challengingCount >= 2 && challengingCount >= total * 0.5) {
        // Recurring challenging / high-effort pattern
        associatedMood = "Challenging / Demanding";
        observation = `Several of your entries suggest moments of feeling stretched or navigating friction during periods focused on ${category.toLowerCase()}.`;
        matchedSessions = catSessions.filter((s) => getSessionMoodInfo(s).valence === "challenging");
      }

      if (observation && matchedSessions.length >= 2) {
        // Compute temporal span
        const dates = matchedSessions.map((s) => new Date(s.createdAt).getTime()).filter((t) => !isNaN(t));
        let timeSpan = "Observed across multiple entries";
        if (dates.length >= 2) {
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));
          const diffDays = Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 0) {
            timeSpan = `Observed on ${minDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
          } else if (diffDays < 7) {
            timeSpan = `Observed across ${diffDays + 1} days`;
          } else {
            const weeks = Math.max(1, Math.round(diffDays / 7));
            timeSpan = `Observed across ${weeks} week${weeks > 1 ? "s" : ""}`;
          }
        }

        correlations.push({
          id: `corr-cat-${category.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          headline: "A pattern I noticed",
          observation,
          cautiousTone: true,
          contextDimension: "category",
          contextValue: category,
          associatedMood,
          evidenceCount: matchedSessions.length,
          totalContextOccurrences: total,
          timeSpanDescription: timeSpan,
          ambiguityAcknowledged: isAmbiguous,
          ambiguityNote: isAmbiguous
            ? `Contains ${positiveCount} positive/focused entries and ${challengingCount} entries describing friction.`
            : undefined,
          evidence: matchedSessions.slice(0, 5).map((s) => ({
            sessionId: s.id,
            sessionTitle: s.title || `${category} Entry`,
            date: s.createdAt,
            mood: s.mood || s.sentiment || "Reflective",
            sentiment: s.sentiment || s.mood,
            contextSnippet: (s.summary || s.messages?.[0]?.content || "Journal reflection recorded.").slice(0, 160),
            category: s.category || category,
          })),
          detectedAt: now,
        });
      }
    }
  }

  // Group 2: Temporal Consistency (Journaling streak / frequency pattern)
  if (validSessions.length >= 3) {
    const sorted = [...validSessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    // Check if recent entries have consistent positive/calm sentiment
    const recentPositive = sorted.filter((s) => getSessionMoodInfo(s).valence === "positive");
    if (recentPositive.length >= 3 && !correlations.some((c) => c.contextDimension === "routine")) {
      const dates = recentPositive.map((s) => new Date(s.createdAt).getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const diffDays = Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

      correlations.push({
        id: "corr-routine-consistency",
        headline: "A rhythm I noticed",
        observation: "Your mood entries have generally reflected a more grounded, steady state during periods when you've been consistently journaling.",
        cautiousTone: true,
        contextDimension: "routine",
        contextValue: "Consistent Reflection",
        associatedMood: "Calm / Grounded",
        evidenceCount: recentPositive.length,
        totalContextOccurrences: sorted.length,
        timeSpanDescription: diffDays > 0 ? `Spanning ${diffDays} days of journaling` : "Across recent sessions",
        ambiguityAcknowledged: false,
        evidence: recentPositive.slice(0, 5).map((s) => ({
          sessionId: s.id,
          sessionTitle: s.title || "Journal Entry",
          date: s.createdAt,
          mood: s.mood || s.sentiment || "Calm",
          sentiment: s.sentiment || s.mood,
          contextSnippet: (s.summary || s.messages?.[0]?.content || "Consistent reflection.").slice(0, 160),
          category: s.category,
        })),
        detectedAt: now,
      });
    }
  }

  if (correlations.length === 0) {
    return {
      hasSufficientData: false,
      totalAnalyzedEntries: validSessions.length,
      message: "I don't have enough journal history to identify a meaningful pattern yet. Continue writing reflections with moods to uncover your personal patterns.",
      correlations: [],
      lastAnalyzed: now,
    };
  }

  return {
    hasSufficientData: true,
    totalAnalyzedEntries: validSessions.length,
    correlations: correlations.slice(0, 3), // Return top 3 verified correlations
    lastAnalyzed: now,
  };
}

// Phase 1 Feature 2: Mood + Context Correlation Route
app.post("/api/gemini/mood-correlations", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { sessions = [] } = body;

    if (!Array.isArray(sessions) || sessions.length < 2) {
      return res.json({
        hasSufficientData: false,
        totalAnalyzedEntries: Array.isArray(sessions) ? sessions.length : 0,
        message: "I don't have enough journal history to identify a meaningful pattern yet.",
        correlations: [],
        lastAnalyzed: new Date().toISOString(),
        modelUsed: "deterministic-filter",
        fallback: false,
      });
    }

    // Run deterministic analysis first to ensure zero false memory & grounded evidence
    const localReport = analyzeLocalMoodCorrelations(sessions);
    if (!localReport.hasSufficientData || localReport.correlations.length === 0) {
      return res.json({
        ...localReport,
        modelUsed: "deterministic-filter",
        fallback: false,
      });
    }

    // Prepare session summary data for Gemini synthesis
    const candidateData = sessions.slice(0, 20).map((s: any) => ({
      id: s.id,
      title: s.title,
      date: s.createdAt,
      category: s.category || "Journal",
      mood: s.mood || s.sentiment || "Reflective",
      sentiment: s.sentiment || s.mood,
      summary: (s.summary || s.messages?.[0]?.content || "").slice(0, 200),
      tags: s.tags || [],
    }));

    const systemInstruction = `You are the Mood & Context Correlation Intelligence engine for Personal Gemini Journal ("An AI journal that remembers how you think").
Your core philosophy is: Understand → Remember → Connect → Reflect → Develop → Act.

Your objective is to identify meaningful, recurring patterns between the user's mood, journal context, time, and activities/thoughts.

CRITICAL DIRECTIVES:
1. ZERO FABRICATION: Every correlation MUST be strictly grounded in the provided session data. NEVER invent activities, events, emotions, causes, dates, or session IDs. If there is insufficient evidence for a category or topic, DO NOT generate an insight.
2. NO CAUSALITY CLAIMS: Correlation is NOT causation. NEVER claim that an activity or topic causes a mood (e.g., NEVER say "Working on projects makes you happy" or "Studying causes stress").
   ALWAYS use cautious, reflective language such as:
   - "appears to"
   - "you seem to"
   - "there's a pattern of"
   - "your entries suggest"
   - "you've often described"
3. NO MEDICAL OR PSYCHOLOGICAL DIAGNOSIS: Do NOT diagnose anxiety, depression, burnout, or psychological conditions. Frame observations purely as reflective journal rhythms.
4. MINIMUM EVIDENCE THRESHOLD:
   - A pattern MUST have at least 2 distinct supporting entries with corroborated mood.
   - Never generate a correlation from 1 isolated entry.
5. CONTRADICTORY EVIDENCE:
   - If a topic or category has mixed moods (e.g., some days positive, other days stressful), do NOT force a positive conclusion. Explicitly acknowledge the ambiguity: "Your entries show varied feelings around [topic]...". Set "ambiguityAcknowledged": true.
6. GROUNDED EVIDENCE ITEMS:
   - Include the exact "sessionId", "sessionTitle", "date", and "mood" of each supporting entry from the input.

Return strictly valid JSON format:
{
  "hasSufficientData": true,
  "correlations": [
    {
      "id": "corr-[slug]",
      "headline": "A pattern I noticed",
      "observation": "You've often described feeling more focused on days when you write about your project work.",
      "cautiousTone": true,
      "contextDimension": "category | topic | activity | time | routine",
      "contextValue": "Projects",
      "associatedMood": "Focused / Energized",
      "evidenceCount": 4,
      "totalContextOccurrences": 5,
      "timeSpanDescription": "Observed across 3 weeks",
      "ambiguityAcknowledged": false,
      "ambiguityNote": null,
      "evidence": [
        {
          "sessionId": "session-123",
          "sessionTitle": "Refactoring Core Engine",
          "date": "2026-08-20T10:00:00.000Z",
          "mood": "Energized",
          "contextSnippet": "Worked on the engine architecture and felt steady progress."
        }
      ]
    }
  ]
}`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `Analyze these journal sessions for grounded mood and context correlations:\n\n${JSON.stringify(
              candidateData,
              null,
              2
            )}`,
          },
        ],
      },
    ];

    try {
      const result = await generateContentWithFallback({
        contents,
        systemInstruction,
        temperature: 0.3,
      });

      let cleaned = result.text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(cleaned);
      const rawCorrelations = Array.isArray(parsed.correlations) ? parsed.correlations : [];

      // Validate every correlation to guarantee zero hallucinated sessions & minimum 2 evidence items
      const validSessionIds = new Set(sessions.map((s: any) => s.id));
      const verifiedCorrelations = rawCorrelations
        .map((corr: any) => {
          const validEvidence = (Array.isArray(corr.evidence) ? corr.evidence : []).filter(
            (ev: any) => ev && ev.sessionId && validSessionIds.has(ev.sessionId)
          );
          return {
            ...corr,
            evidence: validEvidence,
            evidenceCount: validEvidence.length,
            cautiousTone: true,
            detectedAt: new Date().toISOString(),
          };
        })
        .filter((corr: any) => corr.evidenceCount >= 2);

      if (verifiedCorrelations.length === 0) {
        return res.json({
          ...localReport,
          modelUsed: result.usedModel,
          fallback: false,
        });
      }

      return res.json({
        hasSufficientData: true,
        totalAnalyzedEntries: sessions.length,
        correlations: verifiedCorrelations.slice(0, 3),
        lastAnalyzed: new Date().toISOString(),
        modelUsed: result.usedModel,
        fallback: false,
      });
    } catch (aiErr: any) {
      console.log("[Mood Correlations] Gemini unavailable. Using verified deterministic engine.");
      return res.json({
        ...localReport,
        modelUsed: "local-deterministic-engine",
        fallback: true,
        notice: "Correlations synthesized via local reflective intelligence.",
      });
    }
  } catch (error: any) {
    console.error("[Mood Correlations Route] Error:", error);
    return res.json({
      hasSufficientData: false,
      totalAnalyzedEntries: 0,
      message: "I don't have enough journal history to identify a meaningful pattern yet.",
      correlations: [],
      lastAnalyzed: new Date().toISOString(),
      modelUsed: "error-fallback",
      fallback: true,
    });
  }
});

// =========================================================================
// Phase 1 Feature 3: Goals & Planning Intelligence Endpoints
// =========================================================================

// Helper: Local deterministic goal recognizer from journal text
function detectGoalIntentionLocally(text: string): {
  hasPotentialGoal: boolean;
  suggestedGoal?: {
    title: string;
    intention: string;
    motivation?: string;
    targetDate?: string;
    suggestedMilestones: string[];
    originSnippet: string;
  };
} {
  if (!text || text.trim().length < 20) {
    return { hasPotentialGoal: false };
  }

  const sentences = text.split(/(?<=[.?!])\s+/);
  const intentionPatterns = [
    /(?:i\s+(?:really\s+)?want\s+to|i'd\s+love\s+to|i've\s+been\s+thinking\s+(?:about|that\s+i\s+want\s+to)|my\s+goal\s+is\s+to|i\s+aim\s+to|i\s+need\s+to\s+build|i'm\s+working\s+toward|i\s+plan\s+to)\s+([^.?!,;]+)/i,
    /(?:i\s+want\s+to\s+become\s+(?:better\s+at|comfortable\s+with))\s+([^.?!,;]+)/i,
  ];

  for (const sentence of sentences) {
    for (const pattern of intentionPatterns) {
      const match = sentence.match(pattern);
      if (match && match[1]) {
        let coreAction = match[1].trim();
        coreAction = coreAction.replace(/\s+(?:because|so\s+that|since|and\s+then|although).*/i, '');
        
        const title = coreAction.charAt(0).toUpperCase() + coreAction.slice(1);
        if (title.length >= 8 && title.length <= 80) {
          let targetDate: string | undefined = undefined;
          const dateMatch = sentence.match(/(?:by|before|in)\s+(january|february|march|april|may|june|july|august|september|october|november|december|\d{4}|next\s+month|the\s+end\s+of\s+the\s+year)/i);
          if (dateMatch) {
            targetDate = dateMatch[0];
          }

          return {
            hasPotentialGoal: true,
            suggestedGoal: {
              title,
              intention: sentence.trim(),
              motivation: sentence.includes('because') ? sentence.split(/because/i)[1]?.trim() : undefined,
              targetDate,
              suggestedMilestones: [
                `Establish foundational plan for ${title.toLowerCase()}`,
                `Build core practice and initial progress`,
                `Refine approach and resolve key bottlenecks`,
                `Achieve primary outcome and reflect on lessons`
              ],
              originSnippet: sentence.trim(),
            }
          };
        }
      }
    }
  }

  return { hasPotentialGoal: false };
}

// Helper: Local deterministic milestone generator
function generateLocalMilestones(title: string, intention: string): {
  milestones: { title: string; description: string }[];
  suggestedActions: { milestoneTitle: string; text: string; priority: 'High' | 'Medium' | 'Low' }[];
} {
  const cleanTitle = title.replace(/[^\w\s]/g, '').trim();
  return {
    milestones: [
      {
        title: `Clarify requirements & core scope for ${cleanTitle}`,
        description: `Define what success looks like and document the essential boundary of the goal.`
      },
      {
        title: `Establish foundational groundwork & resources`,
        description: `Set up the fundamental tools, initial learning, or core setup.`
      },
      {
        title: `Build and iterate on core execution`,
        description: `Engage in focused regular progress on the primary deliverables.`
      },
      {
        title: `Review progress, test, and resolve obstacles`,
        description: `Reflect on friction points in your journal and refine the execution.`
      },
      {
        title: `Finalize outcome and complete closure reflection`,
        description: `Reach completion and capture what you learned in your personal journal.`
      }
    ],
    suggestedActions: [
      {
        milestoneTitle: `Clarify requirements & core scope for ${cleanTitle}`,
        text: `Write down 3 concrete criteria for what finishing this goal means.`,
        priority: 'High'
      },
      {
        milestoneTitle: `Establish foundational groundwork & resources`,
        text: `Dedicate 30 minutes to gather initial materials and set up environment.`,
        priority: 'Medium'
      }
    ]
  };
}

// Route 1: Suggest Goal from Journal Entry
app.post("/api/gemini/goals/suggest-from-journal", async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { text, sessionTitle } = body;
    const combinedText = `${sessionTitle || ''} ${text || ''}`.trim();

    if (!combinedText || combinedText.length < 15) {
      return res.json({ hasPotentialGoal: false });
    }

    const localSuggestion = detectGoalIntentionLocally(combinedText);

    try {
      const systemInstruction = `You are Personal Gemini Journal's Goal Recognition Assistant.
The product philosophy is: Understand -> Remember -> Connect -> Reflect -> Develop -> Act.
A goal is a meaningful outcome the user expresses wanting to achieve (e.g. "I want to become comfortable with machine learning", "I want to improve my public speaking", "I want to build my personal finance app").
CRITICAL RULES:
1. Do NOT turn casual or momentary reflections into goals. Only recognize clear, expressed intentions to work toward an outcome.
2. Be conservative: if the user did NOT express a genuine goal intention, return {"hasPotentialGoal": false}.
3. Never invent dates. Only populate "targetDate" if the user explicitly provided one in the text.
4. Output JSON format ONLY:
{
  "hasPotentialGoal": true,
  "confidence": 0.85,
  "reasoning": "User expressed a sustained desire to...",
  "suggestedGoal": {
    "title": "Short meaningful title (e.g. Improve My Public Speaking)",
    "intention": "Concise summary of what they want to achieve",
    "motivation": "Why they care based strictly on their words (or null if unmentioned)",
    "targetDate": "Explicit date mentioned or null",
    "suggestedMilestones": ["Milestone 1", "Milestone 2", "Milestone 3"],
    "originSnippet": "Exact quote from journal"
  }
}`;

      const prompt = `Analyze this journal entry text for a meaningful goal intention:\n\n"${combinedText.slice(0, 1500)}"`;
      const result = await generateContentWithFallback({
        contents: prompt,
        systemInstruction,
        temperature: 0.2
      });

      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && typeof parsed.hasPotentialGoal === 'boolean') {
          return res.json({
            ...parsed,
            modelUsed: result.usedModel,
            fallback: false
          });
        }
      }

      return res.json(localSuggestion);
    } catch (aiErr) {
      console.log("[Goal Suggest] AI unavailable, returning local intention detection.");
      return res.json({
        ...localSuggestion,
        modelUsed: "local-detector",
        fallback: true
      });
    }
  } catch (error: any) {
    console.error("[Goal Suggest Error]:", error);
    return res.json({ hasPotentialGoal: false });
  }
});

// Route 2: Goal -> Milestones & Action Engine Suggestions
app.post("/api/gemini/goals/breakdown", async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { title, intention, motivation, targetDate } = body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: "Goal title is required" });
    }

    const localBreakdown = generateLocalMilestones(title, intention || "");

    try {
      const systemInstruction = `You are Personal Gemini Journal's Goal & Milestone Planning Assistant.
The product philosophy is: Goal -> Meaning -> Thoughts -> Milestones -> Actions -> Progress -> Reflection.
The application already has an Action Engine and task dependency system.
CRITICAL RULES:
1. Break the goal into 3 to 6 meaningful major MILESTONES (major stages of progress, NOT dozens of tiny micro-tasks).
2. Distinguish: Goal (meaningful outcome) -> Milestone (major stage) -> Action (concrete thing the user can do).
3. Suggest 2 to 4 starter concrete ACTIONS that feed directly into the existing Action Engine.
4. If targetDate was not provided by user, do not invent dates.
5. Output JSON format ONLY:
{
  "milestones": [
    { "title": "Meaningful stage title", "description": "Short explanation of this stage" }
  ],
  "suggestedActions": [
    { "milestoneTitle": "Matching milestone stage title", "text": "Concrete actionable item", "priority": "High" | "Medium" | "Low" }
  ]
}`;

      const prompt = `Goal: "${title}"
Intention / Context: "${intention || 'Not specified'}"
Motivation / Why User Cares: "${motivation || 'Not specified'}"
Target Date: "${targetDate || 'None provided'}"

Suggest meaningful milestones (3 to 6 stages) and starter actions for the Action Engine:`;

      const result = await generateContentWithFallback({
        contents: prompt,
        systemInstruction,
        temperature: 0.3
      });

      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
          return res.json({
            milestones: parsed.milestones.slice(0, 6),
            suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions.slice(0, 6) : [],
            modelUsed: result.usedModel,
            fallback: false
          });
        }
      }

      return res.json(localBreakdown);
    } catch (aiErr) {
      console.log("[Goal Breakdown] AI unavailable, returning deterministic milestones.");
      return res.json({
        ...localBreakdown,
        modelUsed: "local-planner",
        fallback: true
      });
    }
  } catch (error: any) {
    console.error("[Goal Breakdown Error]:", error);
    return res.status(500).json({ error: "Could not generate goal breakdown" });
  }
});

// Route 3: Goal <-> Journal Connection (Connecting reflections to active goals)
app.post("/api/gemini/goals/connect-journal", async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { goals, session } = body;

    if (!Array.isArray(goals) || goals.length === 0 || !session) {
      return res.json({ connections: [] });
    }

    // Local keyword and semantic correlation first
    const sessionText = `${session.title || ''} ${session.summary || ''} ${(session.messages || []).map((m: any) => m.content).join(' ')}`.toLowerCase();
    const localConnections: any[] = [];

    for (const g of goals) {
      const goalWords = g.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      const hasKeywordMatch = goalWords.some((w: string) => sessionText.includes(w));

      if (hasKeywordMatch) {
        let connectionType = 'reflection';
        if (sessionText.includes('frustrat') || sessionText.includes('stuck') || sessionText.includes('block') || sessionText.includes('difficult')) {
          connectionType = 'obstacle';
        } else if (sessionText.includes('finish') || sessionText.includes('complete') || sessionText.includes('done') || sessionText.includes('progress')) {
          connectionType = 'progress';
        }

        localConnections.push({
          goalId: g.id,
          goalTitle: g.title,
          connectionType,
          snippet: (session.summary || session.title || sessionText.slice(0, 120)),
          explanation: `Your journal entry touches on themes related to "${g.title}".`
        });
      }
    }

    try {
      const systemInstruction = `You are Personal Gemini Journal's Goal Reflection Connector.
The user keeps a personal journal. Your task is to identify if the current journal session reflects upon, records obstacles for, celebrates progress on, or rethinks any of the user's active goals.
CRITICAL RULES:
1. Grounding: Only return a connection if there is an authentic semantic connection between the journal entry and the goal. Do NOT force connections.
2. Connection types: "reflection" | "obstacle" | "progress" | "evolution".
3. Output JSON format ONLY:
{
  "connections": [
    {
      "goalId": "goal-id",
      "connectionType": "reflection" | "obstacle" | "progress" | "evolution",
      "snippet": "Relevant phrase or sentence from journal",
      "explanation": "Brief non-causal reason for connection"
    }
  ]
}`;

      const prompt = `Active Goals:
${goals.map((g: any) => `- ID: ${g.id}, Title: "${g.title}", Intention: "${g.intention || ''}"`).join('\n')}

Journal Entry:
Title: "${session.title || ''}"
Summary: "${session.summary || ''}"
Content Snippet: "${sessionText.slice(0, 800)}"

Identify authentic connections (or empty list if none):`;

      const result = await generateContentWithFallback({
        contents: prompt,
        systemInstruction,
        temperature: 0.2
      });

      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && Array.isArray(parsed.connections)) {
          const validGoalIds = new Set(goals.map((g: any) => g.id));
          const verified = parsed.connections.filter((c: any) => validGoalIds.has(c.goalId));
          return res.json({
            connections: verified,
            modelUsed: result.usedModel,
            fallback: false
          });
        }
      }

      return res.json({ connections: localConnections });
    } catch (aiErr) {
      return res.json({
        connections: localConnections,
        modelUsed: "local-matcher",
        fallback: true
      });
    }
  } catch (error: any) {
    console.error("[Goal Connect Journal Error]:", error);
    return res.json({ connections: [] });
  }
});

// Route 4: Generate Dashboard Goals (Long-Term or Short-Term) from user's journal entries
app.post("/api/gemini/goals/generate-dashboard-goals", async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { sessions = [], timeframe = 'long_term' } = body;
    const isLongTerm = timeframe === 'long_term';

    // Prepare journal context
    const recentSnippets = Array.isArray(sessions)
      ? sessions.slice(0, 10).map((s: any) => {
          const text = s.summary || (Array.isArray(s.messages) ? s.messages.map((m: any) => m.content).join(' ') : '');
          return `[${s.title || 'Entry'} (${s.category || 'Journal'})]: ${text.slice(0, 300)}`;
        }).join('\n')
      : '';

    const fallbackGoals = isLongTerm ? [
      {
        id: `goal_lt_${Date.now()}_1`,
        title: "Master AI Engineering & Intuitive Systems",
        intention: "Deepen end-to-end expertise in full-stack architecture and intelligent agent workflows",
        motivation: "Build thoughtful, impactful software with resilient UX and high craftsmanship",
        timeframe: 'long_term',
        milestones: [
          { id: `ms_1`, title: "Design resilient fallback models and offline-first state", isCompleted: true, status: 'completed', order: 1 },
          { id: `ms_2`, title: "Architect distributed thread memory & mind garden graphs", isCompleted: false, status: 'pending', order: 2 },
          { id: `ms_3`, title: "Publish open technical documentation and showcase", isCompleted: false, status: 'pending', order: 3 },
        ]
      },
      {
        id: `goal_lt_${Date.now()}_2`,
        title: "Cultivate Sustained Creative & Physical Vitality",
        intention: "Establish daily mindful journaling and balanced weekly recovery rhythms",
        motivation: "Sustain clarity of mind, emotional resilience, and deep presence",
        timeframe: 'long_term',
        milestones: [
          { id: `ms_4`, title: "Maintain 30-day journaling reflection habit", isCompleted: false, status: 'pending', order: 1 },
          { id: `ms_5`, title: "Incorporate outdoor movement and screen-free evenings", isCompleted: false, status: 'pending', order: 2 },
        ]
      }
    ] : [
      {
        id: `goal_st_${Date.now()}_1`,
        title: "Weekly Reflection Retrospective",
        intention: "Review core ideas brainstormed this week and extract 3 actionable priorities",
        motivation: "Keep thoughts organized and convert ideas into momentum",
        timeframe: 'short_term',
        milestones: [
          { id: `ms_s1`, title: "Review latest brainstorm cards and notes", isCompleted: true, status: 'completed', order: 1 },
          { id: `ms_s2`, title: "Select top project sprint for the coming week", isCompleted: false, status: 'pending', order: 2 },
        ]
      },
      {
        id: `goal_st_${Date.now()}_2`,
        title: "Draft Distraction-Free Thought Log",
        intention: "Spend 20 minutes writing a pure unguided journal entry without interruptions",
        motivation: "Clear mental noise and discover unarticulated insights",
        timeframe: 'short_term',
        milestones: [
          { id: `ms_s3`, title: "Complete 1 pure journal session without live chat", isCompleted: false, status: 'pending', order: 1 },
        ]
      }
    ];

    if (!recentSnippets || recentSnippets.length < 30) {
      return res.json({ goals: fallbackGoals, source: 'curated' });
    }

    try {
      const systemInstruction = `You are Personal Gemini Journal's Goal Synthesis Assistant.
Your task is to analyze the user's recent journal reflections and generate 2 to 3 tailored ${isLongTerm ? 'LONG-TERM aspirational goals' : 'SHORT-TERM sprint goals / near-term milestones'}.
Philosophy:
- Long-term goals: Strategic horizons (multi-month, core life pillars, mastery, creative projects, wellbeing).
- Short-term goals: Immediate weekly/bi-weekly actionable milestones, habits, or discrete tasks.
- Keep titles inspiring, clear, and realistic based strictly on what the user thinks and writes about.
Output JSON format ONLY:
{
  "goals": [
    {
      "id": "goal_${isLongTerm ? 'lt' : 'st'}_generated_1",
      "title": "Clear concise goal title",
      "intention": "What they are aiming to achieve",
      "motivation": "Why it matters based on their reflections",
      "timeframe": "${isLongTerm ? 'long_term' : 'short_term'}",
      "milestones": [
        { "id": "ms_g1", "title": "Milestone title 1", "isCompleted": false, "status": "pending", "order": 1 },
        { "id": "ms_g2", "title": "Milestone title 2", "isCompleted": false, "status": "pending", "order": 2 }
      ]
    }
  ]
}`;

      const prompt = `User's recent journal entries:\n${recentSnippets}\n\nGenerate realistic ${isLongTerm ? 'long-term goals' : 'short-term sprint goals'} derived from these reflections.`;
      const result = await generateContentWithFallback({
        contents: prompt,
        systemInstruction,
      });

      let parsed = JSON.parse(result.text.trim());
      if (Array.isArray(parsed.goals) && parsed.goals.length > 0) {
        return res.json({ goals: parsed.goals, source: 'gemini', modelUsed: result.usedModel });
      }
    } catch (aiErr) {
      console.warn("[Dashboard Goals AI Error]:", aiErr);
    }

    return res.json({ goals: fallbackGoals, source: 'fallback' });
  } catch (error: any) {
    console.error("[Generate Dashboard Goals Error]:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * Vision Board AI Endpoint: Synthesizes and manifests visual aspirations
 * Enriches user prompt into vivid scenes, affirmations, themes, and curated imagery
 */
app.post("/api/gemini/generate-vision", async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const rawPrompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';

    if (!rawPrompt || rawPrompt.length < 2) {
      return res.status(400).json({
        error: "Please provide a vision prompt describing what you want to visualize or manifest.",
      });
    }

    // Curated high-aesthetic photo collection mapped by theme
    const THEME_IMAGE_MAP: Record<string, string[]> = {
      nature: [
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1200&q=80",
      ],
      mountain: [
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80",
      ],
      cozy: [
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80",
      ],
      ocean: [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1200&q=80",
      ],
      career: [
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
      ],
      creativity: [
        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80",
      ],
      travel: [
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=80",
      ],
      wellness: [
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1508672019048-805b876b67e2?auto=format&fit=crop&w=1200&q=80",
      ]
    };

    let title = rawPrompt.slice(0, 40);
    let vividScene = rawPrompt;
    let category = "Vision & Manifestation";
    let affirmation = "I am stepping toward this reality with clear intention.";
    let themeKey = "nature";
    let modelUsed = "fallback";

    try {
      const systemInstruction = `You are an AI Vision & Manifestation Muse for a reflective journal app.
The user provides a description of an aspiration, future moment, life vision, or aesthetic goal.
Analyze their prompt and generate:
1. "title": A short, poetic, evocative title (max 6 words).
2. "vividScene": A sensory, beautifully written 2-sentence depiction of this moment in the present tense.
3. "category": One of "Nature & Solitude", "Creative Craft", "Career & Purpose", "Travel & Adventure", "Health & Vitality", "Cozy Home", or "Mindfulness".
4. "affirmation": An inspiring, grounding affirmation written in the first person ("I am...", "My life is...").
5. "themeKey": One exact string from: ["nature", "mountain", "cozy", "ocean", "career", "creativity", "travel", "wellness"].

Respond strictly in JSON:
{
  "title": "Sunrise Over High Peaks",
  "vividScene": "Crisp alpine breeze rustles through ancient pine needles as golden sunlight floods the valley. You stand at the precipice with absolute clarity of direction.",
  "category": "Nature & Solitude",
  "affirmation": "I embrace wide open horizons and trust the pace of my journey.",
  "themeKey": "mountain"
}`;

      const aiResponse = await generateContentWithFallback({
        contents: `User Vision Prompt:\n"${rawPrompt}"`,
        systemInstruction,
        temperature: 0.7,
      });

      modelUsed = aiResponse.usedModel;
      const cleanJson = aiResponse.text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(cleanJson);

      if (parsed.title) title = String(parsed.title).trim();
      if (parsed.vividScene) vividScene = String(parsed.vividScene).trim();
      if (parsed.category) category = String(parsed.category).trim();
      if (parsed.affirmation) affirmation = String(parsed.affirmation).trim();
      if (parsed.themeKey && THEME_IMAGE_MAP[parsed.themeKey]) {
        themeKey = parsed.themeKey;
      }
    } catch (aiErr) {
      console.warn("[Vision Synthesis AI Warning]:", aiErr);
      // Determine theme keyword from words in prompt
      const lower = rawPrompt.toLowerCase();
      if (lower.includes('mountain') || lower.includes('peak') || lower.includes('hike') || lower.includes('climb')) themeKey = 'mountain';
      else if (lower.includes('sea') || lower.includes('ocean') || lower.includes('beach') || lower.includes('wave')) themeKey = 'ocean';
      else if (lower.includes('book') || lower.includes('coffee') || lower.includes('cabin') || lower.includes('cozy') || lower.includes('home')) themeKey = 'cozy';
      else if (lower.includes('work') || lower.includes('startup') || lower.includes('job') || lower.includes('company') || lower.includes('build')) themeKey = 'career';
      else if (lower.includes('art') || lower.includes('paint') || lower.includes('write') || lower.includes('design')) themeKey = 'creativity';
      else if (lower.includes('travel') || lower.includes('flight') || lower.includes('japan') || lower.includes('paris') || lower.includes('explore')) themeKey = 'travel';
      else if (lower.includes('health') || lower.includes('yoga') || lower.includes('peace') || lower.includes('mind') || lower.includes('meditat')) themeKey = 'wellness';
    }

    const availableImages = THEME_IMAGE_MAP[themeKey] || THEME_IMAGE_MAP.nature;
    // Deterministic selection based on prompt string hash
    let hash = 0;
    for (let i = 0; i < rawPrompt.length; i++) {
      hash = (hash << 5) - hash + rawPrompt.charCodeAt(i);
      hash |= 0;
    }
    const selectedIndex = Math.abs(hash) % availableImages.length;
    const imageUrl = availableImages[selectedIndex];

    return res.json({
      imageUrl,
      title,
      prompt: rawPrompt,
      vividScene,
      category,
      affirmation,
      themeKey,
      modelUsed,
    });
  } catch (error: any) {
    console.error("[Generate Vision Error]:", error);
    return res.status(500).json({ error: error.message || "Failed to generate vision visual." });
  }
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Gemini Reflection Journal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
