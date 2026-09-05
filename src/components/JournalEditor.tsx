import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  Compass,
  ArrowLeft,
  Feather,
  MapPin,
  Sun,
  Moon,
  Star,
  X,
  Menu,
  Smile,
  Paperclip,
  Mic,
  MicOff,
  Plus,
  Trash2,
} from 'lucide-react';
import { JournalSession, ChatMessage, ReflectionSentiment, PaperThemePreference, UnfinishedThread } from '../types';
import { PROMPT_INSPIRATIONS, MOOD_OPTIONS } from '../data/prompts';
import { SessionSummaryCard } from './SessionSummaryCard';
import { getThemeConfig } from '../utils/theme';
import { GeminiIcon } from './GeminiIcon';

interface JournalEditorProps {
  session: JournalSession;
  onUpdateSession: (updated: Partial<JournalSession>) => Promise<void>;
  onSendMessage: (text: string, intent: string) => Promise<void>;
  onGenerateSummary: () => Promise<void>;
  onBackToDashboard: () => void;
  isGenerating: boolean;
  isSummarizing: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  errorMessage?: string | null;
  onRetrySave?: () => void;
  theme?: PaperThemePreference;
  onToggleDarkMode?: () => void;
  continuationThread?: UnfinishedThread | null;
  onDismissContinuationBanner?: () => void;
}

const QUICK_EMOJIS = ['😀', '😂', '😍', '🥹', '😢', '😡', '🙏', '🔥', '✨', '💡', '📌', '❤️', '👍', '🎉', '🤔', '😴'];

const CATEGORY_OPTIONS = ['Brainstorm', 'Journal', 'Reflective', 'Books', 'Movies', 'Study', 'Projects', 'General'] as const;

export const JournalEditor: React.FC<JournalEditorProps> = ({
  session,
  onUpdateSession,
  onSendMessage,
  onGenerateSummary,
  onBackToDashboard,
  isGenerating,
  isSummarizing,
  saveStatus,
  errorMessage,
  onRetrySave,
  theme = { themePreset: 'journey-teal', paperTone: 'journey-clean', ruling: 'ruled', inkStyle: 'teal' },
  onToggleDarkMode,
  continuationThread,
  onDismissContinuationBanner,
}) => {
  const [inputText, setInputText] = useState('');
  const [reflectionIntent, setReflectionIntent] = useState<string>('Thinking Partner');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(session.title);
  const [tagInput, setTagInput] = useState('');
  const [locationDraft, setLocationDraft] = useState(session.location || '');

  // Thin rail + drawer (replaces the old cluttered header strip)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Composer extras: attachments, emoji picker, voice input
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const themeConfig = getThemeConfig(theme);

  useEffect(() => {
    setTitleDraft(session.title);
    setLocationDraft(session.location || '');
  }, [session.title, session.location]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages, isGenerating]);

  // Close the drawer when clicking outside of it, without blocking the rest of the screen
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDrawerOpen]);

  const handleTitleSubmit = () => {
    if (titleDraft.trim() && titleDraft !== session.title) {
      onUpdateSession({ title: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleLocationSubmit = () => {
    onUpdateSession({ location: locationDraft.trim() || undefined });
  };

  const handleSelectMood = (moodLabel: string) => {
    const newMood = session.mood === moodLabel ? undefined : moodLabel;
    onUpdateSession({ mood: newMood });
  };

  const handleSelectWeather = (weather: string) => {
    onUpdateSession({ weather: session.weather === weather ? undefined : weather });
  };

  const handleSelectCategory = (cat: any) => {
    onUpdateSession({ category: cat });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = session.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        onUpdateSession({ tags: [...currentTags, tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = session.tags || [];
    onUpdateSession({ tags: currentTags.filter((t) => t !== tagToRemove) });
  };

  const handleSubmitMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isGenerating) return;

    const attachmentNote = attachments.length
      ? `\n\n📎 Attached: ${attachments.map((f) => f.name).join(', ')}`
      : '';
    const textToSend = `${inputText.trim()}${attachmentNote}`.trim();

    setInputText('');
    setAttachments([]);
    await onSendMessage(textToSend, reflectionIntent);
  };

  const handleApplyPrompt = (promptText: string) => {
    setInputText(promptText);
    textareaRef.current?.focus();
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setAttachments((prev) => [...prev, ...files]);
    }
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleToggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Voice input isn't supported in this browser; fail silently and quietly.
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(' ');
      setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const currentCategory = session.category || 'Journal';

  return (
    <div
      className="flex h-screen flex-col transition-colors duration-200"
      style={{
        backgroundColor: themeConfig.paperBg,
        color: themeConfig.inkColor,
      }}
    >
      {/* Save / Error Banner */}
      {saveStatus === 'error' && (
        <div className="flex items-center justify-between bg-rose-700 px-4 py-2 text-xs font-medium text-white shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Persistence issue: {errorMessage || 'Failed to save journal entry.'}</span>
          </div>
          {onRetrySave && (
            <button
              onClick={onRetrySave}
              className="rounded bg-white/20 px-2 py-1 text-xs font-semibold hover:bg-white/30"
            >
              Retry Save
            </button>
          )}
        </div>
      )}

      {/* Clean Header: back button + editable title only */}
      <div
        className="border-b px-4 py-3.5 sm:px-6 shadow-xs shrink-0 z-20"
        style={{
          backgroundColor: themeConfig.paperCardBg,
          borderColor: themeConfig.border,
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            id="back-to-dashboard-btn"
            onClick={onBackToDashboard}
            className="p-2 rounded-2xl transition-all flex items-center justify-center border shrink-0"
            style={{
              backgroundColor: themeConfig.chipBg,
              color: themeConfig.inkColor,
              borderColor: themeConfig.border,
            }}
            title="Return to Timeline"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                id="session-title-input"
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                onBlur={handleTitleSubmit}
                autoFocus
                className="w-full rounded-xl border px-3 py-2 font-serif text-xl font-bold focus:outline-none"
                style={{
                  backgroundColor: themeConfig.paperBg,
                  borderColor: themeConfig.primary,
                  color: themeConfig.inkColor,
                }}
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-opacity hover:opacity-80"
                style={{ borderColor: themeConfig.border, backgroundColor: themeConfig.paperBg }}
                title="Click to rename"
              >
                <span className="font-serif text-xl font-bold tracking-tight truncate" style={{ color: themeConfig.inkColor }}>
                  {session.title || 'Untitled Moment'}
                </span>
                <Feather className="h-4 w-4 opacity-50 shrink-0 ml-auto" style={{ color: themeConfig.primary }} />
              </button>
            )}
          </div>

          {/* Save status — quiet, icon-only */}
          <div className="shrink-0" title={saveStatus === 'saving' ? 'Saving...' : 'Saved'}>
            {saveStatus === 'saving' ? (
              <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
            ) : (
              <Check className="h-4 w-4" style={{ color: themeConfig.primary }} />
            )}
          </div>

        </div>
      </div>

      {/* Main area: thin rail + chat + sliding drawer, all in the same row */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Persistent thin rail */}
        <div
          className="w-12 shrink-0 border-r flex flex-col items-center py-4"
          style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}
        >
          <button
            id="open-details-drawer-btn"
            onClick={() => setIsDrawerOpen((v) => !v)}
            className="p-2 rounded-xl border transition-all"
            style={
              isDrawerOpen
                ? { backgroundColor: themeConfig.primary, borderColor: themeConfig.primary, color: '#ffffff' }
                : { backgroundColor: session.mood ? themeConfig.chipBg : 'transparent', borderColor: themeConfig.border, color: themeConfig.primary }
            }
            title="Mood, entry type & details"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Sliding drawer — overlays on top of the chat, doesn't push it, and doesn't block it */}
        {isDrawerOpen && (
          <div
            ref={drawerRef}
            className="absolute top-0 left-12 h-full w-72 max-w-[80vw] border-r shadow-lg z-30 overflow-y-auto transition-transform duration-200"
            style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}
          >
            <div className="p-4 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-sm font-bold" style={{ color: themeConfig.inkColor }}>
                  Entry Details
                </h3>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg opacity-60 hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mood */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide opacity-60 mb-2">Mood</p>
                <div className="flex flex-wrap gap-1.5">
                  {MOOD_OPTIONS.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => handleSelectMood(m.label)}
                      className="px-2.5 py-1 rounded-full text-xs border transition-all"
                      style={
                        session.mood === m.label
                          ? { backgroundColor: themeConfig.chipBg, borderColor: themeConfig.primary, color: themeConfig.primary, fontWeight: 700 }
                          : { backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor, opacity: 0.85 }
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entry type / category */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide opacity-60 mb-2">Entry Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleSelectCategory(cat)}
                      className="text-xs px-3 py-1 rounded-full font-bold transition-all border"
                      style={
                        currentCategory === cat
                          ? { backgroundColor: themeConfig.primary, color: '#ffffff', borderColor: themeConfig.primary }
                          : { backgroundColor: themeConfig.chipBg, color: themeConfig.inkColor, borderColor: themeConfig.border, opacity: 0.8 }
                      }
                    >
                      #{cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weather */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide opacity-60 mb-2">Weather</p>
                <div className="flex items-center gap-1.5">
                  {['☀️ Sunny', '⛅ Cloudy', '🌧️ Rain'].map((w) => (
                    <button
                      key={w}
                      onClick={() => handleSelectWeather(w)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
                      style={
                        session.weather === w
                          ? { backgroundColor: themeConfig.chipBg, color: themeConfig.primary, borderColor: themeConfig.primary, fontWeight: 700 }
                          : { backgroundColor: themeConfig.paperBg, color: themeConfig.inkColor, borderColor: themeConfig.border, opacity: 0.8 }
                      }
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide opacity-60 mb-2">Location</p>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <input
                    type="text"
                    value={locationDraft}
                    onChange={(e) => setLocationDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLocationSubmit()}
                    onBlur={handleLocationSubmit}
                    placeholder="e.g. San Francisco, Kyoto..."
                    className="flex-1 px-2 py-1 rounded-lg border text-xs"
                    style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide opacity-60 mb-2">Tags</p>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add a tag, press Enter..."
                  className="w-full px-2 py-1 rounded-lg border text-xs mb-2"
                  style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {(session.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border"
                      style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="opacity-60 hover:opacity-100">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Media details — only for Books / Movies */}
              {['Books', 'Movies'].includes(currentCategory) && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide opacity-60 mb-2">
                    {currentCategory === 'Books' ? 'Author' : 'Director'} &amp; Rating
                  </p>
                  <input
                    type="text"
                    value={session.mediaAuthorDirector || ''}
                    onChange={(e) => onUpdateSession({ mediaAuthorDirector: e.target.value })}
                    placeholder="Name..."
                    className="w-full px-2 py-1 rounded-lg border text-xs mb-2"
                    style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                  />
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => onUpdateSession({ mediaRating: star })} className="transition-all hover:scale-110">
                        <Star
                          className="h-4 w-4"
                          style={{
                            color: (session.mediaRating || 0) >= star ? '#fbbf24' : themeConfig.border,
                            fill: (session.mediaRating || 0) >= star ? '#fbbf24' : 'transparent',
                          }}
                        />
                      </button>
                    ))}
                  </div>
                  <select
                    value={session.mediaStatus || 'Want to Consume'}
                    onChange={(e) => onUpdateSession({ mediaStatus: e.target.value as any })}
                    className="w-full px-2 py-1 rounded-lg border text-xs font-semibold"
                    style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                  >
                    <option value="Want to Consume">Want to {currentCategory === 'Books' ? 'Read' : 'Watch'}</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}

              {currentCategory === 'Study' && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide opacity-60 mb-2">Topic / Subject</p>
                  <input
                    type="text"
                    value={session.studyTopic || ''}
                    onChange={(e) => onUpdateSession({ studyTopic: e.target.value })}
                    placeholder="e.g., Quantum Physics..."
                    className="w-full px-2 py-1 rounded-lg border text-xs"
                    style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                  />
                </div>
              )}

              {currentCategory === 'Projects' && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide opacity-60 mb-2">Milestone</p>
                  <input
                    type="text"
                    value={session.projectMilestone || ''}
                    onChange={(e) => onUpdateSession({ projectMilestone: e.target.value })}
                    placeholder="e.g., Alpha Release..."
                    className="w-full px-2 py-1 rounded-lg border text-xs"
                    style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                  />
                </div>
              )}

              {/* Tools */}
              <div className="pt-2 border-t space-y-2" style={{ borderColor: themeConfig.border }}>
                <button
                  id="synthesize-summary-btn"
                  onClick={onGenerateSummary}
                  disabled={isSummarizing || session.messages.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40 shadow-xs transition-all hover:opacity-90"
                  style={{ backgroundColor: themeConfig.primary }}
                >
                  <Sparkles className={`h-3.5 w-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
                  <span>{isSummarizing ? 'Synthesizing...' : 'AI Summary'}</span>
                </button>

                {onToggleDarkMode && (
                  <button
                    id="editor-dark-mode-toggle"
                    onClick={onToggleDarkMode}
                    className="w-full flex items-center justify-center gap-1.5 p-1.5 rounded-full border transition-all hover:opacity-90 shadow-xs"
                    style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                  >
                    {theme?.darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                    <span className="text-xs font-semibold">{theme?.darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                )}

                {session.withoutAI && (
                  <div
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border justify-center"
                    style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary, borderColor: themeConfig.border }}
                  >
                    <Feather className="h-3 w-3" />
                    <span>Quiet Mode (Without AI)</span>
                  </div>
                )}

                <p className="text-[11px] opacity-60 text-center">
                  {new Date(session.createdAt).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat / Workspace Area — stays fully usable whether the drawer is open or closed */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 min-w-0">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Active Continuation Thread Banner */}
            {continuationThread && (
              <div
                className="rounded-3xl p-5 border shadow-xs relative overflow-hidden transition-all"
                style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.primary, borderWidth: '1.5px' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div
                      className="h-10 w-10 rounded-2xl flex items-center justify-center border shadow-2xs shrink-0 mt-0.5"
                      style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}
                    >
                      <GeminiIcon className="h-5 w-5" color={themeConfig.primary} accentColor={themeConfig.accentColor} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                          style={{ backgroundColor: themeConfig.paperCardBg, color: themeConfig.primary, borderColor: themeConfig.border }}
                        >
                          Resumed Thread
                        </span>
                        <span className="text-xs font-bold" style={{ color: themeConfig.inkColor }}>
                          {continuationThread.topic}
                        </span>
                      </div>
                      <p className="font-serif italic text-xs sm:text-sm mt-2 leading-relaxed opacity-95" style={{ color: themeConfig.inkColor }}>
                        "{continuationThread.openingPrompt}"
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => handleApplyPrompt(continuationThread.openingPrompt)}
                          className="text-xs font-bold px-3.5 py-1.5 rounded-full text-white shadow-2xs hover:opacity-90 active:scale-98 transition-all"
                          style={{ backgroundColor: themeConfig.primary }}
                        >
                          Insert into composer
                        </button>
                      </div>
                    </div>
                  </div>

                  {onDismissContinuationBanner && (
                    <button
                      onClick={onDismissContinuationBanner}
                      className="p-1.5 rounded-xl opacity-50 hover:opacity-100 transition-opacity"
                      style={{ color: themeConfig.inkColor }}
                      title="Dismiss reminder"
                      aria-label="Dismiss reminder"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* AI Insights & Summary Card if present */}
            {session.summary && (
              <SessionSummaryCard session={session} onRegenerateSummary={onGenerateSummary} isGenerating={isSummarizing} />
            )}

            {/* Socratic Conversation Flow */}
            <div className="space-y-4">
              {session.messages.length === 0 ? (
                <div
                  className={`theme-card rounded-3xl p-8 sm:p-12 text-center border shadow-2xs ${themeConfig.rulingClass}`}
                  style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}
                >
                  <Compass className="h-12 w-12 mx-auto mb-3 opacity-40" style={{ color: themeConfig.primary }} />
                  <h2 className="font-serif text-xl font-bold" style={{ color: themeConfig.inkColor }}>
                    {session.withoutAI ? 'Pure Journaling (Without AI)' : 'Begin this Journal Entry'}
                  </h2>
                  <p className="text-xs sm:text-sm opacity-70 max-w-md mx-auto mt-1 leading-relaxed">
                    {session.withoutAI
                      ? 'Write freely without conversational AI turns. A summary and knowledge graph will be synthesized when you save.'
                      : "Write freely about an idea, a milestone, or today's reflections. Your AI companion will help you explore deeper insights."}
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {PROMPT_INSPIRATIONS.slice(0, 3).map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => handleApplyPrompt(prompt.prompt)}
                        className="rounded-2xl border px-3.5 py-2 text-left text-xs font-medium transition-all max-w-xs shadow-2xs hover:opacity-90"
                        style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                      >
                        <p className="font-bold" style={{ color: themeConfig.primary }}>{prompt.title}</p>
                        <p className="text-[11px] opacity-70 line-clamp-1">{prompt.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                session.messages.map((message) => {
                  const isUser = message.role === 'user';
                  return (
                    <div key={message.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 text-[11px] opacity-60 font-medium px-2">
                        <span>{isUser ? 'You' : 'Journal Companion (Gemini)'}</span>
                        <span>•</span>
                        <span>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[90%] sm:max-w-[80%] rounded-3xl p-5 shadow-xs ${isUser ? 'text-white rounded-br-xs' : 'border rounded-bl-xs'}`}
                        style={
                          isUser
                            ? { backgroundColor: themeConfig.userBubbleBg, color: themeConfig.userBubbleText }
                            : { backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border, color: themeConfig.inkColor }
                        }
                      >
                        <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                          <Markdown>{message.content}</Markdown>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {isGenerating && (
                <div className="flex items-start gap-2">
                  <div className="rounded-2xl border p-4 shadow-xs" style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}>
                    <div className="flex items-center gap-2 text-xs font-medium" style={{ color: themeConfig.primary }}>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>Thinking partner is reflecting on your entry...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Composer */}
      <div className="border-t p-4 sm:px-8 shrink-0 z-20" style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}>
        <div className="mx-auto max-w-4xl">
          <div className="mb-2 flex items-center justify-between">
            {session.withoutAI ? (
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: themeConfig.primary }}>
                <Feather className="h-3.5 w-3.5" />
                <span>Distraction-Free Mode: Write your thoughts peacefully. Enter adds paragraph.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="font-bold opacity-60 text-[11px] uppercase tracking-wider mr-1">Reflection Mode:</span>
                {['Thinking Partner', 'Brainstorm Ideas', 'Deep Reflection', 'Unpack Emotion', 'Action Next Steps'].map((intent) => (
                  <button
                    key={intent}
                    onClick={() => setReflectionIntent(intent)}
                    className="rounded-full px-3 py-1 text-xs font-semibold transition-all border"
                    style={
                      reflectionIntent === intent
                        ? { backgroundColor: themeConfig.primary, color: '#ffffff', borderColor: themeConfig.primary }
                        : { backgroundColor: themeConfig.chipBg, color: themeConfig.inkColor, borderColor: themeConfig.border, opacity: 0.85 }
                    }
                  >
                    {intent}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachments.map((file, idx) => (
                <span
                  key={`${file.name}-${idx}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border"
                  style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[140px] truncate">{file.name}</span>
                  <button onClick={() => handleRemoveAttachment(idx)} className="opacity-60 hover:opacity-100">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmitMessage} className="relative">
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFilesSelected} accept="image/*,application/pdf,.doc,.docx,.txt" />

            <textarea
              ref={textareaRef}
              id="reflection-input-textarea"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitMessage();
                }
              }}
              placeholder={
                session.withoutAI
                  ? 'Write your reflection or brainstorm here without interruptions... (Press Enter to record)'
                  : 'Write your reflection or brainstorm here... (Shift+Enter for newline, Enter to send)'
              }
              className="w-full rounded-2xl border p-3.5 pl-12 pr-32 text-sm focus:outline-none shadow-inner resize-none"
              style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
            />

            {/* Attach button — top-left inside the composer */}
            <button
              type="button"
              onClick={handleAttachClick}
              className="absolute top-3.5 left-3 p-1 rounded-full border transition-all hover:opacity-80"
              style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
              title="Attach files, images or PDFs"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Emoji / mic / send — bottom-right inside the composer */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="p-2 rounded-full border transition-all hover:opacity-80"
                  style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
                  title="Add an emoji"
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>

                {showEmojiPicker && (
                  <div
                    className="absolute bottom-11 right-0 grid grid-cols-4 gap-1 p-2 rounded-2xl border shadow-lg z-30 w-40"
                    style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border }}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="text-lg hover:scale-110 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleRecording}
                className="p-2 rounded-full border transition-all hover:opacity-80"
                style={
                  isRecording
                    ? { backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }
                    : { backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.inkColor }
                }
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>

              <button
                type="submit"
                id="send-reflection-btn"
                disabled={(!inputText.trim() && attachments.length === 0) || isGenerating}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-40 shadow-xs transition-all hover:opacity-90"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <span>{session.withoutAI ? 'Record' : 'Send'}</span>
                {session.withoutAI ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};