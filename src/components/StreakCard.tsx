import React from 'react';
import { Flame } from 'lucide-react';
import { PaperThemePreference } from '../types';
import { getThemeConfig } from '../utils/theme';

export interface StreakCardProps {
  streakDays?: number;
  message?: string;
  weeklyActivity?: boolean[]; // Array of 7 booleans for Monday..Sunday
  className?: string;
  theme?: PaperThemePreference;
}

export const StreakCard: React.FC<StreakCardProps> = ({
  streakDays = 12,
  message = 'Keep showing up for yourself.',
  weeklyActivity = [true, true, true, true, true, false, false],
  className = '',
  theme,
}) => {
  const themeConfig = getThemeConfig(theme);

  return (
    <div 
      id="streak-card-container"
      className={`rounded-3xl p-6 text-white shadow-xs flex flex-col justify-between transition-all relative overflow-hidden ${className}`}
      style={{
        backgroundColor: themeConfig.primary,
        backgroundImage: `linear-gradient(135deg, ${themeConfig.primary}, ${themeConfig.primaryHover || themeConfig.primary})`,
      }}
    >
      <div>
        {/* Top Flame Icon */}
        <div className="flex items-center justify-start mb-4">
          <div 
            className="h-10 w-10 rounded-full flex items-center justify-center shadow-xs bg-white/15"
          >
            <Flame className="h-5 w-5 text-amber-300 fill-amber-300/25" />
          </div>
        </div>

        {/* Eyebrow Label */}
        <p className="text-[10px] uppercase font-bold tracking-widest text-white/80">
          CURRENT STREAK
        </p>

        {/* Days Count */}
        <h3 className="text-3xl font-bold font-serif text-white tracking-tight mt-1">
          {streakDays} days
        </h3>

        {/* Motivational Caption */}
        <p className="text-xs text-white/85 mt-1 font-medium">
          {message}
        </p>
      </div>

      {/* 7-Segment Streak Progress Bar */}
      <div className="mt-6 pt-2">
        <div className="flex items-center gap-1.5 w-full">
          {weeklyActivity.slice(0, 7).map((isActive, index) => (
            <div
              key={index}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor: isActive ? '#f59e0b' : 'rgba(255, 255, 255, 0.25)',
                boxShadow: isActive ? '0 0 6px rgba(245, 158, 11, 0.5)' : 'none',
              }}
              title={`Day ${index + 1}: ${isActive ? 'Active' : 'Rest'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
