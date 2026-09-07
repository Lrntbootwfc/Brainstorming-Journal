import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Database,
  Camera,
  MapPin,
  Calendar,
  CloudSun,
  Workflow,
  Feather,
  Lock,
  GitBranch,
  CheckCircle,
  TreeDeciduous,
  Target,
  Folder,
  Lightbulb,
  BookOpen,
  Layers,
  HeartHandshake,
  TrendingUp,
  Sun,
  Moon,
  Compass,
  Activity,
  Zap,
  Clock,
  Palette,
  Check,
  Settings
} from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';
import { PaperThemePreference } from '../types';
import { ThemeConfig, getThemeConfig } from '../utils/theme';
import { ThemeModal } from './ThemeModal';

const heroImage = '/hero-landscape.jpg';

interface LandingPageProps {
  onSignIn: () => void;
  onStartJournal?: () => void;
  isLoading: boolean;
  user?: any;
  errorMessage?: string | null;
  theme?: PaperThemePreference;
  themeConfig?: ThemeConfig;
  onUpdateTheme?: (theme: PaperThemePreference) => void;
  
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onStartJournal,
  isLoading,
  user,
  errorMessage,
  theme,
  themeConfig,
  onUpdateTheme,
}) => {
  const defaultTheme: PaperThemePreference = {
    darkMode: false,
    themePreset: 'journey-teal',
    paperTone: 'journey-clean',
    ruling: 'blank',
    inkStyle: 'teal'
  };
  
  const activeTheme = theme || defaultTheme;
  const activeThemeConfig = themeConfig || getThemeConfig(activeTheme);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  return (
    <>

    <div className="min-h-screen flex flex-col justify-between transition-colors duration-200"
      style={{
        backgroundColor: activeThemeConfig.paperBg,
        backgroundImage: activeTheme.darkMode 
          ? 'radial-gradient(circle at 20% 0%, rgba(38, 166, 154, 0.06), transparent 50%), radial-gradient(circle at 80% 100%, rgba(0, 131, 143, 0.05), transparent 50%)'
          : 'none',
        color: activeThemeConfig.inkColor
      }}
    >
      {/* Top Navigation Bar */}
      <header 
        className="mx-auto w-full max-w-7xl flex items-center justify-between px-4 sm:px-8 py-5 border-b transition-colors"
        style={{ borderColor: activeThemeConfig.border }}
      >
        {/* Brand: Gemini Icon matching Dashboard, title, and badge */}
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center shadow-xs border shrink-0 transition-colors"
            style={{ 
              backgroundColor: activeThemeConfig.chipBg, 
              borderColor: activeThemeConfig.border 
            }}
          >
            <GeminiIcon 
              className="h-5 w-5 sm:h-6 sm:w-6" 
              color={activeThemeConfig.primary} 
              accentColor={activeThemeConfig.accentColor} 
            />
          </div>
          <div>
            <span 
              className="font-serif text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2"
              style={{ color: activeThemeConfig.inkColor }}
            >
              Brainstorming Journal
            </span>
            <span 
              className="text-[11px] block font-medium opacity-70"
              style={{ color: activeThemeConfig.inkColor }}
            >
              Turning ideas into action and providing clear direction
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Mode Toggle matching Dashboard */}
          {onUpdateTheme && (
            <button
              id="landing-theme-toggle-btn"
              onClick={() => onUpdateTheme({ ...activeTheme, darkMode: !activeTheme.darkMode })}
              className="p-2 sm:p-2.5 rounded-full border text-xs flex items-center justify-center transition-all shadow-2xs hover:opacity-90 cursor-pointer shrink-0"
              style={{
                backgroundColor: activeThemeConfig.chipBg,
                borderColor: activeThemeConfig.border,
                color: activeThemeConfig.primary,
              }}
              title={activeTheme.darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Light and Dark Mode"
            >
              {activeTheme.darkMode ? (
                <Sun className="h-4 w-4" style={{ color: activeThemeConfig.primary }} />
              ) : (
                <Moon className="h-4 w-4" style={{ color: activeThemeConfig.primary }} />
              )}
            </button>
          )}

          
            <button
              id="landing-settings-btn"
              onClick={ () => setIsThemeModalOpen(true) }
              className="p-2 sm:p-2.5 rounded-full border text-xs flex items-center justify-center transition-all shadow-2xs hover:opacity-90 cursor-pointer shrink-0"
              style={{
                backgroundColor: activeThemeConfig.chipBg,
                borderColor: activeThemeConfig.border,
                color: activeThemeConfig.primary,
              }}
              title="Settings & Themes"
              aria-label="Open Settings"
            >
              <Settings className="h-4 w-4" style={{ color: activeThemeConfig.primary }} />
            </button>
          
          {user ? (
            <button
              id="landing-open-dashboard-btn"
              onClick={onStartJournal}
              className="px-5 py-2 rounded-full text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs hover:opacity-95 transition-all cursor-pointer transform hover:-translate-y-0.5"
              style={{ backgroundColor: activeThemeConfig.primary }}
            >
              <span>Open Journal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              id="landing-signin-btn"
              onClick={onSignIn}
              disabled={isLoading}
              className="px-5 py-2 rounded-full border text-xs sm:text-sm font-bold flex items-center gap-2 shadow-2xs hover:opacity-95 transition-all cursor-pointer"
              style={{
                backgroundColor: activeThemeConfig.paperCardBg,
                borderColor: activeThemeConfig.border,
                color: activeThemeConfig.inkColor,
              }}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.4 0-.8.1-1.6.4-2.4L1.9 7C.7 9.4 0 11.1 0 12.3s.7 2.9 1.9 5.3l3.7-2.9z" />
                <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17c1.8 3.8 5.6 6.5 10.1 6.5z" />
              </svg>
              <span>{isLoading ? 'Connecting...' : 'Sign In with Google'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Scrollable Body */}
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-8 py-6 space-y-5">
        {/* 1. Hero Section with Scenic Landscape Image & Direct Statement */}
        <section className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg min-h-[440px] sm:min-h-[500px] flex flex-col justify-end p-6 sm:p-12">
          {/* Scenic Background Image */}
          <img 
            src={heroImage} 
            alt="Scenic mountain valley with a winding turquoise river and a solitary observation bench"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Calming Vignette Gradient for Perfect Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-black/20" />

          {/* Hero Content: Direct declaration as the Brainstorming Journal */}
          <div className="relative z-10 max-w-7xl text-left space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-3.5 py-1 text-xs font-semibold text-white shadow-xs">
              <Feather className="h-3.5 w-3.5 text-teal-300" />
              <span>Welcome to Brainstorming Journal</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Where raw ideas transform into action and purposeful direction.
            </h1>

            <p className="text-sm sm:text-base text-slate-200 max-w-7xl font-normal leading-relaxed text-justify">
              Every idea begins scattered and incomplete. The Brainstorming Journal walks alongside your thinking like a calm, thoughtful companion, one that doesn't just listen to your ideas but helps shape them into realistic action steps, giving you a clear sense of direction.
            </p>

            {/* Primary Action Button inside Hero */}
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              {user ? (
                <button
                  id="landing-hero-cta-btn"
                  onClick={onStartJournal}
                  className="px-6 py-3 rounded-full bg-teal-600 text-white font-bold text-sm shadow-md hover:bg-teal-500 transition-all transform hover:-translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Open Your Journal</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  id="landing-hero-cta-btn"
                  onClick={onSignIn}
                  disabled={isLoading}
                  className="px-6 py-3 rounded-full bg-white text-slate-900 font-bold text-sm shadow-md hover:bg-slate-100 transition-all transform hover:-translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                    <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.4 0-.8.1-1.6.4-2.4L1.9 7C.7 9.4 0 11.1 0 12.3s.7 2.9 1.9 5.3l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17c1.8 3.8 5.6 6.5 10.1 6.5z" />
                  </svg>
                  <span>{isLoading ? 'Connecting...' : 'Begin Reflection with Google'}</span>
                </button>
              )}

              {errorMessage && (
                <div className="flex flex-col items-center gap-2 max-w-md animate-in fade-in duration-300">
                  <p className="text-xs text-rose-300 font-medium bg-rose-950/70 px-3.5 py-1.5 rounded-xl border border-rose-800 text-center text-justify">
                    {errorMessage}
                  </p>
                  {errorMessage.toLowerCase().includes('popup') && (
                    <button
                      id="landing-retry-signin-btn"
                      onClick={onSignIn}
                      className="text-xs px-3 py-1 rounded-full bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      Click here to try again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2. The Core Philosophy — Continuous Editorial Narrative */}
        <section className="space-y-6">
          <div className="max-w-7xl space-y-3">
            <div 
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
              style={{ color: activeThemeConfig.primary }}
            >
              <Sparkles className="h-4 w-4" />
              <span>The Purpose & Vision</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
              A journal designed for thinkers, builders, and dreamers who refuse to let ideas fade away.
            </h2>
            <p className="text-sm sm:text-base opacity-80 leading-relaxed font-normal text-justify">
              Most note-taking applications become digital graveyards: a chaotic pile of isolated sentences where brilliant moments get buried under tomorrow’s noise. <strong>Brainstorming Journal</strong> was built on a singular conviction: an idea is only as powerful as the direction it gives your life. By combining reflective human writing with Gemini intelligence, this journal actively participates in your thinking process—challenging assumptions, weaving connections between scattered moments, and crystallizing amorphous brainstorms into concrete, executable steps.
            </p>
          </div>
        </section>

        {/* 3. The Complete Flow: Everything Inside the Journal (Flowing Presentation, No Boxy Cards) */}
        <section className="space-y-12 pt-4">
          <div className="border-b pb-4" style={{ borderColor: activeThemeConfig.border }}>
            <div 
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: activeThemeConfig.primary }}
            >
              <Layers className="h-4 w-4" />
              <span>Architectural Blueprint</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              The Living Flow: Everything Inside the Journal
            </h2>
            <p className="text-xs sm:text-sm opacity-75 mt-1 max-w-7xl text-justify">
              A seamless, step-by-step journey from the initial spark of raw reflection to long-term intellectual growth and tangible milestones.
            </p>
          </div>

          {/* Sequential Narrative Chapters */}
          <div className="relative pl-6 sm:pl-10 space-y-5 border-l-2" style={{ borderColor: activeThemeConfig.border }}>

            {/* Step 1: The First Spark & Deep Brainstorming Dialogue */}
            <div className="relative group space-y-3">
              {/* Timeline Marker Dot */}
              <div 
                className="absolute -left-[31px] sm:-left-[47px] top-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-110"
                style={{ 
                  backgroundColor: activeThemeConfig.paperBg,
                  borderColor: activeThemeConfig.primary,
                  color: activeThemeConfig.primary
                }}
              >
                01
              </div>

              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                  style={{ 
                    backgroundColor: activeThemeConfig.chipBg, 
                    color: activeThemeConfig.primary,
                    borderColor: activeThemeConfig.border 
                  }}
                >
                  Socratic Reflection
                </span>
                <span className="text-xs opacity-60">• Multi-turn dialogue</span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                Deep Brainstorming & Interactive Thought Partnership
              </h3>

              <p className="text-sm opacity-85 leading-relaxed max-w-7xl text-justify">
                When you write an entry in Brainstorming Journal, you aren't writing into an empty void. Powered by Gemini, the AI acts as a dedicated intellectual sounding board. Rather than dispensing unsolicited advice or generic summaries, it practices the Socratic method: asking probing questions, pointing out hidden nuances in your reasoning, highlighting unexamined assumptions, and reflecting your core thesis back to you with striking clarity.
              </p>

              <div 
                className="p-4 rounded-2xl border text-xs leading-relaxed max-w-7xl space-y-1.5"
                style={{ backgroundColor: activeThemeConfig.chipBg, borderColor: activeThemeConfig.border }}
              >
                <div className="font-bold flex items-center gap-1.5" style={{ color: activeThemeConfig.primary }}>
                  <Feather className="h-3.5 w-3.5" />
                  <span>Quiet Mode (Zero AI Interference)</span>
                </div>
                <p className="opacity-80 text-justify">
                  Prefer pure solitude? With one click, engage Quiet Mode to write uninterrupted without any AI interaction or history inclusion, preserving the sanctuary of an old-school private diary.
                </p>
              </div>
            </div>

            {/* Step 2: Thought to Action Engine */}
            <div className="relative group space-y-3">
              <div 
                className="absolute -left-[31px] sm:-left-[47px] top-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-110"
                style={{ 
                  backgroundColor: activeThemeConfig.paperBg,
                  borderColor: activeThemeConfig.primary,
                  color: activeThemeConfig.primary
                }}
              >
                02
              </div>

              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                  style={{ 
                    backgroundColor: activeThemeConfig.chipBg, 
                    color: activeThemeConfig.primary,
                    borderColor: activeThemeConfig.border 
                  }}
                >
                  Actionable Execution
                </span>
                <span className="text-xs opacity-60">• Direction & Momentum</span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                The Thought ➔ Action Engine (Turning Ideas into Clear Direction)
              </h3>

              <p className="text-sm opacity-85 leading-relaxed max-w-7xl text-justify">
                Ideas remain harmless daydreams until they are broken down into actionable commitments. The journal features a specialized Thought-to-Action synthesis engine that extracts real-world milestones from your introspections. It organizes tasks chronologically, surfaces foundational dependencies, suggests realistic next horizons, and provides the clear direction needed to convert creative momentum into tangible progress.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-7xl pt-1">
                <div 
                  className="p-3.5 rounded-2xl border text-xs space-y-1"
                  style={{ backgroundColor: activeThemeConfig.chipBg, borderColor: activeThemeConfig.border }}
                >
                  <div className="font-bold flex items-center gap-1.5" style={{ color: activeThemeConfig.primary }}>
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Dependency Sequencing</span>
                  </div>
                  <p className="opacity-75 text-justify">
                    Automatically determines which prerequisite action must happen first before larger plans unfold.
                  </p>
                </div>
                <div 
                  className="p-3.5 rounded-2xl border text-xs space-y-1"
                  style={{ backgroundColor: activeThemeConfig.chipBg, borderColor: activeThemeConfig.border }}
                >
                  <div className="font-bold flex items-center gap-1.5" style={{ color: activeThemeConfig.primary }}>
                    <Compass className="h-3.5 w-3.5" />
                    <span>Goal Alignment</span>
                  </div>
                  <p className="opacity-75">
                    Connects specific journal action items directly to your high-level personal and professional aspirations.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Mind Tree — Semantic Idea Evolution Graph */}
            <div className="relative group space-y-3">
              <div 
                className="absolute -left-[31px] sm:-left-[47px] top-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-110"
                style={{ 
                  backgroundColor: activeThemeConfig.paperBg,
                  borderColor: activeThemeConfig.primary,
                  color: activeThemeConfig.primary
                }}
              >
                03
              </div>

              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                  style={{ 
                    backgroundColor: activeThemeConfig.chipBg, 
                    color: activeThemeConfig.primary,
                    borderColor: activeThemeConfig.border 
                  }}
                >
                  Knowledge Mapping
                </span>
                <span className="text-xs opacity-60">• Semantic graph intelligence</span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                Mind Tree: Connecting Hidden Dots Across Time
              </h3>

              <p className="text-sm opacity-85 leading-relaxed max-w-7xl text-justify">
                Ideas rarely show up in a neat order. A thought from three weeks ago often connects to something you wrote today, even if you never noticed the link while it was happening. The Mind Tree takes your journal entries and organizes them into a single visual, structured like a tree, so those connections become easy to see at a glance.
The roots represent your foundational ideas and philosophies, the beliefs and principles that quietly shape everything else you write. The branches represent the topics and interests you're actively exploring right now, the threads you keep coming back to. The leaves represent newer, still-forming ideas, the sparks that haven't fully taken shape yet. The fruits represent finished projects and completed goals, the moments where an idea actually became something real.
Instead of scrolling through entries one at a time trying to remember how things fit together, you get one image that lays out the whole picture of where your thinking has been and where it's headed.
              </p>
            </div>

            {/* Step 4: Mind Garden — The Living Biological Growth Map */}
            <div className="relative group space-y-3">
              <div 
                className="absolute -left-[31px] sm:-left-[47px] top-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-110"
                style={{ 
                  backgroundColor: activeThemeConfig.paperBg,
                  borderColor: activeThemeConfig.primary,
                  color: activeThemeConfig.primary
                }}
              >
                04
              </div>

              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                  style={{ 
                    backgroundColor: activeThemeConfig.chipBg, 
                    color: activeThemeConfig.primary,
                    borderColor: activeThemeConfig.border 
                  }}
                >
                  Emotional Intelligence
                </span>
                <span className="text-xs opacity-60">•  Mood extraction</span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                Mood Extraction & Calendar Reflection
              </h3>

              <p className="text-sm opacity-85 leading-relaxed max-w-7xl text-justify">
                Writing regularly says a lot about how you're feeling, even when you're not directly writing about your feelings. The journal reads the tone of each entry as you write it and picks up on the underlying mood automatically, so you never have to stop and manually tag how you felt that day.
                Those moods are then plotted on a calendar view, giving you a simple visual timeline of your emotional patterns. You can look back across a week and notice a rough stretch, scroll through a full month and spot the days that stood out, or look across a season and see how your overall mindset has shifted over time. It turns something usually invisible, like your emotional rhythm, into something you can actually see and reflect on.
              </p>
            </div>

            {/* Step 5: Unfinished Thought Resumption & Memory Radar */}
            <div className="relative group space-y-3">
              <div 
                className="absolute -left-[31px] sm:-left-[47px] top-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-110"
                style={{ 
                  backgroundColor: activeThemeConfig.paperBg,
                  borderColor: activeThemeConfig.primary,
                  color: activeThemeConfig.primary
                }}
              >
                05
              </div>

              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                  style={{ 
                    backgroundColor: activeThemeConfig.chipBg, 
                    color: activeThemeConfig.primary,
                    borderColor: activeThemeConfig.border 
                  }}
                >
                  Thought Continuity
                </span>
                <span className="text-xs opacity-60">• Never lose an idea</span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                Unfinished Thread Resumption: Rekindling Abandoned Sparks
              </h3>

              <p className="text-sm opacity-85 leading-relaxed max-w-7xl text-justify">
                How many incredible brainstorms have you started, only to get interrupted and completely forget about them? The Brainstorming Journal continuously listens to the continuity of your work. It intelligently identifies open loops, unsolved questions, and abandoned threads, presenting a gentle banner on your dashboard that invites you to resume that train of thought with full contextual recall when inspiration strikes.
              </p>
            </div>

            {/* Step 6: Emotional Well-Being & Mood Correlation Analytics */}
            <div className="relative group space-y-3">
              <div 
                className="absolute -left-[31px] sm:-left-[47px] top-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-110"
                style={{ 
                  backgroundColor: activeThemeConfig.paperBg,
                  borderColor: activeThemeConfig.primary,
                  color: activeThemeConfig.primary
                }}
              >
                06
              </div>

              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                  style={{ 
                    backgroundColor: activeThemeConfig.chipBg, 
                    color: activeThemeConfig.primary,
                    borderColor: activeThemeConfig.border 
                  }}
                >
                  Visual Aspiration
                </span>
                <span className="text-xs opacity-60">• Curated imagery</span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                Vision Board: A Visual Space for What You're Working Toward
              </h3>

              <p className="text-sm opacity-85 leading-relaxed max-w-7xl text-justify">
                Some goals are easier to hold onto as a picture than as a sentence. The Vision Board gives you a dedicated space to pin images and quotes that represent the direction you're heading in, sitting right alongside the goals and plans you've already written down.

Whether it's a place you're saving up to visit, a version of your daily routine you're building toward, or a project you can already picture finished, the Vision Board keeps that image in front of you every time you open the journal. Pairing your written goals with a visual reference makes the whole thing feel less like a task list and more like a direction you're actively moving toward.
              </p>
            </div>

            {/* Step 7: Goal Milestones & Life Alignment */}
            <div className="relative group space-y-3">
              <div 
                className="absolute -left-[31px] sm:-left-[47px] top-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-110"
                style={{ 
                  backgroundColor: activeThemeConfig.paperBg,
                  borderColor: activeThemeConfig.primary,
                  color: activeThemeConfig.primary
                }}
              >
                07
              </div>

              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                  style={{ 
                    backgroundColor: activeThemeConfig.chipBg, 
                    color: activeThemeConfig.primary,
                    borderColor: activeThemeConfig.border 
                  }}
                >
                  Goal Setting
                </span>
                <span className="text-xs opacity-60">• Short-term & Long-term vision</span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                Integrated Goal Tracking & Milestone Alignment
              </h3>

              <p className="text-sm opacity-85 leading-relaxed max-w-7xl text-justify">
                Keep the grand vision aligned with daily efforts. Maintain customized short-term horizons and long-term North Star goals right alongside your writing canvas. The AI can also analyze your recent journaling patterns to recommend new growth goals, helping you bridge the gap between where you currently stand and where you want to be.
              </p>
            </div>

            {/* Step 8: Sensory Grounding & Tactile Aesthetic Experience */}
            <div className="relative group space-y-3">
              <div 
                className="absolute -left-[31px] sm:-left-[47px] top-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-110"
                style={{ 
                  backgroundColor: activeThemeConfig.paperBg,
                  borderColor: activeThemeConfig.primary,
                  color: activeThemeConfig.primary
                }}
              >
                08
              </div>

              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                  style={{ 
                    backgroundColor: activeThemeConfig.chipBg, 
                    color: activeThemeConfig.primary,
                    borderColor: activeThemeConfig.border 
                  }}
                >
                  Sensory Experience
                </span>
                <span className="text-xs opacity-60">• Atmosphere, atlas & tactile paper</span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                Atmospheric Memory & Tactile Paper Themes
              </h3>

              <p className="text-sm opacity-85 leading-relaxed max-w-7xl text-justify">
                Memory is tied to more than just words. The journal captures a bit of the physical context around each entry, like the weather or temperature at the time you were writing, adding a small layer of atmosphere to what you recorded that day.

On top of that, the journal itself is designed to feel like real paper rather than a plain digital box. You can choose from several stationery styles, including Cream, Parchment, Kraft, and Moleskine textures, along with customizable ruling grids to match how you like to write. Light and dark palettes are both available too, so the journal stays comfortable to read whether you're writing in the morning or late at night.
              </p>
            </div>

            {/* Step 9: Organization & Uncompromising Privacy */}
            <div className="relative group space-y-3">
              <div 
                className="absolute -left-[31px] sm:-left-[47px] top-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-transform group-hover:scale-110"
                style={{ 
                  backgroundColor: activeThemeConfig.paperBg,
                  borderColor: activeThemeConfig.primary,
                  color: activeThemeConfig.primary
                }}
              >
                09
              </div>
              

              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                  style={{ 
                    backgroundColor: activeThemeConfig.chipBg, 
                    color: activeThemeConfig.primary,
                    borderColor: activeThemeConfig.border 
                  }}
                >
                  Security & Architecture
                </span>
                <span className="text-xs opacity-60">• User-isolated Firestore & Google Auth</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                Built on a Foundation of Privacy
              </h3>
              <p className="text-sm opacity-85 leading-relaxed max-w-7xl text-justify">
                Journaling only works if you trust the space you're writing in. Every entry is stored in a user-isolated Firestore instance, meaning your data is kept logically separate from every other user's account, with no shared collections and no risk of cross-account exposure.

Sign-in runs through Google Authentication, so you get a secure and familiar login process without needing to create or remember another password. Together, these choices mean the journal is built from the ground up with privacy as a starting point, not an afterthought, so your reflections stay yours.
              </p>

            </div>

          </div>
        </section>

        {/* 4. Competition Showcase Summary Banner */}
        <section 
          className="p-6 sm:p-10 rounded-3xl border transition-colors space-y-6"
          style={{ 
            backgroundColor: activeThemeConfig.chipBg,
            borderColor: activeThemeConfig.border
          }}
        >
          <div className="max-w-7xl space-y-3">
            <div 
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
              style={{ color: activeThemeConfig.primary }}
            >
              <Target className="h-4 w-4" />
              <span>Ready for the Competition</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              A Complete Thinking Environment Crafted for Real-World Impact
            </h3>
            <p className="text-xs sm:text-sm opacity-80 leading-relaxed font-normal text-justify">
              From raw thought capture to Socratic refinement, semantic connection mapping in the Mind Tree, living visual growth in the Mind Garden, and tactical action execution—Brainstorming Journal gives every thinker the clarity, momentum, and direction needed to succeed.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-4 flex-wrap">
            {user ? (
              <button
                id="landing-footer-cta-btn"
                onClick={onStartJournal}
                className="px-7 py-3 rounded-full text-white font-bold text-sm shadow-md hover:opacity-95 transition-all transform hover:-translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: activeThemeConfig.primary }}
              >
                <span>Enter Brainstorming Journal</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                id="landing-footer-cta-btn"
                onClick={onSignIn}
                disabled={isLoading}
                className="px-7 py-3 rounded-full text-white font-bold text-sm shadow-md hover:opacity-95 transition-all transform hover:-translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: activeThemeConfig.primary }}
              >
                <span>Start Brainstorming with Google</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <span className="text-xs opacity-60 font-medium">Free, private, and synced to Google Cloud</span>
          </div>
        </section>
      </main>

      {/* Refined Footer */}
      <footer 
        className="mx-auto w-full max-w-7xl px-4 sm:px-8 py-6 border-t flex flex-col sm:flex-row items-center justify-between text-xs opacity-75 gap-3 mt-12 transition-colors"
        style={{ borderColor: activeThemeConfig.border }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: activeThemeConfig.primary }}>
            <ShieldCheck className="h-4 w-4" />
            Cloud Firestore Synced
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 opacity-60" />
            Private & Owner-Bound
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Gemini Socratic AI
          </span>
        </div>
        <p className="text-[11px] opacity-80 text-justify">© Brainstorming Journal • AI Thought Partner & Direction Engine</p>
      </footer>
    </div>
    <ThemeModal
      isOpen={isThemeModalOpen}
      onClose={() => setIsThemeModalOpen(false)}
      theme={activeTheme}
      onUpdateTheme={onUpdateTheme!}
    />
    </>
  );
};
