import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Database,
  Camera,
  MapPin,
  Calendar,
  CloudSun,
  Compass,
  Workflow,
  Feather,
  Lock,
  Network,
  TreeDeciduous,
  GitBranch,
  CheckCircle,
  Lightbulb,
  BookOpen,
  Layers,
  HeartHandshake,
  TrendingUp
} from 'lucide-react';

const heroImage = '/hero-landscape.jpg';

interface LandingPageProps {
  onSignIn: () => void;
  onStartJournal?: () => void;
  isLoading: boolean;
  user?: any;
  errorMessage?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onStartJournal,
  isLoading,
  user,
  errorMessage,
}) => {
  return (
    <div className="min-h-screen bg-[#fbfcfb] text-slate-800 flex flex-col justify-between selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navigation Bar */}
      <header className="mx-auto w-full max-w-5xl flex items-center justify-between px-4 sm:px-8 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center shadow-xs">
            <Compass className="h-5 w-5 text-teal-100" />
          </div>
          <div>
            <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Brainstorm Journal
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                AI Companion
              </span>
            </span>
            <span className="text-[11px] text-slate-500 block font-medium">
              A contemplative space for your thoughts
            </span>
          </div>
        </div>

        <div>
          {user ? (
            <button
              id="landing-open-dashboard-btn"
              onClick={onStartJournal}
              className="px-5 py-2 rounded-full bg-teal-800 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs hover:bg-teal-900 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <span>Open Journal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              id="landing-signin-btn"
              onClick={onSignIn}
              disabled={isLoading}
              className="px-5 py-2 rounded-full bg-white text-slate-800 border border-slate-300 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-2xs hover:bg-slate-50 hover:border-teal-400 transition-all cursor-pointer"
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
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-8 py-4 space-y-12">
        {/* 1. Hero Section with Scenic Landscape Image */}
        <section className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg min-h-[420px] sm:min-h-[480px] flex flex-col justify-end p-6 sm:p-12">
          {/* Scenic Background Image */}
          <img 
            src={heroImage} 
            alt="Scenic mountain valley with a winding turquoise river and a solitary observation bench"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Calming Vignette Gradient for Perfect Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-black/10" />

          {/* Minimal, Appropriate Words in the Hero */}
          <div className="relative z-10 max-w-2xl text-left space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-3.5 py-1 text-xs font-semibold text-white shadow-xs">
              <Feather className="h-3.5 w-3.5 text-teal-300" />
              <span>A sanctuary for your thoughts</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              A quiet place for your thoughts.
            </h1>

            <p className="text-sm sm:text-base text-slate-200 max-w-lg font-normal leading-relaxed">
              Reflect freely, untangle ideas, and watch your thoughts connect.
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
                <p className="text-xs text-rose-300 font-medium bg-rose-950/60 px-3 py-1 rounded-full border border-rose-800">
                  {errorMessage}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 2. Core Idea of the Application & Hackathon Story */}
        <section className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-800">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>The Core Idea</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-snug">
              A personal journal that thinks, questions, and listens with you.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Most digital journals are passive text editors or rigid filing cabinets where thoughts are typed and quickly forgotten. Brainstorming Journal transforms journaling into an active, contemplative dialogue. Powered by Gemini Socratic intelligence, it acts as a calm companion—asking thoughtful, probing questions, reflecting your inner wisdom back to you, and uncovering the deeper meaning beneath everyday thoughts.
            </p>
          </div>

          {/* 3. What More We Are Offering (In Specific Order) */}
          <div className="space-y-6 pt-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-800">
              <Layers className="h-4 w-4 text-teal-600" />
              <span>What More We Are Offering</span>
            </div>

            {/* Feature Pair: Mind Tree & Mind Garden */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mind Tree */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between hover:border-teal-300 transition-colors">
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 block">
                      Connect the Dots
                    </span>
                    <h3 className="font-serif text-xl font-bold text-slate-900 mt-0.5">
                      Mind Tree
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Your thoughts don't exist in isolation. Mind Tree connects related ideas from your journal and shows how one thought can lead to, evolve into, or branch into another.
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Powered by semantic graph intelligence, it surfaces recurring themes, evolutionary milestones, and conceptual bridges across days or months of writing.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-teal-800">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  <span>Answers: &ldquo;How are my thoughts connected?&rdquo;</span>
                </div>
              </div>

              {/* Mind Garden */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between hover:border-emerald-300 transition-colors">
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <TreeDeciduous className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                      The Living Mind Tree
                    </span>
                    <h3 className="font-serif text-xl font-bold text-slate-900 mt-0.5">
                      Mind Garden
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Your entire thinking journey represented as One Living Tree. Root thoughts anchor foundational themes deep into subterranean soil; thoughts travel along the sprawling branches; emergent innovations and creative sparks bloom at the leaves; and results, breakthroughs, and key insights bear fruit as ripe apples.
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The tree breathes with the changing seasons (Spring blossoms, Summer canopy, Autumn harvest, Winter solstice) responding to your journal&apos;s live atmospheric weather context.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Answers: &ldquo;How has my thinking grown?&rdquo;</span>
                </div>
              </div>
            </div>

            {/* The Living Map Summary Callout */}
            <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200/80 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-900">
                <TrendingUp className="h-4 w-4 text-teal-700" />
                <span>The Living Cognitive Map</span>
              </div>
              <h4 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
                Connecting Thoughts + Showing Their Growth
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 max-w-2xl leading-relaxed">
                Together, <strong>Mind Tree</strong> (which connects related ideas) and <strong>Mind Garden</strong> (which reveals how those ideas mature over time) turn your journal into a living map of how your thoughts connect and develop over time.
              </p>
            </div>

            {/* Additional progressive capabilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Thought to Action */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5 hover:border-teal-300 transition-colors">
                <div className="h-9 w-9 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <h4 className="font-serif text-base font-bold text-slate-900">
                  Thought ➔ Action Engine (Strictly Optional)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Reflections do not have to remain purely abstract. When you are ready, synthesize actionable milestones with automatic dependency sequencing and horizontal sub-steps. Thought-to-action remains strictly optional—your thoughts are valuable simply as thoughts.
                </p>
              </div>

              {/* Sensory & Grounded Memory */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5 hover:border-teal-300 transition-colors">
                <div className="h-9 w-9 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <CloudSun className="h-4 w-4" />
                </div>
                <h4 className="font-serif text-base font-bold text-slate-900">
                  Tactile & Atmospheric Memory Grounding
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every entry captures the tactile feeling of the moment: live atmospheric weather tags, location atlas pins, photo snapshots, customizable paper and ink textures (Cream, Parchment, Kraft, Moleskine), and owner-isolated cloud persistence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Curated Companion Features Grid */}
        <section className="space-y-4 pt-2">
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-900">
              Thoughtful Companion Features
            </h2>
            <p className="text-xs text-slate-500">
              Everything designed to support your daily journaling and creative contemplation.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Snapshots */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-start gap-2 hover:border-teal-300 transition-colors">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Snapshots</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Visual memories with photo uploads
                </span>
              </div>
            </div>

            {/* Weather */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-start gap-2 hover:border-amber-300 transition-colors">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <CloudSun className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Weather</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Live atmosphere & temperature
                </span>
              </div>
            </div>

            {/* Atlas Geotags */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-start gap-2 hover:border-rose-300 transition-colors">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Atlas Geotags</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Location coordinates & memory maps
                </span>
              </div>
            </div>

            {/* Calendar */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-start gap-2 hover:border-blue-300 transition-colors">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Calendar</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Chronological timeline & streaks
                </span>
              </div>
            </div>

            {/* Mind Network & Flowchart */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-start gap-2 hover:border-indigo-300 transition-colors">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Workflow className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Connect Dots</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Mind maps & optional flowcharts
                </span>
              </div>
            </div>

            {/* Socratic Partner */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-start gap-2 hover:border-purple-300 transition-colors">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Socratic AI</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Probing prompts & reflections
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Refined Footer */}
      <footer className="mx-auto w-full max-w-5xl px-4 sm:px-8 py-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 mt-8">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-teal-800 font-semibold">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            Cloud Firestore Synced
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            Private & Owner-Bound
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Gemini Socratic AI
          </span>
        </div>
        <p className="text-[11px] opacity-80">© Brainstorm Journal & AI Thought Companion</p>
      </footer>
    </div>
  );
};
