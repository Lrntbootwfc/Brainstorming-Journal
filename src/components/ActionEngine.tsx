import React, { useMemo, useState } from 'react';
import { JournalSession, ActionItem, PaperThemePreference, TaskPriority } from '../types';
import { getThemeConfig } from '../utils/theme';
import { orderTasksByDependencies, deduplicateActions } from '../utils/taskIntelligence';
import { 
  CheckCircle, 
  Circle, 
  ExternalLink, 
  Sparkles, 
  ArrowDownUp, 
  Calendar, 
  GitCommit, 
  Clock,
  Check,
  X,
  Plus,
  Trash2,
  Tag,
  CheckSquare,
  Square
} from 'lucide-react';

interface ActionEngineProps {
  sessions: JournalSession[];
  theme?: PaperThemePreference;
  onUpdateSession?: (sessionId: string, updates: Partial<JournalSession>) => void;
  onOpenSession: (sessionId: string) => void;
}

export const ActionEngine: React.FC<ActionEngineProps> = ({ 
  sessions, 
  theme, 
  onUpdateSession, 
  onOpenSession 
}) => {
  const themeConfig = getThemeConfig(theme);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [viewMode, setViewMode] = useState<'deadline' | 'intelligent' | 'date'>('deadline');
  const [editingDeadlineTaskId, setEditingDeadlineTaskId] = useState<string | null>(null);
  const [customDateInput, setCustomDateInput] = useState<string>('');

  // Manual Task Creation State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Medium');
  const [newTaskSubtasks, setNewTaskSubtasks] = useState('');
  const [newTaskSessionId, setNewTaskSessionId] = useState<string>('');

  // Extract, deduplicate, and assemble all actions across sessions
  const consolidatedTasks = useMemo(() => {
    let allExtracted: ActionItem[] = [];

    sessions.forEach((s) => {
      let sessionTasks: ActionItem[] = [];

      if (s.structuredTasks && s.structuredTasks.length > 0) {
        sessionTasks = s.structuredTasks.map((t) => ({
          ...t,
          sourceEntryId: t.sourceEntryId || s.id,
          sessionId: t.sessionId || s.id,
          sessionTitle: t.sessionTitle || s.title,
          status: t.status || (t.isCompleted ? 'completed' : 'pending'),
          isCompleted: Boolean(t.isCompleted || t.status === 'completed'),
        }));
      } else if (s.actionItems && s.actionItems.length > 0) {
        // Fallback convert legacy strings to structured actions with inferred deadlines
        s.actionItems.forEach((text, idx) => {
          const sessionBaseTime = new Date(s.createdAt).getTime() || Date.now();
          const fallbackDeadline = new Date(sessionBaseTime + 86400000 * (idx + 2)).toISOString().split('T')[0];
          sessionTasks.push({
            id: `legacy-${s.id}-${idx}`,
            text,
            sourceEntryId: s.id,
            sessionId: s.id,
            sessionTitle: s.title,
            priority: 'Medium',
            status: 'pending',
            isCompleted: false,
            createdAt: s.createdAt,
            deadline: fallbackDeadline,
          });
        });
      }

      // Deduplicate actions within this session to prevent repeat entries
      const deduped = deduplicateActions([], sessionTasks, s.id, s.title);
      allExtracted.push(...deduped);
    });

    return allExtracted;
  }, [sessions]);

  // Apply Phase 3: Intelligent task ordering & dependency resolution
  const intelligentPlan = useMemo(() => {
    return orderTasksByDependencies(consolidatedTasks);
  }, [consolidatedTasks]);

  // Choose display list based on viewMode
  const displayedTasks = useMemo(() => {
    let list: ActionItem[] = [];
    if (viewMode === 'deadline') {
      list = [...consolidatedTasks].sort((a, b) => {
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (viewMode === 'intelligent') {
      list = intelligentPlan.orderedTasks;
    } else {
      list = [...consolidatedTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filter === 'pending') {
      return list.filter((t) => !t.isCompleted && t.status !== 'completed');
    }
    if (filter === 'completed') {
      return list.filter((t) => t.isCompleted || t.status === 'completed');
    }
    return list;
  }, [viewMode, intelligentPlan, consolidatedTasks, filter]);

  // Interactive toggle with Firestore persistence
  const toggleAction = (action: ActionItem) => {
    if (!onUpdateSession) return;
    const targetSessionId = action.sourceEntryId || action.sessionId;
    if (!targetSessionId) return;

    const session = sessions.find((s) => s.id === targetSessionId);
    if (!session) return;

    const newStatus = action.status === 'completed' || action.isCompleted ? 'pending' : 'completed';
    const newIsCompleted = newStatus === 'completed';

    let updatedStructuredTasks: ActionItem[] = [];

    if (session.structuredTasks && session.structuredTasks.length > 0) {
      updatedStructuredTasks = session.structuredTasks.map((t) => {
        if (t.id === action.id || t.text.trim().toLowerCase() === action.text.trim().toLowerCase()) {
          return {
            ...t,
            status: newStatus,
            isCompleted: newIsCompleted,
          };
        }
        return t;
      });
    } else {
      // If session only had legacy string actionItems, initialize structuredTasks
      const baseItems = session.actionItems || [action.text];
      updatedStructuredTasks = baseItems.map((text, idx) => {
        const matches = text.trim().toLowerCase() === action.text.trim().toLowerCase();
        return {
          id: `task_${session.id}_${idx}`,
          text,
          sourceEntryId: session.id,
          sessionId: session.id,
          sessionTitle: session.title,
          priority: 'Medium',
          status: matches ? newStatus : 'pending',
          isCompleted: matches ? newIsCompleted : false,
          createdAt: session.createdAt,
        };
      });
    }

    onUpdateSession(targetSessionId, {
      structuredTasks: updatedStructuredTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  // Interactive deadline assignment with Firestore persistence
  const updateTaskDeadline = (action: ActionItem, newDeadline: string) => {
    if (!onUpdateSession) return;
    const targetSessionId = action.sourceEntryId || action.sessionId;
    if (!targetSessionId) return;

    const session = sessions.find((s) => s.id === targetSessionId);
    if (!session) return;

    let updatedStructuredTasks: ActionItem[] = [];

    if (session.structuredTasks && session.structuredTasks.length > 0) {
      updatedStructuredTasks = session.structuredTasks.map((t) => {
        if (t.id === action.id || t.text.trim().toLowerCase() === action.text.trim().toLowerCase()) {
          return {
            ...t,
            deadline: newDeadline,
          };
        }
        return t;
      });
    } else {
      const baseItems = session.actionItems || [action.text];
      updatedStructuredTasks = baseItems.map((text, idx) => {
        const matches = text.trim().toLowerCase() === action.text.trim().toLowerCase();
        return {
          id: `task_${session.id}_${idx}`,
          text,
          sourceEntryId: session.id,
          sessionId: session.id,
          sessionTitle: session.title,
          priority: 'Medium',
          status: 'pending',
          isCompleted: false,
          createdAt: session.createdAt,
          deadline: matches ? newDeadline : undefined,
        };
      });
    }

    onUpdateSession(targetSessionId, {
      structuredTasks: updatedStructuredTasks,
      updatedAt: new Date().toISOString(),
    });
    setEditingDeadlineTaskId(null);
  };

  // Interactive subtask completion toggle
  const toggleSubtask = (action: ActionItem, subtaskId: string) => {
    if (!onUpdateSession) return;
    const targetSessionId = action.sourceEntryId || action.sessionId;
    if (!targetSessionId) return;

    const session = sessions.find((s) => s.id === targetSessionId);
    if (!session || !session.structuredTasks) return;

    const updatedStructuredTasks = session.structuredTasks.map((t) => {
      if (t.id === action.id || t.text.trim().toLowerCase() === action.text.trim().toLowerCase()) {
        const updatedSubs = (t.subtasks || []).map((st: any) => {
          if (st.id === subtaskId) {
            return { ...st, isCompleted: !st.isCompleted };
          }
          return st;
        });
        return { ...t, subtasks: updatedSubs };
      }
      return t;
    });

    onUpdateSession(targetSessionId, {
      structuredTasks: updatedStructuredTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete a task (either manual or extracted)
  const deleteTask = (action: ActionItem) => {
    if (!onUpdateSession) return;
    const targetSessionId = action.sourceEntryId || action.sessionId;
    if (!targetSessionId) return;

    const session = sessions.find((s) => s.id === targetSessionId);
    if (!session) return;

    let updatedStructuredTasks: ActionItem[] = [];
    if (session.structuredTasks && session.structuredTasks.length > 0) {
      updatedStructuredTasks = session.structuredTasks.filter(
        (t) => t.id !== action.id && t.text.trim().toLowerCase() !== action.text.trim().toLowerCase()
      );
    } else if (session.actionItems) {
      const remainingStrings = session.actionItems.filter(
        (txt) => txt.trim().toLowerCase() !== action.text.trim().toLowerCase()
      );
      onUpdateSession(targetSessionId, {
        actionItems: remainingStrings,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    onUpdateSession(targetSessionId, {
      structuredTasks: updatedStructuredTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  // Create a new task manually
  const handleCreateManualTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskText.trim()) return;
    if (!onUpdateSession) return;

    const targetSession = sessions.find((s) => s.id === newTaskSessionId) || sessions[0];
    if (!targetSession) return;

    const parsedSubtasks = newTaskSubtasks
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: `sub_${Date.now()}_${idx}`,
        text,
        isCompleted: false,
      }));

    const newTask: ActionItem = {
      id: `manual_task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: newTaskText.trim(),
      sourceEntryId: targetSession.id,
      sessionId: targetSession.id,
      sessionTitle: targetSession.title,
      priority: newTaskPriority,
      deadline: newTaskDeadline || undefined,
      status: 'pending',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      isManual: true,
      subtasks: parsedSubtasks.length > 0 ? parsedSubtasks : undefined,
    };

    let existingTasks = targetSession.structuredTasks || [];
    if (existingTasks.length === 0 && targetSession.actionItems && targetSession.actionItems.length > 0) {
      existingTasks = targetSession.actionItems.map((text, idx) => ({
        id: `legacy_${targetSession.id}_${idx}`,
        text,
        sourceEntryId: targetSession.id,
        sessionId: targetSession.id,
        sessionTitle: targetSession.title,
        priority: 'Medium' as const,
        status: 'pending' as const,
        isCompleted: false,
        createdAt: targetSession.createdAt,
      }));
    }

    onUpdateSession(targetSession.id, {
      structuredTasks: [newTask, ...existingTasks],
      updatedAt: new Date().toISOString(),
    });

    // Reset form fields
    setNewTaskText('');
    setNewTaskDeadline('');
    setNewTaskPriority('Medium');
    setNewTaskSubtasks('');
    setIsAddingTask(false);
  };

  const setQuickDeadline = (daysFromNow: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysFromNow);
    setNewTaskDeadline(targetDate.toISOString().split('T')[0]);
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'High':
        return { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.25)' };
      case 'Medium':
        return { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.25)' };
      case 'Low':
        return { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.25)' };
      default:
        return { bg: 'rgba(156, 163, 175, 0.12)', text: '#6b7280', border: 'rgba(156, 163, 175, 0.25)' };
    }
  };

  const activeCount = consolidatedTasks.filter((t) => !t.isCompleted && t.status !== 'completed').length;
  const completedCount = consolidatedTasks.filter((t) => t.isCompleted || t.status === 'completed').length;

  return (
    <div className="w-full h-full p-6 sm:p-8 overflow-y-auto" style={{ color: themeConfig.inkColor }}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: themeConfig.border }}>
          <div>
            <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
              <CheckCircle className="h-6 w-6" style={{ color: themeConfig.primary }} />
              Thought ➔ Action
            </h2>
            <p className="text-sm opacity-75 mt-1">
              Actions extracted from reflections or added manually, with task dependencies and intelligent sequencing.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-all cursor-pointer"
              style={{ backgroundColor: themeConfig.primary }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isAddingTask ? 'Close Form' : 'Add Task Manually'}</span>
            </button>

            <div 
              className="px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-xs"
              style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
            >
              <span>{activeCount} Active</span>
              <span className="opacity-40">•</span>
              <span className="opacity-70">{completedCount} Done</span>
            </div>
          </div>
        </div>

        {/* Philosophy Callout: Thoughts don't always need actions */}
        <div 
          className="p-4 rounded-2xl border text-xs flex items-start gap-3 shadow-2xs"
          style={{ 
            backgroundColor: themeConfig.chipBg, 
            borderColor: themeConfig.border, 
            color: themeConfig.inkColor 
          }}
        >
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">Contemplation is complete on its own</span>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                style={{ 
                  backgroundColor: themeConfig.paperCardBg, 
                  borderColor: themeConfig.border, 
                  color: themeConfig.primary 
                }}
              >
                Optional Companion
              </span>
            </div>
            <p className="opacity-80 leading-relaxed">
              In this notebook, thought-to-action is completely optional. Many reflections are meant for mindfulness, emotional processing, or creative exploration without being forced into a to-do list. Use the Action Engine only when you choose to plan execution, or manually add standalone tasks below.
            </p>
          </div>
        </div>

        {/* Manual Task Creation Form */}
        {isAddingTask && (
          <form 
            onSubmit={handleCreateManualTask}
            className="p-5 rounded-2xl border shadow-sm space-y-4 transition-all"
            style={{ 
              backgroundColor: themeConfig.paperCardBg, 
              borderColor: themeConfig.border 
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: themeConfig.border }}>
              <div className="flex items-center gap-2 font-serif font-bold text-sm" style={{ color: themeConfig.inkColor }}>
                <Plus className="h-4 w-4" style={{ color: themeConfig.primary }} />
                <span>Create New Task</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddingTask(false)}
                className="opacity-60 hover:opacity-100 transition-opacity p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Task Name Input */}
            <div>
              <label className="block text-xs font-bold mb-1 opacity-80">
                Task Description <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="What action needs to be taken?"
                required
                className="w-full px-3 py-2 rounded-xl border text-sm outline-hidden focus:ring-1 transition-all"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  borderColor: themeConfig.border,
                  color: themeConfig.inkColor
                }}
              />
            </div>

            {/* Deadline & Quick Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold opacity-80">
                  Target Deadline (Optional)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(0)}
                    className="text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer hover:opacity-100 opacity-75"
                    style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(1)}
                    className="text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer hover:opacity-100 opacity-75"
                    style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(3)}
                    className="text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer hover:opacity-100 opacity-75"
                    style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(7)}
                    className="text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer hover:opacity-100 opacity-75"
                    style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                  >
                    Next Week
                  </button>
                </div>
              </div>
              <input 
                type="date"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border text-sm outline-hidden font-mono"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  borderColor: themeConfig.border,
                  color: themeConfig.inkColor
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Priority Selection */}
              <div>
                <label className="block text-xs font-bold mb-1 opacity-80">Priority</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Low', 'Medium', 'High'] as TaskPriority[]).map((p) => {
                    const isSelected = newTaskPriority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTaskPriority(p)}
                        className="py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer"
                        style={isSelected ? {
                          backgroundColor: themeConfig.primary,
                          color: '#ffffff',
                          borderColor: themeConfig.primary
                        } : {
                          backgroundColor: themeConfig.chipBg,
                          borderColor: themeConfig.border,
                          color: themeConfig.inkColor,
                          opacity: 0.75
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reflection Assignment */}
              <div>
                <label className="block text-xs font-bold mb-1 opacity-80">Connect to Reflection</label>
                <select
                  value={newTaskSessionId}
                  onChange={(e) => setNewTaskSessionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.inkColor
                  }}
                >
                  <option value="">Standalone Action (or latest reflection)</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || 'Untitled Session'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Horizontal Subtasks */}
            <div>
              <label className="block text-xs font-bold mb-1 opacity-80">
                Horizontal Sub-steps (Optional, comma or newline separated)
              </label>
              <input
                type="text"
                value={newTaskSubtasks}
                onChange={(e) => setNewTaskSubtasks(e.target.value)}
                placeholder="e.g., Draft outline, Gather data, Review with team"
                className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  borderColor: themeConfig.border,
                  color: themeConfig.inkColor
                }}
              />
              {newTaskSubtasks.trim() && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] font-bold opacity-60">Subtask Preview:</span>
                  {newTaskSubtasks.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).map((st, i) => (
                    <span 
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium border"
                      style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
                    >
                      {i + 1}{String.fromCharCode(97 + (i % 26))}. {st}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: themeConfig.border }}>
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border hover:opacity-80 transition-opacity cursor-pointer"
                style={{ borderColor: themeConfig.border, color: themeConfig.inkColor }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTaskText.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save Task</span>
              </button>
            </div>
          </form>
        )}

        {/* Control Bar: Filters & View Mode (Clean High Contrast, No Black Box) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Status Filter Tabs */}
          <div 
            className="flex items-center gap-1.5 p-1 rounded-2xl border" 
            style={{ 
              backgroundColor: themeConfig.chipBg, 
              borderColor: themeConfig.border 
            }}
          >
            <button
              onClick={() => setFilter('pending')}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              style={filter === 'pending' ? {
                backgroundColor: themeConfig.primary,
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
              } : {
                color: themeConfig.inkColor,
                opacity: 0.75,
              }}
            >
              <span>Pending</span>
              <span 
                className="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                style={filter === 'pending' ? {
                  backgroundColor: 'rgba(255,255,255,0.28)',
                  color: '#ffffff',
                } : {
                  backgroundColor: themeConfig.paperCardBg,
                  color: themeConfig.inkColor,
                }}
              >
                {activeCount}
              </span>
            </button>
            <button
              onClick={() => setFilter('all')}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              style={filter === 'all' ? {
                backgroundColor: themeConfig.primary,
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
              } : {
                color: themeConfig.inkColor,
                opacity: 0.75,
              }}
            >
              <span>All</span>
              <span 
                className="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                style={filter === 'all' ? {
                  backgroundColor: 'rgba(255,255,255,0.28)',
                  color: '#ffffff',
                } : {
                  backgroundColor: themeConfig.paperCardBg,
                  color: themeConfig.inkColor,
                }}
              >
                {consolidatedTasks.length}
              </span>
            </button>
            <button
              onClick={() => setFilter('completed')}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              style={filter === 'completed' ? {
                backgroundColor: themeConfig.primary,
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
              } : {
                color: themeConfig.inkColor,
                opacity: 0.75,
              }}
            >
              <span>Completed</span>
              <span 
                className="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                style={filter === 'completed' ? {
                  backgroundColor: 'rgba(255,255,255,0.28)',
                  color: '#ffffff',
                } : {
                  backgroundColor: themeConfig.paperCardBg,
                  color: themeConfig.inkColor,
                }}
              >
                {completedCount}
              </span>
            </button>
          </div>

          {/* View Mode Toggle (High-Contrast, No Black Box) */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <button
              onClick={() => setViewMode('deadline')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer"
              style={viewMode === 'deadline' ? {
                backgroundColor: themeConfig.primary,
                color: '#ffffff',
                borderColor: themeConfig.primary,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
              } : {
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border,
                color: themeConfig.inkColor,
                opacity: 0.8
              }}
            >
              <Calendar className="h-3.5 w-3.5" />
              By Deadline
            </button>
            <button
              onClick={() => setViewMode('intelligent')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer"
              style={viewMode === 'intelligent' ? {
                backgroundColor: themeConfig.primary,
                color: '#ffffff',
                borderColor: themeConfig.primary,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
              } : {
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border,
                color: themeConfig.inkColor,
                opacity: 0.8
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Intelligent Order
            </button>
            <button
              onClick={() => setViewMode('date')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer"
              style={viewMode === 'date' ? {
                backgroundColor: themeConfig.primary,
                color: '#ffffff',
                borderColor: themeConfig.primary,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
              } : {
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border,
                color: themeConfig.inkColor,
                opacity: 0.8
              }}
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              Recent First
            </button>
          </div>
        </div>

        {/* Phase 3 / Deadline Banner */}
        {viewMode === 'deadline' && (
          <div 
            className="p-3.5 rounded-xl border text-xs flex items-start gap-2.5"
            style={{ 
              backgroundColor: themeConfig.chipBg, 
              borderColor: themeConfig.border, 
              color: themeConfig.inkColor 
            }}
          >
            <Calendar className="h-4 w-4 shrink-0 mt-0.5" style={{ color: themeConfig.primary }} />
            <div>
              <span className="font-bold">Chronological Deadline Sorting: </span>
              <span className="opacity-90">Tasks ordered by closest due date. Click on any deadline badge to adjust or set a date.</span>
            </div>
          </div>
        )}

        {viewMode === 'intelligent' && consolidatedTasks.length > 0 && (
          <div 
            className="p-3.5 rounded-xl border text-xs flex items-start gap-2.5"
            style={{ 
              backgroundColor: themeConfig.chipBg, 
              borderColor: themeConfig.border,
            }}
          >
            <GitCommit className="h-4 w-4 shrink-0 mt-0.5 opacity-70" style={{ color: themeConfig.primary }} />
            <div>
              <span className="font-bold">Sequencing Rationale: </span>
              <span className="opacity-90">{intelligentPlan.explanation}</span>
              <p className="opacity-60 mt-0.5">
                Priority order applied: 1. Explicit dependencies ➔ 2. Deadlines ➔ 3. Prerequisite actions (Research ➔ Build ➔ Test) ➔ 4. High priority.
              </p>
            </div>
          </div>
        )}

        {/* Task List */}
        {displayedTasks.length === 0 ? (
          <div className="text-center py-16 opacity-80 border rounded-2xl p-8" style={{ borderColor: themeConfig.border }}>
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-bold mb-1">
              {filter === 'completed' ? 'No completed tasks yet' : 'No action items right now'}
            </h3>
            <p className="text-xs max-w-md mx-auto opacity-75 mb-4">
              {filter === 'completed'
                ? 'Check off active tasks as you complete them to see your progress recorded here.'
                : 'Action extraction is completely optional. Contemplative reflections do not require tasks. If you do want to plan execution, feel free to add a task manually.'}
            </p>
            {filter !== 'completed' && !isAddingTask && (
              <button
                onClick={() => setIsAddingTask(true)}
                className="px-4 py-2 rounded-full text-xs font-bold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-all"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Task Manually</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTasks.map((task) => {
              const pStyle = getPriorityBadgeStyle(task.priority);
              const isDone = task.isCompleted || task.status === 'completed';

              return (
                <div 
                  key={task.id}
                  className={`p-4 rounded-2xl border shadow-xs transition-all flex items-start gap-3.5 ${
                    isDone ? 'opacity-55 grayscale' : 'hover:shadow-sm'
                  }`}
                  style={{ 
                    backgroundColor: themeConfig.paperCardBg, 
                    borderColor: themeConfig.border 
                  }}
                >
                  {/* Interactive Checkbox */}
                  <button
                    onClick={() => toggleAction(task)}
                    className="mt-0.5 shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    style={{ color: isDone ? themeConfig.primary : '#9ca3af' }}
                    aria-label={isDone ? 'Mark task pending' : 'Mark task completed'}
                  >
                    {isDone ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5 hover:text-emerald-600 transition-colors" />
                    )}
                  </button>
                  
                  {/* Task Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {/* Step Number in Intelligent Mode */}
                      {viewMode === 'intelligent' && task.suggestedOrder && (
                        <span 
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                          style={{ 
                            backgroundColor: themeConfig.chipBg, 
                            borderColor: themeConfig.border, 
                            color: themeConfig.primary 
                          }}
                        >
                          Step #{task.suggestedOrder}
                        </span>
                      )}

                      {/* Manual vs Extracted Badge */}
                      {task.isManual ? (
                        <span 
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1"
                          style={{ 
                            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                            color: '#2563eb', 
                            borderColor: 'rgba(59, 130, 246, 0.25)' 
                          }}
                        >
                          <Tag className="h-2.5 w-2.5" />
                          Manual
                        </span>
                      ) : (
                        <span 
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md border opacity-70"
                          style={{ 
                            backgroundColor: themeConfig.chipBg, 
                            borderColor: themeConfig.border 
                          }}
                        >
                          From Reflection
                        </span>
                      )}

                      {/* Priority Badge */}
                      <span 
                        className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border"
                        style={{ 
                          backgroundColor: pStyle.bg, 
                          color: pStyle.text, 
                          borderColor: pStyle.border 
                        }}
                      >
                        {task.priority || 'Medium'}
                      </span>

                      {/* Interactive Deadline Badge (Editable & Highlighted) */}
                      {editingDeadlineTaskId === task.id ? (
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/40 rounded-lg px-2 py-0.5 text-xs">
                          <input
                            type="date"
                            defaultValue={task.deadline || customDateInput}
                            onChange={(e) => setCustomDateInput(e.target.value)}
                            className="bg-transparent text-xs text-amber-700 dark:text-amber-300 outline-hidden font-medium"
                          />
                          <button
                            onClick={() => updateTaskDeadline(task, customDateInput || task.deadline || new Date().toISOString().split('T')[0])}
                            className="p-0.5 hover:text-emerald-600 cursor-pointer"
                            title="Save deadline"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setEditingDeadlineTaskId(null)}
                            className="p-0.5 hover:text-rose-600 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingDeadlineTaskId(task.id);
                            setCustomDateInput(task.deadline || new Date().toISOString().split('T')[0]);
                          }}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-all hover:scale-105"
                          style={task.deadline ? {
                            backgroundColor: 'rgba(245, 158, 11, 0.12)', 
                            borderColor: 'rgba(245, 158, 11, 0.35)',
                            color: '#b45309',
                          } : {
                            backgroundColor: themeConfig.chipBg,
                            borderColor: themeConfig.border,
                            color: themeConfig.inkColor,
                            opacity: 0.7
                          }}
                          title="Click to change or set task deadline"
                        >
                          <Calendar className="h-2.5 w-2.5" />
                          {task.deadline ? `Due: ${task.deadline}` : '+ Set Deadline'}
                        </button>
                      )}

                      {/* Source Journal Session Link */}
                      {(task.sourceEntryId || task.sessionId) && (
                        <button 
                          onClick={() => onOpenSession(task.sourceEntryId || task.sessionId!)}
                          className="text-[10px] font-semibold opacity-60 hover:opacity-100 flex items-center gap-1 ml-auto transition-all cursor-pointer"
                          title="Open origin journal reflection"
                        >
                          <span>From: {task.sessionTitle ? (task.sessionTitle.length > 20 ? task.sessionTitle.slice(0, 20) + '...' : task.sessionTitle) : 'Reflection'}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}

                      {/* Delete Task Button */}
                      {onUpdateSession && (
                        <button
                          onClick={() => deleteTask(task)}
                          className="text-[10px] p-1 rounded-md opacity-40 hover:opacity-100 hover:text-rose-600 transition-all cursor-pointer ml-1"
                          title="Delete this task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Task Text */}
                    <p className={`text-sm md:text-base font-medium leading-snug ${isDone ? 'line-through opacity-70' : ''}`}>
                      {task.text}
                    </p>

                    {/* Horizontal Subtasks (if available) */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: themeConfig.border }}>
                        <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Sub-steps:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.subtasks.map((subtask: any, subIdx) => {
                            const subText = typeof subtask === 'string' ? subtask : subtask?.text || '';
                            const subId = typeof subtask === 'object' && subtask?.id ? subtask.id : `sub_${subIdx}`;
                            const isSubCompleted = typeof subtask === 'object' ? Boolean(subtask?.isCompleted) : false;
                            const subLabel = `${subIdx + 1}${String.fromCharCode(97 + (subIdx % 26))}`;
                            
                            return (
                              <button
                                key={subIdx}
                                type="button"
                                onClick={() => {
                                  if (typeof subtask === 'object' && subtask?.id) {
                                    toggleSubtask(task, subtask.id);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                                  isSubCompleted ? 'opacity-50 line-through' : 'hover:scale-102'
                                }`}
                                style={{
                                  backgroundColor: themeConfig.chipBg,
                                  borderColor: themeConfig.border,
                                  color: themeConfig.inkColor
                                }}
                                title={typeof subtask === 'object' ? 'Click to toggle completion' : undefined}
                              >
                                {typeof subtask === 'object' ? (
                                  isSubCompleted ? (
                                    <CheckSquare className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Square className="h-3 w-3 opacity-60" />
                                  )
                                ) : (
                                  <span 
                                    className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                                    style={{ backgroundColor: themeConfig.primary }}
                                  >
                                    {subLabel}
                                  </span>
                                )}
                                <span className="text-xs opacity-90">{subText}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Phase 3: Explainable Order Reason / Dependency Cue */}
                    {viewMode === 'intelligent' && task.orderReason && !isDone && (
                      <div className="mt-2 text-[11px] opacity-75 flex items-center gap-1.5">
                        <Clock className="h-3 w-3 shrink-0 opacity-60" />
                        <span>Why now: <span className="font-medium opacity-90">{task.orderReason}</span></span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
