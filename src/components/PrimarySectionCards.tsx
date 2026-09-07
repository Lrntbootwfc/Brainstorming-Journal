import React, { useState } from 'react';
import { 
  Feather, 
  Sparkles, 
  Compass, 
  ArrowRight, 
  CheckSquare, 
  Target, 
  Folder, 
  Network, 
  TreeDeciduous, 
  Workflow, 
  Calendar as CalendarIcon, 
  Activity, 
  Lightbulb, 
  Smile, 
  Clock, 
  Plus, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Brain, 
  X, 
  BookOpen, 
  Sliders,
  ChevronRight,
  GitBranch
} from 'lucide-react';
import { 
  JournalSession, 
  UnfinishedThread, 
  PersonalGoal, 
  CustomFolder, 
  PaperThemePreference, 
  FilterCategory 
} from '../types';

interface PrimarySectionCardsProps {
  primarySection: 'create' | 'explore' | 'reflect';
  sessions: JournalSession[];
  unfinishedThread?: UnfinishedThread | null;
  goals?: PersonalGoal[];
  customFolders?: CustomFolder[];
  displayName: string;
  theme: PaperThemePreference;
  themeConfig: any;
  quietIncludeInAIHistory: boolean;
  onSetQuietIncludeInAIHistory: (val: boolean) => void;
  onNewSession: (category?: 'Brainstorm' | 'Journal' | 'Reflective', withoutAI?: boolean, folderId?: string, includeInAIHistory?: boolean) => void;
  onSelectSession: (id: string) => void;
  onContinueThread?: (thread: UnfinishedThread) => void;
  onDismissThread?: (id: string) => void;
  onOpenFeatureView: (featureView: string, subTab?: string) => void;
  onOpenQuietJournalModal: () => void;
  onSaveCustomFolder?: (folder: CustomFolder) => Promise<void>;
}

export const PrimarySectionCards: React.FC<PrimarySectionCardsProps> = ({
  primarySection,
  sessions,
  unfinishedThread,
  goals = [],
  customFolders = [],
  displayName,
  theme,
  themeConfig,
  quietIncludeInAIHistory,
  onSetQuietIncludeInAIHistory,
  onNewSession,
  onSelectSession,
  onContinueThread,
  onDismissThread,
  onOpenFeatureView,
  onOpenQuietJournalModal,
  onSaveCustomFolder,
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Total structured / legacy tasks for Thought to Action
  const totalTasksCount = sessions.reduce((acc, s) => {
    const structured = s.structuredTasks ? s.structuredTasks.length : 0;
    const legacy = s.actionItems ? s.actionItems.length : 0;
    return acc + Math.max(structured, legacy);
  }, 0);

  const completedTasksCount = sessions.reduce((acc, s) => {
    if (s.structuredTasks) {
      return acc + s.structuredTasks.filter(t => t.isCompleted || t.status === 'completed').length;
    }
    return acc;
  }, 0);

  // Mood counts for Reflect section
  const moodDistribution = sessions.reduce((acc: Record<string, number>, s) => {
    if (s.mood) {
      const mainMood = s.mood.split(' ')[0] || s.mood;
      acc[mainMood] = (acc[mainMood] || 0) + 1;
    }
    return acc;
  }, {});

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !onSaveCustomFolder) return;
    const newFolder: CustomFolder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      color: themeConfig.primary,
      icon: 'folder',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveCustomFolder(newFolder);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  return (
    <div className="mb-8">
      {/* ─────────────────────────────────────────────────────────────
          SECTION: CREATE
          • Journal & Brainstorming
          • Journal without gemini (toggle: include in AI history as summary?)
          • Thought → Action (Task Dependencies & Intelligent Ordering)
          • Goals and planning (with study tracking)
          • Projects
          • Mind Maps (auto-generated shapes & editable)
         ───────────────────────────────────────────────────────────── */}
      {primarySection === 'create' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Journal & Brainstorming */}
          <div 
            id="card-create-journal-brainstorm"
            className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    color: themeConfig.primary,
                    borderColor: themeConfig.border,
                  }}
                >
                  Create
                </span>
                <Feather className="h-4 w-4 opacity-60" style={{ color: themeConfig.primary }} />
              </div>
              <h4 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                Journal & Brainstorming
              </h4>
              <p className="text-xs opacity-75 mt-1.5 leading-relaxed">
                Capture creative sparks, freeform reflections, or stream-of-consciousness ideas with Gemini companion support.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: themeConfig.border }}>
              <button
                onClick={() => onNewSession('Reflective')}
                className="px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <span>Reflective Journal</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => onNewSession('Brainstorm')}
                className="px-3 py-1.5 rounded-full text-xs font-bold border hover:opacity-90 transition-all cursor-pointer"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  borderColor: themeConfig.border,
                  color: themeConfig.inkColor,
                }}
              >
                <span>Brainstorm</span>
              </button>
            </div>
          </div>

          {/* 2. Journal without Gemini (Quiet Journal) */}
          <div 
            id="card-create-quiet-journal"
            className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    color: themeConfig.primary,
                    borderColor: themeConfig.border,
                  }}
                >
                  Private & Focused
                </span>
                <BookOpen className="h-4 w-4 opacity-80" style={{ color: themeConfig.primary }} />
              </div>
              <h4 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                Journal without Gemini
              </h4>
              <p className="text-xs opacity-75 mt-1.5 leading-relaxed">
                A calm, distraction-free writing space without AI suggestions or interruptions.
              </p>

              {/* AI History Toggle inside card */}
              <div 
                className="mt-3 p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs"
                style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-[11px]" style={{ color: themeConfig.inkColor }}>
                    Include in AI history as summary?
                  </span>
                  <span className="text-[10px] opacity-60">Allows future chat to recall entry gist</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={quietIncludeInAIHistory}
                    onChange={(e) => onSetQuietIncludeInAIHistory(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div 
                    className="w-8 h-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all"
                    style={{
                      backgroundColor: quietIncludeInAIHistory ? themeConfig.primary : (theme.darkMode ? '#374151' : '#d1d5db')
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: themeConfig.border }}>
              <span className="text-[11px] opacity-60">Zero AI interruptions</span>
              <button
                onClick={() => onNewSession('Journal', true, undefined, quietIncludeInAIHistory)}
                className="px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <span>Write Quietly</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 3. Thought → Action */}
          <div 
            id="card-create-thought-to-action"
            className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    color: themeConfig.primary,
                    borderColor: themeConfig.border,
                  }}
                >
                  Actionable
                </span>
                <CheckSquare className="h-4 w-4 opacity-60" style={{ color: themeConfig.primary }} />
              </div>
              <h4 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                Thought → Action
              </h4>
              <p className="text-xs opacity-75 mt-1 leading-relaxed">
                Transform reflections into concrete steps. Includes <strong>Task Dependencies & Intelligent Ordering</strong> to execute priorities systematically.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{completedTasksCount}/{totalTasksCount} Steps Completed</span>
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: themeConfig.border }}>
              <span className="text-[11px] opacity-60 font-medium">Auto-extracted</span>
              <button
                onClick={() => onOpenFeatureView('thought-to-action')}
                className="px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <span>Open Thought → Action</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 4. Goals and Planning */}
          <div 
            id="card-create-goals-planning"
            className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    color: themeConfig.primary,
                    borderColor: themeConfig.border,
                  }}
                >
                  Planning & Study
                </span>
                <Target className="h-4 w-4 opacity-60" style={{ color: themeConfig.primary }} />
              </div>
              <h4 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                Goals and Planning
              </h4>
              <p className="text-xs opacity-75 mt-1 leading-relaxed">
                Set short & long-term goals with intention tracking, milestone checklists, and integrated study planning schedules.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}>
                  {goals.length} Active {goals.length === 1 ? 'Goal' : 'Goals'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: themeConfig.border }}>
              <span className="text-[11px] opacity-60">Study tracking included</span>
              <button
                onClick={() => onOpenFeatureView('goals')}
                className="px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <span>Open Goals & Planning</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>



          {/* 6. Mind Maps */}
          <div 
            id="card-create-mind-maps"
            className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    color: themeConfig.primary,
                    borderColor: themeConfig.border,
                  }}
                >
                  Visual Web
                </span>
                <Network className="h-4 w-4 opacity-60" style={{ color: themeConfig.primary }} />
              </div>
              <h4 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                Mind Maps
              </h4>
              <p className="text-xs opacity-75 mt-1 leading-relaxed">
                Automatically generated thought map using geometric shapes centered on <em>{displayName}'s Thoughts</em>. New ideas dynamically sprout new nodes that you can freely modify.
              </p>

              {/* Visual preview pill shapes */}
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs" style={{ backgroundColor: themeConfig.primary }}>
                  {displayName.split(' ')[0]}'s Thoughts
                </span>
                <span className="text-[10px] opacity-40">→</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
                  Auto-Shapes
                </span>
                <span className="text-[10px] opacity-40">→</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}>
                  Editable
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: themeConfig.border }}>
              <span className="text-[11px] opacity-60">Geometric shape layout</span>
              <button
                onClick={() => onOpenFeatureView('mind-maps')}
                className="px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <span>Open Mind Map</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION: EXPLORE
          • Continue Where I Left Off
          • Connect the Dots (Mind Garden & Flowcharts inside)
         ───────────────────────────────────────────────────────────── */}
      {primarySection === 'explore' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Continue Where I Left Off Card */}
          <div 
            id="continue-where-left-off-card"
            className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs"
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
                    {onDismissThread && (
                      <button
                        onClick={() => onDismissThread(unfinishedThread.id)}
                        className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <h4 className="font-serif text-lg font-bold line-clamp-2" style={{ color: themeConfig.inkColor }}>
                    {unfinishedThread.topic}
                  </h4>
                  <p className="font-serif italic text-xs opacity-80 mt-2 line-clamp-3 p-3 rounded-2xl border" style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}>
                    "{unfinishedThread.openingPrompt}"
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: themeConfig.border }}>
                  <span className="text-[11px] opacity-60 truncate">
                    {unfinishedThread.sessionTitle}
                  </span>
                  <button
                    onClick={() => onContinueThread && onContinueThread(unfinishedThread)}
                    className="px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 shrink-0 cursor-pointer"
                    style={{ backgroundColor: themeConfig.primary }}
                  >
                    <span>Continue Thread</span>
                    <ArrowRight className="h-3.5 w-3.5" />
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
                  <h4 className="font-serif text-lg font-bold line-clamp-2" style={{ color: themeConfig.inkColor }}>
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
                    className="px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 shrink-0 cursor-pointer"
                    style={{ backgroundColor: themeConfig.primary }}
                  >
                    <span>Resume Entry</span>
                    <ArrowRight className="h-3.5 w-3.5" />
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
                    Fresh Start
                  </span>
                  <h4 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                    Start Your First Reflection
                  </h4>
                  <p className="text-xs opacity-75 mt-2 leading-relaxed">
                    Your thoughts, brainstorms, and personal moments will appear here so you can continue effortlessly.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: themeConfig.border }}>
                  <button
                    onClick={() => onNewSession('Journal')}
                    className="px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 cursor-pointer"
                    style={{ backgroundColor: themeConfig.primary }}
                  >
                    <span>Write First Note</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 2. Connect the Dots Card (Mind Tree, Flowcharts, Mind Map & Story Threads) */}
          <div 
            id="card-explore-connect-dots"
            className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    color: themeConfig.primary,
                    borderColor: themeConfig.border,
                  }}
                >
                  Deep Synthesis
                </span>
                <Compass className="h-4 w-4 opacity-60" style={{ color: themeConfig.primary }} />
              </div>
              <h4 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                Connect the Dots
              </h4>
              <p className="text-xs opacity-75 mt-1.5 leading-relaxed">
                Discover emergent patterns across all your reflections. Enter to explore your <strong>Mind Tree</strong>, <strong>Flowcharts</strong>, <strong>Mind Map</strong>, and <strong>Story Threads</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => onOpenFeatureView('connect-dots', 'tree')}
                  className="p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all hover:scale-101 cursor-pointer"
                  style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TreeDeciduous className="h-4 w-4" style={{ color: themeConfig.primary }} />
                    <span className="font-bold text-xs" style={{ color: themeConfig.inkColor }}>Mind Tree</span>
                  </div>
                  <span className="text-[10px] opacity-70">Organic branching tree of thoughts</span>
                </button>

                <button
                  onClick={() => onOpenFeatureView('connect-dots', 'flowchart')}
                  className="p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all hover:scale-101 cursor-pointer"
                  style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Workflow className="h-4 w-4" style={{ color: themeConfig.primary }} />
                    <span className="font-bold text-xs" style={{ color: themeConfig.inkColor }}>Flowcharts</span>
                  </div>
                  <span className="text-[10px] opacity-70">Intelligent chronological steps</span>
                </button>

                <button
                  onClick={() => onOpenFeatureView('connect-dots', 'mindmap')}
                  className="p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all hover:scale-101 cursor-pointer"
                  style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Network className="h-4 w-4" style={{ color: themeConfig.primary }} />
                    <span className="font-bold text-xs" style={{ color: themeConfig.inkColor }}>Mind Map</span>
                  </div>
                  <span className="text-[10px] opacity-70">Interactive geometric idea web</span>
                </button>

                <button
                  onClick={() => onOpenFeatureView('connect-dots', 'stories')}
                  className="p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all hover:scale-101 cursor-pointer"
                  style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="h-4 w-4" style={{ color: themeConfig.primary }} />
                    <span className="font-bold text-xs" style={{ color: themeConfig.inkColor }}>Story Threads</span>
                  </div>
                  <span className="text-[10px] opacity-70">Evolution arcs & storylines</span>
                </button>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t flex items-center justify-between" style={{ borderColor: themeConfig.border }}>
              <span className="text-[11px] opacity-60 font-medium">Interactive canvas</span>
              <button
                onClick={() => onOpenFeatureView('connect-dots', 'tree')}
                className="px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <span>Enter Connect the Dots</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION: REFLECT
          • AI-generated Summaries
           
          • Mood Calendar
          • Mood + Context Correlation
         ───────────────────────────────────────────────────────────── */}
      {primarySection === 'reflect' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. AI-generated Summaries */}
          <div 
            id="card-reflect-summaries"
            className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    color: themeConfig.primary,
                    borderColor: themeConfig.border,
                  }}
                >
                  AI Synthesis
                </span>
                <Sparkles className="h-4 w-4 opacity-60" style={{ color: themeConfig.primary }} />
              </div>
              <h4 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                AI-generated Summaries
              </h4>
              <p className="text-xs opacity-75 mt-1.5 leading-relaxed">
                Synthesized insights distilling core themes, emotional arcs, and breakthroughs across your recent entries.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t flex items-center justify-between" style={{ borderColor: themeConfig.border }}>
              <span className="text-[11px] opacity-60">{sessions.length} Moments analyzed</span>
              <button
                onClick={() => onOpenFeatureView('summaries')}
                className="px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <span>View Summaries</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          

          {/* 3. Mood Calendar */}
          <div 
            id="card-reflect-mood-calendar"
            className="rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    color: themeConfig.primary,
                    borderColor: themeConfig.border,
                  }}
                >
                  Calendar
                </span>
                <CalendarIcon className="h-4 w-4 opacity-60" style={{ color: themeConfig.primary }} />
              </div>
              <h4 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                Mood Calendar
              </h4>
              <p className="text-xs opacity-75 mt-1.5 leading-relaxed">
                Day-by-day emotional timeline showing consistency, streak counts, and seasonal mood evolution.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t flex items-center justify-between" style={{ borderColor: themeConfig.border }}>
              <span className="text-[11px] opacity-60 font-medium">Daily grid</span>
              <button
                onClick={() => onOpenFeatureView('mood-calendar')}
                className="px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <span>Open Calendar</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
