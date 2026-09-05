import React from 'react';
import { User } from 'firebase/auth';
import { LogOut, Plus, ShieldCheck, History } from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';
import { PaperThemePreference } from '../types';
import { getThemeConfig } from '../utils/theme';

interface NavbarProps {
  user: User | null;
  onNewSession: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  onSignOut: () => void;
  sessionCount: number;
  theme?: PaperThemePreference;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onNewSession,
  onToggleHistory,
  isHistoryOpen,
  onSignOut,
  sessionCount,
  theme,
}) => {
  const themeConfig = getThemeConfig(theme);

  return (
    <header 
      className="sticky top-0 z-30 border-b transition-colors duration-200"
      style={{
        backgroundColor: themeConfig.paperCardBg,
        borderColor: themeConfig.border,
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs border transition-colors"
            style={{
              backgroundColor: themeConfig.chipBg,
              borderColor: themeConfig.border,
            }}
          >
            <GeminiIcon 
              className="h-5 w-5" 
              color={themeConfig.primary} 
              accentColor={themeConfig.accentColor} 
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span 
                className="font-serif text-lg font-bold tracking-tight"
                style={{ color: themeConfig.inkColor }}
              >
                Brainstorming Journal
              </span>
            </div>
            <p className="text-xs opacity-60 hidden sm:block">
              An AI journal that remembers how you think
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="history-toggle-btn"
              onClick={onToggleHistory}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-all border shadow-2xs"
              style={{
                backgroundColor: isHistoryOpen ? themeConfig.chipBg : themeConfig.paperBg,
                color: themeConfig.inkColor,
                borderColor: themeConfig.border,
              }}
              title="Toggle sidebar drawer"
            >
              <History className="h-4 w-4" style={{ color: themeConfig.primary }} />
              <span className="hidden sm:inline">Drawer</span>
              {sessionCount > 0 && (
                <span 
                  className="rounded-full px-1.5 py-0.5 text-[11px] font-bold"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    color: themeConfig.primary,
                  }}
                >
                  {sessionCount}
                </span>
              )}
            </button>

            <button
              id="new-reflection-btn"
              onClick={onNewSession}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition-all hover:opacity-90 active:scale-98"
              style={{
                backgroundColor: themeConfig.primary,
              }}
            >
              <Plus className="h-4 w-4" />
              <span>New Entry</span>
            </button>

            <div className="h-6 w-px mx-1 hidden sm:block opacity-30" style={{ backgroundColor: themeConfig.border }} />

            {/* User Profile */}
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User profile'}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full border object-cover shadow-2xs"
                  style={{ borderColor: themeConfig.border }}
                />
              ) : (
                <div 
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: themeConfig.primary }}
                >
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p 
                  className="text-xs font-bold truncate max-w-[130px]"
                  style={{ color: themeConfig.inkColor }}
                >
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Isolated</span>
                </div>
              </div>
            </div>

            <button
              id="sign-out-btn"
              onClick={onSignOut}
              className="rounded-xl p-2 transition-colors opacity-70 hover:opacity-100"
              style={{ color: themeConfig.inkColor }}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
