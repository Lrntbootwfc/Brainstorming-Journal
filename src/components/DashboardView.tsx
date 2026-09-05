import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  BookOpen, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Image as ImageIcon, 
  MapPin, 
  Palette, 
  Clock, 
  CheckSquare, 
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
  RefreshCw
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
import { WhatsAppChatModal } from './WhatsAppChatModal';
import { ThemeModal } from './ThemeModal';
import { EntryDetailModal } from './EntryDetailModal';
import { IdeaEvolutionGraph } from './IdeaEvolutionGraph';
import { ActionEngine } from './ActionEngine';
import { MindGarden } from './MindGarden';
import { GoalsView } from './GoalsView';
import { MoodCorrelationCard } from './MoodCorrelationCard';
import { CalendarView } from './CalendarView';
import { GeminiIcon } from './GeminiIcon';
import { fetchMoodCorrelationReport, saveMoodCorrelationReport } from '../utils/firestore';

interface DashboardViewProps {
  user: User;
  sessions: JournalSession[];
  onNewSession: (category?: 'Brainstorm' | 'Journal' | 'Reflective', withoutAI?: boolean, folderId?: string) => void;
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

  const [activeTab, setActiveTab] = useState<DashboardNavTab>('timeline');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<FilterCategory>('All Entries');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  
  // Modals state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
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

      // Search query matching across title, summary, message contents, tags, location
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const titleMatch = s.title?.toLowerCase().includes(q);
      const summaryMatch = s.summary?.toLowerCase().includes(q);
      const messageMatch = s.messages.some((m) => m.content.toLowerCase().includes(q));
      const tagMatch = s.tags?.some((t) => t.toLowerCase().includes(q));
      const locMatch = s.location?.toLowerCase().includes(q);

      return titleMatch || summaryMatch || messageMatch || tagMatch || locMatch;
    });
  }, [sessions, selectedCategoryFilter, searchQuery, selectedLocationFilter]);

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

  const handleToggleSelect = (sessionId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSessionIds.length === filteredSessions.length) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(filteredSessions.map((s) => s.id));
    }
  };

  const handleBatchAssign = (cat: 'Brainstorm' | 'Journal' | 'Reflective') => {
    if (onBatchUpdateCategory && selectedSessionIds.length > 0) {
      onBatchUpdateCategory(selectedSessionIds, cat);
      setSelectedSessionIds([]);
      setIsMultiSelectMode(false);
    }
  };

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
      className={`min-h-screen flex flex-row theme-${themeConfig.preset} paper-${theme.paperTone || 'journey-clean'} ink-${theme.inkStyle || 'teal'}`}
      style={{
        backgroundColor: themeConfig.paperBg,
        color: themeConfig.inkColor
      }}
    >
      {/* Mobile backdrop when drawer is open on mobile screens */}
      {effectiveDrawerOpen && (
        <div 
          onClick={handleCloseDrawer}
          className="fixed inset-0 bg-black/25 backdrop-blur-2xs z-30 md:hidden"
        />
      )}

      {/* Non-blocking Navigation Sidebar Panel */}
      <aside 
        id="dashboard-navigation-sidebar"
        className={`fixed md:sticky top-0 h-screen w-80 max-w-[85vw] p-5 flex flex-col justify-between shrink-0 shadow-xl md:shadow-none z-40 border-r transition-all duration-300 ease-in-out ${
          effectiveDrawerOpen 
            ? 'translate-x-0 md:w-80 md:opacity-100' 
            : '-translate-x-full md:translate-x-0 md:w-0 md:p-0 md:opacity-0 md:border-r-0 overflow-hidden pointer-events-none'
        }`}
        style={{
          backgroundColor: themeConfig.paperCardBg,
          borderColor: themeConfig.border
        }}
      >
        <div className="overflow-y-auto pr-1">
          {/* Brand Header with Close Button */}
          <div 
            className="flex items-center justify-between pb-4 mb-5 border-b"
            style={{ borderColor: themeConfig.border }}
          >
            <div 
              onClick={() => {
                handleCloseDrawer();
                if (onViewLanding) onViewLanding();
              }}
              role={onViewLanding ? "button" : undefined}
              tabIndex={onViewLanding ? 0 : undefined}
              title={onViewLanding ? "View Landing Page & Hero Overview" : undefined}
              className={`flex items-center gap-3 ${onViewLanding ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
            >
              <div 
                className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-xs border"
                style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
              >
                <GeminiIcon className="h-5 w-5" color={themeConfig.primary} accentColor={themeConfig.accentColor} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-serif font-bold text-base leading-tight" style={{ color: themeConfig.inkColor }}>
                    Brainstorming Journal
                  </h1>
                </div>
                <p className="text-[11px] opacity-70 font-medium">
                  An AI journal that remembers how you think
                </p>
              </div>
            </div>

            <button
              onClick={handleCloseDrawer}
              className="p-1.5 rounded-xl transition-colors opacity-70 hover:opacity-100"
              style={{ color: themeConfig.inkColor }}
              title="Close Drawer"
              aria-label="Close navigation drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {([
              { id: 'timeline', label: 'Dashboard', icon: Clock },
              { id: 'goals', label: 'Goals & Planning', icon: Target },
              { id: 'evolution', label: 'Connect the Dots', icon: GitBranch },
              { id: 'actions', label: 'Action Engine', icon: CheckCircle },
              { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
              { id: 'media', label: 'Media & Snapshots', icon: ImageIcon },
              { id: 'atlas', label: 'Atlas & Locations', icon: MapPin },
              { id: 'coach', label: 'Brainstorm Coach', icon: Lightbulb },
            ] as { id: string; label: string; icon: any; badge?: string }[]).map((tabItem) => {
              const Icon = tabItem.icon;
              const isSelected = activeTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  onClick={() => {
                    setActiveTab(tabItem.id as DashboardNavTab);
                    if (window.innerWidth < 768) {
                      handleCloseDrawer();
                    }
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                  style={isSelected ? {
                    backgroundColor: themeConfig.primary,
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  } : {
                    color: themeConfig.inkColor,
                    opacity: 0.8
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{tabItem.label}</span>
                  </div>
                  {tabItem.badge && (
                    <span 
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                      style={isSelected ? {
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        color: '#ffffff'
                      } : {
                        backgroundColor: themeConfig.chipBg,
                        color: themeConfig.primary
                      }}
                    >
                      {tabItem.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              onClick={() => {
                setIsThemeModalOpen(true);
                handleCloseDrawer();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-100"
              style={{
                color: themeConfig.primary,
                backgroundColor: themeConfig.chipBg
              }}
            >
              <Palette className="h-4 w-4" style={{ color: themeConfig.primary }} />
              <span>Journal Themes</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              id="dashboard-dark-mode-toggle"
              onClick={() => onUpdateTheme({ ...theme, darkMode: !theme.darkMode })}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-100 border"
              style={{
                color: themeConfig.inkColor,
                backgroundColor: themeConfig.chipBg,
                borderColor: themeConfig.border,
              }}
            >
              <div className="flex items-center gap-3">
                {theme.darkMode ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-500" />
                )}
                <span>{theme.darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </div>
              <span 
                className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: themeConfig.cardBg,
                  color: themeConfig.inkColor,
                }}
              >
                {theme.darkMode ? 'Dark' : 'Light'}
              </span>
            </button>
          </nav>

          {/* Quick Action: Chat With Your Journal */}
          <div 
            className="mt-6 p-4 rounded-3xl border shadow-2xs"
            style={{
              backgroundColor: themeConfig.chipBg,
              borderColor: themeConfig.border
            }}
          >
            <div className="flex items-center gap-2 text-xs font-bold mb-1" style={{ color: themeConfig.primary }}>
              <GeminiIcon className="h-4 w-4" color={themeConfig.primary} accentColor={themeConfig.accentColor} />
              <span>Journal Companion AI</span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed mb-3">
              Converse with your entire life timeline and memory records.
            </p>
            <button
              id="sidebar-chat-companion-btn"
              onClick={() => {
                setIsChatModalOpen(true);
                handleCloseDrawer();
              }}
              className="w-full py-2 px-3 rounded-2xl text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 shadow-xs transition-all"
              style={{ backgroundColor: themeConfig.primary }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Talk to Your Journal</span>
            </button>
          </div>
        </div>

        {/* User Card & Sign Out */}
        <div className="pt-4 mt-4 border-t flex items-center justify-between shrink-0" style={{ borderColor: themeConfig.border }}>
          <div className="flex items-center gap-2.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full border object-cover shadow-2xs"
                style={{ borderColor: themeConfig.border }}
              />
            ) : (
              <div 
                className="h-9 w-9 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-2xs"
                style={{ backgroundColor: themeConfig.primary }}
              >
                {displayName[0].toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate max-w-[110px]" style={{ color: themeConfig.inkColor }}>
                {displayName}
              </p>
              <p className="text-[10px] font-medium" style={{ color: themeConfig.primary }}>Cloud Connected</p>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Header Banner: Atmosphere, Weather, Streak */}
        <div 
          className="border-b px-4 sm:px-8 py-5 shadow-2xs"
          style={{
            backgroundColor: themeConfig.paperCardBg,
            borderColor: themeConfig.border
          }}
        >
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <button
                id="dashboard-open-drawer-btn"
                onClick={handleToggleDrawer}
                className="p-2.5 rounded-2xl border shadow-2xs flex items-center justify-center transition-all hover:opacity-90 shrink-0 mt-0.5 sm:mt-0"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  borderColor: themeConfig.border,
                  color: themeConfig.inkColor,
                }}
                title="Open Navigation"
                aria-label="Open Navigation"
              >
                <GeminiIcon className="h-4 w-4" color={themeConfig.primary} accentColor={themeConfig.accentColor} />
              </button>

              <div>
                <div className="flex items-center gap-2 text-xs font-medium opacity-80 mb-1">
                  <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>•</span>
                  <span 
                    className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: themeConfig.chipBg,
                      color: themeConfig.chipText,
                      borderColor: themeConfig.border
                    }}
                  >
                    <CloudSun className="h-3.5 w-3.5 text-amber-500" />
                    72°F Sunny
                  </span>
                  <span>•</span>
                  <span 
                    className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: themeConfig.chipBg,
                      color: themeConfig.chipText,
                      borderColor: themeConfig.border
                    }}
                  >
                    <Flame className="h-3.5 w-3.5 text-amber-500" />
                    {sessions.length > 0 ? `${sessions.length} Moments` : 'Start Your Journal'}
                  </span>
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: themeConfig.inkColor }}>
                  {greeting}, {displayName.split(' ')[0]}
                </h2>
                <p className="text-xs sm:text-sm opacity-70 mt-0.5 font-medium">
                  "An AI journal that remembers how you think."
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Input */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 opacity-50" style={{ color: themeConfig.inkColor }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search journals & notes..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-full border text-xs focus:outline-none transition-all shadow-2xs"
                  style={{
                    backgroundColor: themeConfig.paperBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.inkColor
                  }}
                />
              </div>

              {/* Select from list (Multi-select toggle) */}
              <button
                onClick={() => setIsMultiSelectMode((prev) => !prev)}
                className="px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all border"
                style={isMultiSelectMode ? {
                  backgroundColor: themeConfig.accentColor,
                  color: '#ffffff',
                  borderColor: themeConfig.accentColor,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                } : {
                  backgroundColor: themeConfig.chipBg,
                  color: themeConfig.inkColor,
                  borderColor: themeConfig.border,
                  opacity: 0.85
                }}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Multi-select</span>
                {selectedSessionIds.length > 0 && (
                  <span className="bg-white text-rose-600 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                    {selectedSessionIds.length}
                  </span>
                )}
              </button>

              <button
                id="dashboard-new-entry-btn"
                onClick={() => onNewSession('Journal')}
                className="px-5 py-2 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all transform hover:-translate-y-0.5 hover:opacity-90"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <Plus className="h-4 w-4 text-white" />
                <span>New Entry (+)</span>
              </button>
            </div>
          </div>

          {/* Multi-Select Action Banner */}
          {isMultiSelectMode && (
            <div 
              className="max-w-6xl mx-auto mt-3 p-3 rounded-2xl border flex items-center justify-between flex-wrap gap-2 text-xs"
              style={{
                backgroundColor: themeConfig.chipBg,
                borderColor: themeConfig.border
              }}
            >
              <div className="flex items-center gap-2" style={{ color: themeConfig.inkColor }}>
                <button
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-xl border font-bold shadow-2xs"
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: themeConfig.border
                  }}
                >
                  {selectedSessionIds.length === filteredSessions.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="font-medium">{selectedSessionIds.length} moments selected</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold">Assign Category:</span>
                <button
                  onClick={() => handleBatchAssign('Brainstorm')}
                  className="px-3 py-1 rounded-xl bg-orange-100 text-orange-800 border border-orange-200 font-bold hover:bg-orange-200"
                >
                  #Brainstorm
                </button>
                <button
                  onClick={() => handleBatchAssign('Journal')}
                  className="px-3 py-1 rounded-xl bg-teal-100 text-teal-800 border border-teal-200 font-bold hover:bg-teal-200"
                >
                  #Journal
                </button>
                <button
                  onClick={() => handleBatchAssign('Reflective')}
                  className="px-3 py-1 rounded-xl bg-blue-100 text-blue-800 border border-blue-200 font-bold hover:bg-blue-200"
                >
                  #Reflective
                </button>
              </div>
            </div>
          )}
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

          {/* TAB 1: TIMELINE FEED */}
          {activeTab === 'timeline' && (
            <>
              {/* Feature Cards Grid: Multi-card balanced responsive layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {/* 1. Continue Where You Left Off Card */}
                <div 
                  id="continue-where-left-off-card"
                  className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all"
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: themeConfig.border,
                  }}
                >
                  {unfinishedThread && unfinishedThread.status === 'active' ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span 
                            className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: themeConfig.chipBg,
                              color: themeConfig.primary,
                              borderColor: themeConfig.border,
                            }}
                          >
                            Continue Where You Left Off
                          </span>
                          <button
                            onClick={() => onDismissThread && onDismissThread(unfinishedThread.id)}
                            className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                            title="Dismiss"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <h4 className="font-serif text-base font-bold line-clamp-2" style={{ color: themeConfig.inkColor }}>
                          {unfinishedThread.topic}
                        </h4>
                        <p className="font-serif italic text-xs opacity-80 mt-2 line-clamp-3 p-2.5 rounded-xl border" style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}>
                          "{unfinishedThread.openingPrompt}"
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: themeConfig.border }}>
                        <span className="text-[11px] opacity-60 truncate">
                          {unfinishedThread.sessionTitle}
                        </span>
                        <button
                          onClick={() => onContinueThread && onContinueThread(unfinishedThread)}
                          className="px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 shrink-0"
                          style={{ backgroundColor: themeConfig.primary }}
                        >
                          <span>Continue</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  ) : sessions.length > 0 ? (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: themeConfig.chipBg,
                              color: themeConfig.primary,
                              borderColor: themeConfig.border,
                            }}
                          >
                            Continue Where You Left Off
                          </span>
                        </div>
                        <h4 className="font-serif text-base font-bold line-clamp-2" style={{ color: themeConfig.inkColor }}>
                          {sessions[0].title || 'Recent Journal Entry'}
                        </h4>
                        <p className="text-xs opacity-75 mt-2 line-clamp-3 leading-relaxed">
                          {sessions[0].summary || sessions[0].messages?.[sessions[0].messages.length - 1]?.content || 'Pick up right where your last reflection left off.'}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: themeConfig.border }}>
                        <span className="text-[11px] opacity-60">
                          {new Date(sessions[0].createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          onClick={() => onSelectSession(sessions[0].id)}
                          className="px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 shrink-0"
                          style={{ backgroundColor: themeConfig.primary }}
                        >
                          <span>Open Entry</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span 
                          className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border inline-block mb-2"
                          style={{
                            backgroundColor: themeConfig.chipBg,
                            color: themeConfig.primary,
                            borderColor: themeConfig.border,
                          }}
                        >
                          Fresh Canvas
                        </span>
                        <h4 className="font-serif text-base font-bold" style={{ color: themeConfig.inkColor }}>
                          Start Your First Moment
                        </h4>
                        <p className="text-xs opacity-75 mt-2 leading-relaxed">
                          Your thoughts and reflections will shape personal insights, intelligence patterns, and memory threads.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: themeConfig.border }}>
                        <button
                          onClick={() => onNewSession('Journal')}
                          className="px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-2xs hover:opacity-90 active:scale-98"
                          style={{ backgroundColor: themeConfig.primary }}
                        >
                          Begin Journaling
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 2. Mood + Context Intelligence Card */}
                <div className="h-full">
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

                {/* 3. Long-Term Goals Card */}
                <div 
                  className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all"
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: themeConfig.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-7 w-7 rounded-lg flex items-center justify-center border shadow-2xs"
                          style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
                        >
                          <Target className="h-4 w-4" />
                        </div>
                        <h4 className="font-serif text-sm sm:text-base font-bold" style={{ color: themeConfig.inkColor }}>
                          Long-Term Goals
                        </h4>
                      </div>
                      <button
                        onClick={() => handleSuggestGoals('long_term')}
                        disabled={isSuggestingLongTerm}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-all hover:opacity-90 cursor-pointer disabled:opacity-50"
                        style={{
                          backgroundColor: themeConfig.chipBg,
                          borderColor: themeConfig.border,
                          color: themeConfig.primary,
                        }}
                        title="Synthesize long-term aspirations via Gemini AI"
                      >
                        <Sparkle className={`h-3 w-3 ${isSuggestingLongTerm ? 'animate-spin' : ''}`} />
                        <span>{isSuggestingLongTerm ? 'Thinking...' : 'AI Suggest'}</span>
                      </button>
                    </div>

                    <p className="text-xs opacity-70 mb-3">
                      Strategic aspirations & horizons synthesized from your journals.
                    </p>

                    {longTermGoals.length > 0 ? (
                      <div className="p-3 rounded-2xl border space-y-2" style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}>
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-xs line-clamp-1" style={{ color: themeConfig.inkColor }}>
                            {longTermGoals[0].title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}>
                            {longTermGoals[0].progress}%
                          </span>
                        </div>
                        <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${longTermGoals[0].progress}%`, backgroundColor: themeConfig.primary }} />
                        </div>
                        {longTermGoals[0].intention && (
                          <p className="text-[11px] opacity-75 line-clamp-2 italic">
                            "{longTermGoals[0].intention}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl border border-dashed text-center text-xs opacity-70" style={{ borderColor: themeConfig.border }}>
                        No long-term goals yet. Click AI Suggest or add one manually.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: themeConfig.border }}>
                    <button
                      onClick={() => {
                        setNewGoalTimeframe('long_term');
                        setNewGoalModalOpen(true);
                      }}
                      className="text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      style={{ color: themeConfig.primary }}
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Goal</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('goals')}
                      className="text-xs font-bold flex items-center gap-1 opacity-70 hover:opacity-100 cursor-pointer"
                      style={{ color: themeConfig.inkColor }}
                    >
                      <span>View All ({longTermGoals.length})</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* 4. Short-Term Goals & Sprints Card */}
                <div 
                  className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all"
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: themeConfig.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-7 w-7 rounded-lg flex items-center justify-center border shadow-2xs"
                          style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.accentColor }}
                        >
                          <Zap className="h-4 w-4" />
                        </div>
                        <h4 className="font-serif text-sm sm:text-base font-bold" style={{ color: themeConfig.inkColor }}>
                          Short-Term Sprints
                        </h4>
                      </div>
                      <button
                        onClick={() => handleSuggestGoals('short_term')}
                        disabled={isSuggestingShortTerm}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-all hover:opacity-90 cursor-pointer disabled:opacity-50"
                        style={{
                          backgroundColor: themeConfig.chipBg,
                          borderColor: themeConfig.border,
                          color: themeConfig.accentColor,
                        }}
                        title="Synthesize weekly sprint milestones"
                      >
                        <Sparkle className={`h-3 w-3 ${isSuggestingShortTerm ? 'animate-spin' : ''}`} />
                        <span>{isSuggestingShortTerm ? 'Planning...' : 'AI Sprints'}</span>
                      </button>
                    </div>

                    <p className="text-xs opacity-70 mb-3">
                      Actionable weekly milestones & execution checks.
                    </p>

                    {shortTermGoals.length > 0 ? (
                      <div className="p-3 rounded-2xl border space-y-2.5" style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}>
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-xs line-clamp-1" style={{ color: themeConfig.inkColor }}>
                            {shortTermGoals[0].title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.accentColor }}>
                            {shortTermGoals[0].progress}%
                          </span>
                        </div>
                        {shortTermGoals[0].milestones.slice(0, 2).map((m) => (
                          <div 
                            key={m.id}
                            onClick={() => handleToggleMilestone(shortTermGoals[0], m.id)}
                            className="flex items-center gap-2 p-1.5 rounded-xl text-xs hover:bg-black/5 transition-all cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={m.isCompleted}
                              onChange={() => {}}
                              className="h-3.5 w-3.5 rounded cursor-pointer"
                              style={{ accentColor: themeConfig.primary }}
                            />
                            <span className={`line-clamp-1 text-[11px] ${m.isCompleted ? 'line-through opacity-50' : 'opacity-90'}`}>
                              {m.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl border border-dashed text-center text-xs opacity-70" style={{ borderColor: themeConfig.border }}>
                        No sprint goals active. Click AI Sprints to break down tasks.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: themeConfig.border }}>
                    <button
                      onClick={() => {
                        setNewGoalTimeframe('short_term');
                        setNewGoalModalOpen(true);
                      }}
                      className="text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      style={{ color: themeConfig.accentColor }}
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Sprint</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('goals')}
                      className="text-xs font-bold flex items-center gap-1 opacity-70 hover:opacity-100 cursor-pointer"
                      style={{ color: themeConfig.inkColor }}
                    >
                      <span>Open Goals Tab</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* 5. Journal Entry (Without AI) Card */}
                <div 
                  className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all"
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: themeConfig.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-7 w-7 rounded-lg flex items-center justify-center border shadow-2xs"
                          style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
                        >
                          <Feather className="h-4 w-4" />
                        </div>
                        <h4 className="font-serif text-sm sm:text-base font-bold" style={{ color: themeConfig.inkColor }}>
                          Journal Entry (Without AI)
                        </h4>
                      </div>
                      <span 
                        className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border"
                        style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
                      >
                        Quiet Mode
                      </span>
                    </div>

                    <p className="text-xs opacity-75 leading-relaxed mt-2">
                      Pure, distraction-free journaling. Write without live conversational interruptions; Gemini synthesizes an AI summary and connects knowledge upon saving.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: themeConfig.border }}>
                    <button
                      onClick={() => onNewSession('Journal', true)}
                      className="px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 cursor-pointer"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      <Feather className="h-3.5 w-3.5" />
                      <span>Write Without AI</span>
                    </button>
                  </div>
                </div>

                {/* 6. All Entries Folder Card */}
                <div 
                  onClick={() => setSelectedCategoryFilter('All Entries')}
                  className={`rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
                    selectedCategoryFilter === 'All Entries' ? 'ring-2 ring-offset-2' : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: selectedCategoryFilter === 'All Entries' ? themeConfig.primary : themeConfig.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-7 w-7 rounded-lg flex items-center justify-center border shadow-2xs"
                          style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
                        >
                          <Clock className="h-4 w-4" />
                        </div>
                        <h4 className="font-serif text-sm sm:text-base font-bold" style={{ color: themeConfig.inkColor }}>
                          All Entries
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
                        {sessions.length} Moments
                      </span>
                    </div>

                    <p className="text-xs opacity-70 leading-relaxed">
                      Complete chronological stream of all your memories, brainstorms, and personal notes.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: themeConfig.border }}>
                    <span className="font-bold text-[11px]" style={{ color: selectedCategoryFilter === 'All Entries' ? themeConfig.primary : themeConfig.inkColor }}>
                      {selectedCategoryFilter === 'All Entries' ? 'Active Feed' : 'Click to View'}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  </div>
                </div>

                {/* 7. #Brainstorm Ideas Folder Card */}
                <div 
                  onClick={() => setSelectedCategoryFilter('Brainstorm')}
                  className={`rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
                    selectedCategoryFilter === 'Brainstorm' ? 'ring-2 ring-offset-2' : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: selectedCategoryFilter === 'Brainstorm' ? themeConfig.primary : themeConfig.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-7 w-7 rounded-lg flex items-center justify-center border shadow-2xs"
                          style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: '#f59e0b' }}
                        >
                          <Lightbulb className="h-4 w-4" />
                        </div>
                        <h4 className="font-serif text-sm sm:text-base font-bold" style={{ color: themeConfig.inkColor }}>
                          #Brainstorm Ideas
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
                        {sessions.filter((s) => s.category === 'Brainstorm').length} Moments
                      </span>
                    </div>

                    <p className="text-xs opacity-70 leading-relaxed">
                      Creative sparks, experiments, project architecture & unbounded concepts.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: themeConfig.border }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewSession('Brainstorm');
                      }}
                      className="font-bold text-[11px] hover:underline flex items-center gap-1"
                      style={{ color: themeConfig.primary }}
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Brainstorm</span>
                    </button>
                    <span className="text-[11px] opacity-60">
                      {selectedCategoryFilter === 'Brainstorm' ? 'Filtered' : 'Filter Feed →'}
                    </span>
                  </div>
                </div>

                {/* 8. #Daily Journal Folder Card */}
                <div 
                  onClick={() => setSelectedCategoryFilter('Journal')}
                  className={`rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
                    selectedCategoryFilter === 'Journal' ? 'ring-2 ring-offset-2' : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: selectedCategoryFilter === 'Journal' ? themeConfig.primary : themeConfig.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-7 w-7 rounded-lg flex items-center justify-center border shadow-2xs"
                          style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: '#0d9488' }}
                        >
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <h4 className="font-serif text-sm sm:text-base font-bold" style={{ color: themeConfig.inkColor }}>
                          #Daily Journal
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
                        {sessions.filter((s) => s.category === 'Journal').length} Moments
                      </span>
                    </div>

                    <p className="text-xs opacity-70 leading-relaxed">
                      Day-to-day mindfulness, events, thought dumps & personal experiences.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: themeConfig.border }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewSession('Journal');
                      }}
                      className="font-bold text-[11px] hover:underline flex items-center gap-1"
                      style={{ color: themeConfig.primary }}
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Journal</span>
                    </button>
                    <span className="text-[11px] opacity-60">
                      {selectedCategoryFilter === 'Journal' ? 'Filtered' : 'Filter Feed →'}
                    </span>
                  </div>
                </div>

                {/* 9. #Deep Reflective Folder Card */}
                <div 
                  onClick={() => setSelectedCategoryFilter('Reflective')}
                  className={`rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
                    selectedCategoryFilter === 'Reflective' ? 'ring-2 ring-offset-2' : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: selectedCategoryFilter === 'Reflective' ? themeConfig.primary : themeConfig.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-7 w-7 rounded-lg flex items-center justify-center border shadow-2xs"
                          style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: '#8b5cf6' }}
                        >
                          <Feather className="h-4 w-4" />
                        </div>
                        <h4 className="font-serif text-sm sm:text-base font-bold" style={{ color: themeConfig.inkColor }}>
                          #Deep Reflective
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
                        {sessions.filter((s) => s.category === 'Reflective').length} Moments
                      </span>
                    </div>

                    <p className="text-xs opacity-70 leading-relaxed">
                      Emotional inquiry, philosophy, mental clarity & personal evolution.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: themeConfig.border }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewSession('Reflective');
                      }}
                      className="font-bold text-[11px] hover:underline flex items-center gap-1"
                      style={{ color: themeConfig.primary }}
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Reflection</span>
                    </button>
                    <span className="text-[11px] opacity-60">
                      {selectedCategoryFilter === 'Reflective' ? 'Filtered' : 'Filter Feed →'}
                    </span>
                  </div>
                </div>

                {/* 10. #Projects & Study Folder Card */}
                <div 
                  onClick={() => setSelectedCategoryFilter('Projects')}
                  className={`rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
                    selectedCategoryFilter === 'Projects' ? 'ring-2 ring-offset-2' : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: selectedCategoryFilter === 'Projects' ? themeConfig.primary : themeConfig.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-7 w-7 rounded-lg flex items-center justify-center border shadow-2xs"
                          style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: '#3b82f6' }}
                        >
                          <Compass className="h-4 w-4" />
                        </div>
                        <h4 className="font-serif text-sm sm:text-base font-bold" style={{ color: themeConfig.inkColor }}>
                          #Projects & Study
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
                        {sessions.filter((s) => s.category === 'Projects' || s.category === 'Study').length} Moments
                      </span>
                    </div>

                    <p className="text-xs opacity-70 leading-relaxed">
                      Technical roadmaps, study summaries & project execution notes.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: themeConfig.border }}>
                    <span className="font-bold text-[11px]" style={{ color: selectedCategoryFilter === 'Projects' ? themeConfig.primary : themeConfig.inkColor }}>
                      {selectedCategoryFilter === 'Projects' ? 'Active Filter' : 'Filter Feed'}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  </div>
                </div>

                {/* 11. User Custom Folders Cards */}
                {customFolders.map((folder) => {
                  const count = sessions.filter((s) => s.folderId === folder.id || s.category === folder.name || s.tags?.includes(folder.name)).length;
                  const isSelected = selectedCategoryFilter === folder.name;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => setSelectedCategoryFilter(folder.name as FilterCategory)}
                      className={`rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all cursor-pointer group ${
                        isSelected ? 'ring-2 ring-offset-2' : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: themeConfig.paperCardBg,
                        borderColor: isSelected ? (folder.color || themeConfig.primary) : themeConfig.border,
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-7 w-7 rounded-lg flex items-center justify-center border shadow-2xs"
                              style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: folder.color || themeConfig.primary }}
                            >
                              <Folder className="h-4 w-4" />
                            </div>
                            <h4 className="font-serif text-sm sm:text-base font-bold truncate max-w-[140px]" style={{ color: themeConfig.inkColor }}>
                              {folder.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
                              {count}
                            </span>
                            {onDeleteCustomFolder && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteCustomFolder(folder.id);
                                }}
                                className="p-1 rounded-md opacity-40 hover:opacity-100 transition-opacity"
                                title="Delete folder"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs opacity-70 leading-relaxed">
                          Custom collection for organized topic reflections and saved notes.
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: themeConfig.border }}>
                        <span className="font-bold text-[11px]" style={{ color: isSelected ? (folder.color || themeConfig.primary) : themeConfig.inkColor }}>
                          {isSelected ? 'Active Filter' : 'Filter Feed'}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                      </div>
                    </div>
                  );
                })}

                {/* 12. + Add Folder Card */}
                <div 
                  onClick={() => setIsAddFolderModalOpen(true)}
                  className="rounded-3xl p-5 sm:p-6 border border-dashed shadow-2xs flex flex-col justify-center items-center text-center transition-all hover:opacity-90 cursor-pointer min-h-[160px]"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    borderColor: themeConfig.border,
                  }}
                >
                  <div 
                    className="h-10 w-10 rounded-2xl flex items-center justify-center border shadow-2xs mb-2.5 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border, color: themeConfig.primary }}
                  >
                    <Folder className="h-5 w-5" />
                  </div>
                  <h4 className="font-serif text-sm sm:text-base font-bold flex items-center gap-1" style={{ color: themeConfig.inkColor }}>
                    <Plus className="h-4 w-4" style={{ color: themeConfig.primary }} />
                    <span>Add Folder</span>
                  </h4>
                  <p className="text-xs opacity-70 mt-1 max-w-[200px]">
                    Create a custom category folder card to organize your reflections.
                  </p>
                </div>
              </div>

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
                      {searchQuery ? 'Try adjusting your search query or clear filters.' : 'Click "New Entry (+)" to record your first brainstorm or reflection.'}
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
                      const isSelected = selectedSessionIds.includes(session.id);
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
                          onClick={() => {
                            if (isMultiSelectMode) {
                              handleToggleSelect(session.id);
                            } else {
                              setInspectingSession(session);
                            }
                          }}
                          className={`theme-card rounded-3xl p-5 border transition-all cursor-pointer relative group flex flex-col justify-between ${themeConfig.rulingClass}`}
                          style={{
                            backgroundColor: themeConfig.paperCardBg,
                            borderColor: isSelected ? themeConfig.primary : themeConfig.border,
                            boxShadow: isSelected ? `0 0 0 2px ${themeConfig.primary}` : undefined
                          }}
                        >
                          {/* Multi-select indicator */}
                          {isMultiSelectMode && (
                            <div className="absolute top-3 right-3 z-10">
                              <div 
                                className="h-5 w-5 rounded-md flex items-center justify-center border"
                                style={isSelected ? {
                                  backgroundColor: themeConfig.primary,
                                  borderColor: themeConfig.primary,
                                  color: '#ffffff'
                                } : {
                                  borderColor: themeConfig.border,
                                  backgroundColor: themeConfig.paperCardBg
                                }}
                              >
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                              </div>
                            </div>
                          )}

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

          {/* TAB 1.5: EVOLUTION GRAPH */}
          {activeTab === 'evolution' && (
            <IdeaEvolutionGraph 
              sessions={sessions} 
              theme={theme}
              onOpenEditor={onSelectSession}
              onUpdateSession={onUpdateSession}
              onNewSessionWithPrompt={(initialText, category) => {
                onNewSession(category as any);
                // In a fuller implementation, we could pre-fill the editor with this prompt.
                // For now, it will open the editor for that category.
              }}
            />
          )}

          {/* TAB 1.6: ACTION ENGINE */}
          {activeTab === 'actions' && (
            <ActionEngine 
              sessions={sessions} 
              theme={theme}
              onUpdateSession={onUpdateSession}
              onOpenSession={onSelectSession}
            />
          )}

          {/* TAB 1.7: MIND GARDEN — ONE LIVING TREE */}
          {activeTab === 'garden' && (
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

          {/* TAB 2: CALENDAR PAGE (MATCHING MINDFUL WORKSPACE DESIGN) */}
          {activeTab === 'calendar' && (
            <div className="rounded-3xl overflow-hidden">
              <CalendarView
                user={user}
                sessions={sessions}
                goals={goals}
                onNewSession={onNewSession}
                onSelectSession={onSelectSession}
                onViewAllGoals={() => setActiveTab('goals')}
                onAddGoal={onSaveGoal}
                theme={theme}
              />
            </div>
          )}

          {/* TAB 3: MEDIA & SNAPSHOTS */}
          {activeTab === 'media' && (
            <div 
              className={`theme-card rounded-3xl p-6 sm:p-8 border shadow-2xs ${themeConfig.rulingClass}`}
              style={{
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border
              }}
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: themeConfig.border }}>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}
                  >
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold" style={{ color: themeConfig.inkColor }}>
                      Journal Snapshots & Media
                    </h3>
                    <p className="text-xs opacity-70">
                      Visual memories, photo tags, and travel reflections
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNewSession('Journal')}
                  className="px-4 py-2 rounded-full text-white text-xs font-bold shadow-xs hover:opacity-90"
                  style={{ backgroundColor: themeConfig.primary }}
                >
                  Add Snapshot Entry
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 opacity-30 mx-auto mb-3" />
                  <p className="text-xs opacity-70">No media entries recorded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setInspectingSession(s)}
                      className="rounded-2xl border p-4 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                      style={{
                        backgroundColor: themeConfig.paperBg,
                        borderColor: themeConfig.border
                      }}
                    >
                      <div 
                        className="h-32 rounded-xl flex items-center justify-center mb-3 relative overflow-hidden border"
                        style={{
                          backgroundColor: themeConfig.chipBg,
                          borderColor: themeConfig.border
                        }}
                      >
                        <ImageIcon className="h-8 w-8 opacity-40" style={{ color: themeConfig.primary }} />
                        <span 
                          className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs"
                          style={{
                            backgroundColor: themeConfig.paperCardBg,
                            borderColor: themeConfig.border,
                            color: themeConfig.inkColor
                          }}
                        >
                          {s.location || 'Moment'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold line-clamp-1" style={{ color: themeConfig.inkColor }}>{s.title}</h4>
                      <p className="text-[11px] opacity-70 mt-1 line-clamp-2">{s.summary || s.messages[0]?.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ATLAS & LOCATIONS */}
          {activeTab === 'atlas' && (
            <div 
              className={`theme-card rounded-3xl p-6 sm:p-8 border shadow-2xs ${themeConfig.rulingClass}`}
              style={{
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border
              }}
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: themeConfig.border }}>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}
                  >
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold" style={{ color: themeConfig.inkColor }}>
                      Brainstorm Atlas & Places
                    </h3>
                    <p className="text-xs opacity-70">
                      Track where in the world your ideas and reflections were born
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div 
                  className="p-4 rounded-2xl border space-y-2"
                  style={{
                    backgroundColor: themeConfig.paperBg,
                    borderColor: themeConfig.border
                  }}
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-3">
                    Discovered Locations ({locationsList.length})
                  </h4>
                  <button
                    onClick={() => setSelectedLocationFilter('all')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={selectedLocationFilter === 'all' ? {
                      backgroundColor: themeConfig.primary,
                      color: '#ffffff'
                    } : {
                      color: themeConfig.inkColor
                    }}
                  >
                    All Locations ({sessions.length})
                  </button>
                  {locationsList.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setSelectedLocationFilter(loc)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                      style={selectedLocationFilter === loc ? {
                        backgroundColor: themeConfig.primary,
                        color: '#ffffff'
                      } : {
                        color: themeConfig.inkColor
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                        <span>{loc}</span>
                      </span>
                      <span className="text-[10px] opacity-80">{sessions.filter((s) => s.location === loc).length}</span>
                    </button>
                  ))}
                </div>

                <div 
                  className="md:col-span-2 rounded-2xl border p-6 flex flex-col justify-center items-center text-center min-h-[260px]"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    borderColor: themeConfig.border
                  }}
                >
                  <Compass className="h-12 w-12 opacity-50 mb-3 animate-pulse" style={{ color: themeConfig.primary }} />
                  <h4 className="font-serif text-base font-bold" style={{ color: themeConfig.inkColor }}>Interactive Idea Atlas</h4>
                  <p className="text-xs opacity-70 max-w-md mt-1">
                    Every entry with a geotag automatically pins to your personal memory map. Add a location tag when writing in the editor.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BRAINSTORM COACH & PROMPTS */}
          {activeTab === 'coach' && (
            <div 
              className={`theme-card rounded-3xl p-6 sm:p-8 border space-y-6 shadow-2xs ${themeConfig.rulingClass}`}
              style={{
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border
              }}
            >
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: themeConfig.border }}>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}
                  >
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold" style={{ color: themeConfig.inkColor }}>
                      Brainstorm Coach & Daily Inspirations
                    </h3>
                    <p className="text-xs opacity-70">
                      Guided prompts to unblock creative brainstorms and deep reflections
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Morning Intentions & Alignment', category: 'Reflective', prompt: 'What is the one thing that, if accomplished today, would make me feel deeply satisfied?' },
                  { title: 'Creative Idea Blueprint', category: 'Brainstorm', prompt: 'If there were no constraints on time or budget, what ambitious project would I start building today?' },
                  { title: 'Gratitude & Mindfulness', category: 'Journal', prompt: 'What is a small, unnoticed moment from this week that I am genuinely grateful for?' },
                  { title: 'Perspective Shift on Challenges', category: 'Reflective', prompt: 'What is currently challenging me, and what is the hidden lesson or opportunity inside it?' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs"
                    style={{
                      backgroundColor: themeConfig.paperBg,
                      borderColor: themeConfig.border
                    }}
                  >
                    <div>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: themeConfig.chipBg,
                          color: themeConfig.primary,
                          borderColor: themeConfig.border
                        }}
                      >
                        #{item.category}
                      </span>
                      <h4 className="font-serif text-sm font-bold mt-2" style={{ color: themeConfig.inkColor }}>{item.title}</h4>
                      <p className="text-xs opacity-80 mt-1 italic leading-relaxed">"{item.prompt}"</p>
                    </div>
                    <button
                      onClick={() => onNewSession(item.category as any)}
                      className="mt-4 px-4 py-1.5 rounded-full text-white text-xs font-bold hover:opacity-90 self-start shadow-xs transition-opacity"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      Start Reflection →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: GOALS & PLANNING */}
          {activeTab === 'goals' && (
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
        </div>
      </main>

      {/* Floating Action Button (FAB): Persistent Talk to your Journal */}
      <aside 
        aria-label="Journal companion quick access"
        className="fixed bottom-6 right-6 z-40"
      >
        <button
          id="fab-talk-to-journal"
          onClick={() => setIsChatModalOpen(true)}
          className="group flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border cursor-pointer"
          style={{
            backgroundColor: themeConfig.primary,
            borderColor: 'rgba(255,255,255,0.25)',
            color: '#ffffff',
            boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.28), 0 4px 6px -2px rgba(0, 0, 0, 0.12)',
          }}
          title="Talk to your Journal"
          aria-label="Talk to your Journal (Persistent Floating Companion)"
        >
          <div className="relative flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
            <span 
              className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white animate-pulse"
              style={{ backgroundColor: themeConfig.accentColor }}
            />
          </div>
          <span className="font-serif font-bold text-xs sm:text-sm tracking-wide">
            Talk to your Journal
          </span>
        </button>
      </aside>

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

      {/* WhatsApp / Journal Companion Modal */}
      <WhatsAppChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        sessions={sessions}
        theme={theme}
      />

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
