import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  BookOpen, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  PauseCircle, 
  CheckCheck, 
  XCircle, 
  ChevronRight, 
  ChevronDown, 
  ListChecks, 
  Lightbulb, 
  Trash2, 
  Edit3, 
  AlertCircle,
  Compass,
  Tag,
  Upload,
  FileText,
  FileSpreadsheet,
  FileUp,
  Image as ImageIcon,
  Loader2,
  Check,
  Maximize2,
  X,
  RefreshCw,
  FolderArchive
} from 'lucide-react';
import { 
  PersonalGoal, 
  GoalMilestone, 
  GoalStatus, 
  JournalSession, 
  PaperThemePreference, 
  ActionItem,
  VisionCard
} from '../types';
import { getThemeConfig } from '../utils/theme';
import { GeminiIcon } from './GeminiIcon';
import { fetchVisionCards, saveVisionCard, deleteVisionCard } from '../utils/firestore';

interface GoalsViewProps {
  user?: User | null;
  goals: PersonalGoal[];
  sessions: JournalSession[];
  theme: PaperThemePreference;
  onSaveGoal: (goal: PersonalGoal) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onUpdateSession: (updated: Partial<JournalSession> & { id: string }) => Promise<void>;
  onOpenSession: (sessionId: string) => void;
  onReflectOnGoal: (goal: PersonalGoal) => void;
  initialNewGoalPrompt?: {
    title?: string;
    intention?: string;
    motivation?: string;
    targetDate?: string;
    originSessionId?: string;
    originSnippet?: string;
  } | null;
  onClearInitialPrompt?: () => void;
}

const DEFAULT_VISION_CARDS: VisionCard[] = [
  {
    id: 'default-vision-1',
    userId: '',
    prompt: 'A tranquil sunlit workspace with cedar desk, journal, steaming tea, and mountain vista',
    title: 'Clarity & Creative Horizon',
    reflection: 'Golden morning light streams across the worktable. Deep focus flows effortlessly toward your most ambitious craft and life goals.',
    category: 'Creative Craft',
    imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
    status: 'done',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-vision-2',
    userId: '',
    prompt: 'Standing on a high mountain ridge overlooking misty valleys at dawn with clear path forward',
    title: 'Sunrise Over High Peaks',
    reflection: 'Crisp alpine breeze rustles through ancient pines as sunlight floods the valley. Absolute direction, inner resilience, and peace.',
    category: 'Nature & Solitude',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    status: 'done',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  }
];

function parseGoalsFromDocumentText(text: string, fileName: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates: {
    id: string;
    title: string;
    intention: string;
    timeframe: 'short_term' | 'long_term';
    targetDate?: string;
    milestones: string[];
    selected: boolean;
  }[] = [];

  let currentGoal: {
    id: string;
    title: string;
    intention: string;
    timeframe: 'short_term' | 'long_term';
    targetDate?: string;
    milestones: string[];
    selected: boolean;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 3 || /^page \d+/i.test(line) || /^%pdf/i.test(line)) continue;

    // CSV format check
    if ((line.includes(',') || line.includes(';')) && !line.startsWith('#') && !line.startsWith('-')) {
      const delimiter = line.includes(';') ? ';' : ',';
      const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2 && !/^title|^goal|^name|^id/i.test(parts[0])) {
        candidates.push({
          id: `cand_${Date.now()}_${candidates.length}`,
          title: parts[0],
          intention: parts[1] || `Imported from ${fileName}`,
          timeframe: parts.some((p) => p.toLowerCase().includes('long')) ? 'long_term' : 'short_term',
          targetDate: parts.find((p) => /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(p)),
          milestones: parts.slice(2).filter((p) => p.length > 2 && !p.includes('-') && !p.includes('/')),
          selected: true,
        });
        continue;
      }
    }

    // Markdown headers, numbered items, bullets, checkboxes
    const isHeader = /^#{1,3}\s+(.+)/.test(line);
    const isNumbered = /^\d+[\.\)]\s+(.+)/.test(line);
    const isBullet = /^[-*•–—]\s+(.+)/.test(line);
    const isCheckbox = /^[-*]?\s*\[[ xX]?\]\s*(.+)/.test(line);

    if (isHeader || isNumbered || (isBullet && !currentGoal)) {
      const cleanTitle = line
        .replace(/^#{1,3}\s+/, '')
        .replace(/^\d+[\.\)]\s+/, '')
        .replace(/^[-*•–—]\s+/, '')
        .replace(/^\[[ xX]?\]\s*/, '')
        .trim();

      if (cleanTitle.length >= 3) {
        if (currentGoal) {
          candidates.push(currentGoal);
        }
        currentGoal = {
          id: `cand_${Date.now()}_${candidates.length}`,
          title: cleanTitle,
          intention: `Imported from ${fileName}`,
          timeframe: cleanTitle.toLowerCase().includes('year') || cleanTitle.toLowerCase().includes('long') ? 'long_term' : 'short_term',
          milestones: [],
          selected: true,
        };
      }
    } else if (isBullet || isCheckbox) {
      const cleanSub = line.replace(/^[-*•–—]\s+/, '').replace(/^\[[ xX]?\]\s*/, '').trim();
      if (cleanSub.length >= 2) {
        if (currentGoal) {
          currentGoal.milestones.push(cleanSub);
        } else {
          currentGoal = {
            id: `cand_${Date.now()}_${candidates.length}`,
            title: cleanSub,
            intention: `Imported from ${fileName}`,
            timeframe: 'short_term',
            milestones: [],
            selected: true,
          };
        }
      }
    } else if (line.length >= 8 && !line.startsWith('<') && !line.startsWith('{')) {
      if (!currentGoal) {
        currentGoal = {
          id: `cand_${Date.now()}_${candidates.length}`,
          title: line.slice(0, 60),
          intention: line.length > 60 ? line : `Imported from ${fileName}`,
          timeframe: 'short_term',
          milestones: [],
          selected: true,
        };
      } else if (currentGoal.milestones.length < 3) {
        currentGoal.milestones.push(line.slice(0, 80));
      }
    }
  }

  if (currentGoal) {
    candidates.push(currentGoal);
  }

  return candidates.slice(0, 20);
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  user,
  goals,
  sessions,
  theme,
  onSaveGoal,
  onDeleteGoal,
  onUpdateSession,
  onOpenSession,
  onReflectOnGoal,
  initialNewGoalPrompt,
  onClearInitialPrompt,
}) => {
  const themeConfig = getThemeConfig(theme);

  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'paused' | 'completed'>('in_progress');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(Boolean(initialNewGoalPrompt));
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set());

  // Vision Board states
  const [visionCards, setVisionCards] = useState<VisionCard[]>(DEFAULT_VISION_CARDS);
  const [activeVisionIndex, setActiveVisionIndex] = useState<number>(0);
  const [newVisionPrompt, setNewVisionPrompt] = useState<string>('');
  const [isGeneratingVision, setIsGeneratingVision] = useState<boolean>(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [isVisionFullscreen, setIsVisionFullscreen] = useState<boolean>(false);
  const [isVisionSectionCollapsed, setIsVisionSectionCollapsed] = useState<boolean>(false);

  // Document Upload & Goal Extraction states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [currentUploadedFileName, setCurrentUploadedFileName] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [extractedGoals, setExtractedGoals] = useState<{
    id: string;
    title: string;
    intention: string;
    timeframe: 'short_term' | 'long_term';
    targetDate?: string;
    milestones: string[];
    selected: boolean;
  }[]>([]);
  const [uploadedFilesHistory, setUploadedFilesHistory] = useState<{ name: string; size: number; date: string; count: number }[]>(() => {
    try {
      const saved = localStorage.getItem('personal_gemini_uploaded_docs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form state for creating/editing a goal
  const [formTitle, setFormTitle] = useState(initialNewGoalPrompt?.title || '');
  const [formIntention, setFormIntention] = useState(initialNewGoalPrompt?.intention || '');
  const [formMotivation, setFormMotivation] = useState(initialNewGoalPrompt?.motivation || '');
  const [formTargetDate, setFormTargetDate] = useState(initialNewGoalPrompt?.targetDate || '');
  const [formMilestones, setFormMilestones] = useState<{ id: string; title: string; description?: string }[]>([]);
  const [newMilestoneInput, setNewMilestoneInput] = useState('');
  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New action form for a specific milestone
  const [addingActionToMilestoneId, setAddingActionToMilestoneId] = useState<string | null>(null);
  const [newActionText, setNewActionText] = useState('');
  const [newActionPriority, setNewActionPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Load vision cards for user on mount
  useEffect(() => {
    let isMounted = true;
    async function loadVisions() {
      if (user?.uid) {
        try {
          const cards = await fetchVisionCards(user.uid);
          if (isMounted && cards && cards.length > 0) {
            setVisionCards(cards);
            return;
          }
        } catch (err) {
          console.warn('Could not load user vision cards from Firestore:', err);
        }
      }
      try {
        const cached = localStorage.getItem('personal_gemini_vision_cards');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
            setVisionCards(parsed);
          }
        }
      } catch (e) {}
    }
    loadVisions();
    return () => { isMounted = false; };
  }, [user?.uid]);

  // Generate Vision Board image
  const handleGenerateVision = async (overridePrompt?: string) => {
    const promptToUse = (overridePrompt || newVisionPrompt).trim();
    if (!promptToUse || isGeneratingVision) return;
    setIsGeneratingVision(true);
    setVisionError(null);

    try {
      const response = await fetch('/api/gemini/generate-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToUse }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate vision (${response.status})`);
      }

      const data = await response.json();
      const newCard: VisionCard = {
        id: `vision_${Date.now()}`,
        userId: user?.uid || '',
        prompt: promptToUse,
        title: data.title || promptToUse.slice(0, 35),
        reflection: data.vividScene || data.affirmation || 'Manifesting this reality through clear intention.',
        category: data.category || 'Vision & Manifestation',
        imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        status: 'done',
        createdAt: new Date().toISOString(),
      };

      const updated = [newCard, ...visionCards];
      setVisionCards(updated);
      setActiveVisionIndex(0); // The newly generated vision board image is now the final vision board image visible in the spotlight!
      setNewVisionPrompt('');

      if (user?.uid) {
        saveVisionCard(user.uid, newCard).catch((e) => console.warn('Could not save vision card:', e));
      }
      try {
        localStorage.setItem('personal_gemini_vision_cards', JSON.stringify(updated));
      } catch (e) {}
    } catch (err: any) {
      console.error('Vision generation error:', err);
      setVisionError('Could not generate vision visual. Please try again.');
    } finally {
      setIsGeneratingVision(false);
    }
  };

  const handleDeleteVision = async (cardId: string) => {
    const updated = visionCards.filter((c) => c.id !== cardId);
    setVisionCards(updated.length > 0 ? updated : DEFAULT_VISION_CARDS);
    setActiveVisionIndex(0);
    if (user?.uid) {
      deleteVisionCard(user.uid, cardId).catch((e) => console.warn(e));
    }
    try {
      localStorage.setItem('personal_gemini_vision_cards', JSON.stringify(updated));
    } catch (e) {}
  };

  // Handle document file upload (PDF, TXT, CSV, Excel, Word)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsParsingFile(true);
    setFileError(null);
    setCurrentUploadedFileName(file.name);

    try {
      let rawText = '';
      const isTextOrCsv = file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.tsv');

      if (isTextOrCsv) {
        rawText = await file.text();
      } else {
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const decoded = decoder.decode(buffer);
        const textChunks = decoded.match(/[\x20-\x7E\s]{4,}/g);
        rawText = textChunks ? textChunks.join('\n') : '';
      }

      const candidates = parseGoalsFromDocumentText(rawText, file.name);
      if (candidates.length === 0) {
        candidates.push({
          id: `cand_${Date.now()}_1`,
          title: `Achieve key objectives from ${file.name.replace(/\.[^/.]+$/, '')}`,
          intention: `Goals and planning guidelines extracted from ${file.name}`,
          timeframe: 'short_term',
          targetDate: '',
          milestones: ['Review document contents', 'Prioritize action items', 'Track initial progress'],
          selected: true,
        });
      }

      setExtractedGoals(candidates);
      const newHistory = [
        { name: file.name, size: file.size, date: new Date().toLocaleDateString(), count: candidates.length },
        ...uploadedFilesHistory.filter((h) => h.name !== file.name)
      ];
      setUploadedFilesHistory(newHistory);
      try {
        localStorage.setItem('personal_gemini_uploaded_docs', JSON.stringify(newHistory));
      } catch (e) {}

      setIsUploadModalOpen(true);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setFileError(`Could not parse ${file.name}. Please upload a TXT, Markdown, CSV, Excel, or PDF document.`);
    } finally {
      setIsParsingFile(false);
    }
  };

  // Import selected extracted goals into user's goals
  const handleImportExtractedGoals = async () => {
    const selected = extractedGoals.filter((g) => g.selected && g.title.trim());
    if (selected.length === 0) return;

    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      const newGoal: PersonalGoal = {
        id: `goal_${Date.now()}_${i}`,
        title: item.title.trim(),
        intention: item.intention.trim() || `Imported from ${currentUploadedFileName || 'document'}`,
        motivation: `Extracted from ${currentUploadedFileName || 'uploaded file'}`,
        timeframe: item.timeframe || 'short_term',
        userId: user?.uid || '',
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetDate: item.targetDate || '',
        milestones: item.milestones.length > 0
          ? item.milestones.map((mTitle, mIdx) => ({
              id: `ms_${Date.now()}_${mIdx}`,
              title: mTitle,
              isCompleted: false,
              status: 'pending',
              order: mIdx + 1,
            }))
          : [
              {
                id: `ms_${Date.now()}_1`,
                title: 'Review and execute initial action step',
                isCompleted: false,
                status: 'pending',
                order: 1,
              },
            ],
        progress: 0,
        relatedJournalRefs: currentUploadedFileName ? [
          {
            sessionId: 'doc_import',
            sessionTitle: currentUploadedFileName,
            date: new Date().toISOString().split('T')[0],
            snippet: `Imported from ${currentUploadedFileName}`,
            type: 'origin',
          }
        ] : [],
      };
      await onSaveGoal(newGoal);
    }

    setUploadSuccessMessage(`Successfully imported ${selected.length} goal${selected.length > 1 ? 's' : ''} into Goals & Planning!`);
    setIsUploadModalOpen(false);
    setExtractedGoals([]);
    setTimeout(() => setUploadSuccessMessage(null), 6000);
  };

  // React to initial prompt changes
  React.useEffect(() => {
    if (initialNewGoalPrompt) {
      setFormTitle(initialNewGoalPrompt.title || '');
      setFormIntention(initialNewGoalPrompt.intention || '');
      setFormMotivation(initialNewGoalPrompt.motivation || '');
      setFormTargetDate(initialNewGoalPrompt.targetDate || '');
      setIsCreateModalOpen(true);
    }
  }, [initialNewGoalPrompt]);

  const toggleExpandGoal = (id: string) => {
    setExpandedGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered goals
  const filteredGoals = useMemo(() => {
    if (activeFilter === 'all') return goals;
    return goals.filter((g) => g.status === activeFilter);
  }, [goals, activeFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = goals.length;
    const active = goals.filter((g) => g.status === 'in_progress').length;
    const completed = goals.filter((g) => g.status === 'completed').length;
    let totalMilestones = 0;
    let completedMilestones = 0;
    goals.forEach((g) => {
      totalMilestones += g.milestones.length;
      completedMilestones += g.milestones.filter((m) => m.isCompleted).length;
    });
    return { total, active, completed, totalMilestones, completedMilestones };
  }, [goals]);

  // Handle milestone toggle completion
  const handleToggleMilestone = async (goal: PersonalGoal, milestoneId: string) => {
    const updatedMilestones = goal.milestones.map((m) => {
      if (m.id === milestoneId) {
        const nextCompleted = !m.isCompleted;
        return {
          ...m,
          isCompleted: nextCompleted,
          status: (nextCompleted ? 'completed' : 'pending') as 'completed' | 'pending',
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        };
      }
      return m;
    });

    // Calculate transparent progress: completed milestones / total
    const completedCount = updatedMilestones.filter((m) => m.isCompleted).length;
    const progress = updatedMilestones.length > 0 
      ? Math.round((completedCount / updatedMilestones.length) * 100)
      : 0;

    const allCompleted = updatedMilestones.length > 0 && completedCount === updatedMilestones.length;

    const updatedGoal: PersonalGoal = {
      ...goal,
      milestones: updatedMilestones,
      progress,
      status: allCompleted ? 'completed' : goal.status,
      completedAt: allCompleted ? (goal.completedAt || new Date().toISOString()) : undefined,
      updatedAt: new Date().toISOString(),
    };

    await onSaveGoal(updatedGoal);
  };

  // Handle status change
  const handleChangeStatus = async (goal: PersonalGoal, newStatus: GoalStatus) => {
    const updatedGoal: PersonalGoal = {
      ...goal,
      status: newStatus,
      completedAt: newStatus === 'completed' ? (goal.completedAt || new Date().toISOString()) : undefined,
      updatedAt: new Date().toISOString(),
    };
    await onSaveGoal(updatedGoal);
  };

  // Handle adding an Action directly to the Action Engine from a milestone
  const handleAddActionToMilestone = async (goal: PersonalGoal, milestone: GoalMilestone) => {
    if (!newActionText.trim()) return;

    // Find the primary session or fallback to the most recent session
    const targetSession = sessions.find((s) => s.id === goal.relatedJournalRefs[0]?.sessionId) || sessions[0];
    if (!targetSession) {
      alert('Please write at least one journal entry first to connect actions.');
      return;
    }

    const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newAction: ActionItem = {
      id: actionId,
      text: newActionText.trim(),
      priority: newActionPriority,
      status: 'pending',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      sourceEntryId: targetSession.id,
      sessionId: targetSession.id,
      sessionTitle: targetSession.title || goal.title,
      goalId: goal.id,
      milestoneId: milestone.id,
      orderReason: `Milestone: ${milestone.title}`,
      isManual: true,
    };

    // 1. Update session's structuredTasks
    const existingTasks = Array.isArray(targetSession.structuredTasks) ? [...targetSession.structuredTasks] : [];
    existingTasks.push(newAction);
    await onUpdateSession({
      id: targetSession.id,
      structuredTasks: existingTasks,
    });

    // 2. Link action ID to goal milestone
    const updatedMilestones = goal.milestones.map((m) => {
      if (m.id === milestone.id) {
        return {
          ...m,
          actionIds: [...(m.actionIds || []), actionId],
        };
      }
      return m;
    });

    await onSaveGoal({
      ...goal,
      milestones: updatedMilestones,
      updatedAt: new Date().toISOString(),
    });

    setAddingActionToMilestoneId(null);
    setNewActionText('');
  };

  // Request Gemini breakdown for milestones
  const handleGenerateMilestonesWithAI = async () => {
    if (!formTitle.trim()) {
      setFormError('Please enter a goal title first.');
      return;
    }
    setIsGeneratingMilestones(true);
    setFormError(null);

    try {
      const response = await fetch('/api/gemini/goals/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          intention: formIntention.trim(),
          motivation: formMotivation.trim(),
          targetDate: formTargetDate.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate milestones.');
      }

      const data = await response.json();
      if (Array.isArray(data.milestones) && data.milestones.length > 0) {
        setFormMilestones(
          data.milestones.map((m: any, idx: number) => ({
            id: `ms_${Date.now()}_${idx}`,
            title: m.title,
            description: m.description,
          }))
        );
      }
    } catch (err: any) {
      setFormError('Could not auto-generate milestones right now. You can add them manually below.');
    } finally {
      setIsGeneratingMilestones(false);
    }
  };

  // Save new or edited goal
  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Goal title is required.');
      return;
    }

    const now = new Date().toISOString();
    const newMilestonesList: GoalMilestone[] = formMilestones.map((m, idx) => ({
      id: m.id || `ms_${Date.now()}_${idx}`,
      title: m.title,
      description: m.description,
      status: 'pending',
      isCompleted: false,
      order: idx + 1,
    }));

    // If an initial session prompt exists, link it
    const originRef = initialNewGoalPrompt?.originSessionId ? [{
      sessionId: initialNewGoalPrompt.originSessionId,
      sessionTitle: sessions.find((s) => s.id === initialNewGoalPrompt.originSessionId)?.title || 'Journal Origin',
      date: now,
      snippet: initialNewGoalPrompt.originSnippet || formIntention,
      type: 'origin' as const,
    }] : [];

    const newGoal: PersonalGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: 'user', // Overwritten by firestore save
      title: formTitle.trim(),
      intention: formIntention.trim() || 'Work toward this meaningful outcome.',
      motivation: formMotivation.trim() || undefined,
      targetDate: formTargetDate.trim() || undefined,
      status: 'in_progress',
      progress: 0,
      milestones: newMilestonesList,
      relatedJournalRefs: originRef,
      createdAt: now,
      updatedAt: now,
    };

    await onSaveGoal(newGoal);
    setIsCreateModalOpen(false);
    setFormTitle('');
    setFormIntention('');
    setFormMotivation('');
    setFormTargetDate('');
    setFormMilestones([]);
    if (onClearInitialPrompt) onClearInitialPrompt();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Banner */}
      <div 
        className="rounded-3xl p-6 sm:p-8 border shadow-xs"
        style={{
          backgroundColor: themeConfig.paperCardBg,
          borderColor: themeConfig.border,
          color: themeConfig.inkColor
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div 
                className="h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <Target className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-serif font-bold tracking-tight">Goals & Planning</h2>
              <span 
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}
              >
                Phase 1
              </span>
            </div>
            <p className="text-xs opacity-75 max-w-xl leading-relaxed">
              Connect your journal thoughts to meaningful outcomes. Every goal remembers why you care, links back to your reflections, and feeds concrete actions into your Action Engine.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              id="upload-goals-doc-btn"
              onClick={() => {
                setFileError(null);
                fileInputRef.current?.click();
              }}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2 hover:opacity-95 shadow-2xs transition-all cursor-pointer"
              style={{
                backgroundColor: themeConfig.chipBg,
                borderColor: themeConfig.border,
                color: themeConfig.inkColor
              }}
              title="Upload PDF, Text, Excel, Word, or CSV to extract and import goals"
            >
              <Upload className="h-4 w-4" style={{ color: themeConfig.primary }} />
              <span>Import Document</span>
            </button>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown,.csv,.tsv,.xlsx,.xls,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                }
                e.target.value = '';
              }}
            />

            <button
              id="new-goal-btn"
              onClick={() => {
                setFormTitle('');
                setFormIntention('');
                setFormMotivation('');
                setFormTargetDate('');
                setFormMilestones([]);
                setFormError(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white flex items-center gap-2 hover:opacity-95 shadow-xs transition-all cursor-pointer"
              style={{ backgroundColor: themeConfig.primary }}
            >
              <Plus className="h-4 w-4" />
              <span>New Goal</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t" style={{ borderColor: themeConfig.border }}>
          <div className="p-3 rounded-2xl border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
            <span className="text-[11px] font-semibold opacity-70">Active Goals</span>
            <div className="text-xl font-serif font-bold mt-0.5" style={{ color: themeConfig.primary }}>
              {stats.active}
            </div>
          </div>

          <div className="p-3 rounded-2xl border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
            <span className="text-[11px] font-semibold opacity-70">Completed Goals</span>
            <div className="text-xl font-serif font-bold mt-0.5 text-emerald-600">
              {stats.completed}
            </div>
          </div>

          <div className="p-3 rounded-2xl border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
            <span className="text-[11px] font-semibold opacity-70">Milestones Reached</span>
            <div className="text-xl font-serif font-bold mt-0.5">
              {stats.completedMilestones} <span className="text-xs font-normal opacity-60">/ {stats.totalMilestones}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
            <span className="text-[11px] font-semibold opacity-70">Total Tracked</span>
            <div className="text-xl font-serif font-bold mt-0.5">
              {stats.total}
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {uploadSuccessMessage && (
        <div 
          className="p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-xs animate-fade-in"
          style={{
            backgroundColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            color: '#065f46'
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccessMessage}</span>
          </div>
          <button onClick={() => setUploadSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {(fileError || visionError) && (
        <div 
          className="p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-xs animate-fade-in"
          style={{
            backgroundColor: '#fef2f2',
            borderColor: '#fecaca',
            color: '#991b1b'
          }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{fileError || visionError}</span>
          </div>
          <button onClick={() => { setFileError(null); setVisionError(null); }} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Vision Board & Final Generated Image Showcase */}
      {(() => {
        const finalVisionCard = visionCards[activeVisionIndex] || visionCards[0] || DEFAULT_VISION_CARDS[0];
        const topActiveGoal = goals.find((g) => g.status === 'in_progress');

        return (
          <section 
            id="goals-vision-board-section"
            className="rounded-3xl border p-6 sm:p-7 shadow-xs space-y-5 transition-all"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
              color: themeConfig.inkColor
            }}
          >
            {/* Vision Board Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
                    style={{ backgroundColor: themeConfig.primary }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-serif font-bold tracking-tight">
                    Vision Board & Manifestation Canvas
                  </h3>
                  <span 
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}
                  >
                    Visual Horizon
                  </span>
                </div>
                <p className="text-xs opacity-75 mt-1 max-w-xl">
                  Grounded imagery generated from your highest ambitions and reflections to keep your true north in plain sight.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsVisionSectionCollapsed(!isVisionSectionCollapsed)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.inkColor
                  }}
                >
                  {isVisionSectionCollapsed ? 'Show Vision Board' : 'Collapse Vision'}
                </button>
              </div>
            </div>

            {!isVisionSectionCollapsed && (
              <div className="space-y-5 animate-fade-in">
                {/* Spotlight: The Final Vision Board Image */}
                <div className="relative rounded-3xl overflow-hidden border shadow-sm group">
                  <img
                    src={finalVisionCard.imageUrl}
                    alt={finalVisionCard.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-64 sm:h-80 md:h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-xs pointer-events-auto"
                      style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff' }}
                    >
                      {finalVisionCard.category || 'Vision Board'}
                    </span>
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <button
                        onClick={() => setIsVisionFullscreen(true)}
                        className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all shadow-xs cursor-pointer"
                        title="View full image"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVision(finalVisionCard.id)}
                        className="p-2 rounded-full bg-black/50 hover:bg-rose-600 text-white transition-all shadow-xs cursor-pointer"
                        title="Delete this visual"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Information Overlay with Final Generated Image Details */}
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-300" />
                      <span>Final Generated Vision Board Image</span>
                    </p>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
                      {finalVisionCard.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/90 max-w-2xl mt-1 leading-relaxed line-clamp-2">
                      {finalVisionCard.reflection || finalVisionCard.prompt}
                    </p>
                  </div>
                </div>

                {/* Prompt bar & Quick Manifestation Controls */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={newVisionPrompt}
                        onChange={(e) => setNewVisionPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleGenerateVision();
                          }
                        }}
                        placeholder="Describe the future milestone, lifestyle, or vision to generate an image for..."
                        className="w-full px-4 py-2.5 rounded-2xl border text-xs placeholder:opacity-50 focus:outline-none transition-all"
                        style={{
                          backgroundColor: themeConfig.cardBg,
                          borderColor: themeConfig.border,
                          color: themeConfig.inkColor
                        }}
                      />
                    </div>

                    <button
                      onClick={() => handleGenerateVision()}
                      disabled={!newVisionPrompt.trim() || isGeneratingVision}
                      className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 hover:opacity-95 shadow-xs transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      {isGeneratingVision ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating Visual...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Generate Vision Image</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Action Pills */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {topActiveGoal && (
                      <button
                        onClick={() => handleGenerateVision(`A breathtaking vivid scene of achieving: ${topActiveGoal.title}. ${topActiveGoal.intention}`)}
                        disabled={isGeneratingVision}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all hover:opacity-90 cursor-pointer"
                        style={{
                          backgroundColor: themeConfig.chipBg,
                          borderColor: themeConfig.border,
                          color: themeConfig.primary
                        }}
                        title={`Generate vision visual for goal: ${topActiveGoal.title}`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Manifest Top Goal: "{topActiveGoal.title.slice(0, 26)}..."</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleGenerateVision('Standing at the summit of a misty mountain range at sunrise, basking in total clarity and accomplishment')}
                      disabled={isGeneratingVision}
                      className="px-3 py-1.5 rounded-full text-[11px] opacity-75 hover:opacity-100 border transition-all cursor-pointer"
                      style={{
                        backgroundColor: themeConfig.chipBg,
                        borderColor: themeConfig.border,
                      }}
                    >
                      Mountain Peak at Sunrise
                    </button>

                    <button
                      onClick={() => handleGenerateVision('A peaceful cedar wood studio flooded with warm morning sunlight, books, focused work, and tranquil tea')}
                      disabled={isGeneratingVision}
                      className="px-3 py-1.5 rounded-full text-[11px] opacity-75 hover:opacity-100 border transition-all cursor-pointer"
                      style={{
                        backgroundColor: themeConfig.chipBg,
                        borderColor: themeConfig.border,
                      }}
                    >
                      Sunlit Sanctuary & Studio
                    </button>
                  </div>

                  {/* Generated Vision Gallery Thumbnails */}
                  {visionCards.length > 1 && (
                    <div className="pt-3 border-t" style={{ borderColor: themeConfig.border }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-2.5">
                        Generated Vision Gallery ({visionCards.length} Visuals)
                      </p>
                      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                        {visionCards.map((card, idx) => {
                          const isCurrent = activeVisionIndex === idx;
                          return (
                            <button
                              key={card.id}
                              onClick={() => setActiveVisionIndex(idx)}
                              className={`relative rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer group ${
                                isCurrent ? 'scale-105 shadow-sm' : 'opacity-70 hover:opacity-100'
                              }`}
                              style={{
                                width: '130px',
                                height: '80px',
                                borderColor: isCurrent ? themeConfig.primary : themeConfig.border
                              }}
                              title={card.title}
                            >
                              <img
                                src={card.imageUrl}
                                alt={card.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                                <p className="text-[10px] text-white font-medium truncate w-full text-left">
                                  {card.title}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })()}

      {/* 2. Document Upload & Goals Extractor Dropzone */}
      <section 
        id="goals-document-upload-section"
        onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileUpload(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-3xl p-6 sm:p-7 border-2 border-dashed flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all cursor-pointer ${
          isDraggingFile ? 'scale-[1.01] shadow-md' : 'hover:opacity-95'
        }`}
        style={{
          backgroundColor: themeConfig.chipBg,
          borderColor: isDraggingFile ? themeConfig.primary : themeConfig.border,
          color: themeConfig.inkColor
        }}
      >
        <div className="flex items-start gap-4">
          <div 
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0 mt-0.5"
            style={{ backgroundColor: themeConfig.primary }}
          >
            {isParsingFile ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold tracking-tight">
                Import Goals from Document Files
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: themeConfig.border, backgroundColor: themeConfig.paperCardBg, color: themeConfig.primary }}>
                PDF · Excel · TXT · CSV · Word
              </span>
            </div>
            <p className="text-xs opacity-75 mt-1 max-w-xl leading-relaxed">
              Have existing goals listed in a PDF, spreadsheet, or text notes? Drop your file here or click to browse. The parser reads your action items, target dates, and milestones for quick 1-click import.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          {uploadedFilesHistory.length > 0 && (
            <span className="text-[11px] opacity-70 font-medium">
              {uploadedFilesHistory.length} doc{uploadedFilesHistory.length > 1 ? 's' : ''} uploaded
            </span>
          )}
          <button
            type="button"
            className="px-4 py-2 rounded-2xl text-xs font-bold text-white shadow-2xs flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: themeConfig.primary }}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Select Document</span>
          </button>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['in_progress', 'paused', 'completed', 'all'] as const).map((filterKey) => {
          const isSelected = activeFilter === filterKey;
          const labelMap = {
            in_progress: 'In Progress',
            paused: 'Paused',
            completed: 'Completed',
            all: 'All Goals',
          };
          return (
            <button
              key={filterKey}
              onClick={() => setActiveFilter(filterKey)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border"
              style={isSelected ? {
                backgroundColor: themeConfig.primary,
                color: '#ffffff',
                borderColor: themeConfig.primary,
              } : {
                backgroundColor: themeConfig.chipBg,
                color: themeConfig.inkColor,
                borderColor: themeConfig.border,
                opacity: 0.8,
              }}
            >
              {labelMap[filterKey]}
            </button>
          );
        })}
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div 
          className="rounded-3xl p-12 text-center border"
          style={{
            backgroundColor: themeConfig.paperCardBg,
            borderColor: themeConfig.border,
            color: themeConfig.inkColor
          }}
        >
          <Compass className="h-10 w-10 mx-auto opacity-40 mb-3" />
          <h3 className="font-serif text-base font-bold">No {activeFilter.replace('_', ' ')} goals yet</h3>
          <p className="text-xs opacity-70 mt-1 max-w-sm mx-auto leading-relaxed">
            Brainstorming Journal turns your thoughts and intentions into meaningful goals without complex project-management clutter.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-2xl text-xs font-bold text-white inline-flex items-center gap-2"
            style={{ backgroundColor: themeConfig.primary }}
          >
            <Plus className="h-4 w-4" />
            <span>Create Your First Goal</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal) => {
            const isExpanded = expandedGoalIds.has(goal.id);
            const totalMs = goal.milestones.length;
            const completedMs = goal.milestones.filter((m) => m.isCompleted).length;
            const nextMilestone = goal.milestones.find((m) => !m.isCompleted);

            return (
              <div
                key={goal.id}
                className="rounded-3xl border shadow-2xs transition-all overflow-hidden"
                style={{
                  backgroundColor: themeConfig.paperCardBg,
                  borderColor: themeConfig.border,
                  color: themeConfig.inkColor,
                }}
              >
                {/* Goal Main Card Header */}
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span 
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                          style={
                            goal.status === 'completed' ? { backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' } :
                            goal.status === 'paused' ? { backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fde68a' } :
                            { backgroundColor: themeConfig.chipBg, color: themeConfig.primary, borderColor: themeConfig.border }
                          }
                        >
                          {goal.status.replace('_', ' ')}
                        </span>

                        {goal.targetDate && (
                          <span 
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 opacity-80"
                            style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                          >
                            <Calendar className="h-3 w-3" />
                            <span>Target: {goal.targetDate}</span>
                          </span>
                        )}

                        <span className="text-[11px] opacity-60">
                          {totalMs} milestone{totalMs === 1 ? '' : 's'}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg font-bold">
                        {goal.title}
                      </h3>

                      {goal.intention && (
                        <p className="text-xs opacity-80 leading-relaxed max-w-2xl">
                          {goal.intention}
                        </p>
                      )}

                      {goal.motivation && (
                        <div 
                          className="text-[11px] px-3 py-1.5 rounded-xl border mt-2 flex items-start gap-2 max-w-2xl"
                          style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                        >
                          <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                          <div>
                            <span className="font-bold opacity-90">Why this matters: </span>
                            <span className="opacity-80">{goal.motivation}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onReflectOnGoal(goal)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 hover:opacity-90 transition-all shadow-2xs"
                        style={{
                          backgroundColor: themeConfig.chipBg,
                          borderColor: themeConfig.border,
                          color: themeConfig.primary,
                        }}
                        title="Open journal to reflect on progress and obstacles"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Reflect in Journal</span>
                      </button>

                      <button
                        onClick={() => toggleExpandGoal(goal.id)}
                        className="h-8 w-8 rounded-xl border flex items-center justify-center hover:opacity-80 transition-all"
                        style={{ borderColor: themeConfig.border }}
                        title={isExpanded ? 'Collapse' : 'Expand milestones'}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar & Next Meaningful Action */}
                  <div className="mt-5 pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: themeConfig.border }}>
                    <div className="flex-1 max-w-md">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-bold opacity-80">Progress</span>
                        <span className="font-bold" style={{ color: themeConfig.primary }}>
                          {goal.progress}% ({completedMs} of {totalMs} milestones)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-black/5 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${goal.progress}%`,
                            backgroundColor: goal.status === 'completed' ? '#10b981' : themeConfig.primary,
                          }}
                        />
                      </div>
                    </div>

                    {nextMilestone && goal.status === 'in_progress' && (
                      <div 
                        className="text-xs px-3 py-2 rounded-2xl border flex items-center gap-2"
                        style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Next Stage:</span>
                        <span className="font-semibold truncate max-w-xs">{nextMilestone.title}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Milestones, Actions & Journal Connections */}
                {isExpanded && (
                  <div 
                    className="p-5 sm:p-6 border-t space-y-6"
                    style={{ 
                      backgroundColor: themeConfig.chipBg,
                      borderColor: themeConfig.border 
                    }}
                  >
                    {/* Milestones Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ListChecks className="h-4 w-4" style={{ color: themeConfig.primary }} />
                          <h4 className="text-xs font-bold uppercase tracking-wider opacity-80">
                            Major Milestones
                          </h4>
                        </div>
                      </div>

                      {goal.milestones.length === 0 ? (
                        <p className="text-xs opacity-70 italic">No milestones defined yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {goal.milestones.map((ms, idx) => (
                            <div 
                              key={ms.id}
                              className="p-3.5 rounded-2xl border transition-all flex flex-col gap-2"
                              style={{
                                backgroundColor: themeConfig.cardBg,
                                borderColor: themeConfig.border,
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  <button
                                    onClick={() => handleToggleMilestone(goal, ms.id)}
                                    className="mt-0.5 text-xs transition-colors shrink-0"
                                  >
                                    {ms.isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                      <Circle className="h-4 w-4 opacity-40 hover:opacity-80" />
                                    )}
                                  </button>

                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold opacity-50">#{idx + 1}</span>
                                      <span className={`text-xs font-semibold ${ms.isCompleted ? 'line-through opacity-50' : ''}`}>
                                        {ms.title}
                                      </span>
                                    </div>
                                    {ms.description && (
                                      <p className="text-[11px] opacity-70 leading-relaxed">
                                        {ms.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={() => setAddingActionToMilestoneId(addingActionToMilestoneId === ms.id ? null : ms.id)}
                                  className="text-[11px] font-bold px-2 py-1 rounded-xl border hover:opacity-80 shrink-0"
                                  style={{ borderColor: themeConfig.border, color: themeConfig.primary }}
                                >
                                  + Add Action
                                </button>
                              </div>

                              {/* Form to add an Action Item for this milestone */}
                              {addingActionToMilestoneId === ms.id && (
                                <div 
                                  className="mt-2 p-3 rounded-xl border space-y-2 text-xs"
                                  style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                                >
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="text"
                                      value={newActionText}
                                      onChange={(e) => setNewActionText(e.target.value)}
                                      placeholder="Action item to feed into Action Engine..."
                                      className="flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none"
                                      style={{ backgroundColor: themeConfig.cardBg, borderColor: themeConfig.border }}
                                      autoFocus
                                    />
                                    <select
                                      value={newActionPriority}
                                      onChange={(e) => setNewActionPriority(e.target.value as any)}
                                      className="px-2 py-1.5 rounded-lg border text-xs outline-none"
                                      style={{ backgroundColor: themeConfig.cardBg, borderColor: themeConfig.border }}
                                    >
                                      <option value="High">High</option>
                                      <option value="Medium">Medium</option>
                                      <option value="Low">Low</option>
                                    </select>
                                    <button
                                      onClick={() => handleAddActionToMilestone(goal, ms)}
                                      className="px-3 py-1.5 rounded-lg text-white font-bold"
                                      style={{ backgroundColor: themeConfig.primary }}
                                    >
                                      Add
                                    </button>
                                  </div>
                                  <span className="text-[10px] opacity-60">
                                    This action appears immediately in your Action Engine with dependency tracking.
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Linked Journal Entries Section */}
                    {goal.relatedJournalRefs && goal.relatedJournalRefs.length > 0 && (
                      <div className="pt-4 border-t" style={{ borderColor: themeConfig.border }}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <BookOpen className="h-4 w-4" style={{ color: themeConfig.primary }} />
                          <h4 className="text-xs font-bold uppercase tracking-wider opacity-80">
                            Connected Journal Thoughts
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {goal.relatedJournalRefs.map((ref, rIdx) => (
                            <div
                              key={rIdx}
                              onClick={() => onOpenSession(ref.sessionId)}
                              className="p-3 rounded-2xl border cursor-pointer hover:opacity-90 transition-all text-xs"
                              style={{ backgroundColor: themeConfig.cardBg, borderColor: themeConfig.border }}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-bold truncate">{ref.sessionTitle}</span>
                                <span className="text-[10px] opacity-60 uppercase">{ref.type}</span>
                              </div>
                              <p className="text-[11px] opacity-75 line-clamp-2 leading-relaxed">
                                "{ref.snippet}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Goal Lifecycle Management */}
                    <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs" style={{ borderColor: themeConfig.border }}>
                      <div className="flex items-center gap-2">
                        <span className="opacity-70 font-semibold">Change Status:</span>
                        {goal.status !== 'in_progress' && (
                          <button
                            onClick={() => handleChangeStatus(goal, 'in_progress')}
                            className="px-2.5 py-1 rounded-xl border font-bold"
                            style={{ borderColor: themeConfig.border }}
                          >
                            Resume
                          </button>
                        )}
                        {goal.status !== 'paused' && (
                          <button
                            onClick={() => handleChangeStatus(goal, 'paused')}
                            className="px-2.5 py-1 rounded-xl border font-bold"
                            style={{ borderColor: themeConfig.border }}
                          >
                            Pause
                          </button>
                        )}
                        {goal.status !== 'completed' && (
                          <button
                            onClick={() => handleChangeStatus(goal, 'completed')}
                            className="px-2.5 py-1 rounded-xl border font-bold text-emerald-600"
                            style={{ borderColor: themeConfig.border }}
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove the goal "${goal.title}"?`)) {
                            onDeleteGoal(goal.id);
                          }
                        }}
                        className="text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 opacity-80"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Goal</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Goal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div 
            className="w-full max-w-lg rounded-3xl p-6 border shadow-xl max-h-[90vh] overflow-y-auto space-y-4"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
              color: themeConfig.inkColor
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: themeConfig.border }}>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: themeConfig.primary }} />
                <h3 className="font-serif text-lg font-bold">Create New Goal</h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  if (onClearInitialPrompt) onClearInitialPrompt();
                }}
                className="text-xs opacity-60 hover:opacity-100"
              >
                Close
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateGoalSubmit} className="space-y-4 text-xs">
              {/* Goal Title */}
              <div>
                <label className="block font-bold mb-1">
                  Goal Title <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Improve My Public Speaking or Build Personal Finance App"
                  className="w-full px-3.5 py-2.5 rounded-2xl border text-xs outline-none"
                  style={{ backgroundColor: themeConfig.cardBg, borderColor: themeConfig.border }}
                  required
                />
              </div>

              {/* Intention / Context */}
              <div>
                <label className="block font-bold mb-1">
                  What are you trying to accomplish?
                </label>
                <textarea 
                  value={formIntention}
                  onChange={(e) => setFormIntention(e.target.value)}
                  placeholder="Context and what success looks like in your own words..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-2xl border text-xs outline-none resize-none"
                  style={{ backgroundColor: themeConfig.cardBg, borderColor: themeConfig.border }}
                />
              </div>

              {/* Motivation */}
              <div>
                <label className="block font-bold mb-1">
                  Why does this matter to you? <span className="font-normal opacity-60">(Optional)</span>
                </label>
                <input 
                  type="text"
                  value={formMotivation}
                  onChange={(e) => setFormMotivation(e.target.value)}
                  placeholder="The deeper reason or personal importance..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border text-xs outline-none"
                  style={{ backgroundColor: themeConfig.cardBg, borderColor: themeConfig.border }}
                />
              </div>

              {/* Optional Target Date */}
              <div>
                <label className="block font-bold mb-1">
                  Target Date <span className="font-normal opacity-60">(Optional — only if you have a deadline)</span>
                </label>
                <input 
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border text-xs outline-none"
                  style={{ backgroundColor: themeConfig.cardBg, borderColor: themeConfig.border }}
                />
              </div>

              {/* Milestones Breakdown */}
              <div className="pt-2 border-t" style={{ borderColor: themeConfig.border }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">Milestones (Major Stages)</span>
                  <button
                    type="button"
                    onClick={handleGenerateMilestonesWithAI}
                    disabled={isGeneratingMilestones || !formTitle.trim()}
                    className="text-[11px] font-bold px-3 py-1 rounded-xl border flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{isGeneratingMilestones ? 'Analyzing...' : 'Break Down with AI'}</span>
                  </button>
                </div>

                {formMilestones.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {formMilestones.map((ms, idx) => (
                      <div 
                        key={ms.id} 
                        className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                        style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold opacity-60 text-[10px]">#{idx + 1}</span>
                          <span className="font-medium truncate">{ms.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormMilestones(formMilestones.filter((m) => m.id !== ms.id))}
                          className="text-rose-500 hover:text-rose-700 text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Custom Milestone */}
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    value={newMilestoneInput}
                    onChange={(e) => setNewMilestoneInput(e.target.value)}
                    placeholder="Add custom milestone..."
                    className="flex-1 px-3 py-1.5 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: themeConfig.cardBg, borderColor: themeConfig.border }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newMilestoneInput.trim()) return;
                      setFormMilestones([
                        ...formMilestones,
                        { id: `ms_${Date.now()}`, title: newMilestoneInput.trim() },
                      ]);
                      setNewMilestoneInput('');
                    }}
                    className="px-3 py-1.5 rounded-xl border font-bold"
                    style={{ borderColor: themeConfig.border }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t flex items-center justify-end gap-2" style={{ borderColor: themeConfig.border }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    if (onClearInitialPrompt) onClearInitialPrompt();
                  }}
                  className="px-4 py-2 rounded-2xl border font-semibold opacity-70 hover:opacity-100"
                  style={{ borderColor: themeConfig.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl font-bold text-white shadow-xs"
                  style={{ backgroundColor: themeConfig.primary }}
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extracted Goals Review & Import Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div 
            className="w-full max-w-2xl max-h-[85vh] rounded-3xl border shadow-xl flex flex-col overflow-hidden"
            style={{ 
              backgroundColor: themeConfig.paperCardBg, 
              borderColor: themeConfig.border, 
              color: themeConfig.inkColor 
            }}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b flex items-center justify-between" style={{ borderColor: themeConfig.border }}>
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-2xs"
                  style={{ backgroundColor: themeConfig.primary }}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold">Import Goals from Document</h3>
                  <p className="text-xs opacity-75 truncate max-w-md">
                    {currentUploadedFileName} · {extractedGoals.length} goal{extractedGoals.length > 1 ? 's' : ''} detected
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 rounded-xl hover:opacity-75 transition-all"
                style={{ backgroundColor: themeConfig.chipBg }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: List of Extracted Goals */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-semibold opacity-75">
                  Select goals to import into your Goals & Planning board:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExtractedGoals((prev) => prev.map((g) => ({ ...g, selected: true })))}
                    className="text-xs font-bold hover:underline"
                    style={{ color: themeConfig.primary }}
                  >
                    Select All
                  </button>
                  <span className="opacity-40">|</span>
                  <button
                    type="button"
                    onClick={() => setExtractedGoals((prev) => prev.map((g) => ({ ...g, selected: false })))}
                    className="text-xs opacity-70 hover:opacity-100"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {extractedGoals.map((candidate, idx) => (
                <div 
                  key={candidate.id}
                  className={`p-4 rounded-2xl border transition-all ${candidate.selected ? 'shadow-2xs' : 'opacity-60'}`}
                  style={{ 
                    backgroundColor: themeConfig.cardBg, 
                    borderColor: candidate.selected ? themeConfig.primary : themeConfig.border 
                  }}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={candidate.selected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setExtractedGoals((prev) => prev.map((g) => g.id === candidate.id ? { ...g, selected: checked } : g));
                      }}
                      className="mt-1 h-4 w-4 rounded cursor-pointer"
                    />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={candidate.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExtractedGoals((prev) => prev.map((g) => g.id === candidate.id ? { ...g, title: val } : g));
                        }}
                        className="w-full font-bold text-xs px-2.5 py-1.5 rounded-xl border outline-none"
                        style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                        placeholder="Goal title"
                      />
                      <input
                        type="text"
                        value={candidate.intention}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExtractedGoals((prev) => prev.map((g) => g.id === candidate.id ? { ...g, intention: val } : g));
                        }}
                        className="w-full text-[11px] px-2.5 py-1 rounded-lg border opacity-80 outline-none"
                        style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                        placeholder="Core intention or motivation"
                      />

                      {candidate.milestones.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Milestones:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {candidate.milestones.map((m, mIdx) => (
                              <span 
                                key={mIdx} 
                                className="text-[10px] px-2 py-0.5 rounded-md border"
                                style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t flex items-center justify-between" style={{ borderColor: themeConfig.border }}>
              <span className="text-xs opacity-75">
                {extractedGoals.filter((g) => g.selected).length} of {extractedGoals.length} goals selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-2xl border text-xs font-semibold hover:opacity-80"
                  style={{ borderColor: themeConfig.border }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportExtractedGoals}
                  disabled={extractedGoals.filter((g) => g.selected).length === 0}
                  className="px-5 py-2 rounded-2xl text-xs font-bold text-white shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: themeConfig.primary }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Import {extractedGoals.filter((g) => g.selected).length} Goals</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vision Fullscreen Modal */}
      {isVisionFullscreen && (
        <div 
          onClick={() => setIsVisionFullscreen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in cursor-pointer"
        >
          {(() => {
            const card = visionCards[activeVisionIndex] || visionCards[0] || DEFAULT_VISION_CARDS[0];
            return (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="max-w-4xl w-full rounded-3xl overflow-hidden border shadow-2xl relative cursor-default"
                style={{ borderColor: 'rgba(255,255,255,0.15)' }}
              >
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[75vh] object-cover"
                />
                <button 
                  onClick={() => setIsVisionFullscreen(false)}
                  className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white shadow-md cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="p-6 bg-black/90 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-white">
                    {card.category}
                  </span>
                  <h3 className="text-2xl font-serif font-bold mt-2">{card.title}</h3>
                  <p className="text-sm opacity-85 mt-1 leading-relaxed">{card.reflection || card.prompt}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
