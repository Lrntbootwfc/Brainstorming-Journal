import React, { useState } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw, 
  Info, 
  Clock, 
  ExternalLink,
  Tag,
  AlertCircle,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { MoodCorrelationReport, MoodContextCorrelation, MoodEvidenceItem } from '../types';
import { GeminiIcon } from './GeminiIcon';

interface MoodCorrelationCardProps {
  report: MoodCorrelationReport | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectSession?: (sessionId: string) => void;
  themeConfig: {
    paperCardBg: string;
    border: string;
    inkColor: string;
    primary: string;
    chipBg: string;
    accent: string;
  };
}

export const MoodCorrelationCard: React.FC<MoodCorrelationCardProps> = ({
  report,
  isLoading,
  onRefresh,
  onSelectSession,
  themeConfig,
}) => {
  const [activeCorrelationIndex, setActiveCorrelationIndex] = useState<number>(0);
  const [showEvidence, setShowEvidence] = useState<boolean>(false);

  const correlations = report?.correlations || [];
  const currentCorrelation: MoodContextCorrelation | undefined = correlations[activeCorrelationIndex];

  // Insufficient Data State
  if (!report || !report.hasSufficientData || correlations.length === 0) {
    return (
      <div 
        id="mood-correlation-insufficient-card"
        className="rounded-3xl p-5 md:p-6 transition-all duration-300 relative overflow-hidden"
        style={{
          backgroundColor: themeConfig.paperCardBg,
          border: `1px dashed ${themeConfig.border}`,
          boxShadow: '0 4px 20px -4px rgba(0,0,0,0.03)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dashed" style={{ borderColor: themeConfig.border }}>
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: `${themeConfig.primary}15`, color: themeConfig.primary }}
            >
              <GeminiIcon className="w-4 h-4" color={themeConfig.primary} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider block opacity-70" style={{ color: themeConfig.inkColor }}>
                Mood + Context Intelligence
              </span>
              <h3 className="font-serif font-bold text-sm leading-tight" style={{ color: themeConfig.inkColor }}>
                Discovering Your Patterns
              </h3>
            </div>
          </div>

          <button
            id="btn-refresh-mood-correlation-empty"
            onClick={onRefresh}
            disabled={isLoading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ 
              backgroundColor: themeConfig.chipBg, 
              color: themeConfig.inkColor,
              border: `1px solid ${themeConfig.border}`
            }}
            title="Scan journal history for recurring mood rhythms"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analyzing...' : 'Scan Patterns'}</span>
          </button>
        </div>

        <div className="mt-4 flex items-start gap-3.5">
          <div 
            className="p-2 rounded-xl mt-0.5 shrink-0"
            style={{ backgroundColor: `${themeConfig.primary}10`, color: themeConfig.primary }}
          >
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-serif leading-relaxed" style={{ color: themeConfig.inkColor }}>
              {report?.message || "I don't have enough journal history to identify a meaningful pattern yet."}
            </p>
            <p className="text-xs opacity-70 leading-normal" style={{ color: themeConfig.inkColor }}>
              Log at least 2 entries with moods and topics. Gemini will ground insights exclusively in your own words without assuming causality or diagnosing emotions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="mood-correlation-card"
      className="rounded-3xl p-5 md:p-6 transition-all duration-300 relative overflow-hidden"
      style={{
        backgroundColor: themeConfig.paperCardBg,
        border: `1px solid ${themeConfig.border}`,
        boxShadow: '0 6px 24px -6px rgba(0,0,0,0.05)',
      }}
    >
      {/* Card Header with Gemini branding & controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b" style={{ borderColor: themeConfig.border }}>
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
            style={{ backgroundColor: `${themeConfig.primary}18`, color: themeConfig.primary }}
          >
            <GeminiIcon className="w-4 h-4" color={themeConfig.primary} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-70" style={{ color: themeConfig.inkColor }}>
                Mood + Context Intelligence
              </span>
              {report.fallback && (
                <span 
                  className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold opacity-60"
                  style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.inkColor }}
                  title="Synthesized deterministically via local reflective intelligence"
                >
                  Local Engine
                </span>
              )}
            </div>
            <h3 className="font-serif font-bold text-sm md:text-base leading-tight" style={{ color: themeConfig.inkColor }}>
              {currentCorrelation?.headline || 'A pattern I noticed'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {correlations.length > 1 && (
            <div 
              className="flex items-center rounded-full p-0.5 border"
              style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
            >
              {correlations.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveCorrelationIndex(idx);
                    setShowEvidence(false);
                  }}
                  className="px-2 py-0.5 text-[11px] font-bold rounded-full transition-all cursor-pointer"
                  style={idx === activeCorrelationIndex ? {
                    backgroundColor: themeConfig.primary,
                    color: '#ffffff',
                  } : {
                    color: themeConfig.inkColor,
                    opacity: 0.7,
                  }}
                  aria-label={`View pattern ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}

          <button
            id="btn-refresh-mood-correlation"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ 
              backgroundColor: themeConfig.chipBg, 
              color: themeConfig.inkColor,
              border: `1px solid ${themeConfig.border}`
            }}
            title="Scan for recent mood and context correlations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Analyzing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Main Pattern Observation */}
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {currentCorrelation?.contextValue && (
            <span 
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: `${themeConfig.primary}12`, color: themeConfig.primary }}
            >
              <Tag className="w-3 h-3" />
              <span>{currentCorrelation.contextValue}</span>
            </span>
          )}

          {currentCorrelation?.associatedMood && (
            <span 
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.inkColor }}
            >
              <TrendingUp className="w-3 h-3 opacity-70" />
              <span>{currentCorrelation.associatedMood}</span>
            </span>
          )}

          {currentCorrelation?.timeSpanDescription && (
            <span 
              className="inline-flex items-center gap-1 text-[11px] font-medium opacity-60 ml-auto"
              style={{ color: themeConfig.inkColor }}
            >
              <Clock className="w-3 h-3" />
              <span>{currentCorrelation.timeSpanDescription}</span>
            </span>
          )}
        </div>

        {/* Cautious, non-causal observation */}
        <p className="text-base md:text-lg font-serif leading-relaxed" style={{ color: themeConfig.inkColor }}>
          “{currentCorrelation?.observation}”
        </p>

        {/* Ambiguity Acknowledged Banner if mixed feelings were found (Test 3) */}
        {currentCorrelation?.ambiguityAcknowledged && (
          <div 
            className="flex items-start gap-2.5 p-3 rounded-2xl text-xs leading-relaxed"
            style={{
              backgroundColor: 'rgba(217, 119, 6, 0.08)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              color: '#92400e',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-bold block">Nuanced Pattern</span>
              <p className="opacity-90">
                {currentCorrelation.ambiguityNote || "Your entries reflect mixed emotions during this context. We respect both the moments of ease and the moments of tension."}
              </p>
            </div>
          </div>
        )}

        {/* See Why / Evidence Toggle Button */}
        <div className="pt-2 flex items-center justify-between">
          <button
            id="btn-toggle-mood-evidence"
            onClick={() => setShowEvidence(!showEvidence)}
            className="inline-flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-80 cursor-pointer"
            style={{ color: themeConfig.primary }}
          >
            <span>{showEvidence ? 'Hide evidence' : `See why (${currentCorrelation?.evidenceCount || 0} entries) →`}</span>
            {showEvidence ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          <span className="text-[11px] opacity-50 italic">
            Zero fabrication • Grounded in your entries
          </span>
        </div>

        {/* Expandable Evidence Breakdown Drawer */}
        {showEvidence && currentCorrelation && (
          <div 
            id="mood-correlation-evidence-drawer"
            className="mt-3 p-4 rounded-2xl space-y-3 transition-all animate-in fade-in duration-200"
            style={{ 
              backgroundColor: themeConfig.chipBg, 
              border: `1px solid ${themeConfig.border}` 
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: themeConfig.border }}>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold" style={{ color: themeConfig.inkColor }}>
                  Supporting Journal Entries ({currentCorrelation.evidence.length})
                </span>
              </div>
              <span className="text-[11px] opacity-60">
                Click any entry to view
              </span>
            </div>

            <div className="space-y-2.5">
              {currentCorrelation.evidence.map((item: MoodEvidenceItem, idx: number) => {
                const formattedDate = item.date ? new Date(item.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }) : 'Past Entry';

                return (
                  <div
                    key={item.sessionId || idx}
                    onClick={() => onSelectSession && item.sessionId && onSelectSession(item.sessionId)}
                    className="p-3 rounded-xl transition-all hover:translate-x-0.5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    style={{
                      backgroundColor: themeConfig.paperCardBg,
                      border: `1px solid ${themeConfig.border}`,
                    }}
                    title="Open this journal entry"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold truncate" style={{ color: themeConfig.inkColor }}>
                          {item.sessionTitle || 'Journal Reflection'}
                        </h4>
                        <span className="text-[10px] opacity-60 shrink-0">
                          {formattedDate}
                        </span>
                      </div>
                      <p className="text-xs opacity-75 font-serif line-clamp-1 italic" style={{ color: themeConfig.inkColor }}>
                        "{item.contextSnippet}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {item.mood && (
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
                          style={{ 
                            backgroundColor: `${themeConfig.primary}15`, 
                            color: themeConfig.primary 
                          }}
                        >
                          {item.mood}
                        </span>
                      )}
                      <ExternalLink className="w-3 h-3 opacity-40 hover:opacity-100" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
