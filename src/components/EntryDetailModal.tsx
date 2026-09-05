import React from 'react';
import { 
  X, 
  Calendar, 
  Tag, 
  Sparkles, 
  Lightbulb, 
  CheckSquare, 
  MessageSquare, 
  Edit3,
  Bookmark,
  Heart,
  Share2,
  Trash2
} from 'lucide-react';
import Markdown from 'react-markdown';
import { JournalSession, PaperThemePreference } from '../types';
import { getThemeConfig } from '../utils/theme';

interface EntryDetailModalProps {
  session: JournalSession | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenEditor: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  theme?: PaperThemePreference;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  session,
  isOpen,
  onClose,
  onOpenEditor,
  onDeleteSession,
  theme,
}) => {
  if (!isOpen || !session) return null;

  const themeConfig = getThemeConfig(theme);

  const categoryBadgeColors: Record<string, string> = {
    Brainstorm: 'bg-[#fff5e6] text-[#b85a1b] border-[#fcd8b4]',
    Journal: 'bg-[#eef8f2] text-[#2c754d] border-[#c0e6cf]',
    Reflective: 'bg-[#f2f4f8] text-[#36557a] border-[#c8d4e4]',
    General: 'bg-[#f4efe6] text-[#6d6152] border-[#dfd3c1]',
  };

  const currentCategory = session.category || 'General';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs">
      <div 
        className="paper-card w-full max-w-2xl max-h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden relative"
        style={{
          backgroundColor: themeConfig.paperCardBg,
          borderColor: themeConfig.border,
          color: themeConfig.inkColor
        }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{
            backgroundColor: themeConfig.paperBg,
            borderColor: themeConfig.border
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${categoryBadgeColors[currentCategory] || categoryBadgeColors.General}`}>
              #{currentCategory}
            </span>
            {session.mood && (
              <span 
                className="text-xs px-2.5 py-0.5 rounded-full border font-medium"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  borderColor: themeConfig.border,
                  color: themeConfig.inkColor
                }}
              >
                {session.mood}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenEditor(session.id);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all hover:opacity-90"
              style={{ backgroundColor: themeConfig.primary }}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Open in Journal Editor</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full opacity-60 hover:opacity-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: themeConfig.inkColor }}>
              {session.title || 'Untitled Reflection'}
            </h1>
            <p className="text-xs opacity-70 mt-1.5 flex items-center gap-2 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(session.createdAt).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          </div>

          {/* AI Summary Card if present */}
          {session.summary && (
            <div 
              className="rounded-2xl p-5 border shadow-xs"
              style={{
                backgroundColor: themeConfig.chipBg,
                borderColor: themeConfig.border
              }}
            >
              <div className="flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wider" style={{ color: themeConfig.primary }}>
                <Sparkles className="h-4 w-4" />
                <span>AI Synthesis Summary</span>
              </div>
              <p className="text-sm leading-relaxed opacity-90">{session.summary}</p>

              {session.keyInsights && session.keyInsights.length > 0 && (
                <div className="mt-4 pt-3 border-t" style={{ borderColor: themeConfig.border }}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: themeConfig.primary }}>
                    <Lightbulb className="h-3.5 w-3.5" />
                    <span>Key Takeaways</span>
                  </div>
                  <ul className="space-y-1 text-xs opacity-80">
                    {session.keyInsights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: themeConfig.primary }} />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Conversation Entries */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-60 flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Journal Dialogue ({session.messages.length} notes)</span>
            </h3>

            {session.messages.length === 0 ? (
              <p className="text-xs opacity-60 italic">No text recorded in this entry.</p>
            ) : (
              session.messages.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className={`p-4 rounded-2xl border ${
                    m.role === 'user'
                      ? 'border-l-4'
                      : 'shadow-2xs'
                  }`}
                  style={m.role === 'user' ? {
                    backgroundColor: themeConfig.paperBg,
                    borderColor: themeConfig.border,
                    borderLeftColor: themeConfig.primary,
                    color: themeConfig.inkColor
                  } : {
                    backgroundColor: themeConfig.chipBg,
                    borderColor: themeConfig.border,
                    color: themeConfig.inkColor
                  }}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold opacity-60 mb-1.5 pb-1 border-b" style={{ borderColor: themeConfig.border }}>
                    <span>{m.role === 'user' ? '👤 Your Thought' : '✨ Gemini Assistant'}</span>
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                  ) : (
                    <div className="markdown-body text-sm prose prose-stone">
                      <Markdown>{m.content}</Markdown>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t flex items-center justify-between"
          style={{
            backgroundColor: themeConfig.paperBg,
            borderColor: themeConfig.border
          }}
        >
          <button
            onClick={() => {
              onDeleteSession(session.id);
              onClose();
            }}
            className="text-xs text-rose-700 hover:text-rose-900 flex items-center gap-1 font-medium px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Entry</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full border text-xs font-semibold transition-all"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
              color: themeConfig.inkColor
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
