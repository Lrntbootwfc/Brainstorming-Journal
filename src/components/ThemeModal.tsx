import React from 'react';
import { X, Check, Palette, Compass, Sparkles, Sun, Moon, Trees, Flame, Feather } from 'lucide-react';
import { PaperThemePreference, JourneyThemePreset } from '../types';
import { getThemeConfig } from '../utils/theme';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: PaperThemePreference;
  onUpdateTheme: (newTheme: PaperThemePreference) => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  theme,
  onUpdateTheme,
}) => {
  if (!isOpen) return null;

  const themeConfig = getThemeConfig(theme);

  const journeyThemes: {
    id: JourneyThemePreset;
    name: string;
    tagline: string;
    primaryColor: string;
    accentBg: string;
    icon: any;
    previewColors: string[];
    defaultTone?: PaperThemePreference['paperTone'];
    defaultInk?: PaperThemePreference['inkStyle'];
  }[] = [
    {
      id: 'journey-teal',
      name: 'Cloud & Teal',
      tagline: 'Soothing ocean teal & clean sky',
      primaryColor: '#00838f',
      accentBg: '#e0f2f1',
      icon: Compass,
      previewColors: ['#00838f', '#26a69a', '#e0f2f1', '#f5f9fa'],
      defaultTone: 'journey-clean',
      defaultInk: 'teal',
    },
    {
      id: 'sunset-amber',
      name: 'Sunset Wanderlust',
      tagline: 'Warm golden hour, terracotta warmth & amber horizons',
      primaryColor: '#d97706',
      accentBg: '#fef3c7',
      icon: Sun,
      previewColors: ['#d97706', '#f59e0b', '#fef3c7', '#fdfaf6'],
      defaultTone: 'cream',
      defaultInk: 'espresso',
    },
    {
      id: 'alpine-forest',
      name: 'Alpine & Evergreen',
      tagline: 'Forest serenity, pine needles & fresh mountain breeze',
      primaryColor: '#2e7d32',
      accentBg: '#e8f5e9',
      icon: Trees,
      previewColors: ['#2e7d32', '#4caf50', '#e8f5e9', '#f4f8f5'],
      defaultTone: 'journey-clean',
      defaultInk: 'charcoal',
    },
    {
      id: 'midnight-voyage',
      name: 'Midnight Voyage',
      tagline: 'Starlit deep navy, lavender twilight & quiet contemplation',
      primaryColor: '#4338ca',
      accentBg: '#ede9fe',
      icon: Moon,
      previewColors: ['#4338ca', '#6366f1', '#ede9fe', '#f6f7fb'],
      defaultTone: 'journey-clean',
      defaultInk: 'navy',
    },
    {
      id: 'classic-parchment',
      name: 'Moleskine & Leather',
      tagline: 'Timeless warm cream stationery & vintage fountain pen',
      primaryColor: '#2c2825',
      accentBg: '#f4efe5',
      icon: Feather,
      previewColors: ['#2c2825', '#c86446', '#f4efe5', '#fcf9f2'],
      defaultTone: 'moleskine',
      defaultInk: 'espresso',
    },
  ];

  const paperTones: { id: PaperThemePreference['paperTone']; name: string; bg: string; border: string; desc: string }[] = [
    { id: 'journey-clean', name: 'Pure Sky', bg: '#f7fafb', border: '#dbe7eb', desc: 'Crisp, airy modern standard' },
    { id: 'cream', name: 'Warm Cream', bg: '#fbf8f3', border: '#e8ded0', desc: 'Classic warm stationery tone' },
    { id: 'parchment', name: 'Fine Parchment', bg: '#f5efe4', border: '#dfd2be', desc: 'Vintage textured parchment' },
    { id: 'moleskine', name: 'Ivory Page', bg: '#fffdf7', border: '#e6decb', desc: 'Crisp, high-contrast ivory' },
  ];

  const rulings: { id: PaperThemePreference['ruling']; name: string; desc: string }[] = [
    { id: 'blank', name: 'Clean Flow', desc: 'Serene unlined cards and free thought' },
    { id: 'ruled', name: 'Ruled Lines', desc: 'Subtle journal horizontal lines' },
    { id: 'grid', name: 'Soft Grid', desc: 'Delicate 20px graph paper' },
  ];

  const inkStyles: { id: PaperThemePreference['inkStyle']; name: string; color: string; desc: string }[] = [
    { id: 'teal', name: 'Signature Teal', color: '#00838f', desc: 'Signature oceanic ink' },
    { id: 'charcoal', name: 'Charcoal Black', color: '#1e293b', desc: 'Deep fountain pen ink' },
    { id: 'espresso', name: 'Espresso Sepia', color: '#451a03', desc: 'Warm roasted sepia' },
    { id: 'navy', name: 'Midnight Navy', color: '#1e1b4b', desc: 'Rich indigo archival ink' },
  ];

  const handleSelectPreset = (preset: typeof journeyThemes[0]) => {
    onUpdateTheme({
      ...theme,
      themePreset: preset.id,
      paperTone: preset.defaultTone || theme.paperTone,
      inkStyle: preset.defaultInk || theme.inkStyle,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-3xl p-6 sm:p-8 bg-[#ffffff] border border-slate-200 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: themeConfig.chipBg, color: themeConfig.primary }}
            >
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-900">
                Journal Atmosphere & Themes
              </h2>
              <p className="text-xs text-slate-500">
                Personalize your journal aesthetic, atmosphere, and styling
              </p>
            </div>
          </div>
          <button
            id="close-theme-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-5 space-y-6 overflow-y-auto pr-1 flex-1">
          {/* Light / Dark Mode Appearance Switch */}
          <div className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 bg-slate-50/70 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-200/70 text-slate-700">
                {theme.darkMode ? <Moon className="h-5 w-5 text-indigo-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {theme.darkMode ? 'Dark Appearance Active' : 'Light Appearance Active'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Switch between day reflection and midnight writing mode
                </p>
              </div>
            </div>
            <button
              type="button"
              id="theme-modal-dark-mode-btn"
              onClick={() => onUpdateTheme({ ...theme, darkMode: !theme.darkMode })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs flex items-center gap-1.5 ${
                theme.darkMode 
                  ? 'bg-slate-900 text-white border-slate-700' 
                  : 'bg-white text-slate-800 border-slate-300'
              }`}
            >
              {theme.darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
              <span>{theme.darkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
            </button>
          </div>

          {/* Preset Palette */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                1. Atmosphere Theme Preset
              </label>
              <span 
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  color: themeConfig.primary,
                  borderColor: themeConfig.border
                }}
              >
                Instant Live Application
              </span>
            </div>

            <div className="space-y-2.5">
              {journeyThemes.map((preset) => {
                const isSelected = (theme.themePreset || 'journey-teal') === preset.id;
                const IconComponent = preset.icon;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'ring-2 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/40'
                    }`}
                    style={isSelected ? {
                      borderColor: preset.primaryColor,
                      backgroundColor: preset.accentBg,
                      outlineColor: preset.primaryColor
                    } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: preset.accentBg, color: preset.primaryColor }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{preset.name}</p>
                          {isSelected && (
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-2xs"
                              style={{ backgroundColor: preset.primaryColor }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{preset.tagline}</p>
                      </div>
                    </div>

                    {/* Color Swatch Dots */}
                    <div className="flex items-center gap-1 shrink-0">
                      {preset.previewColors.map((color, idx) => (
                        <span
                          key={idx}
                          className="h-4 w-4 rounded-full border border-black/10 shadow-2xs"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paper Tone */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-3">
              2. Paper Canvas Tone
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {paperTones.map((item) => {
                const isSelected = theme.paperTone === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onUpdateTheme({ ...theme, paperTone: item.id })}
                    className={`text-left p-3 rounded-2xl border transition-all relative ${
                      isSelected
                        ? 'ring-2 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    style={{ 
                      backgroundColor: item.bg,
                      borderColor: isSelected ? themeConfig.primary : '#e2e8f0'
                    }}
                  >
                    {isSelected && (
                      <div 
                        className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full text-white flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: themeConfig.primary }}
                      >
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    )}
                    <p className="text-xs font-bold text-slate-900">{item.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rulings & Ink Shade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                3. Page Layout
              </label>
              <div className="space-y-1.5">
                {rulings.map((item) => {
                  const isSelected = theme.ruling === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onUpdateTheme({ ...theme, ruling: item.id })}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? 'text-white shadow-2xs font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      style={isSelected ? {
                        backgroundColor: themeConfig.primary,
                        borderColor: themeConfig.primary
                      } : {}}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                4. Primary Ink Accent
              </label>
              <div className="space-y-1.5">
                {inkStyles.map((item) => {
                  const isSelected = theme.inkStyle === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onUpdateTheme({ ...theme, inkStyle: item.id })}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? 'ring-1 font-semibold text-slate-900'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                      style={isSelected ? {
                        backgroundColor: themeConfig.chipBg,
                        borderColor: themeConfig.primary
                      } : {}}
                    >
                      <span className="h-3.5 w-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">Theme is auto-saved to your profile</span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-white text-xs font-bold shadow-xs transition-all hover:opacity-90"
            style={{ backgroundColor: themeConfig.primary }}
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
};

