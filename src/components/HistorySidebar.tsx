import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Trash2, 
  Calendar, 
  MessageSquare, 
  Sparkles, 
  Download, 
  FileText,
  Clock,
  Filter
} from 'lucide-react';
import { JournalSession } from '../types';
import { MOOD_OPTIONS } from '../data/prompts';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: JournalSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
  isLoading: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesMood = !selectedMoodFilter || s.mood === selectedMoodFilter;
      if (!matchesMood) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const titleMatch = s.title.toLowerCase().includes(q);
      const summaryMatch = s.summary?.toLowerCase().includes(q);
      const messageMatch = s.messages.some((m) => m.content.toLowerCase().includes(q));
      const tagMatch = s.tags?.some((t) => t.toLowerCase().includes(q));

      return titleMatch || summaryMatch || messageMatch || tagMatch;
    });
  }, [sessions, searchQuery, selectedMoodFilter]);

  const handleExportMarkdown = (session: JournalSession, e: React.MouseEvent) => {
    e.stopPropagation();
    let md = `# ${session.title}\n\n`;
    md += `**Date:** ${new Date(session.createdAt).toLocaleDateString()} | **Mood:** ${session.mood || 'Unset'}\n\n`;
    if (session.summary) {
      md += `## Summary\n${session.summary}\n\n`;
    }
    if (session.keyInsights?.length) {
      md += `## Key Insights\n${session.keyInsights.map((k) => `- ${k}`).join('\n')}\n\n`;
    }
    if (session.actionItems?.length) {
      md += `## Action Steps\n${session.actionItems.map((a) => `- ${a}`).join('\n')}\n\n`;
    }
    md += `## Reflection Dialogue\n\n`;
    session.messages.forEach((m) => {
      const speaker = m.role === 'user' ? '### 👤 You' : '### ✨ Gemini';
      md += `${speaker} *(${new Date(m.timestamp).toLocaleTimeString()})*\n\n${m.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-stone-200 bg-stone-50 shadow-2xl transition-all sm:max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 bg-white">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-stone-700" />
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Reflection History
          </h2>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600 border border-stone-200">
            {sessions.length}
          </span>
        </div>
        <button
          id="close-history-btn"
          onClick={onClose}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          aria-label="Close history"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search & Mood Filter Controls */}
      <div className="border-b border-stone-200 bg-white/70 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            id="history-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries, keywords, thoughts..."
            className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-9 pr-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Mood filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedMoodFilter(null)}
            className={`rounded-full px-2.5 py-1 font-medium transition-all ${
              selectedMoodFilter === null
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All
          </button>
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood.label}
              onClick={() =>
                setSelectedMoodFilter(selectedMoodFilter === mood.label ? null : mood.label)
              }
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-all ${
                selectedMoodFilter === mood.label
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>{mood.emoji}</span>
              <span>{mood.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-stone-500">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800 mb-2" />
            <span>Loading your private reflections...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-16 text-center text-sm text-stone-500">
            <FileText className="mx-auto h-8 w-8 text-stone-300 mb-2" />
            <p className="font-medium text-stone-700">No reflections found</p>
            <p className="text-xs text-stone-400 mt-1">
              {searchQuery ? 'Try adjusting your search query' : 'Begin a new session to record your thoughts'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  onNewSession();
                  onClose();
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800"
              >
                Start First Entry
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const formattedDate = new Date(session.updatedAt || session.createdAt).toLocaleDateString(
              undefined,
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }
            );

            return (
              <div
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  onClose();
                }}
                className={`group relative cursor-pointer rounded-xl border p-4 transition-all ${
                  isActive
                    ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900'
                    : 'border-stone-200/90 bg-white/80 hover:border-stone-300 hover:bg-white hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-sm font-semibold text-stone-900 line-clamp-1">
                    {session.title || 'Untitled Reflection'}
                  </h3>
                  {session.mood && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 font-medium">
                      {session.mood}
                    </span>
                  )}
                </div>

                {/* Summary or latest thought snippet */}
                <p className="mt-1.5 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                  {session.summary ||
                    session.messages[session.messages.length - 1]?.content ||
                    'No messages yet.'}
                </p>

                {/* Footer metadata */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-stone-400" />
                      {formattedDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-stone-400" />
                      {session.messages.length} {session.messages.length === 1 ? 'turn' : 'turns'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleExportMarkdown(session, e)}
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      title="Export as Markdown"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(session.id);
                      }}
                      className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete reflection"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation Overlay */}
                {confirmDeleteId === session.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 z-10 flex items-center justify-between rounded-xl bg-stone-900/95 px-4 text-white backdrop-blur-xs"
                  >
                    <span className="text-xs font-medium text-stone-200">Delete this entry?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded px-2 py-1 text-xs text-stone-300 hover:bg-stone-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onDeleteSession(session.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
