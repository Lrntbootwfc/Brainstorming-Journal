import { PaperThemePreference, JourneyThemePreset } from '../types';

export interface ThemeConfig {
  preset: JourneyThemePreset;
  name: string;
  primary: string;
  primaryHover: string;
  accent: string;
  accentColor: string;
  bg: string;
  cardBg: string;
  sidebarBg: string;
  border: string;
  chipBg: string;
  chipText: string;
  activeNavBg: string;
  activeNavText: string;
  primaryBtnClass: string;
  lightBadgeClass: string;
  activeTabClass: string;
  calendarStampBg: string;
  calendarStampText: string;
  paperBg: string;
  paperCardBg: string;
  paperBorder: string;
  inkColor: string;
  rulingClass: string;
  userBubbleBg: string;
  userBubbleText: string;
}

export const THEME_PRESETS: Record<JourneyThemePreset, {
  name: string;
  primary: string;
  primaryHover: string;
  accent: string;
  bg: string;
  cardBg: string;
  sidebarBg: string;
  border: string;
  chipBg: string;
  chipText: string;
  primaryBtnClass: string;
  lightBadgeClass: string;
  activeTabClass: string;
  calendarStampBg: string;
  calendarStampText: string;
}> = {
  'journey-teal': {
    name: 'Cloud & Teal',
    primary: '#00838f',
    primaryHover: '#006064',
    accent: '#26a69a',
    bg: '#f5f9fa',
    cardBg: '#ffffff',
    sidebarBg: '#ffffff',
    border: '#dbe7eb',
    chipBg: '#e0f2f1',
    chipText: '#00695c',
    primaryBtnClass: 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-700/20',
    lightBadgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    activeTabClass: 'bg-teal-700 text-white shadow-xs',
    calendarStampBg: '#e0f2f1',
    calendarStampText: '#00695c',
  },
  'sunset-amber': {
    name: 'Sunset Wanderlust',
    primary: '#d97706',
    primaryHover: '#b45309',
    accent: '#f59e0b',
    bg: '#fffdf7',
    cardBg: '#ffffff',
    sidebarBg: '#ffffff',
    border: '#fde68a',
    chipBg: '#fef3c7',
    chipText: '#92400e',
    primaryBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
    lightBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    activeTabClass: 'bg-amber-600 text-white shadow-xs',
    calendarStampBg: '#fef3c7',
    calendarStampText: '#92400e',
  },
  'alpine-forest': {
    name: 'Alpine & Evergreen',
    primary: '#2e7d32',
    primaryHover: '#1b5e20',
    accent: '#4caf50',
    bg: '#f3f8f4',
    cardBg: '#ffffff',
    sidebarBg: '#ffffff',
    border: '#c8e6c9',
    chipBg: '#e8f5e9',
    chipText: '#1b5e20',
    primaryBtnClass: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20',
    lightBadgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    activeTabClass: 'bg-emerald-700 text-white shadow-xs',
    calendarStampBg: '#e8f5e9',
    calendarStampText: '#1b5e20',
  },
  'midnight-voyage': {
    name: 'Midnight Voyage',
    primary: '#4338ca',
    primaryHover: '#3730a3',
    accent: '#6366f1',
    bg: '#f5f4fb',
    cardBg: '#ffffff',
    sidebarBg: '#ffffff',
    border: '#ddd6fe',
    chipBg: '#ede9fe',
    chipText: '#4338ca',
    primaryBtnClass: 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-indigo-700/20',
    lightBadgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    activeTabClass: 'bg-indigo-700 text-white shadow-xs',
    calendarStampBg: '#ede9fe',
    calendarStampText: '#4338ca',
  },
  'classic-parchment': {
    name: 'Moleskine & Leather',
    primary: '#78350f',
    primaryHover: '#451a03',
    accent: '#b45309',
    bg: '#faf6ee',
    cardBg: '#ffffff',
    sidebarBg: '#fffdfa',
    border: '#e8decb',
    chipBg: '#fef3c7',
    chipText: '#78350f',
    primaryBtnClass: 'bg-amber-900 hover:bg-stone-900 text-white shadow-amber-900/20',
    lightBadgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    activeTabClass: 'bg-amber-900 text-white shadow-xs',
    calendarStampBg: '#f5eedc',
    calendarStampText: '#78350f',
  },
};

export const PAPER_TONES: Record<string, { bg: string; cardBg: string; border: string }> = {
  'journey-clean': { bg: '#f5f9fa', cardBg: '#ffffff', border: '#dbe7eb' },
  'cream': { bg: '#fbf8f0', cardBg: '#fffdfa', border: '#ebdccb' },
  'parchment': { bg: '#f5efe4', cardBg: '#faf5ec', border: '#e3d4be' },
  'moleskine': { bg: '#fffdf7', cardBg: '#ffffff', border: '#e6decb' },
  'kraft': { bg: '#eee4d3', cardBg: '#f7f1e6', border: '#d8c5aa' },
};

export const INK_STYLES: Record<string, string> = {
  'teal': '#00838f',
  'charcoal': '#1e293b',
  'espresso': '#451a03',
  'navy': '#1e1b4b',
};

export function getThemeConfig(theme?: Partial<PaperThemePreference>): ThemeConfig {
  const presetKey: JourneyThemePreset = theme?.themePreset || 'journey-teal';
  const preset = THEME_PRESETS[presetKey] || THEME_PRESETS['journey-teal'];
  const isDark = Boolean(theme?.darkMode);
  
  const paperKey = theme?.paperTone || 'journey-clean';
  const paper = PAPER_TONES[paperKey] || PAPER_TONES['journey-clean'];
  
  const inkKey = theme?.inkStyle || 'charcoal';
  const baseInkColor = INK_STYLES[inkKey] || INK_STYLES['charcoal'];
  
  let rulingClass = '';
  if (theme?.ruling === 'ruled') {
    rulingClass = 'notebook-ruled';
  } else if (theme?.ruling === 'grid') {
    rulingClass = 'paper-grid';
  }

  if (isDark) {
    return {
      preset: presetKey,
      name: `${preset.name} (Dark)`,
      primary: preset.accent || '#2dd4bf',
      primaryHover: preset.primary,
      accent: preset.accent,
      accentColor: preset.accent,
      bg: '#111215',
      cardBg: '#18191e',
      sidebarBg: '#14151a',
      border: '#282a32',
      chipBg: '#23252e',
      chipText: '#e2e8f0',
      activeNavBg: '#23252e',
      activeNavText: preset.accent || '#2dd4bf',
      primaryBtnClass: 'bg-teal-500 hover:bg-teal-400 text-stone-950 font-bold shadow-xs',
      lightBadgeClass: 'bg-stone-800 text-teal-300 border-stone-700',
      activeTabClass: 'bg-stone-800 text-white shadow-xs border border-stone-700',
      calendarStampBg: '#23252e',
      calendarStampText: '#e2e8f0',
      paperBg: '#111215',
      paperCardBg: '#18191e',
      paperBorder: '#282a32',
      inkColor: '#f1f5f9',
      rulingClass,
      userBubbleBg: preset.primary,
      userBubbleText: '#ffffff',
    };
  }

  return {
    preset: presetKey,
    name: preset.name,
    primary: preset.primary,
    primaryHover: preset.primaryHover,
    accent: preset.accent,
    accentColor: preset.accent,
    bg: paper.bg || preset.bg,
    cardBg: paper.cardBg || preset.cardBg,
    sidebarBg: preset.sidebarBg,
    border: paper.border || preset.border,
    chipBg: preset.chipBg,
    chipText: preset.chipText,
    activeNavBg: preset.chipBg,
    activeNavText: preset.primary,
    primaryBtnClass: preset.primaryBtnClass,
    lightBadgeClass: preset.lightBadgeClass,
    activeTabClass: preset.activeTabClass,
    calendarStampBg: preset.calendarStampBg,
    calendarStampText: preset.calendarStampText,
    paperBg: paper.bg,
    paperCardBg: paper.cardBg,
    paperBorder: paper.border,
    inkColor: baseInkColor,
    rulingClass,
    userBubbleBg: preset.primary,
    userBubbleText: '#ffffff',
  };
}
