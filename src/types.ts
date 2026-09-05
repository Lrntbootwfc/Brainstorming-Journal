export type MessageRole = 'user' | 'model';

export type JournalCategory = 'Brainstorm' | 'Journal' | 'Reflective' | 'General' | 'Books' | 'Movies' | 'Study' | 'Projects';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string; // ISO string
  modelUsed?: string;
  category?: JournalCategory;
}

export type ReflectionSentiment = 
  | 'Calm'
  | 'Reflective'
  | 'Optimistic'
  | 'Challenging'
  | 'Energized'
  | 'Grounded'
  | 'Contemplative';

export type JourneyThemePreset = 
  | 'journey-teal' 
  | 'sunset-amber' 
  | 'alpine-forest' 
  | 'midnight-voyage' 
  | 'classic-parchment';

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'pending' | 'completed';
export type TaskDependencyType = 'depends_on' | 'prerequisite' | 'follows';

export interface ActionItem {
  id: string;
  text: string;
  sourceEntryId?: string;
  sessionId?: string;
  sessionTitle?: string;
  priority: TaskPriority;
  deadline?: string; // Optional: only set if explicitly or reasonably inferred from the journal
  status: TaskStatus;
  isCompleted: boolean;
  createdAt: string;

  // Phase 3: Dependencies & suggested ordering
  dependsOn?: string[]; // IDs of tasks this task depends on (prerequisites)
  prerequisiteFor?: string[]; // IDs of tasks that depend on this
  relationshipType?: TaskDependencyType;
  suggestedOrder?: number;
  orderReason?: string; // Explainable: why this task is ordered here
  subtasks?: { id: string; text: string; isCompleted?: boolean; deadline?: string }[];
  isManual?: boolean; // Whether task was manually added by user

  // Goals & Planning connection
  goalId?: string;
  milestoneId?: string;
}

export interface TaskDependencyRule {
  taskId: string;
  dependsOnId: string;
  relationshipType: TaskDependencyType;
  reason: string;
}

export interface TaskOrderingPlan {
  orderedTasks: ActionItem[];
  explanation: string;
  dependenciesFound: boolean;
}

export interface JournalSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  category?: JournalCategory;
  messages: ChatMessage[];
  mood?: string;
  tags?: string[];
  summary?: string;
  keyInsights?: string[];
  sentiment?: ReflectionSentiment | string;
  actionItems?: string[]; // Legacy string list
  structuredTasks?: ActionItem[]; // Structured tasks for Thought -> Action Engine
  isArchived?: boolean;
  location?: string;
  weather?: string;
  weatherTemp?: string;
  imageUrl?: string;
  isStarred?: boolean;
  withoutAI?: boolean; // When true, writer uses distraction-free journaling without live conversational turns; AI summary generated on save
  folderId?: string; // Optional custom folder ID
  
  // Expanded specialized tracking fields
  mediaRating?: number; // 1-5 for books/movies
  mediaAuthorDirector?: string;
  mediaStatus?: 'Want to Consume' | 'In Progress' | 'Completed';
  projectMilestone?: string;
  studyTopic?: string;
}

export interface PromptInspiration {
  id: string;
  title: string;
  category: 'Mindfulness' | 'Productivity' | 'Gratitude' | 'Problem-Solving' | 'Creativity' | 'Books' | 'Movies' | 'Study' | 'Projects';
  prompt: string;
  description: string;
}

export interface UserStats {
  totalSessions: number;
  totalReflections: number;
  activeStreakDays: number;
  lastActiveDate: string;
}

export type ActiveView = 'landing' | 'dashboard' | 'editor';
export type DashboardNavTab = 'timeline' | 'goals' | 'calendar' | 'evolution' | 'actions' | 'garden' | 'media' | 'atlas' | 'coach' | 'vision';
export type FilterCategory = 'All Entries' | 'Brainstorm' | 'Journal' | 'Reflective' | 'Books' | 'Movies' | 'Study' | 'Projects' | 'Select from list';

export interface PaperThemePreference {
  themePreset: JourneyThemePreset;
  paperTone: 'cream' | 'parchment' | 'kraft' | 'moleskine' | 'journey-clean';
  ruling: 'ruled' | 'grid' | 'blank';
  inkStyle: 'charcoal' | 'espresso' | 'navy' | 'teal';
  darkMode?: boolean;
}

// Stages aligned with Batch 1 trajectory: Original Thought -> Exploration -> Refinement -> New Direction -> Outcome
export type EvolutionStage = 
  | 'Original Thought'
  | 'Exploration' 
  | 'Refinement' 
  | 'New Direction'
  | 'Outcome'
  | 'Seed Idea' 
  | 'Action / Breakthrough';

export type ThoughtRelationshipType =
  | 'related'
  | 'evolved_from'
  | 'refined_from'
  | 'expands'
  | 'leads_to'
  | 'diverges_from'
  // Legacy types preserved for backward compatibility
  | 'evolution'
  | 'thematic'
  | 'breakthrough'
  | 'pivot';

export interface IdeaNode {
  id: string;
  sourceEntryId?: string;
  title: string;
  label?: string; // Common alias for title
  category: string;
  date: string;
  timestamp?: string; // Common alias for date
  mood?: string;
  summary: string;
  cluster: string;
  evolutionStage: EvolutionStage;
  stage?: EvolutionStage; // Common alias
  keyInsights: string[];
  actionItems?: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface IdeaLink {
  id: string;
  source: string | any;
  target: string | any;
  relationship: string;
  relationshipType: ThoughtRelationshipType;
  explanation: string;
  reason?: string; // Common alias
  strength: number; // 1 to 5
  confidence?: number; // 0.0 to 1.0 or 1 to 5
}

export interface EvolutionStory {
  id: string;
  theme: string;
  narrative: string;
  milestoneNodeIds: string[];
  cluster: string;
}

// Phase 4A: Hierarchical Mind Map node
export interface MindMapNode {
  id: string;
  label: string;
  type: 'central' | 'theme' | 'idea' | 'sub_idea';
  parentId?: string | null;
  sourceEntryId?: string;
}

// Phase 4B: Process Flowchart node
export interface FlowchartNode {
  id: string;
  label: string;
  type: 'start' | 'action' | 'decision' | 'outcome';
  sourceEntryId?: string;
  next?: string[]; // IDs of target nodes in sequence
  condition?: string; // Condition for decision branches
  reason?: string; // Rationale for transition
  deadline?: string; // Target completion deadline
  subtasks?: string[]; // Sub-actions (e.g., 2a, 2b, 2c, 2d)
  status?: 'pending' | 'completed';
}

export interface FlowchartData {
  hasProcess: boolean;
  nodes: FlowchartNode[];
  explanation?: string;
}

export interface IdeaEvolutionGraphData {
  nodes: IdeaNode[];
  links: IdeaLink[];
  evolutionStories: EvolutionStory[];
  overallInsights: string[];
  clusters: string[];
  lastAnalyzed: string;
  
  // Phase 4 & Phase 3 extensions
  mindMap?: MindMapNode[];
  flowchart?: FlowchartData;
  taskOrdering?: TaskOrderingPlan;
  modelUsed?: string;
  fallback?: boolean;
  notice?: string;
}

// Phase 1 — Journal Intelligence: Feature 1: Continue Where I Left Off
export type UnfinishedThreadStatus = 'active' | 'dismissed' | 'continued' | 'resolved';

export interface UnfinishedThread {
  id: string; // Unique thread identifier, e.g. "thread-session-xyz"
  sessionId: string; // Originating journal session ID
  sessionTitle: string; // Originating session title
  topic: string; // Short concise topic, e.g. "Starting a weekend side project"
  lastMeaningfulContext: string; // Crucial context the user was considering
  unresolvedQuestion: string; // The central dilemma, question, or unexplored branch
  openingPrompt: string; // Warm conversational invitation: "You were exploring whether to pursue X. Last time, you were uncertain about Y. Would you like to continue from there?"
  suggestedStarterReply?: string; // Natural starter thought for the user
  confidence: number; // 0.0 to 1.0; only surface high-confidence threads
  lastInteractionTimestamp: string; // When this thought occurred
  status: UnfinishedThreadStatus;
  detectedAt: string;
  resolutionNote?: string;
}

export interface ThreadTrackingState {
  dismissedThreadIds: string[];
  continuedThreadIds: string[];
  resolvedThreadIds?: string[];
  lastCheckedAt?: string;
}

// Phase 1 — Journal Intelligence: Feature 2: Mood + Context Correlation
export interface MoodEvidenceItem {
  sessionId: string;
  sessionTitle: string;
  date: string;
  mood?: string;
  sentiment?: string;
  contextSnippet: string;
  category?: string;
}

export type MoodContextDimension = 'category' | 'topic' | 'activity' | 'time' | 'routine';

export interface MoodContextCorrelation {
  id: string; // e.g. "corr-projects-focused"
  headline: string; // e.g. "A pattern I noticed"
  observation: string; // Cautious phrasing: "You've often described feeling more focused on days when you write about your project work."
  cautiousTone: boolean; // Confirms non-causal reflective phrasing
  contextDimension: MoodContextDimension;
  contextValue: string; // e.g. "Projects", "Study", "Deep Work"
  associatedMood: string; // e.g. "Focused / Energized" or "Calm"
  evidenceCount: number; // Number of supporting entries (minimum 2)
  totalContextOccurrences: number; // Total entries under this context
  timeSpanDescription?: string; // e.g. "Observed across 3 weeks"
  evidence: MoodEvidenceItem[]; // Grounded supporting entries
  ambiguityAcknowledged?: boolean; // True if mixed/contradictory signals exist
  ambiguityNote?: string; // e.g. "While most entries correlate with high focus, 1 entry noted fatigue."
  detectedAt: string;
}

export interface MoodCorrelationReport {
  hasSufficientData: boolean;
  totalAnalyzedEntries: number;
  message?: string; // e.g. "I don't have enough journal history to identify a meaningful pattern yet."
  correlations: MoodContextCorrelation[];
  lastAnalyzed: string;
  modelUsed?: string;
  fallback?: boolean;
}

// Phase 1 — Journal Intelligence: Feature 3: Goals & Planning
export type GoalStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'abandoned';

export interface GoalMilestone {
  id: string; // e.g. "ms_123"
  title: string; // Meaningful major stage (e.g., "Build authentication flow")
  description?: string;
  status: 'pending' | 'completed';
  isCompleted: boolean;
  targetDate?: string; // Optional: only if user provided one
  order: number; // Sequence index (1, 2, 3...)
  actionIds?: string[]; // IDs of ActionItems connected in the Action Engine
  completedAt?: string;
}

export interface GoalJournalReference {
  sessionId: string;
  sessionTitle: string;
  date: string;
  snippet: string;
  type: 'origin' | 'reflection' | 'obstacle' | 'progress' | 'evolution';
}

export interface PersonalGoal {
  id: string;
  userId: string;
  title: string; // The meaningful outcome (e.g. "Build my personal finance app")
  intention: string; // Context & what the user is trying to accomplish
  motivation?: string; // Why the user cares / why this is important
  targetDate?: string; // Optional deadline, only when user provided one
  status: GoalStatus;
  progress: number; // Transparent integer percentage (0 to 100) based on actual milestones & actions
  milestones: GoalMilestone[];
  relatedJournalRefs: GoalJournalReference[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  abandonedReason?: string;
  category?: string;
  timeframe?: 'long_term' | 'short_term'; // Long-term vision vs near-term sprint milestone
}

export interface CustomFolder {
  id: string;
  name: string;
  color?: string; // Hex or theme tone
  icon?: string; // Lucide icon identifier
  description?: string;
  createdAt: string;
}

export interface SuggestedGoalFromJournal {
  hasPotentialGoal: boolean;
  confidence?: number;
  reasoning?: string;
  suggestedGoal?: {
    title: string;
    intention: string;
    motivation?: string;
    targetDate?: string;
    suggestedMilestones: string[];
    originSnippet: string;
  };
}

export interface VisionCard {
  id: string;
  userId: string;
  prompt: string;
  imageUrl: string;
  title?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3';
  category?: string;
  reflection?: string;
  targetGoalId?: string;
  status: 'done' | 'generating' | 'failed';
  createdAt: string;
  updatedAt?: string;
}



