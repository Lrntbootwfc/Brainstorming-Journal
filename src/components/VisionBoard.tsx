import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Trash2, 
  Plus, 
  Maximize2, 
  X, 
  Compass, 
  PenTool, 
  BookOpen, 
  Target, 
  RefreshCw,
  ExternalLink,
  Heart
} from 'lucide-react';
import { VisionCard } from '../types';
import { fetchVisionCards, saveVisionCard, deleteVisionCard } from '../utils/firestore';
import { ThemeConfig } from '../utils/theme';

interface VisionBoardProps {
  userId: string;
  themeConfig: ThemeConfig;
  onStartReflectionWithVision?: (visionTitle: string, visionPrompt: string) => void;
  onSwitchToGoals?: () => void;
}

const INSPIRATION_PROMPTS = [
  "A tranquil timber cabin library overlooking misty autumn mountains with a steaming mug of tea",
  "A bright, plant-filled creative studio with large skylights and unfinished oil paintings on easels",
  "Publishing my first thoughtful non-fiction book and seeing it in a warm independent bookstore",
  "A sunrise meditation deck by the ocean with gentle turquoise waves and crystal clear horizon",
  "Launching a mindful, design-forward technology project that brings peace to thousands of people",
  "An ancient Kyoto moss garden path surrounded by cedar trees and morning rain"
];

export const VisionBoard: React.FC<VisionBoardProps> = ({
  userId,
  themeConfig,
  onStartReflectionWithVision,
  onSwitchToGoals,
}) => {
  const [cards, setCards] = useState<VisionCard[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<VisionCard | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load vision cards from user's isolated Firestore collection
  const loadCards = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const userCards = await fetchVisionCards(userId);
      setCards(userCards);
    } catch (err: any) {
      console.error('Failed to load vision cards:', err);
      setError('Could not load your vision board. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Handle generating visual with AI
  const handleGenerateVisual = async (promptToUse?: string) => {
    const textToSubmit = (promptToUse || prompt).trim();
    if (!textToSubmit || textToSubmit.length < 2) return;

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/generate-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSubmit }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Generation failed (${response.status})`);
      }

      const result = await response.json();

      if (!result.imageUrl) {
        throw new Error('No visual imagery was returned. Please try again.');
      }

      const newCard: VisionCard = {
        id: `vision_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        prompt: textToSubmit,
        imageUrl: result.imageUrl,
        title: result.title || textToSubmit.slice(0, 40),
        category: result.category || 'Vision & Manifestation',
        reflection: result.vividScene || '',
        status: 'done',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Persist to user's isolated Firestore subcollection
      await saveVisionCard(userId, newCard);

      // Update local state
      setCards((prev) => [newCard, ...prev]);
      setPrompt('');
    } catch (err: any) {
      console.error('Error in vision generation:', err);
      setError(err.message || 'Something went wrong while manifesting your vision. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Handle removing a vision card
  const handleRemoveCard = async (cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!userId || !cardId) return;

    setDeletingId(cardId);
    try {
      await deleteVisionCard(userId, cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (selectedCard?.id === cardId) {
        setSelectedCard(null);
      }
    } catch (err: any) {
      console.error('Failed to delete vision card:', err);
      setError('Could not remove this vision card. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div id="vision-board-container" className="space-y-8">
      {/* Header & Manifesto Panel */}
      <div 
        id="vision-board-hero"
        className="theme-card rounded-3xl p-6 sm:p-8 border shadow-sm transition-all"
        style={{
          backgroundColor: themeConfig.paperCardBg,
          borderColor: themeConfig.border,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b" style={{ borderColor: themeConfig.border }}>
          <div className="flex items-center gap-3">
            <div 
              className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
              style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}
            >
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider opacity-60">Visual Manifestation</span>
                <span 
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}
                >
                  {cards.length} {cards.length === 1 ? 'Vision' : 'Visuals'}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mt-0.5" style={{ color: themeConfig.inkColor }}>
                Vision Board
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-vision-btn"
              onClick={loadCards}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all opacity-80 hover:opacity-100"
              style={{ borderColor: themeConfig.border, color: themeConfig.inkColor }}
              title="Refresh vision board"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-6 max-w-2xl opacity-80" style={{ color: themeConfig.inkColor }}>
          Articulate the moments, milestones, or aesthetic futures you wish to cultivate. Gemini transforms your words into vivid visual anchor points that guide your daily journaling.
        </p>

        {/* Input Formulation Form */}
        <div className="space-y-4">
          <div className="relative">
            <textarea
              id="vision-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe a future moment, milestone, or serene space you want to bring into your reality..."
              rows={3}
              disabled={generating}
              className="w-full rounded-2xl p-4 text-sm outline-none transition-all resize-none shadow-xs"
              style={{
                backgroundColor: themeConfig.bg,
                color: themeConfig.inkColor,
                border: `1.5px solid ${themeConfig.border}`,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleGenerateVisual();
                }
              }}
            />
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs opacity-50">
                Tip: Press ⌘+Enter to manifest • Be sensory & descriptive
              </span>
              <span className="text-xs opacity-50 font-mono">
                {prompt.length} chars
              </span>
            </div>
          </div>

          {/* Quick Prompts Chips */}
          <div className="space-y-2">
            <span className="text-xs font-semibold opacity-70 block">
              Inspiration Starters:
            </span>
            <div className="flex flex-wrap gap-2">
              {INSPIRATION_PROMPTS.map((samplePrompt, idx) => (
                <button
                  key={idx}
                  id={`sample-prompt-${idx}`}
                  onClick={() => {
                    setPrompt(samplePrompt);
                    handleGenerateVisual(samplePrompt);
                  }}
                  disabled={generating}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all hover:scale-[1.01] text-left truncate max-w-xs"
                  style={{
                    backgroundColor: themeConfig.bg,
                    borderColor: themeConfig.border,
                    color: themeConfig.inkColor,
                  }}
                  title={samplePrompt}
                >
                  ✨ {samplePrompt}
                </button>
              ))}
            </div>
          </div>

          {/* Submission Action */}
          <div className="flex items-center justify-end pt-2">
            <button
              id="generate-vision-btn"
              onClick={() => handleGenerateVisual()}
              disabled={generating || !prompt.trim()}
              className="theme-btn-primary px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Synthesizing Visual Manifestation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Visual Card</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div 
            id="vision-error-banner"
            className="mt-4 p-4 rounded-2xl border flex items-center justify-between text-sm bg-rose-50 border-rose-200 text-rose-800"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">Notice:</span>
              <span>{error}</span>
            </div>
            <button 
              onClick={() => setError(null)}
              className="p-1 rounded-lg hover:bg-rose-100 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Grid of Vision Cards */}
      {loading ? (
        <div id="vision-loading-state" className="text-center py-16 theme-card rounded-3xl border" style={{ borderColor: themeConfig.border }}>
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: themeConfig.primary }} />
          <p className="text-sm font-medium opacity-70">Opening your personal vision gallery...</p>
        </div>
      ) : cards.length === 0 ? (
        <div 
          id="vision-empty-state"
          className="theme-card rounded-3xl p-12 text-center border shadow-xs"
          style={{
            backgroundColor: themeConfig.paperCardBg,
            borderColor: themeConfig.border,
          }}
        >
          <div 
            className="h-16 w-16 rounded-3xl mx-auto flex items-center justify-center mb-4"
            style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}
          >
            <Compass className="h-8 w-8" />
          </div>
          <h3 className="font-serif text-xl font-bold mb-2" style={{ color: themeConfig.inkColor }}>
            Your Vision Board is Waiting
          </h3>
          <p className="text-sm max-w-md mx-auto opacity-70 mb-6">
            Describe what you desire to see in your life. Use the prompt field above or choose one of the inspiration starters to create your very first visual anchor.
          </p>
          <button
            id="empty-state-focus-btn"
            onClick={() => document.getElementById('vision-prompt-input')?.focus()}
            className="theme-btn-primary px-4 py-2 rounded-2xl text-xs font-bold inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Vision</span>
          </button>
        </div>
      ) : (
        <div id="vision-cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <div
              key={card.id}
              id={`vision-card-${card.id}`}
              onClick={() => setSelectedCard(card)}
              className="theme-card rounded-3xl overflow-hidden border shadow-xs hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
              style={{
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border,
              }}
            >
              {/* Card Image Banner */}
              <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                <img
                  src={card.imageUrl}
                  alt={card.title || card.prompt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                
                {/* Category Chip */}
                {card.category && (
                  <div className="absolute top-3 left-3">
                    <span className="text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full bg-white/90 text-slate-800 backdrop-blur-xs shadow-xs">
                      {card.category}
                    </span>
                  </div>
                )}

                {/* Card Quick Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    id={`expand-card-${card.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCard(card);
                    }}
                    className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
                    title="Expand visual"
                    aria-label="Expand visual"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    id={`delete-card-${card.id}`}
                    onClick={(e) => handleRemoveCard(card.id, e)}
                    disabled={deletingId === card.id}
                    className="h-8 w-8 rounded-full bg-black/40 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
                    title="Remove card"
                    aria-label="Remove card"
                  >
                    {deletingId === card.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Title Overlay at bottom of image */}
                <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                  <h4 className="font-serif font-bold text-base line-clamp-1 drop-shadow-xs">
                    {card.title || card.prompt}
                  </h4>
                </div>
              </div>

              {/* Card Details Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-xs leading-relaxed opacity-75 line-clamp-3 italic" style={{ color: themeConfig.inkColor }}>
                    "{card.prompt}"
                  </p>
                  {card.reflection && (
                    <div 
                      className="p-3 rounded-xl text-xs leading-relaxed"
                      style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.chipText }}
                    >
                      <p className="line-clamp-3">{card.reflection}</p>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: themeConfig.border }}>
                  <span className="opacity-50 text-[11px]">
                    {new Date(card.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    {onStartReflectionWithVision && (
                      <button
                        id={`reflect-card-${card.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartReflectionWithVision(card.title || card.prompt, card.prompt);
                        }}
                        className="px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all opacity-80 hover:opacity-100 hover:scale-105"
                        style={{
                          borderColor: themeConfig.border,
                          backgroundColor: themeConfig.bg,
                          color: themeConfig.primary,
                        }}
                        title="Reflect on this vision in Journal"
                      >
                        <PenTool className="h-3 w-3" />
                        <span>Journal</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded Modal View for Deep Contemplation */}
      {selectedCard && (
        <div 
          id="vision-card-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedCard(null)}
        >
          <div 
            className="theme-card rounded-3xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image Header */}
            <div className="relative aspect-16/10 w-full bg-slate-900 overflow-hidden shrink-0">
              <img
                src={selectedCard.imageUrl}
                alt={selectedCard.title || selectedCard.prompt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                id="close-vision-modal-btn"
                onClick={() => setSelectedCard(null)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
              {selectedCard.category && (
                <div className="absolute top-4 left-4">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/95 text-slate-800 shadow-md">
                    {selectedCard.category}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Content Details */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold opacity-60">Visual Anchor</span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold mt-1" style={{ color: themeConfig.inkColor }}>
                  {selectedCard.title || selectedCard.prompt}
                </h3>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold opacity-70 block">Originating Prompt:</span>
                <p className="text-sm italic leading-relaxed p-4 rounded-2xl border" style={{ backgroundColor: themeConfig.bg, borderColor: themeConfig.border, color: themeConfig.inkColor }}>
                  "{selectedCard.prompt}"
                </p>
              </div>

              {selectedCard.reflection && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold opacity-70 block">Sensory Depiction & Reflection:</span>
                  <div 
                    className="p-4 rounded-2xl text-sm leading-relaxed"
                    style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.chipText }}
                  >
                    <p>{selectedCard.reflection}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-4" style={{ borderColor: themeConfig.border }}>
                <div className="flex items-center gap-2">
                  {onStartReflectionWithVision && (
                    <button
                      id="modal-start-reflection-btn"
                      onClick={() => {
                        onStartReflectionWithVision(selectedCard.title || selectedCard.prompt, selectedCard.prompt);
                        setSelectedCard(null);
                      }}
                      className="theme-btn-primary px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2"
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      <span>Start Journal Entry from this Vision</span>
                    </button>
                  )}
                  {onSwitchToGoals && (
                    <button
                      id="modal-switch-goals-btn"
                      onClick={() => {
                        onSwitchToGoals();
                        setSelectedCard(null);
                      }}
                      className="px-4 py-2 rounded-2xl text-xs font-bold border flex items-center gap-2 opacity-80 hover:opacity-100"
                      style={{ borderColor: themeConfig.border, color: themeConfig.inkColor }}
                    >
                      <Target className="h-3.5 w-3.5" />
                      <span>Link with Goals</span>
                    </button>
                  )}
                </div>

                <button
                  id="modal-delete-vision-btn"
                  onClick={() => handleRemoveCard(selectedCard.id)}
                  disabled={deletingId === selectedCard.id}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Visual</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
