import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth, signInWithGoogle, logOut, onAuthStateChanged } from './firebase';
import { 
  fetchUserSessions, 
  saveJournalSession, 
  deleteJournalSession,
  saveUserTheme,
  fetchUserTheme,
  saveThreadTrackingState,
  fetchThreadTrackingState,
  fetchPersonalGoals,
  savePersonalGoal,
  deletePersonalGoal,
  fetchCustomFolders,
  saveCustomFolders,
} from './utils/firestore';
import { JournalSession, ChatMessage, ActiveView, PaperThemePreference, UnfinishedThread, PersonalGoal, CustomFolder, JournalCategory } from './types';
import { getThemeConfig } from './utils/theme';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { JournalEditor } from './components/JournalEditor';
import { HistorySidebar } from './components/HistorySidebar';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<ActiveView>('landing');
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [dbError, setDbError] = useState<string | null>(null);

  // Feature 1: Continue Where I Left Off State
  const [unfinishedThread, setUnfinishedThread] = useState<UnfinishedThread | null>(null);
  const [continuationThread, setContinuationThread] = useState<UnfinishedThread | null>(null);
  const [isAnalyzingThreads, setIsAnalyzingThreads] = useState(false);

  // Phase 1 Feature 3: Goals & Planning State
  const [goals, setGoals] = useState<PersonalGoal[]>([]);

  // Phase 2: Custom Dashboard Folders / Cards
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);

  // Theme settings (persisted in localStorage and Firestore)
  const [theme, setTheme] = useState<PaperThemePreference>(() => {
    try {
      const saved = localStorage.getItem('notebook_theme_pref');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      themePreset: 'journey-teal',
      paperTone: 'journey-clean',
      ruling: 'blank',
      inkStyle: 'teal',
    };
  });

  const themeConfig = getThemeConfig(theme);

  // Apply CSS custom variables dynamically to document element
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', themeConfig.primary);
    root.style.setProperty('--theme-primary-hover', themeConfig.primaryHover);
    root.style.setProperty('--theme-bg', themeConfig.paperBg);
    root.style.setProperty('--theme-card-bg', themeConfig.paperCardBg);
    root.style.setProperty('--theme-ink', themeConfig.inkColor);
    root.style.setProperty('--theme-border', themeConfig.border);
    root.style.setProperty('--theme-accent', themeConfig.accentColor);
    root.style.setProperty('--theme-chip-bg', themeConfig.chipBg);
    root.style.setProperty('--theme-chip-text', themeConfig.chipText);
  }, [themeConfig]);

  const handleUpdateTheme = (newTheme: PaperThemePreference) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('notebook_theme_pref', JSON.stringify(newTheme));
    } catch {}
    if (user) {
      saveUserTheme(user.uid, newTheme);
    }
  };


  const formatErrorMessage = (err: any): string => {
    if (!err) return 'An unexpected error occurred.';
    const raw = err.message || String(err);
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        return parsed.error;
      }
    } catch {}
    return raw;
  };

  // Helper to create a blank session object
  const createBlankSession = (userId: string, initialCategory: 'Brainstorm' | 'Journal' | 'Reflective' = 'Journal'): JournalSession => ({
    id: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    userId,
    title: 'New Reflection',
    category: initialCategory,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    tags: [],
  });

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Load user theme preferences if available in Firestore
        try {
          const userTheme = await fetchUserTheme(currentUser.uid);
          if (userTheme) {
            setTheme(userTheme);
            localStorage.setItem('notebook_theme_pref', JSON.stringify(userTheme));
          }
        } catch (themeErr) {
          console.warn('Could not restore user theme from cloud:', themeErr);
        }

        // Load sessions, personal goals, and custom folders for authenticated user
        setSessionsLoading(true);
        try {
          const [userSessions, userGoals, userFolders] = await Promise.all([
            fetchUserSessions(currentUser.uid),
            fetchPersonalGoals(currentUser.uid).catch(() => []),
            fetchCustomFolders(currentUser.uid).catch(() => []),
          ]);
          setSessions(userSessions);
          setGoals(userGoals || []);
          setCustomFolders(userFolders || []);
          if (userSessions.length > 0) {
            setActiveSessionId(userSessions[0].id);
          } else {
            // Initialize with first session
            const initialSession = createBlankSession(currentUser.uid, 'Journal');
            setSessions([initialSession]);
            setActiveSessionId(initialSession.id);
            await saveJournalSession(currentUser.uid, initialSession);
          }
          setActiveView('dashboard');
          // Trigger intelligence analysis for unfinished threads
          analyzeUnfinishedThreads(userSessions, currentUser.uid);
        } catch (err: any) {
          console.error('Failed to load user data:', err);
          setDbError(formatErrorMessage(err));
          setActiveView('dashboard');
        } finally {
          setSessionsLoading(false);
        }
      } else {
        setSessions([]);
        setGoals([]);
        setCustomFolders([]);
        setActiveSessionId(null);
        setUnfinishedThread(null);
        setContinuationThread(null);
        setActiveView('landing');
      }
    });

    return () => unsubscribe();
  }, []);

  // Feature 1: Analyze Unfinished Threads
  const analyzeUnfinishedThreads = useCallback(async (userSessions: JournalSession[], userId: string) => {
    if (!userSessions || userSessions.length === 0) {
      setUnfinishedThread(null);
      return;
    }

    setIsAnalyzingThreads(true);
    try {
      const trackingState = await fetchThreadTrackingState(userId).catch(() => null);
      const dismissedIds = trackingState?.dismissedThreadIds || [];
      const continuedIds = trackingState?.continuedThreadIds || [];
      const resolvedIds = trackingState?.resolvedThreadIds || [];

      const response = await fetch('/api/gemini/unfinished-threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessions: userSessions,
          dismissedIds,
          continuedIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const threads: UnfinishedThread[] = data.threads || [];
        
        // Exclude threads that are already dismissed, continued, or resolved
        const active = threads.filter((t) => {
          if (dismissedIds.includes(t.id) || continuedIds.includes(t.id) || resolvedIds.includes(t.id)) {
            return false;
          }
          const tracked = trackingState ? (trackingState as any)[t.id] : undefined;
          if (tracked && (tracked.status === 'dismissed' || tracked.status === 'continued' || tracked.status === 'resolved')) {
            return false;
          }
          return true;
        });

        if (active.length > 0) {
          setUnfinishedThread(active[0]);
        } else {
          // Gracefully surface most recent session with thoughts if no strict regex triggered
          const meaningfulSession = userSessions.find((s) => s.summary || (Array.isArray(s.messages) && s.messages.length > 0)) || userSessions[0];
          const fallbackThreadId = `thread-${meaningfulSession.id}`;
          if (meaningfulSession && !dismissedIds.includes(fallbackThreadId) && !continuedIds.includes(fallbackThreadId)) {
            setUnfinishedThread({
              id: fallbackThreadId,
              sessionId: meaningfulSession.id,
              sessionTitle: meaningfulSession.title && meaningfulSession.title !== 'New Reflection' ? meaningfulSession.title : 'Recent Reflection',
              topic: meaningfulSession.title && meaningfulSession.title !== 'New Reflection' ? meaningfulSession.title : 'Recent Thoughts',
              lastMeaningfulContext: meaningfulSession.summary || meaningfulSession.messages?.[0]?.content?.slice(0, 140) || 'Your paused line of reflection',
              unresolvedQuestion: 'Pick up where you left off and expand your thinking',
              openingPrompt: `You were exploring "${meaningfulSession.title || 'your personal thoughts'}". Would you like to pick up where you left off?`,
              suggestedStarterReply: `Continuing on ${meaningfulSession.title || 'my reflection'}: `,
              confidence: 0.82,
              lastInteractionTimestamp: meaningfulSession.updatedAt || meaningfulSession.createdAt || new Date().toISOString(),
              status: 'active',
              detectedAt: new Date().toISOString(),
            });
          } else {
            setUnfinishedThread(null);
          }
        }
      }
    } catch (err) {
      console.warn('Unfinished threads analysis notice:', err);
    } finally {
      setIsAnalyzingThreads(false);
    }
  }, []);

  const handleRetryLoadUserData = useCallback(async () => {
    if (!user) return;
    setSessionsLoading(true);
    setDbError(null);
    try {
      const [userSessions, userGoals, userFolders] = await Promise.all([
        fetchUserSessions(user.uid),
        fetchPersonalGoals(user.uid).catch(() => []),
        fetchCustomFolders(user.uid).catch(() => []),
      ]);
      setSessions(userSessions);
      setGoals(userGoals || []);
      setCustomFolders(userFolders || []);
      if (userSessions.length > 0) {
        setActiveSessionId(userSessions[0].id);
      } else {
        const initialSession = createBlankSession(user.uid, 'Journal');
        setSessions([initialSession]);
        setActiveSessionId(initialSession.id);
        await saveJournalSession(user.uid, initialSession);
      }
      analyzeUnfinishedThreads(userSessions, user.uid);
    } catch (err: any) {
      console.error('Failed to reload user data:', err);
      setDbError(formatErrorMessage(err));
    } finally {
      setSessionsLoading(false);
    }
  }, [user, analyzeUnfinishedThreads]);

  const handleContinueThread = async (thread: UnfinishedThread) => {
    if (!user) return;
    try {
      await saveThreadTrackingState(user.uid, thread.id, 'continued');
    } catch (err) {
      console.warn('Failed to update thread tracking status:', err);
    }
    setActiveSessionId(thread.sessionId);
    setContinuationThread(thread);
    setUnfinishedThread(null);
    setActiveView('editor');
  };

  const handleDismissThread = async (threadId: string) => {
    if (!user) return;
    try {
      await saveThreadTrackingState(user.uid, threadId, 'dismissed');
    } catch (err) {
      console.warn('Failed to update dismiss status:', err);
    }
    setUnfinishedThread(null);
  };

  // Phase 1 Feature 3: Goals & Planning handlers
  const handleSaveGoal = async (goal: PersonalGoal) => {
    setGoals((prev) => {
      const existingIndex = prev.findIndex((g) => g.id === goal.id);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = goal;
        return copy;
      }
      return [goal, ...prev];
    });
    if (user) {
      try {
        await savePersonalGoal(user.uid, goal);
      } catch (err) {
        console.error('Failed to save goal to cloud:', err);
      }
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    if (user) {
      try {
        await deletePersonalGoal(user.uid, goalId);
      } catch (err) {
        console.error('Failed to delete goal from cloud:', err);
      }
    }
  };


  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign in failed:', err);
      const isPopupBlocked = err.code === 'auth/popup-blocked' || 
        (err.message && err.message.toLowerCase().includes('popup-blocked'));
      const isPopupClosed = err.code === 'auth/popup-closed-by-user';
      
      if (isPopupBlocked) {
        setAuthError('Sign-in popup was blocked by your browser. Please allow popups or open this page in a new window to sign in.');
      } else if (isPopupClosed) {
        // User voluntarily dismissed popup, no alarm needed
        setAuthError(null);
      } else {
        setAuthError(err.message || 'Failed to authenticate with Google.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setIsHistoryOpen(false);
      setActiveView('landing');
    } catch (err: any) {
      console.error('Sign out failed:', err);
    }
  };

  // Create a new reflection session and open Editor
  const handleNewSession = async (
    category: JournalCategory = 'Journal',
    withoutAI: boolean = false,
    folderId?: string,
    includeInAIHistory?: boolean
  ) => {
    if (!user) return;
    const base = createBlankSession(user.uid, category as any);
    const newSession: JournalSession = {
      ...base,
      category,
      withoutAI: Boolean(withoutAI),
      includeInAIHistory: Boolean(includeInAIHistory),
      folderId: folderId || undefined,
      title: withoutAI ? 'Pure Journaling (Without AI)' : 'New Reflection',
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveView('editor');

    try {
      setSaveStatus('saving');
      await saveJournalSession(user.uid, newSession);
      setSaveStatus('saved');
    } catch (err: any) {
      console.error('Error saving new session:', err);
      setSaveStatus('error');
      setDbError(formatErrorMessage(err));
    }
  };

  // Custom folder managers
  const handleSaveCustomFolder = async (folder: CustomFolder) => {
    setCustomFolders((prev) => {
      const idx = prev.findIndex((f) => f.id === folder.id);
      const next = idx >= 0 ? prev.map((f) => (f.id === folder.id ? folder : f)) : [...prev, folder];
      if (user) saveCustomFolders(user.uid, next).catch(console.error);
      return next;
    });
  };

  const handleDeleteCustomFolder = async (folderId: string) => {
    setCustomFolders((prev) => {
      const next = prev.filter((f) => f.id !== folderId);
      if (user) saveCustomFolders(user.uid, next).catch(console.error);
      return next;
    });
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setActiveView('editor');
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      await deleteJournalSession(user.uid, sessionId);
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);

      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          const fresh = createBlankSession(user.uid, 'Journal');
          setSessions([fresh]);
          setActiveSessionId(fresh.id);
          await saveJournalSession(user.uid, fresh);
        }
      }
    } catch (err: any) {
      console.error('Error deleting session:', err);
      setDbError(formatErrorMessage(err));
    }
  };

  const handleBatchUpdateCategory = async (sessionIds: string[], newCategory: 'Brainstorm' | 'Journal' | 'Reflective') => {
    if (!user) return;
    const updatedList = sessions.map((s) =>
      sessionIds.includes(s.id) ? { ...s, category: newCategory, updatedAt: new Date().toISOString() } : s
    );
    setSessions(updatedList);

    try {
      await Promise.all(
        updatedList
          .filter((s) => sessionIds.includes(s.id))
          .map((s) => saveJournalSession(user.uid, s))
      );
    } catch (err) {
      console.error('Batch update failed:', err);
    }
  };

  // Active Session helper
  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Update properties on the active session
  const handleUpdateSession = async (updates: Partial<JournalSession>) => {
    if (!user || !currentSession) return;
    const updated: JournalSession = {
      ...currentSession,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

    try {
      setSaveStatus('saving');
      await saveJournalSession(user.uid, updated);
      setSaveStatus('saved');
      setDbError(null);
    } catch (err: any) {
      console.error('Error updating session:', err);
      setSaveStatus('error');
      setDbError(err.message || 'Failed to save updates.');
    }
  };

  const handleUpdateAnySession = async (sessionId: string, updates: Partial<JournalSession>) => {
    if (!user) return;
    const sessionToUpdate = sessions.find((s) => s.id === sessionId);
    if (!sessionToUpdate) return;

    const updated: JournalSession = {
      ...sessionToUpdate,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

    try {
      setSaveStatus('saving');
      await saveJournalSession(user.uid, updated);
      setSaveStatus('saved');
      setDbError(null);
    } catch (err: any) {
      console.error('Error updating session:', err);
      setSaveStatus('error');
      setDbError(err.message || 'Failed to save updates.');
    }
  };

  // Send message to Gemini and persist both user and AI turns
  const handleSendMessage = async (text: string, intent: string) => {
    if (!user || !currentSession) return;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now() + '-u',
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    // Auto-detect category heuristics if category not manually set
    let detectedCategory = currentSession.category || 'Journal';
    const lowerText = text.toLowerCase();
    if (intent === 'Brainstorm Ideas' || lowerText.includes('idea') || lowerText.includes('build') || lowerText.includes('project') || lowerText.includes('brainstorm')) {
      detectedCategory = 'Brainstorm';
    } else if (intent === 'Deep Reflection' || lowerText.includes('realize') || lowerText.includes('feel') || lowerText.includes('perspective')) {
      detectedCategory = 'Reflective';
    }

    const updatedMessages = [...currentSession.messages, userMessage];
    const sessionWithUserMsg: JournalSession = {
      ...currentSession,
      category: detectedCategory,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    // Optimistically update and save user message immediately
    setSessions((prev) => prev.map((s) => (s.id === sessionWithUserMsg.id ? sessionWithUserMsg : s)));

    try {
      setSaveStatus('saving');
      await saveJournalSession(user.uid, sessionWithUserMsg);
      setSaveStatus('saved');
    } catch (err: any) {
      console.error('Failed to persist user message:', err);
      setSaveStatus('error');
      setDbError(err.message || 'Failed to persist your message to Firestore.');
    }

    // If this session is pure journaling without live AI, skip conversational Gemini turn.
    // If user opted to include this entry in their AI history, trigger background auto-title & summary indexing.
    if (currentSession.withoutAI) {
      if (currentSession.includeInAIHistory) {
        triggerAutoTitleAndSummary(sessionWithUserMsg);
      }
      return;
    }

    // Call Gemini API
    setIsGenerating(true);
    try {
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          promptType: intent,
          context: `Session Category: ${detectedCategory}, Mood: ${currentSession.mood || 'Unspecified'}, Tags: ${(currentSession.tags || []).join(', ')}`,
        }),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 80)}`);
      }

      if (!response.ok && !data.reply) {
        throw new Error(data.error || `Server responded with ${response.status}`);
      }

      const aiMessage: ChatMessage = {
        id: 'msg-' + Date.now() + '-m',
        role: 'model',
        content: data.reply || "I'm reflecting on what you wrote. Let's continue exploring this idea.",
        timestamp: new Date().toISOString(),
        modelUsed: data.modelUsed || (data.fallback ? 'local-fallback' : 'gemini'),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      const finalSession: JournalSession = {
        ...sessionWithUserMsg,
        messages: finalMessages,
        updatedAt: new Date().toISOString(),
      };

      setSessions((prev) => prev.map((s) => (s.id === finalSession.id ? finalSession : s)));

      setSaveStatus('saving');
      await saveJournalSession(user.uid, finalSession);
      setSaveStatus('saved');

      // Auto-summarize & categorize on first turn if untitled
      if (
        (finalSession.title === 'New Reflection' || !finalSession.title) &&
        finalSession.messages.length === 2
      ) {
        triggerAutoTitleAndSummary(finalSession);
      }
    } catch (err: any) {
      console.error('Gemini reflection error:', err);
      setDbError(err.message || 'Gemini reflection request failed.');
      setSaveStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Background auto-title generator & categorizer
  const triggerAutoTitleAndSummary = async (sessionToSummarize: JournalSession) => {
    if (!user) return;
    try {
      const res = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: sessionToSummarize.messages }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const summaryData = await res.json();
        const enriched: JournalSession = {
          ...sessionToSummarize,
          title: summaryData.title || sessionToSummarize.title,
          category: summaryData.category || sessionToSummarize.category || 'Journal',
          summary: summaryData.summary || undefined,
          keyInsights: summaryData.keyInsights || undefined,
          sentiment: summaryData.sentiment || undefined,
          actionItems: summaryData.actionItems || undefined,
          structuredTasks: summaryData.structuredTasks || (summaryData.actionItems ? summaryData.actionItems.map((text: string, idx: number) => ({
            id: `tsk_${Date.now()}_${idx}`,
            text,
            priority: 'Medium' as const,
            status: 'pending' as const,
            isCompleted: false,
            createdAt: new Date().toISOString(),
            deadline: new Date(Date.now() + 86400000 * (idx + 2)).toISOString().split('T')[0],
          })) : undefined),
        };
        setSessions((prev) => prev.map((s) => (s.id === enriched.id ? enriched : s)));
        await saveJournalSession(user.uid, enriched);
      }
    } catch (err) {
      console.warn('Auto-summary skipped:', err);
    }
  };

  // Manual Trigger: Synthesize & Summarize Session
  const handleGenerateSummary = async () => {
    if (!user || !currentSession || currentSession.messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentSession.messages }),
      });

      let summaryData: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        summaryData = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 80)}`);
      }

      if (!res.ok && !summaryData.title && !summaryData.summary) {
        throw new Error(summaryData.error || 'Failed to generate summary.');
      }

      const updated: JournalSession = {
        ...currentSession,
        title: summaryData.title || currentSession.title,
        category: summaryData.category || currentSession.category || 'Journal',
        summary: summaryData.summary || undefined,
        keyInsights: summaryData.keyInsights || undefined,
        sentiment: summaryData.sentiment || undefined,
        actionItems: summaryData.actionItems || undefined,
        structuredTasks: summaryData.structuredTasks || (summaryData.actionItems ? summaryData.actionItems.map((text: string, idx: number) => ({
          id: `tsk_${Date.now()}_${idx}`,
          text,
          priority: 'Medium' as const,
          status: 'pending' as const,
          isCompleted: false,
          createdAt: new Date().toISOString(),
          deadline: new Date(Date.now() + 86400000 * (idx + 2)).toISOString().split('T')[0],
        })) : undefined),
        updatedAt: new Date().toISOString(),
      };

      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSaveStatus('saving');
      await saveJournalSession(user.uid, updated);
      setSaveStatus('saved');
    } catch (err: any) {
      console.error('Summarize error:', err);
      setDbError(err.message || 'Failed to synthesize session.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleToggleDarkMode = () => {
    handleUpdateTheme({
      ...theme,
      darkMode: !theme.darkMode,
    });
  };

  const handleRetrySave = async () => {
    if (!user || !currentSession) return;
    try {
      setSaveStatus('saving');
      setDbError(null);
      await saveJournalSession(user.uid, currentSession);
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setDbError(err.message || 'Retry save failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f2] text-[#2c2825] flex flex-col font-sans selection:bg-[#f4d29f] selection:text-[#23201d]">
      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        {authLoading ? (
          <div className="flex h-screen items-center justify-center bg-[#fcf9f2]">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#d5c8b5] border-t-[#2c2825] mb-3" />
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6d6356]">
                Opening Notebook Journal...
              </p>
            </div>
          </div>
        ) : (!user || activeView === 'landing') ? (
          <LandingPage
            onSignIn={handleSignIn}
            onStartJournal={() => setActiveView('dashboard')}
            isLoading={authLoading}
            user={user}
            errorMessage={authError}
            theme={theme}
            themeConfig={themeConfig}
            onUpdateTheme={handleUpdateTheme}
          />
        ) : activeView === 'editor' && currentSession ? (
          <JournalEditor
            session={currentSession}
            onUpdateSession={handleUpdateSession}
            onSendMessage={handleSendMessage}
            onGenerateSummary={handleGenerateSummary}
            onBackToDashboard={() => setActiveView('dashboard')}
            isGenerating={isGenerating}
            isSummarizing={isSummarizing}
            saveStatus={saveStatus}
            errorMessage={dbError}
            onRetrySave={handleRetrySave}
            theme={theme}
            onToggleDarkMode={handleToggleDarkMode}
          />
        ) : (
          <DashboardView
            user={user}
            sessions={sessions}
            onNewSession={(category, withoutAI, folderId, includeInAIHistory) => handleNewSession(category, withoutAI, folderId, includeInAIHistory)}
            onSelectSession={handleSelectSession}
            onUpdateSession={handleUpdateAnySession}
            onDeleteSession={handleDeleteSession}
            onSignOut={handleSignOut}
            onViewLanding={() => setActiveView('landing')}
            theme={theme}
            onUpdateTheme={handleUpdateTheme}
            onBatchUpdateCategory={handleBatchUpdateCategory}
            unfinishedThread={unfinishedThread}
            onContinueThread={handleContinueThread}
            onDismissThread={handleDismissThread}
            isAnalyzingThreads={isAnalyzingThreads}
            goals={goals}
            onSaveGoal={handleSaveGoal}
            onDeleteGoal={handleDeleteGoal}
            customFolders={customFolders}
            onSaveCustomFolder={handleSaveCustomFolder}
            onDeleteCustomFolder={handleDeleteCustomFolder}
            errorMessage={dbError}
            onRetryLoad={handleRetryLoadUserData}
          />
        )}
      </main>
    </div>
  );
}

