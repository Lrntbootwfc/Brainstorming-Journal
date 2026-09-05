import React from 'react';
import { Sparkles, Lightbulb, CheckSquare, Heart, RefreshCw } from 'lucide-react';
import { JournalSession } from '../types';

interface SessionSummaryCardProps {
  session: JournalSession;
  onRegenerateSummary?: () => void;
  isGenerating?: boolean;
}

export const SessionSummaryCard: React.FC<SessionSummaryCardProps> = ({
  session,
  onRegenerateSummary,
  isGenerating,
}) => {
  if (!session.summary && !session.keyInsights?.length && !session.actionItems?.length) {
    return null;
  }

  return (
    <div className="my-6 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/50 via-stone-50/50 to-orange-50/30 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-amber-200/50 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800">
            <Sparkles className="h-4 w-4 text-amber-600" />
          </div>
          <h3 className="font-serif text-base font-semibold text-stone-900">
            Gemini Reflection Synthesis
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {session.sentiment && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-700 border border-stone-200 shadow-2xs">
              <Heart className="h-3 w-3 text-rose-500" />
              <span>{session.sentiment}</span>
            </span>
          )}

          {onRegenerateSummary && (
            <button
              id="regenerate-summary-btn"
              onClick={onRegenerateSummary}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-200/60 transition-colors disabled:opacity-50"
              title="Regenerate summary"
            >
              <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Narrative */}
      {session.summary && (
        <div className="mb-4">
          <p className="text-sm leading-relaxed text-stone-800 font-normal">
            {session.summary}
          </p>
        </div>
      )}

      {/* Key Insights */}
      {session.keyInsights && session.keyInsights.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-900/80 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
            <span>Key Insights & Realizations</span>
          </div>
          <ul className="space-y-1.5 pl-1">
            {session.keyInsights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-stone-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {session.actionItems && session.actionItems.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-900/80 mb-2">
            <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>Gentle Action Steps</span>
          </div>
          <ul className="space-y-1.5 pl-1">
            {session.actionItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-stone-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
