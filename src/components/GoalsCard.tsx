import React, { useState } from 'react';
import { Plus, ArrowRight, BookOpen, Heart, Compass } from 'lucide-react';
import { PersonalGoal, PaperThemePreference } from '../types';
import { getThemeConfig } from '../utils/theme';

export interface GoalsCardProps {
  goals?: PersonalGoal[];
  onAddGoal?: (goal: PersonalGoal) => void;
  onViewAllGoals?: () => void;
  className?: string;
  theme?: PaperThemePreference;
}

interface DefaultGoalItem {
  id: string;
  title: string;
  subtitle: string;
  progressPercent: number;
  iconType: 'routine' | 'reading' | 'ideas';
  accentColor: string;
  bgColor: string;
  barColor: string;
}

const DEFAULT_SAMPLE_GOALS: DefaultGoalItem[] = [
  {
    id: 'sample-goal-1',
    title: 'Build a healthier routine',
    subtitle: 'A yearly goal with steady daily actions',
    progressPercent: 62,
    iconType: 'routine',
    accentColor: '#2563eb',
    bgColor: '#eff6ff',
    barColor: '#3b82f6',
  },
  {
    id: 'sample-goal-2',
    title: 'Finish my reading list',
    subtitle: 'Monthly focus - 2 of 5 books',
    progressPercent: 40,
    iconType: 'reading',
    accentColor: '#059669',
    bgColor: '#ecfdf5',
    barColor: '#10b981',
  },
  {
    id: 'sample-goal-3',
    title: 'Make more space for ideas',
    subtitle: 'Monthly focus - 7 journal entries',
    progressPercent: 78,
    iconType: 'ideas',
    accentColor: '#d97706',
    bgColor: '#fffbeb',
    barColor: '#d97706',
  },
];

export const GoalsCard: React.FC<GoalsCardProps> = ({
  goals = [],
  onAddGoal,
  onViewAllGoals,
  className = '',
  theme,
}) => {
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const themeConfig = getThemeConfig(theme);

  // Map user goals or fallback to screenshot defaults
  const displayItems = goals.length > 0 ? goals.slice(0, 3).map((g, index) => {
    const palette = DEFAULT_SAMPLE_GOALS[index % DEFAULT_SAMPLE_GOALS.length];
    return {
      id: g.id,
      title: g.title,
      subtitle: g.category ? `${g.category} focus` : (g.milestones?.[0]?.title || g.intention || 'Daily habit action'),
      progressPercent: typeof g.progress === 'number' ? g.progress : palette.progressPercent,
      iconType: palette.iconType,
      accentColor: palette.accentColor,
      bgColor: palette.bgColor,
      barColor: palette.barColor,
    };
  }) : DEFAULT_SAMPLE_GOALS;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (onAddGoal) {
      onAddGoal({
        id: 'goal-' + Date.now(),
        userId: '',
        title: newTitle.trim(),
        intention: newSubtitle.trim() || 'Daily habit action',
        status: 'in_progress',
        progress: 0,
        milestones: newSubtitle ? [{ 
          id: 'm-1', 
          title: newSubtitle.trim(), 
          isCompleted: false,
          status: 'pending',
          order: 1
        }] : [],
        relatedJournalRefs: [],
        category: 'Personal Growth',
        timeframe: 'short_term',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setNewTitle('');
    setNewSubtitle('');
    setIsAddingGoal(false);
  };

  const renderIcon = (type: string, color: string) => {
    switch (type) {
      case 'routine':
        return <Heart className="h-4 w-4" style={{ color }} />;
      case 'reading':
        return <BookOpen className="h-4 w-4" style={{ color }} />;
      case 'ideas':
      default:
        return <Compass className="h-4 w-4" style={{ color }} />;
    }
  };

  return (
    <div 
      id="goals-card-container"
      className={`rounded-3xl border p-6 shadow-xs flex flex-col justify-between transition-all ${className}`}
      style={{
        backgroundColor: themeConfig.paperCardBg,
        borderColor: themeConfig.border,
        color: themeConfig.inkColor,
      }}
    >
      <div>
        {/* Header with Title and Add Goal Button */}
        <div className="flex items-start justify-between gap-2 mb-5">
          <div>
            <p 
              className="text-[10px] uppercase font-bold tracking-widest opacity-70"
              style={{ color: themeConfig.primary }}
            >
              DIRECTION FOR YOUR YEAR
            </p>
            <h3 
              className="text-2xl font-serif font-bold tracking-tight mt-0.5"
              style={{ color: themeConfig.inkColor }}
            >
              Goals
            </h3>
          </div>
          <button
            id="goals-card-add-btn"
            onClick={() => setIsAddingGoal(!isAddingGoal)}
            className="text-xs font-bold flex items-center gap-1 transition-opacity opacity-85 hover:opacity-100 pt-1 cursor-pointer"
            style={{ color: themeConfig.primary }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add goal</span>
          </button>
        </div>

        {/* Inline Quick Add Form */}
        {isAddingGoal && (
          <form 
            onSubmit={handleCreateSubmit} 
            className="mb-4 p-3 rounded-2xl border space-y-2 text-xs"
            style={{
              backgroundColor: themeConfig.chipBg,
              borderColor: themeConfig.border,
            }}
          >
            <input 
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Goal title (e.g. Daily creative writing)"
              className="w-full px-3 py-1.5 rounded-xl border focus:outline-none"
              style={{
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border,
                color: themeConfig.inkColor,
              }}
              autoFocus
            />
            <input 
              type="text"
              value={newSubtitle}
              onChange={(e) => setNewSubtitle(e.target.value)}
              placeholder="Focus detail or milestone"
              className="w-full px-3 py-1.5 rounded-xl border focus:outline-none"
              style={{
                backgroundColor: themeConfig.paperCardBg,
                borderColor: themeConfig.border,
                color: themeConfig.inkColor,
              }}
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button 
                type="button" 
                onClick={() => setIsAddingGoal(false)}
                className="px-2.5 py-1 opacity-70 hover:opacity-100"
                style={{ color: themeConfig.inkColor }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-3 py-1 text-white font-semibold rounded-lg shadow-xs"
                style={{ backgroundColor: themeConfig.primary }}
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Goals List */}
        <div className="space-y-4">
          {displayItems.map((goal) => (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Patterned / Solid Circle Icon */}
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs"
                    style={{ backgroundColor: goal.bgColor }}
                  >
                    {renderIcon(goal.iconType, goal.accentColor)}
                  </div>
                  <div className="min-w-0">
                    <h4 
                      className="text-xs font-bold truncate"
                      style={{ color: themeConfig.inkColor }}
                    >
                      {goal.title}
                    </h4>
                    <p 
                      className="text-[11px] truncate opacity-70"
                      style={{ color: themeConfig.inkColor }}
                    >
                      {goal.subtitle}
                    </p>
                  </div>
                </div>
                {/* Percentage Badge */}
                <span 
                  className="text-xs font-semibold shrink-0 opacity-75"
                  style={{ color: themeConfig.inkColor }}
                >
                  {goal.progressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div 
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: themeConfig.chipBg }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${goal.progressPercent}%`,
                    backgroundColor: goal.barColor || themeConfig.primary,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View All Goals Button */}
      <div className="mt-6 pt-2">
        <button
          id="goals-card-view-all-btn"
          onClick={onViewAllGoals}
          className="w-full border font-semibold text-xs py-2.5 rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer hover:opacity-90"
          style={{
            borderColor: themeConfig.border,
            backgroundColor: themeConfig.chipBg,
            color: themeConfig.inkColor,
          }}
        >
          <span>View all goals</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
