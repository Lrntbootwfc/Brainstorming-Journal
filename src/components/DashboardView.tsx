import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  MessageSquare,
  BookOpen, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Image as ImageIcon, 
  MapPin, 
  Palette, 
  Clock, 
  ArrowRight,
  Bookmark,
  Smile,
  Trash2,
  Tag,
  Compass,
  LogOut,
  Sliders,
  Check,
  Sun,
  Moon,
  CloudSun,
  Flame,
  Star,
  Camera,
  Share2,
  ChevronRight,
  Filter,
  Lightbulb,
  GitBranch,
  CheckCircle,
  TreeDeciduous,
  Menu,
  X,
  Target,
  Folder,
  Feather,
  Zap,
  Sparkle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Settings,
  User as UserIcon,
  Layers,
  Network,
  Activity,
  FileText,
  Brain,
  Workflow
} from 'lucide-react';
import { 
  JournalSession, 
  FilterCategory, 
  DashboardNavTab, 
  PaperThemePreference,
  UnfinishedThread,
  PersonalGoal,
  MoodCorrelationReport,
  CustomFolder
} from '../types';
import { getThemeConfig } from '../utils/theme';
import { ThemeModal } from './ThemeModal';
import { EntryDetailModal } from './EntryDetailModal';
import { IdeaEvolutionGraph } from './IdeaEvolutionGraph';
import { ActionEngine } from './ActionEngine';
import { MindGarden } from './MindGarden';
import { GoalsView } from './GoalsView';
import { MoodCorrelationCard } from './MoodCorrelationCard';
import { CalendarView } from './CalendarView';
import { GeminiIcon } from './GeminiIcon';
import { MindMapView, FlowchartView } from './MindMapAndFlowchartViews';
import { PrimarySectionCards } from './PrimarySectionCards';
import { fetchMoodCorrelationReport, saveMoodCorrelationReport } from '../utils/firestore';

interface DashboardViewProps {
  user: User;
  sessions: JournalSession[];
  onNewSession: (category?: 'Brainstorm' | 'Journal' | 'Reflective', withoutAI?: boolean, folderId?: string, includeInAIHistory?: boolean) => void;
  onSelectSession: (sessionId: string) => void;
  onUpdateSession?: (sessionId: string, updates: Partial<JournalSession>) => void;
  onDeleteSession: (sessionId: string) => void;
  onSignOut: () => void;
  onViewLanding?: () => void;
  theme: PaperThemePreference;
  onUpdateTheme: (newTheme: PaperThemePreference) => void;
  onBatchUpdateCategory?: (sessionIds: string[], newCategory: 'Brainstorm' | 'Journal' | 'Reflective') => void;
  isDrawerOpen?: boolean;
  onToggleDrawer?: () => void;
  unfinishedThread?: UnfinishedThread | null;
  onContinueThread?: (thread: UnfinishedThread) => void;
  onDismissThread?: (threadId: string) => void;
  isAnalyzingThreads?: boolean;
  goals?: PersonalGoal[];
  onSaveGoal?: (goal: PersonalGoal) => Promise<void>;
  onDeleteGoal?: (goalId: string) => Promise<void>;
  customFolders?: CustomFolder[];
  onSaveCustomFolder?: (folder: CustomFolder) => Promise<void>;
  onDeleteCustomFolder?: (folderId: string) => Promise<void>;
  errorMessage?: string | null;
  onRetryLoad?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  sessions,
  onNewSession,
  onSelectSession,
  onUpdateSession,
  onDeleteSession,
  onSignOut,
  onViewLanding,
  theme,
  onUpdateTheme,
  onBatchUpdateCategory,
  isDrawerOpen,
  onToggleDrawer,
  unfinishedThread,
  onContinueThread,
  onDismissThread,
  isAnalyzingThreads,
  goals = [],
  onSaveGoal,
  onDeleteGoal,
  customFolders = [],
  onSaveCustomFolder,
  onDeleteCustomFolder,
  errorMessage,
  onRetryLoad,
}) => {
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const effectiveDrawerOpen = isDrawerOpen !== undefined ? isDrawerOpen : internalDrawerOpen;

  const handleToggleDrawer = () => {
    if (onToggleDrawer) {
      onToggleDrawer();
    } else {
      setInternalDrawerOpen((prev) => !prev);
    }
  };

  const handleCloseDrawer = () => {
    if (onToggleDrawer && effectiveDrawerOpen) {
      onToggleDrawer();
    } else {
      setInternalDrawerOpen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && effectiveDrawerOpen) {
        handleCloseDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveDrawerOpen]);

  const [primarySection, setPrimarySection] = useState<'create' | 'explore' | 'reflect'>('create');
  const [activeFeatureView, setActiveFeatureView] = useState<string | null>(null);
  const [connectDotsSubTab, setConnectDotsSubTab] = useState<'tree' | 'flowchart' | 'mindmap' | 'stories'>('tree');
  const [isQuietJournalModalOpen, setIsQuietJournalModalOpen] = useState(false);
  const [quietIncludeInAIHistory, setQuietIncludeInAIHistory] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<DashboardNavTab>('timeline');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<FilterCategory>('All Entries');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  
  // Modals state
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [inspectingSession, setInspectingSession] = useState<JournalSession | null>(null);

  // Goals suggestions & manual management state
  const [isSuggestingLongTerm, setIsSuggestingLongTerm] = useState(false);
  const [isSuggestingShortTerm, setIsSuggestingShortTerm] = useState(false);
  const [newGoalModalOpen, setNewGoalModalOpen] = useState(false);
  const [newGoalTimeframe, setNewGoalTimeframe] = useState<'long_term' | 'short_term'>('long_term');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalIntention, setNewGoalIntention] = useState('');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  // Custom Folder modal state
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#0d9488');

  // Segregate long-term and short-term goals
  const longTermGoals = useMemo(() => {
    return goals.filter((g) => g.timeframe === 'long_term' || (!g.timeframe && g.milestones.length > 2));
  }, [goals]);

  const shortTermGoals = useMemo(() => {
    return goals.filter((g) => g.timeframe === 'short_term' || (!g.timeframe && g.milestones.length <= 2));
  }, [goals]);

  const handleSuggestGoals = async (timeframe: 'long_term' | 'short_term') => {
    if (timeframe === 'long_term') setIsSuggestingLongTerm(true);
    else setIsSuggestingShortTerm(true);

    try {
      const res = await fetch('/api/gemini/goals/generate-dashboard-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions, timeframe }),
      });
      const data = await res.json();
      if (data.goals && Array.isArray(data.goals) && onSaveGoal) {
        for (const g of data.goals) {
          await onSaveGoal({
            id: g.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: user.uid,
            title: g.title,
            intention: g.intention || g.title,
            motivation: g.motivation,
            timeframe: timeframe,
            category: 'Personal Development',
            progress: 0,
            status: 'in_progress',
            milestones: (g.milestones || []).map((m: any, idx: number) => ({
              id: m.id || `ms_${Date.now()}_${idx}`,
              title: m.title,
              isCompleted: Boolean(m.isCompleted),
              status: m.isCompleted ? 'completed' : 'pending',
              order: idx + 1,
            })),
            relatedJournalRefs: sessions.slice(0, 2).map((s) => ({
              sessionId: s.id,
              sessionTitle: s.title || 'Journal Entry',
              date: s.createdAt,
              snippet: s.summary || s.messages[0]?.content || '',
              type: 'origin',
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Failed to generate goals:', err);
    } finally {
      if (timeframe === 'long_term') setIsSuggestingLongTerm(false);
      else setIsSuggestingShortTerm(false);
    }
  };

  const handleToggleMilestone = async (goal: PersonalGoal, milestoneId: string) => {
    if (!onSaveGoal) return;
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
    const completedCount = updatedMilestones.filter((m) => m.isCompleted).length;
    const progress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0;
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

  const handleCreateManualGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !onSaveGoal) return;
    const goal: PersonalGoal = {
      id: `goal_${Date.now()}`,
      userId: user.uid,
      title: newGoalTitle.trim(),
      intention: newGoalIntention.trim() || newGoalTitle.trim(),
      timeframe: newGoalTimeframe,
      category: 'Personal Growth',
      progress: 0,
      status: 'in_progress',
      milestones: newMilestoneTitle.trim() ? [
        {
          id: `ms_${Date.now()}`,
          title: newMilestoneTitle.trim(),
          isCompleted: false,
          status: 'pending',
          order: 1,
        }
      ] : [],
      relatedJournalRefs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveGoal(goal);
    setNewGoalTitle('');
    setNewGoalIntention('');
    setNewMilestoneTitle('');
    setNewGoalModalOpen(false);
  };

  const handleCreateCustomFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !onSaveCustomFolder) return;
    const folder: CustomFolder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      color: newFolderColor,
      createdAt: new Date().toISOString(),
    };
    await onSaveCustomFolder(folder);
    setNewFolderName('');
    setIsAddFolderModalOpen(false);
  };

  // Mood + Context Correlation state & analysis
  const [moodReport, setMoodReport] = useState<MoodCorrelationReport | null>(null);
  const [isAnalyzingMood, setIsAnalyzingMood] = useState(false);

  const handleFetchMoodCorrelations = useCallback(async () => {
    if (!sessions || sessions.length === 0) {
      setMoodReport({
        hasSufficientData: false,
        correlations: [],
        totalAnalyzedEntries: 0,
        modelUsed: 'heuristic',
        lastAnalyzed: new Date().toISOString(),
        message: 'Write at least two reflections with mood or context to reveal correlations.',
      });
      return;
    }

    setIsAnalyzingMood(true);
    try {
      const res = await fetch('/api/gemini/mood-correlations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions }),
      });
      if (res.ok) {
        const data: MoodCorrelationReport = await res.json();
        setMoodReport(data);
        if (user?.uid) {
          saveMoodCorrelationReport(user.uid, data).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Failed to analyze mood correlations:', err);
    } finally {
      setIsAnalyzingMood(false);
    }
  }, [sessions, user?.uid]);

  useEffect(() => {
    let isMounted = true;
    if (user?.uid) {
      fetchMoodCorrelationReport(user.uid)
        .then((cached) => {
          if (isMounted && cached && cached.correlations && cached.correlations.length > 0) {
            setMoodReport(cached);
          } else if (isMounted) {
            handleFetchMoodCorrelations();
          }
        })
        .catch(() => {
          if (isMounted) handleFetchMoodCorrelations();
        });
    } else {
      handleFetchMoodCorrelations();
    }
    return () => {
      isMounted = false;
    };
  }, [user?.uid, sessions.length, handleFetchMoodCorrelations]);

  const themeConfig = getThemeConfig(theme);

  // Dynamic Time of Day Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = user.displayName || user.email?.split('@')[0] || 'Explorer';

  // Filtered Sessions: Master feed with dynamic categories and zero physical duplication
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Category filter matching
      if (selectedCategoryFilter !== 'All Entries' && selectedCategoryFilter !== 'Select from list') {
        const cat = s.category || 'Journal';
        const matchesCat = cat.toLowerCase() === selectedCategoryFilter.toLowerCase();
        const matchesTag = s.tags?.some((t) => t.toLowerCase() === selectedCategoryFilter.toLowerCase());
        const matchesFolder = s.folderId === selectedCategoryFilter || s.tags?.includes(selectedCategoryFilter);
        if (!matchesCat && !matchesTag && !matchesFolder) return false;
      }

      // Location filter if active
      if (selectedLocationFilter !== 'all' && s.location !== selectedLocationFilter) {
        return false;
      }

      return true;
    });
  }, [sessions, selectedCategoryFilter, selectedLocationFilter]);

  // Unique locations from sessions
  const locationsList = useMemo(() => {
    const locs = new Set<string>();
    sessions.forEach((s) => {
      if (s.location) locs.add(s.location);
    });
    return Array.from(locs);
  }, [sessions]);

  // Media entries (entries with photos or snapshots)
  const mediaSessions = useMemo(() => {
    return sessions.filter((s) => s.imageUrl || s.messages.some((m) => m.content.includes('http')));
  }, [sessions]);

  const filterTabs: { label: FilterCategory; count?: number }[] = [
    { label: 'All Entries', count: sessions.length },
    { label: 'Brainstorm', count: sessions.filter((s) => s.category === 'Brainstorm').length },
    { label: 'Journal', count: sessions.filter((s) => !s.category || s.category === 'Journal').length },
    { label: 'Reflective', count: sessions.filter((s) => s.category === 'Reflective').length },
  ];

  const categoryColorMap: Record<string, { bg: string; text: string; border: string }> = {
    Brainstorm: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
    Journal: { bg: '#e0f2f1', text: '#00695c', border: '#80cbc4' },
    Reflective: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
    General: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  };

  return (
    <div 
      className={`min-h-screen flex flex-col relative theme-${themeConfig.preset} paper-${theme.paperTone || 'journey-clean'} ink-${theme.inkStyle || 'teal'}`}
      style={{
        color: themeConfig.inkColor
      }}
    >
      {/* Serene Mountain & River Landscape Main Canvas Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Full-coverage high-resolution serene mountain landscape */}
        <img
          src="/serene-mountain-bg.jpg"
          alt="Serene misty mountain and river landscape"
          className="w-full h-full object-cover object-center scale-[1.01]"
        />
        {/* Subtle translucent ice/fog veil with light blur so the landscape remains crisp and visible */}
        <div 
          className={`absolute inset-0 transition-colors duration-500 ${
            theme.darkMode 
              ? 'bg-slate-950/30' 
              : 'bg-white/10'
          }`}
          // style={{
          //   backdropFilter: 'blur(1px)',
          //   WebkitBackdropFilter: 'blur(1px)',
          // }}
        />
        {/* Very light frosty glaze */}
        <div 
          className={`absolute inset-0 pointer-events-none ${
            theme.darkMode
              ? 'bg-gradient-to-b from-sky-950/15 via-transparent to-slate-950/40'
              : 'bg-gradient-to-b from-white/25 via-transparent to-white/20'
          }`}
        />
      </div>

      {/* Main Workspace with floating translucent cards over the serene canvas */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto relative z-10">
        {/* Compact Header Banner: Takes ~10% screen height with greeting, weather, moments, controls in one line */}
        <div 
          className="border-b px-4 sm:px-6 py-2.5 sm:py-3 transition-colors"
          style={{
            backgroundColor: themeConfig.paperCardBg,
            borderColor: themeConfig.border,
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)'
          }}
        >
          <div className="max-w-6xl mx-auto space-y-2">
            {/* Unified Single Line: Greeting, Day, Temperature, Moments & Controls */}
            <div className="flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Left: Gemini spark + Compact Greeting + Day, Temperature & Moments in the SAME line */}
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-wrap">
                <div 
                  className="h-7 w-7 rounded-lg flex items-center justify-center border shrink-0 shadow-2xs"
                  style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                >
                  <GeminiIcon className="h-3.5 w-3.5" color={themeConfig.primary} accentColor={themeConfig.accentColor} />
                </div>

                {/* Smaller Greeting */}
                <h2 className="font-serif text-sm sm:text-base font-bold tracking-tight truncate shrink-0" style={{ color: themeConfig.inkColor }}>
                  {greeting}, {displayName.split(' ')[0]}
                </h2>

                <span className="opacity-30 text-xs hidden sm:inline">•</span>

                {/* Day/Date, Temperature and Moments */}
                <div className="flex items-center gap-1.5 text-xs font-medium opacity-90 flex-wrap">
                  <span className="text-[11px] sm:text-xs opacity-75">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className="opacity-30">•</span>
                  <span 
                    className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border text-[11px] shadow-2xs"
                    style={{
                      backgroundColor: themeConfig.chipBg,
                      color: themeConfig.inkColor,
                      borderColor: themeConfig.border
                    }}
                  >
                    <CloudSun className="h-3 w-3" style={{ color: themeConfig.primary }} />
                    <span>72°F Sunny</span>
                  </span>
                  <span className="opacity-30">•</span>
                  <span 
                    className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border text-[11px] shadow-2xs"
                    style={{
                      backgroundColor: themeConfig.chipBg,
                      color: themeConfig.inkColor,
                      borderColor: themeConfig.border
                    }}
                  >
                    <Flame className="h-3 w-3" style={{ color: themeConfig.accentColor }} />
                    <span>{sessions.length > 0 ? `${sessions.length} Moments` : 'Start Your Journal'}</span>
                  </span>
                </div>
              </div>

              {/* Right: Mode toggle, Settings, Profile in the SAME line */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {/* Light & Dark Mode Toggle */}
                <button
                  id="header-theme-toggle-btn"
                  onClick={() => onUpdateTheme({ ...theme, darkMode: !theme.darkMode })}
                  className="p-1.5 sm:p-2 rounded-full border text-xs flex items-center justify-center transition-all shadow-2xs hover:opacity-90 cursor-pointer shrink-0"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.primary,
                  }}
                  title={theme.darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  aria-label="Toggle Light and Dark Mode"
                >
                  {theme.darkMode ? (
                    <Sun className="h-3.5 w-3.5" style={{ color: themeConfig.primary }} />
                  ) : (
                    <Moon className="h-3.5 w-3.5" style={{ color: themeConfig.primary }} />
                  )}
                </button>

                {/* Settings (theme toggles) */}
                <button
                  id="header-settings-btn"
                  onClick={() => setIsThemeModalOpen(true)}
                  className="p-1.5 sm:p-2 rounded-full border text-xs flex items-center justify-center transition-all shadow-2xs hover:opacity-90 cursor-pointer shrink-0"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.primary,
                  }}
                  title="Settings & Themes"
                  aria-label="Open Settings"
                >
                  <Settings className="h-3.5 w-3.5" style={{ color: themeConfig.primary }} />
                </button>

                {/* Profile dropdown */}
                <div className="relative shrink-0">
                  <button
                    id="header-profile-btn"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border flex items-center justify-center font-bold text-xs shadow-2xs transition-all hover:scale-105 cursor-pointer overflow-hidden"
                    style={{
                      backgroundColor: themeConfig.primary,
                      borderColor: themeConfig.border,
                      color: '#ffffff',
                    }}
                    title="User Profile"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={displayName} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    ) : (
                      <span>{displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </button>

                  {isProfileMenuOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 rounded-2xl border p-3 shadow-xl z-50 animate-in fade-in"
                      style={{
                        backgroundColor: themeConfig.paperCardBg,
                        borderColor: themeConfig.border,
                        color: themeConfig.inkColor,
                        backdropFilter: 'blur(16px)',
                      }}
                    >
                      <div className="border-b pb-2 mb-2" style={{ borderColor: themeConfig.border }}>
                        <p className="font-bold text-xs truncate">{displayName}</p>
                        <p className="text-[11px] opacity-70 truncate">{user.email || 'Anonymous User'}</p>
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}>
                          Cloud Connected
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Row: The 3 Primary Section Tabs (CREATE, EXPLORE, REFLECT) + New Entry Action */}
            <div className="flex items-center justify-between gap-3 pt-1.5 border-t" style={{ borderColor: themeConfig.border }}>
              {/* Primary Section Switcher */}
              <div 
                className="inline-flex items-center gap-1 p-0.5 rounded-xl border shadow-2xs"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  borderColor: themeConfig.border,
                }}
              >
                {([
                  { id: 'create', label: 'CREATE', icon: Feather },
                  { id: 'explore', label: 'EXPLORE', icon: Compass },
                  { id: 'reflect', label: 'REFLECT', icon: Sparkles },
                ] as const).map((sec) => {
                  const Icon = sec.icon;
                  const isSelected = primarySection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setPrimarySection(sec.id);
                        setActiveFeatureView(null);
                      }}
                      className="px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      style={isSelected ? {
                        backgroundColor: themeConfig.primary,
                        color: '#ffffff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                      } : {
                        color: themeConfig.inkColor,
                        opacity: 0.75
                      }}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{sec.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Actions: New Entry button */}
              <button
                id="dashboard-new-entry-btn"
                onClick={() => onNewSession('Journal')}
                className="px-3.5 py-1 rounded-full text-white text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all transform hover:-translate-y-0.5 hover:opacity-90 cursor-pointer shrink-0"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <Plus className="h-3.5 w-3.5 text-white" />
                <span>New Entry (+)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Tabs Area */}
        <div className="max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-8 flex-1">
          {/* Synchronized Error & Reconnection Banner */}
          {errorMessage && (
            <div 
              id="dashboard-error-banner"
              className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm bg-rose-50 border-rose-200 text-rose-800 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold">Database Notice: </span>
                  <span>{errorMessage}</span>
                </div>
              </div>
              {onRetryLoad && (
                <button
                  id="dashboard-retry-sync-btn"
                  onClick={onRetryLoad}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Connection</span>
                </button>
              )}
            </div>
          )}

          {/* PRIMARY SECTION CONTENT OVERVIEW (When activeFeatureView === null) */}
          {activeFeatureView === null && (
            <>
              <PrimarySectionCards
                primarySection={primarySection}
                sessions={sessions}
                unfinishedThread={unfinishedThread}
                goals={goals}
                customFolders={customFolders}
                displayName={displayName}
                theme={theme}
                themeConfig={themeConfig}
                quietIncludeInAIHistory={quietIncludeInAIHistory}
                onSetQuietIncludeInAIHistory={setQuietIncludeInAIHistory}
                onNewSession={onNewSession}
                onSelectSession={onSelectSession}
                onContinueThread={onContinueThread}
                onDismissThread={onDismissThread}
                onOpenFeatureView={(view) => setActiveFeatureView(view)}
                onOpenQuietJournalModal={() => setIsQuietJournalModalOpen(true)}
                onSaveCustomFolder={onSaveCustomFolder}
              />

              {/* Active Category / Folder Filter Banner */}
              {selectedCategoryFilter !== 'All Entries' && (
                <div 
                  className="flex items-center justify-between p-3.5 px-5 rounded-2xl border mb-6 shadow-2xs"
                  style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70" style={{ color: themeConfig.inkColor }}>Active Folder:</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-xs" style={{ backgroundColor: themeConfig.primary }}>
                      {selectedCategoryFilter}
                    </span>
                    <span className="text-xs opacity-70 font-medium">({filteredSessions.length} moments found)</span>
                  </div>
                  <button 
                    onClick={() => setSelectedCategoryFilter('All Entries')}
                    className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full border hover:opacity-90 transition-all cursor-pointer"
                    style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.primary }}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Show All Entries</span>
                  </button>
                </div>
              )}

              {/* Master Chronological Feed */}
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" style={{ color: themeConfig.primary }} />
                    <h3 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                      {selectedCategoryFilter} ({filteredSessions.length})
                    </h3>
                  </div>
                  <span className="text-xs opacity-60 font-medium">
                    Sorted chronologically by latest entry
                  </span>
                </div>

                {filteredSessions.length === 0 ? (
                  <div 
                    className="rounded-3xl p-12 text-center border shadow-2xs"
                    style={{
                      backgroundColor: themeConfig.paperCardBg,
                      borderColor: themeConfig.border
                    }}
                  >
                    <BookOpen className="h-12 w-12 opacity-30 mx-auto mb-3" />
                    <h4 className="font-serif text-base font-bold" style={{ color: themeConfig.inkColor }}>No journal entries found</h4>
                    <p className="text-xs opacity-70 mt-1 max-w-sm mx-auto">
                      Click "New Entry (+)" to record your first brainstorm or reflection.
                    </p>
                    <button
                      onClick={() => onNewSession('Journal')}
                      className="mt-4 px-6 py-2.5 rounded-full text-white text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      Write First Journal Entry
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSessions.map((session) => {
                      const category = session.category || 'Journal';
                      const catStyle = categoryColorMap[category] || categoryColorMap.General;
                      const dateObj = new Date(session.updatedAt || session.createdAt);
                      const monthStr = dateObj.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
                      const dayStr = dateObj.getDate();
                      const weekdayStr = dateObj.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
                      const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div
                          key={session.id}
                          onClick={() => setInspectingSession(session)}
                          className={`theme-card rounded-3xl p-5 border transition-all cursor-pointer relative group flex flex-col justify-between ${themeConfig.rulingClass}`}
                          style={{
                            backgroundColor: themeConfig.paperCardBg,
                            borderColor: themeConfig.border,
                          }}
                        >

                          <div>
                            {/* Card Header: Date Stamp & Category */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                {/* Calendar Stamp */}
                                <div 
                                  className="h-12 w-12 rounded-2xl border text-center flex flex-col justify-center shrink-0 shadow-2xs"
                                  style={{
                                    backgroundColor: themeConfig.calendarStampBg,
                                    borderColor: themeConfig.border,
                                    color: themeConfig.calendarStampText
                                  }}
                                >
                                  <span className="text-[9px] font-bold tracking-wider">{monthStr}</span>
                                  <span className="text-base font-extrabold leading-none">{dayStr}</span>
                                </div>

                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs"
                                      style={{
                                        backgroundColor: catStyle.bg,
                                        color: catStyle.text,
                                        borderColor: catStyle.border,
                                      }}
                                    >
                                      #{category}
                                    </span>
                                    {session.sentiment && (
                                      <span 
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                                        style={{
                                          backgroundColor: themeConfig.chipBg,
                                          color: themeConfig.chipText,
                                          borderColor: themeConfig.border
                                        }}
                                      >
                                        {session.sentiment}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px] opacity-70 mt-1 font-medium">
                                    <span>{weekdayStr} • {timeStr}</span>
                                    {session.location && (
                                      <span className="flex items-center gap-0.5">
                                        <MapPin className="h-3 w-3 text-rose-500" />
                                        <span>{session.location}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Mood or Star */}
                              <div className="flex items-center gap-1">
                                {session.mood && (
                                  <span className="text-sm" title={session.mood}>
                                    {session.mood.split(' ')[0]}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Title */}
                            <h4 className="font-serif text-base font-bold transition-colors line-clamp-1" style={{ color: themeConfig.inkColor }}>
                              {session.title || 'Untitled Moment'}
                            </h4>

                            {/* Content / Summary Snippet */}
                            <p className="text-xs opacity-80 mt-2 line-clamp-2 leading-relaxed font-normal">
                              {session.summary || session.messages[session.messages.length - 1]?.content || 'Empty entry. Click to add thoughts.'}
                            </p>
                          </div>

                          {/* Card Footer */}
                          <div className="mt-4 pt-3 border-t flex items-center justify-between text-[11px] opacity-80" style={{ borderColor: themeConfig.border }}>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 font-medium">
                                <MessageSquare className="h-3 w-3 opacity-60" />
                                <span>{session.messages.length} notes</span>
                              </span>
                              {session.weather && (
                                <span className="flex items-center gap-1">
                                  <Sun className="h-3 w-3 text-amber-500" />
                                  <span>{session.weather}</span>
                                </span>
                              )}
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSession(session.id);
                              }}
                              className="text-xs font-bold flex items-center gap-1 hover:underline"
                              style={{ color: themeConfig.primary }}
                            >
                              <span>Open</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ACTIVE FEATURE VIEW (When activeFeatureView !== null) */}
          {activeFeatureView !== null && (
            <div className="space-y-6">
              {/* Breadcrumb Header */}
              <div 
                className="flex items-center justify-between gap-4 p-4 rounded-3xl border shadow-2xs"
                style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveFeatureView(null)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-2xs hover:opacity-85 transition-all cursor-pointer"
                    style={{
                      backgroundColor: themeConfig.chipBg,
                      borderColor: themeConfig.border,
                      color: themeConfig.primary,
                    }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to {primarySection.toUpperCase()}</span>
                  </button>
                  <span className="text-xs opacity-40">/</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: themeConfig.inkColor }}>
                      {activeFeatureView === 'thought-to-action' ? 'Thought → Action (Task Dependencies & Intelligent Ordering)' :
                       activeFeatureView === 'goals' ? 'Goals and Planning (with Study Tracking)' :
                       activeFeatureView === 'projects' ? 'Projects & Collections' :
                       activeFeatureView === 'mind-maps' ? 'Mind Maps (Interactive Thought Web)' :
                       activeFeatureView === 'connect-dots' ? 'Connect the Dots (Mind Tree, Flowcharts, Mind Map & Story Threads)' :
                       activeFeatureView === 'summaries' ? 'AI-generated Summaries' :
                       activeFeatureView === 'mood-calendar' ? 'Mood Calendar' :
                       activeFeatureView === 'mood-correlation' ? 'Mood + Context Correlation' :
                       activeFeatureView.replace(/-/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. THOUGHT TO ACTION (Task Dependencies & Intelligent Ordering) */}
              {activeFeatureView === 'thought-to-action' && (
                <ActionEngine 
                  sessions={sessions} 
                  theme={theme}
                  onUpdateSession={onUpdateSession}
                  onOpenSession={onSelectSession}
                />
              )}

              {/* 2. GOALS AND PLANNING (with Study Tracking) */}
              {activeFeatureView === 'goals' && (
                <GoalsView
                  user={user}
                  goals={goals}
                  sessions={sessions}
                  theme={theme}
                  onSaveGoal={onSaveGoal || (async () => {})}
                  onDeleteGoal={onDeleteGoal || (async () => {})}
                  onUpdateSession={async (u) => {
                    if (onUpdateSession) onUpdateSession(u.id, u);
                  }}
                  onOpenSession={onSelectSession}
                  onReflectOnGoal={(goal) => {
                    onNewSession('Reflective');
                  }}
                />
              )}

              {/* 3. PROJECTS */}
              {activeFeatureView === 'projects' && (
                <div 
                  className="rounded-3xl p-6 sm:p-8 border shadow-2xs space-y-6"
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: themeConfig.border,
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-serif text-xl font-bold" style={{ color: themeConfig.inkColor }}>
                        Projects & Topic Folders
                      </h3>
                      <p className="text-xs opacity-75 mt-1">
                        Organize interconnected thoughts, research sprints, and study modules.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddFolderModalOpen(true)}
                      className="px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 transition-all cursor-pointer"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Project Folder</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Default Project Collections */}
                    {[
                      { name: 'Brainstorm Ideas', category: 'Brainstorm', icon: Lightbulb, color: '#f59e0b' },
                      { name: 'Daily Reflections', category: 'Journal', icon: BookOpen, color: '#0d9488' },
                      { name: 'Philosophy & Deep Thoughts', category: 'Reflective', icon: Feather, color: '#8b5cf6' },
                      { name: 'Projects & Study Tracks', category: 'Projects', icon: Compass, color: '#3b82f6' },
                    ].map((item) => {
                      const count = sessions.filter(s => s.category === item.category).length;
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.name}
                          onClick={() => {
                            setSelectedCategoryFilter(item.category as FilterCategory);
                            setActiveFeatureView(null);
                          }}
                          className="p-5 rounded-2xl border shadow-2xs flex flex-col justify-between transition-all hover:scale-101 cursor-pointer"
                          style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="h-9 w-9 rounded-xl flex items-center justify-center border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: item.color }}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
                              {count} entries
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm" style={{ color: themeConfig.inkColor }}>{item.name}</h4>
                            <span className="text-[11px] opacity-70 mt-1 block">Click to view project entries</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Custom Folders */}
                    {customFolders.map((folder) => {
                      const count = sessions.filter(s => s.folderId === folder.id || s.category === folder.name).length;
                      return (
                        <div
                          key={folder.id}
                          onClick={() => {
                            setSelectedCategoryFilter(folder.name as FilterCategory);
                            setActiveFeatureView(null);
                          }}
                          className="p-5 rounded-2xl border shadow-2xs flex flex-col justify-between transition-all hover:scale-101 cursor-pointer"
                          style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="h-9 w-9 rounded-xl flex items-center justify-center border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: folder.color || themeConfig.primary }}>
                              <Folder className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
                              {count} entries
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm" style={{ color: themeConfig.inkColor }}>{folder.name}</h4>
                            <span className="text-[11px] opacity-70 mt-1 block">Custom project collection</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. MIND MAPS (Auto-generated & Editable with shapes) */}
              {activeFeatureView === 'mind-maps' && (
                <div 
                  className="rounded-3xl p-4 sm:p-6 border shadow-2xs"
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: themeConfig.border,
                  }}
                >
                  <MindMapView
                    sessions={sessions}
                    themeConfig={themeConfig}
                    onSelectNode={(node) => {
                      if (node.id) onSelectSession(node.id);
                    }}
                    onOpenEditor={(id) => onSelectSession(id)}
                    userName={displayName}
                  />
                </div>
              )}

              {/* 5. CONNECT THE DOTS (Mind Tree, Flowcharts, Mind Map & Story Threads) */}
              {activeFeatureView === 'connect-dots' && (
                <div className="space-y-4">
                  <div 
                    className="flex items-center gap-2 p-1.5 rounded-2xl border shadow-2xs self-start inline-flex flex-wrap"
                    style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                  >
                    <button
                      onClick={() => setConnectDotsSubTab('tree')}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      style={connectDotsSubTab === 'tree' ? {
                        backgroundColor: themeConfig.primary,
                        color: '#ffffff',
                      } : {
                        color: themeConfig.inkColor,
                        opacity: 0.75
                      }}
                    >
                      <TreeDeciduous className="h-3.5 w-3.5" />
                      <span>Mind Tree</span>
                    </button>
                    <button
                      onClick={() => setConnectDotsSubTab('flowchart')}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      style={connectDotsSubTab === 'flowchart' ? {
                        backgroundColor: themeConfig.primary,
                        color: '#ffffff',
                      } : {
                        color: themeConfig.inkColor,
                        opacity: 0.75
                      }}
                    >
                      <Workflow className="h-3.5 w-3.5" />
                      <span>Flowcharts</span>
                    </button>
                    <button
                      onClick={() => setConnectDotsSubTab('mindmap')}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      style={connectDotsSubTab === 'mindmap' ? {
                        backgroundColor: themeConfig.primary,
                        color: '#ffffff',
                      } : {
                        color: themeConfig.inkColor,
                        opacity: 0.75
                      }}
                    >
                      <Network className="h-3.5 w-3.5" />
                      <span>Mind Map</span>
                    </button>
                    <button
                      onClick={() => setConnectDotsSubTab('stories')}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      style={connectDotsSubTab === 'stories' ? {
                        backgroundColor: themeConfig.primary,
                        color: '#ffffff',
                      } : {
                        color: themeConfig.inkColor,
                        opacity: 0.75
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Story Threads</span>
                    </button>
                  </div>

                  {connectDotsSubTab === 'tree' && (
                    <div 
                      className="rounded-3xl border shadow-md overflow-hidden h-[780px] sm:h-[860px] flex flex-col relative"
                      style={{
                        backgroundColor: themeConfig.paperCardBg,
                        borderColor: themeConfig.border
                      }}
                    >
                      <MindGarden 
                        sessions={sessions} 
                        theme={theme}
                        onSelectSession={(session) => onSelectSession(session.id)}
                      />
                    </div>
                  )}

                  {connectDotsSubTab === 'flowchart' && (
                    <FlowchartView
                      sessions={sessions}
                      themeConfig={themeConfig}
                      onUpdateSession={onUpdateSession}
                      onSelectNode={(node) => {
                        if (node.id) onSelectSession(node.id);
                      }}
                      onOpenEditor={(id) => onSelectSession(id)}
                    />
                  )}

                  {connectDotsSubTab === 'mindmap' && (
                    <div 
                      className="rounded-3xl p-4 sm:p-6 border shadow-2xs"
                      style={{
                        backgroundColor: themeConfig.paperCardBg,
                        borderColor: themeConfig.border,
                      }}
                    >
                      <MindMapView
                        sessions={sessions}
                        themeConfig={themeConfig}
                        onSelectNode={(node) => {
                          if (node.id) onSelectSession(node.id);
                        }}
                        onOpenEditor={(id) => onSelectSession(id)}
                        userName={displayName}
                      />
                    </div>
                  )}

                  {connectDotsSubTab === 'stories' && (
                    <IdeaEvolutionGraph 
                      sessions={sessions} 
                      theme={theme}
                      initialViewMode="stories"
                      onOpenEditor={onSelectSession}
                      onUpdateSession={onUpdateSession}
                      onNewSessionWithPrompt={(initialText, category) => {
                        onNewSession(category as any);
                      }}
                    />
                  )}
                </div>
              )}

              {/* 6. AI-GENERATED SUMMARIES */}
              {activeFeatureView === 'summaries' && (
                <div 
                  className="rounded-3xl p-6 sm:p-8 border shadow-2xs space-y-6"
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: themeConfig.border,
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-serif text-xl font-bold" style={{ color: themeConfig.inkColor }}>
                        AI-Generated Summaries & Distillations
                      </h3>
                      <p className="text-xs opacity-75 mt-1">
                        Synthesized cognitive takeaways and emotional milestones across all recorded moments.
                      </p>
                    </div>
                    <button
                      onClick={() => onNewSession('Reflective')}
                      className="px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 transition-all cursor-pointer"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      <Sparkle className="h-3.5 w-3.5" />
                      <span>Synthesize New Reflection</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sessions.filter(s => s.summary).slice(0, 8).map((s) => (
                      <div
                        key={s.id}
                        onClick={() => onSelectSession(s.id)}
                        className="p-5 rounded-2xl border shadow-2xs transition-all hover:scale-101 cursor-pointer flex flex-col justify-between"
                        style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}>
                              {s.category || 'Journal'}
                            </span>
                            <span className="text-[11px] opacity-60">
                              {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <h4 className="font-serif font-bold text-sm mb-1.5" style={{ color: themeConfig.inkColor }}>
                            {s.title}
                          </h4>
                          <p className="text-xs opacity-80 leading-relaxed line-clamp-3">
                            {s.summary}
                          </p>
                        </div>
                        <div className="mt-4 pt-2.5 border-t flex items-center justify-between text-xs font-bold" style={{ borderColor: themeConfig.border, color: themeConfig.primary }}>
                          <span>Open Full Entry</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    ))}
                    {sessions.filter(s => s.summary).length === 0 && (
                      <div className="col-span-full p-8 rounded-2xl border border-dashed text-center opacity-70 text-sm">
                        No AI summaries generated yet. Complete a reflection or conversation with Gemini to see synthesized summaries.
                      </div>
                    )}
                  </div>
                </div>
              )}

  


              {/* 8. MOOD CALENDAR */}
              {activeFeatureView === 'mood-calendar' && (
                <div className="rounded-3xl overflow-hidden">
                  <CalendarView
                    user={user}
                    sessions={sessions}
                    goals={goals}
                    onNewSession={onNewSession}
                    onSelectSession={onSelectSession}
                    onViewAllGoals={() => {
                      setPrimarySection('create');
                      setActiveFeatureView('goals');
                    }}
                    onAddGoal={onSaveGoal}
                    theme={theme}
                  />
                </div>
              )}

              {/* 9. MOOD + CONTEXT CORRELATION */}
              {activeFeatureView === 'mood-correlation' && (
                <div className="space-y-4">
                  <MoodCorrelationCard
                    report={moodReport}
                    isLoading={isAnalyzingMood}
                    onRefresh={handleFetchMoodCorrelations}
                    onSelectSession={onSelectSession}
                    themeConfig={{
                      paperCardBg: themeConfig.paperCardBg,
                      border: themeConfig.border,
                      inkColor: themeConfig.inkColor,
                      primary: themeConfig.primary,
                      chipBg: themeConfig.chipBg,
                      accent: themeConfig.accentColor,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Add Custom Folder Modal */}
      {isAddFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div 
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl relative"
            style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div 
                  className="h-8 w-8 rounded-xl flex items-center justify-center border shadow-2xs"
                  style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
                >
                  <Folder className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                  Add Custom Folder
                </h3>
              </div>
              <button 
                onClick={() => setIsAddFolderModalOpen(false)}
                className="p-1 rounded-xl opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5" style={{ color: themeConfig.inkColor }}>
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Travel 2026, Startup Ideas, Book Notes"
                  className="w-full px-4 py-2.5 rounded-2xl border text-xs focus:outline-none transition-all shadow-2xs"
                  style={{
                    backgroundColor: themeConfig.paperBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.inkColor,
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5" style={{ color: themeConfig.inkColor }}>
                  Color Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['#b45309', '#0d9488', '#8b5cf6', '#3b82f6', '#e11d48', '#10b981', '#6366f1'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewFolderColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition-transform ${newFolderColor === c ? 'scale-115 ring-2 ring-offset-2' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c, borderColor: 'rgba(255,255,255,0.4)' }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: themeConfig.border }}>
                <button
                  type="button"
                  onClick={() => setIsAddFolderModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold border opacity-70 hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-white text-xs font-bold shadow-xs hover:opacity-90 active:scale-98 transition-all"
                  style={{ backgroundColor: themeConfig.primary }}
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Manual Goal Modal */}
      {newGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div 
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl relative"
            style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div 
                  className="h-8 w-8 rounded-xl flex items-center justify-center border shadow-2xs"
                  style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
                >
                  <Target className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                  {newGoalTimeframe === 'long_term' ? 'New Long-Term Goal' : 'New Sprint Goal'}
                </h3>
              </div>
              <button 
                onClick={() => setNewGoalModalOpen(false)}
                className="p-1 rounded-xl opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1" style={{ color: themeConfig.inkColor }}>
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder={newGoalTimeframe === 'long_term' ? 'e.g. Master Machine Learning Fundamentals' : 'e.g. Complete Chapters 1-3 & Run Evaluation'}
                  className="w-full px-4 py-2 rounded-2xl border text-xs focus:outline-none transition-all shadow-2xs"
                  style={{
                    backgroundColor: themeConfig.paperBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.inkColor,
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1" style={{ color: themeConfig.inkColor }}>
                  Intention / Why It Matters
                </label>
                <input
                  type="text"
                  value={newGoalIntention}
                  onChange={(e) => setNewGoalIntention(e.target.value)}
                  placeholder="e.g. To build intuition and confidence before launching my project"
                  className="w-full px-4 py-2 rounded-2xl border text-xs focus:outline-none transition-all shadow-2xs"
                  style={{
                    backgroundColor: themeConfig.paperBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.inkColor,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1" style={{ color: themeConfig.inkColor }}>
                  First Milestone / Action Step
                </label>
                <input
                  type="text"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="e.g. Set up repository and write first 5 prompts"
                  className="w-full px-4 py-2 rounded-2xl border text-xs focus:outline-none transition-all shadow-2xs"
                  style={{
                    backgroundColor: themeConfig.paperBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.inkColor,
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewGoalTimeframe('long_term')}
                    className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                    style={newGoalTimeframe === 'long_term' ? {
                      backgroundColor: themeConfig.primary,
                      color: '#ffffff',
                      borderColor: themeConfig.primary
                    } : {
                      backgroundColor: themeConfig.chipBg,
                      color: themeConfig.inkColor,
                      borderColor: themeConfig.border
                    }}
                  >
                    Long-Term
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGoalTimeframe('short_term')}
                    className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                    style={newGoalTimeframe === 'short_term' ? {
                      backgroundColor: themeConfig.accentColor,
                      color: '#ffffff',
                      borderColor: themeConfig.accentColor
                    } : {
                      backgroundColor: themeConfig.chipBg,
                      color: themeConfig.inkColor,
                      borderColor: themeConfig.border
                    }}
                  >
                    Sprint
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewGoalModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold border opacity-70 hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-xs hover:opacity-90 active:scale-98 transition-all"
                    style={{ backgroundColor: themeConfig.primary }}
                  >
                    Save Goal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiet Journal (Journal Without Gemini) Options Modal */}
      {isQuietJournalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div 
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl relative"
            style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div 
                  className="h-9 w-9 rounded-2xl flex items-center justify-center border shadow-2xs"
                  style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
                >
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                    Journal Without Gemini
                  </h3>
                  <p className="text-xs opacity-70">Quiet, offline-style personal writing</p>
                </div>
              </div>
              <button 
                onClick={() => setIsQuietJournalModalOpen(false)}
                className="p-1 rounded-xl opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div 
                className="p-4 rounded-2xl border flex items-start gap-3"
                style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
              >
                <Sparkle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: themeConfig.primary }} />
                <div className="space-y-1">
                  <p className="text-xs font-bold" style={{ color: themeConfig.inkColor }}>
                    Include in AI History as Summary?
                  </p>
                  <p className="text-[11px] opacity-75 leading-relaxed">
                    Choose whether you want Gemini to ingest a condensed summary of this entry into your future AI conversation history.
                  </p>
                </div>
              </div>

              <label 
                className="flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all hover:opacity-90"
                style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold" style={{ color: themeConfig.inkColor }}>
                    Sync Summary to AI History
                  </span>
                  <span className="text-[10px] opacity-60">
                    {quietIncludeInAIHistory 
                      ? "Summary will be accessible for AI insights & macro trends"
                      : "Completely excluded from AI context and memory"}
                  </span>
                </div>
                <input 
                  type="checkbox"
                  checked={quietIncludeInAIHistory}
                  onChange={(e) => setQuietIncludeInAIHistory(e.target.checked)}
                  className="h-4 w-4 rounded cursor-pointer"
                  style={{ accentColor: themeConfig.primary }}
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: themeConfig.border }}>
                <button
                  type="button"
                  onClick={() => setIsQuietJournalModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold border opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuietJournalModalOpen(false);
                    onNewSession('Journal', true, undefined, quietIncludeInAIHistory);
                  }}
                  className="px-5 py-2 rounded-full text-white text-xs font-bold shadow-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                  style={{ backgroundColor: themeConfig.primary }}
                >
                  Start Writing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Settings Modal */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        theme={theme}
        onUpdateTheme={onUpdateTheme}
      />

      {/* Detailed Entry Viewer Modal */}
      <EntryDetailModal
        session={inspectingSession}
        isOpen={inspectingSession !== null}
        onClose={() => setInspectingSession(null)}
        onOpenEditor={(id) => {
          onSelectSession(id);
          setInspectingSession(null);
        }}
        onDeleteSession={(id) => {
          onDeleteSession(id);
          setInspectingSession(null);
        }}
        theme={theme}
      />
    </div>
  );
};
