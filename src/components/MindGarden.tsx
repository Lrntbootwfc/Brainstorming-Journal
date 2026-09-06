import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  JournalSession, 
  PaperThemePreference 
} from '../types';
import { getThemeConfig } from '../utils/theme';
import { 
  TreeDeciduous, 
  Sprout, 
  Leaf, 
  Flame, 
  Calendar, 
  Layers, 
  Sparkles, 
  BookOpen, 
  Info,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  CloudSun,
  CloudRain,
  Snowflake,
  Wind,
  Compass,
  X,
  Lightbulb,
  Award,
  Zap,
  Target
} from 'lucide-react';
const livingTreeImg = '/living_mind_tree.jpg';

interface MindGardenProps {
  sessions: JournalSession[];
  theme?: PaperThemePreference;
  onSelectSession?: (session: JournalSession) => void;
}

export type SeasonMode = 'auto' | 'spring' | 'summer' | 'autumn' | 'winter';

export interface RootThoughtData {
  id: string;
  category: string;
  title: string;
  earliestDate: string;
  sessions: JournalSession[];
  x: number;
  y: number;
  trunkX: number;
  trunkY: number;
}

export interface BranchThoughtData {
  id: string;
  sessionId: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  depthScore: number;
  messageCount: number;
  session: JournalSession;
  x: number;
  y: number;
  parentBranchX: number;
  parentBranchY: number;
}

export interface InnovationLeafData {
  id: string;
  sessionId: string;
  title: string;
  sparkText: string;
  date: string;
  category: string;
  session: JournalSession;
  x: number;
  y: number;
  leafAngle: number;
}

export interface FruitResultData {
  id: string;
  sessionId: string;
  type: 'insight' | 'action_breakthrough' | 'milestone';
  title: string;
  description: string;
  date: string;
  session: JournalSession;
  appleX: number;
  appleY: number;
  cardX: number;
  cardY: number;
  side: 'left' | 'right';
  branchX?: number;
  branchY?: number;
  fruitX: number;
  fruitY: number;
  colorGrade: 'ruby' | 'honeycrisp' | 'golden';
}

export type SelectedTreeElement = 
  | { type: 'root_thought'; data: RootThoughtData }
  | { type: 'branch_thought'; data: BranchThoughtData }
  | { type: 'innovation_leaf'; data: InnovationLeafData }
  | { type: 'fruit_result'; data: FruitResultData }
  | { type: 'trunk'; data: { totalSessions: number; firstDate: string; lastDate: string; totalStreak: number } }
  | null;

export const MindGarden: React.FC<MindGardenProps> = ({ 
  sessions, 
  theme,
  onSelectSession 
}) => {
  const themeConfig = getThemeConfig(theme);

  // Viewport container and canvas state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(0.55);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasUserMoved, setHasUserMoved] = useState<boolean>(false);

  // Selected element inspection state
  const [selectedElement, setSelectedElement] = useState<SelectedTreeElement>(null);

  // Season & Weather state
  const [seasonPreference, setSeasonPreference] = useState<SeasonMode>('auto');
  const [isBreezeActive, setIsBreezeActive] = useState<boolean>(true);

  // Canvas dimensions calibrated exactly 2x to photorealistic tree image (896 x 1200)
  const CANVAS_WIDTH = 1792;
  const CANVAS_HEIGHT = 2400;
  const TRUNK_BASE_X = 896;
  const TRUNK_BASE_Y = 1840;
  const TRUNK_MID_Y = 1400;

  // 1. Determine natural season / weather context
  const resolvedSeason = useMemo<'spring' | 'summer' | 'autumn' | 'winter'>(() => {
    if (seasonPreference !== 'auto') {
      return seasonPreference;
    }

    // Check latest session's weather tag if available
    const latestWithWeather = [...sessions].reverse().find(s => Boolean(s.weather));
    if (latestWithWeather && latestWithWeather.weather) {
      const w = latestWithWeather.weather.toLowerCase();
      if (w.includes('rain')) return 'spring';
      if (w.includes('sun') || w.includes('hot')) return 'summer';
      if (w.includes('cloud') || w.includes('wind')) return 'autumn';
      if (w.includes('snow') || w.includes('frost') || w.includes('cold')) return 'winter';
    }

    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }, [seasonPreference, sessions]);

  // Visual Atmosphere Overlay
  const seasonOverlay = useMemo(() => {
    switch (resolvedSeason) {
      case 'spring':
        return {
          name: 'Spring Blossom',
          subtitle: 'Fresh tender growth, blossoming inquiry & morning dew',
          icon: <Sprout className="h-4 w-4 text-emerald-500" />,
          tintColor: 'rgba(74, 222, 128, 0.08)',
          glowColor: '#86efac',
          showParticles: 'petals',
        };
      case 'summer':
        return {
          name: 'Summer Canopy',
          subtitle: 'Lush golden sunlight, full foliage & deep shade',
          icon: <Sun className="h-4 w-4 text-amber-500" />,
          tintColor: 'rgba(250, 204, 21, 0.06)',
          glowColor: '#facc15',
          showParticles: 'sunbeams',
        };
      case 'autumn':
        return {
          name: 'Autumn Harvest',
          subtitle: 'Warm amber tones, ripe fruits of thought & harvest stillness',
          icon: <Wind className="h-4 w-4 text-amber-600" />,
          tintColor: 'rgba(234, 88, 12, 0.09)',
          glowColor: '#f97316',
          showParticles: 'leaves',
        };
      case 'winter':
      default:
        return {
          name: 'Winter Solstice',
          subtitle: 'Crystalline crisp atmosphere, enduring fruits & resting buds',
          icon: <Snowflake className="h-4 w-4 text-sky-400" />,
          tintColor: 'rgba(56, 189, 248, 0.07)',
          glowColor: '#38bdf8',
          showParticles: 'frost',
        };
    }
  }, [resolvedSeason]);

  // 2. Data Mapping: Strict allocation to the user's 4 distinct botanical zones:
  // - Root thoughts near roots
  // - Branch thoughts at branches
  // - Innovations at leaves
  // - Results at fruits
  const {
    rootThoughts,
    branchThoughts,
    innovationLeaves,
    fruitResults,
    totalStreak,
    firstDate,
    lastDate
  } = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return {
        rootThoughts: [],
        branchThoughts: [],
        innovationLeaves: [],
        fruitResults: [],
        totalStreak: 0,
        firstDate: 'Today',
        lastDate: 'Today'
      };
    }

    const sorted = [...sessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const fDate = new Date(sorted[0].createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const lDate = new Date(sorted[sorted.length - 1].createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const uniqueDays = new Set(
      sorted.map((s) => new Date(s.createdAt).toDateString())
    );

    // Group sessions by foundational categories for ROOT THOUGHTS
    const categoryMap = new Map<string, JournalSession[]>();
    sorted.forEach((s) => {
      const cat = s.category || 'Reflective';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat)!.push(s);
    });

    // -------------------------------------------------------------
    // ZONE 1: ROOT THOUGHTS (Anchored deep near the roots in subterranean soil)
    // -------------------------------------------------------------
    const computedRoots: RootThoughtData[] = [];
    const rootCategories = Array.from(categoryMap.keys());
    
    // Spread coordinates beneath ground level in subterranean soil (y: 2000 to 2350)
    const rootPositions = [
      { x: 320,  y: 2160 },   // Deep Left Root
      { x: 580,  y: 2280 },   // Mid-Left Taproot
      { x: 896,  y: 2320 },   // Center Taproot Heart
      { x: 1200, y: 2280 },   // Mid-Right Taproot
      { x: 1480, y: 2160 },   // Deep Right Root
      { x: 440,  y: 2020 },   // Upper-Left Lateral Root
      { x: 1340, y: 2020 },   // Upper-Right Lateral Root
    ];

    rootCategories.forEach((cat, idx) => {
      const sessList = categoryMap.get(cat) || [];
      const pos = rootPositions[idx % rootPositions.length];
      const earliest = new Date(sessList[0].createdAt).toLocaleDateString();

      computedRoots.push({
        id: `root-${cat}`,
        category: cat,
        title: `Root Thought: #${cat}`,
        earliestDate: earliest,
        sessions: sessList,
        x: pos.x,
        y: pos.y,
        trunkX: TRUNK_BASE_X,
        trunkY: TRUNK_BASE_Y,
      });
    });

    // -------------------------------------------------------------
    // ZONE 2: BRANCH THOUGHTS (Placed along the main and secondary branches)
    // -------------------------------------------------------------
    // Branch locations along trunk and spreading boughs (y: 950 to 1600, x: 340 to 1500)
    const branchPositions = [
      // Left major boughs
      { x: 380,  y: 1360, parentX: 780,  parentY: 1480 },
      { x: 520,  y: 1220, parentX: 780,  parentY: 1480 },
      { x: 680,  y: 1120, parentX: 860,  parentY: 1380 },
      // Center trunk / upper boughs
      { x: 820,  y: 920,  parentX: 896,  parentY: 1250 },
      { x: 960,  y: 840,  parentX: 896,  parentY: 1180 },
      { x: 1080, y: 920,  parentX: 896,  parentY: 1250 },
      // Right major boughs
      { x: 1180, y: 1120, parentX: 960,  parentY: 1380 },
      { x: 1320, y: 1220, parentX: 1040, parentY: 1480 },
      { x: 1460, y: 1360, parentX: 1040, parentY: 1480 },
      // Secondary bough splits
      { x: 560,  y: 1040, parentX: 680,  parentY: 1120 },
      { x: 1260, y: 1040, parentX: 1180, parentY: 1120 },
    ];

    const computedBranches: BranchThoughtData[] = [];
    sorted.forEach((s, idx) => {
      const pos = branchPositions[idx % branchPositions.length];
      // Offset slightly for recurring nodes on same branch
      const jitterX = (Math.floor(idx / branchPositions.length)) * 28 * (idx % 2 === 0 ? 1 : -1);
      const jitterY = (Math.floor(idx / branchPositions.length)) * 20;

      const msgCount = s.messages ? s.messages.length : 1;
      const depthScore = Math.min(Math.ceil(msgCount / 2), 4);

      computedBranches.push({
        id: `branch-thought-${s.id}`,
        sessionId: s.id,
        title: s.title || 'Thought of Reflection',
        date: new Date(s.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        }),
        category: s.category || 'Reflective',
        summary: s.summary || s.messages?.[0]?.content || 'Thought reflection along the branch',
        depthScore,
        messageCount: msgCount,
        session: s,
        x: pos.x + jitterX,
        y: pos.y + jitterY,
        parentBranchX: pos.parentX,
        parentBranchY: pos.parentY
      });
    });

    // -------------------------------------------------------------
    // ZONE 3: INNOVATIONS AT LEAVES (Emerging sparks, creative brainstorms)
    // -------------------------------------------------------------
    // Located throughout the canopy foliage: y: 350 to 850
    const leafCanopyPositions = [
      { x: 380,  y: 720,  angle: -20 },
      { x: 560,  y: 580,  angle: -10 },
      { x: 740,  y: 460,  angle: -5 },
      { x: 896,  y: 400,  angle: 0 },
      { x: 1060, y: 460,  angle: 5 },
      { x: 1240, y: 580,  angle: 15 },
      { x: 1420, y: 720,  angle: 25 },
      { x: 460,  y: 840,  angle: -15 },
      { x: 660,  y: 690,  angle: -8 },
      { x: 1140, y: 690,  angle: 8 },
      { x: 1360, y: 840,  angle: 20 },
    ];

    const computedInnovations: InnovationLeafData[] = [];
    // Prioritize Brainstorm / Projects sessions, or sessions with creative tags, or recent creative thoughts
    const innovativeSessions = sorted.filter(
      s => s.category === 'Brainstorm' || s.category === 'Projects' || (s.tags && s.tags.length > 0)
    );
    const poolForInnovations = innovativeSessions.length > 0 ? innovativeSessions : sorted;

    poolForInnovations.forEach((s, idx) => {
      const pos = leafCanopyPositions[idx % leafCanopyPositions.length];
      const spark = s.keyInsights?.[0] || s.summary || s.title || 'Creative innovation sparked in reflection';

      computedInnovations.push({
        id: `leaf-innovation-${s.id}`,
        sessionId: s.id,
        title: s.title || 'Emergent Idea',
        sparkText: spark,
        date: new Date(s.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        }),
        category: s.category || 'Brainstorm',
        session: s,
        x: pos.x,
        y: pos.y,
        leafAngle: pos.angle
      });
    });

    // -------------------------------------------------------------
    // ZONE 4: RESULTS AT FRUITS (Positioned beside the already existing apples in the image)
    // -------------------------------------------------------------
    // Coordinates of all photorealistic red apples present in living_mind_tree.jpg (896x1200 * 2)
    const REAL_APPLE_POSITIONS = [
      { appleX: 1324, appleY: 568, side: 'left' as const },   // prominent mid-right bough apple
      { appleX: 570,  appleY: 608, side: 'right' as const },  // prominent mid-left bough apple
      { appleX: 224,  appleY: 742, side: 'right' as const },  // lower-left bough apple
      { appleX: 264,  appleY: 568, side: 'right' as const },  // outer-left bough apple
      { appleX: 1442, appleY: 672, side: 'left' as const },   // lower-right bough apple
      { appleX: 1472, appleY: 446, side: 'left' as const },   // upper-right bough apple
      { appleX: 1056, appleY: 252, side: 'right' as const },  // high crown center-right
      { appleX: 848,  appleY: 334, side: 'left' as const },   // crown center-left
      { appleX: 1324, appleY: 680, side: 'left' as const },   // mid-lower right bough
      { appleX: 1596, appleY: 570, side: 'left' as const },   // far-right bough
      { appleX: 1130, appleY: 502, side: 'right' as const },  // center-right bough
      { appleX: 1326, appleY: 346, side: 'left' as const },   // high right bough
      { appleX: 500,  appleY: 356, side: 'right' as const },  // high left bough
      { appleX: 492,  appleY: 658, side: 'right' as const },  // mid-left lower bough
      { appleX: 880,  appleY: 546, side: 'right' as const },  // center bough fork
      { appleX: 958,  appleY: 342, side: 'left' as const },   // upper center bough
      { appleX: 348,  appleY: 676, side: 'right' as const },  // left outer bough
      { appleX: 754,  appleY: 396, side: 'left' as const },   // upper left-center
      { appleX: 1648, appleY: 674, side: 'left' as const },   // far-right outer
    ];

    const computeFruitPlacement = (slot: number) => {
      const pos = REAL_APPLE_POSITIONS[slot % REAL_APPLE_POSITIONS.length];
      const cardWidth = 236;
      const cardX = pos.side === 'left' ? pos.appleX - cardWidth - 14 : pos.appleX + 26;
      const cardY = pos.appleY - 32;
      return {
        appleX: pos.appleX,
        appleY: pos.appleY,
        cardX,
        cardY,
        side: pos.side,
        fruitX: pos.appleX,
        fruitY: pos.appleY,
      };
    };

    const computedResults: FruitResultData[] = [];
    let fruitSlot = 0;

    sorted.forEach((session) => {
      // 1. Synthesized Key Insights -> Results!
      if (session.keyInsights && session.keyInsights.length > 0) {
        session.keyInsights.forEach((insight) => {
          const placement = computeFruitPlacement(fruitSlot);
          fruitSlot++;
          computedResults.push({
            id: `result-insight-${session.id}-${fruitSlot}`,
            sessionId: session.id,
            type: 'insight',
            title: `Key Insight: ${insight.slice(0, 48)}${insight.length > 48 ? '...' : ''}`,
            description: insight,
            date: new Date(session.createdAt).toLocaleDateString(),
            session,
            ...placement,
            colorGrade: 'ruby'
          });
        });
      }

      // 2. Completed Action Items -> Results!
      if (session.structuredTasks) {
        const completed = session.structuredTasks.filter(t => t.isCompleted || t.status === 'completed');
        completed.forEach((task) => {
          const placement = computeFruitPlacement(fruitSlot);
          fruitSlot++;
          computedResults.push({
            id: `result-action-${session.id}-${task.id}`,
            sessionId: session.id,
            type: 'action_breakthrough',
            title: `Action Breakthrough: ${task.text.slice(0, 48)}`,
            description: task.text,
            date: new Date(session.createdAt).toLocaleDateString(),
            session,
            ...placement,
            colorGrade: 'honeycrisp'
          });
        });
      }

      // 3. High Depth Reflection Breakthroughs (if no insights or tasks yet)
      const msgCount = session.messages ? session.messages.length : 1;
      if (msgCount >= 5 && (!session.keyInsights || session.keyInsights.length === 0)) {
        const placement = computeFruitPlacement(fruitSlot);
        fruitSlot++;
        computedResults.push({
          id: `result-depth-${session.id}`,
          sessionId: session.id,
          type: 'milestone',
          title: `Result of Deep Contemplation: ${session.title || 'Matured Reflection'}`,
          description: session.summary || 'A rich, deep inquiry that uncovered personal clarity and direction.',
          date: new Date(session.createdAt).toLocaleDateString(),
          session,
          ...placement,
          colorGrade: 'golden'
        });
      }
    });

    return {
      rootThoughts: computedRoots,
      branchThoughts: computedBranches,
      innovationLeaves: computedInnovations,
      fruitResults: computedResults,
      totalStreak: uniqueDays.size,
      firstDate: fDate,
      lastDate: lDate
    };
  }, [sessions]);

  // Initial centering on mid-tree canopy and main boughs
  useEffect(() => {
    if (!containerRef.current || hasUserMoved) return;
    const rect = containerRef.current.getBoundingClientRect();
    const initialZoom = rect.width < 768 ? 0.38 : 0.52;
    const initialPanX = rect.width / 2 - TRUNK_BASE_X * initialZoom;
    const initialPanY = rect.height / 2 - 1200 * initialZoom;

    setZoom(initialZoom);
    setPan({ x: initialPanX, y: initialPanY });
  }, [hasUserMoved]);

  // Drag-to-Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setHasUserMoved(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile/tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
      setHasUserMoved(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Smooth wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setHasUserMoved(true);
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.32), 2.2);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setZoom(newZoom);
    }
  };

  // Camera jump presets corresponding strictly to the 4 requested zones
  const jumpToZone = (zone: 'results' | 'innovations' | 'branches' | 'roots' | 'all') => {
    if (!containerRef.current) return;
    setHasUserMoved(true);
    const rect = containerRef.current.getBoundingClientRect();

    switch (zone) {
      case 'results':
        setZoom(0.8);
        setPan({
          x: rect.width / 2 - 896 * 0.8,
          y: rect.height / 2 - 580 * 0.8
        });
        break;
      case 'innovations':
        setZoom(0.78);
        setPan({
          x: rect.width / 2 - 896 * 0.78,
          y: rect.height / 2 - 620 * 0.78
        });
        break;
      case 'branches':
        setZoom(0.72);
        setPan({
          x: rect.width / 2 - 896 * 0.72,
          y: rect.height / 2 - 1200 * 0.72
        });
        break;
      case 'roots':
        setZoom(0.72);
        setPan({
          x: rect.width / 2 - 896 * 0.72,
          y: rect.height / 2 - 2160 * 0.72
        });
        break;
      case 'all':
      default:
        const fullZoom = Math.min(rect.width / CANVAS_WIDTH, rect.height / CANVAS_HEIGHT) * 0.95;
        setZoom(fullZoom);
        setPan({
          x: rect.width / 2 - 896 * fullZoom,
          y: rect.height / 2 - 1200 * fullZoom
        });
        break;
    }
  };

  return (
    <div 
      className="relative w-full h-full min-h-[680px] flex flex-col lg:flex-row overflow-hidden select-none"
      style={{ backgroundColor: themeConfig.bg, color: themeConfig.inkColor }}
    >
      {/* ========================================================== */}
      {/* 80% SECTION: UNOBSCURED LIVING TREE CANVAS VIEWPORT        */}
      {/* Zero overlay bars or pills hiding any part of the tree     */}
      {/* ========================================================== */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="w-full lg:w-[80%] h-[550px] lg:h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-slate-950/90 flex-1 shrink-0"
      >
        {/* Living Tree Coordinate Layer (Transformable) */}
        <div
          style={{
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.08s ease-out'
          }}
          className="absolute top-0 left-0 relative select-none"
        >
          {/* 1. PHOTOREALISTIC LIVING TREE IMAGE BACKDROP */}
          <img 
            src={livingTreeImg}
            alt="The Living Mind Tree"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-2xl shadow-2xl"
          />

          {/* 2. ATMOSPHERIC SEASONAL LIGHTING & DEPTH OVERLAYS */}
          <div 
            className="absolute inset-0 pointer-events-none transition-colors duration-700"
            style={{ backgroundColor: seasonOverlay.tintColor }}
          />

          {/* Calming Vignette for Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

          {/* 3. INTERACTIVE SVG OVERLAY FOR EXACT BOTANICAL ZONES */}
          <svg
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            className="absolute inset-0 w-full h-full pointer-events-auto"
          >
            <defs>
              {/* Glowing Drop Shadows */}
              <filter id="fruitGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#dc2626" floodOpacity="0.45" />
              </filter>
              <filter id="leafGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10b981" floodOpacity="0.45" />
              </filter>
              <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* ========================================================== */}
            {/* ZONE 1: ROOT THOUGHTS (Near the roots underground)        */}
            {/* ========================================================== */}
            <g id="zone-root-thoughts">
              {rootThoughts.map((root) => {
                const isSelected = selectedElement?.type === 'root_thought' && selectedElement.data.id === root.id;
                return (
                  <g 
                    key={root.id}
                    className="cursor-pointer group"
                  >
                    {/* Organic root sap connection line to trunk base */}
                    <path
                      d={`M ${root.trunkX} ${root.trunkY} Q ${(root.trunkX + root.x) / 2} ${(root.trunkY + root.y) / 2 + 50}, ${root.x} ${root.y}`}
                      stroke={isSelected ? "#f59e0b" : "rgba(217, 119, 6, 0.45)"}
                      strokeWidth={isSelected ? "4" : "2.5"}
                      strokeDasharray="6,4"
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all group-hover:stroke-amber-400 group-hover:stroke-[3.5]"
                    />

                    {/* Root Nodule Anchor Circle */}
                    <circle
                      cx={root.x}
                      cy={root.y}
                      r={isSelected ? "14" : "10"}
                      fill={isSelected ? "#f59e0b" : "#d97706"}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement({ type: 'root_thought', data: root });
                      }}
                      className="transition-transform group-hover:scale-125"
                    />

                    {/* Thought Card beside the Root */}
                    <foreignObject
                      x={root.x - 110}
                      y={root.y + 18}
                      width="220"
                      height="82"
                      className="overflow-visible"
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement({ type: 'root_thought', data: root });
                        }}
                        className={`p-2.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-950/95 border-amber-400 ring-2 ring-amber-400/50 scale-105' 
                            : 'bg-stone-950/85 hover:bg-amber-950/95 border-amber-600/40 hover:border-amber-400/80 hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                            <span>🌱</span> Root Thought
                          </span>
                          <span className="text-[10px] text-amber-200/60 font-medium">
                            {root.sessions.length} entr{root.sessions.length > 1 ? 'ies' : 'y'}
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-amber-100 leading-snug truncate">
                          #{root.category}
                        </p>
                        <p className="text-[11px] text-amber-200/75 leading-tight truncate mt-0.5">
                          Rooted since {root.earliestDate}
                        </p>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>

            {/* Central Trunk Timeline Hotspot */}
            <g 
              id="trunk-hotspot"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement({
                  type: 'trunk',
                  data: {
                    totalSessions: sessions.length,
                    firstDate,
                    lastDate,
                    totalStreak
                  }
                });
              }}
              className="cursor-pointer group"
            >
              <g transform={`translate(${TRUNK_BASE_X}, ${TRUNK_MID_Y})`}>
                <rect
                  x="-90"
                  y="-15"
                  width="180"
                  height="30"
                  rx="15"
                  fill="rgba(30, 20, 15, 0.9)"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  filter="url(#badgeShadow)"
                  className="transition-all group-hover:scale-105"
                />
                <text
                  textAnchor="middle"
                  y="5.5"
                  fontSize="11.5"
                  fontWeight="bold"
                  fill="#fef3c7"
                >
                  🪵 Thinking Spine ({sessions.length} Thoughts)
                </text>
              </g>
            </g>

            {/* ========================================================== */}
            {/* ZONE 2: BRANCH THOUGHTS (At branches along the limbs)      */}
            {/* ========================================================== */}
            <g id="zone-branch-thoughts">
              {branchThoughts.map((b) => {
                const isSelected = selectedElement?.type === 'branch_thought' && selectedElement.data.id === b.id;
                return (
                  <g 
                    key={b.id}
                    className="cursor-pointer group"
                  >
                    {/* Branch Connection Tendril */}
                    <line
                      x1={b.parentBranchX}
                      y1={b.parentBranchY}
                      x2={b.x}
                      y2={b.y}
                      stroke={isSelected ? "#0d9488" : "rgba(255,255,255,0.4)"}
                      strokeWidth={isSelected ? "3" : "1.8"}
                      strokeLinecap="round"
                      className="transition-all group-hover:stroke-teal-400"
                    />

                    {/* Branch Node Pin */}
                    <circle
                      cx={b.x}
                      cy={b.y}
                      r={isSelected ? "11" : "8"}
                      fill={isSelected ? "#0d9488" : "#0f766e"}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement({ type: 'branch_thought', data: b });
                      }}
                      className="transition-transform group-hover:scale-125"
                    />

                    {/* Thought Card beside the Branch */}
                    <foreignObject
                      x={b.x - 110}
                      y={b.y - 88}
                      width="220"
                      height="82"
                      className="overflow-visible"
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement({ type: 'branch_thought', data: b });
                        }}
                        className={`p-2.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-teal-950/95 border-teal-400 ring-2 ring-teal-400/50 scale-105' 
                            : 'bg-stone-950/85 hover:bg-teal-950/95 border-teal-600/40 hover:border-teal-400/80 hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1">
                            <span>🌿</span> #{b.category}
                          </span>
                          <span className="text-[10px] text-teal-200/60 font-medium">
                            {b.date}
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-white leading-snug truncate">
                          {b.title}
                        </p>
                        <p className="text-[11px] text-teal-100/75 leading-tight line-clamp-2 mt-0.5">
                          {b.summary}
                        </p>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>

            {/* ========================================================== */}
            {/* ZONE 3: INNOVATIONS AT LEAVES (Among the canopy foliage)   */}
            {/* ========================================================== */}
            <g id="zone-innovations-leaves">
              {innovationLeaves.map((leaf) => {
                const isSelected = selectedElement?.type === 'innovation_leaf' && selectedElement.data.id === leaf.id;
                return (
                  <g 
                    key={leaf.id}
                    className="cursor-pointer group"
                  >
                    {/* Glowing Leaf Beacon at Foliage */}
                    <g 
                      transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.leafAngle})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement({ type: 'innovation_leaf', data: leaf });
                      }}
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r="14"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2"
                        opacity="0.6"
                        className="animate-ping"
                      />
                      <path
                        d="M 0 0 C -10 -14, -14 -28, 0 -38 C 14 -28, 10 -14, 0 0 Z"
                        fill={isSelected ? "#10b981" : "#059669"}
                        stroke="#ecfdf5"
                        strokeWidth="1.8"
                        filter="url(#leafGlow)"
                        className="transition-transform group-hover:scale-125"
                      />
                    </g>

                    {/* Thought Card beside the Leaf */}
                    <foreignObject
                      x={leaf.x - 110}
                      y={leaf.y + 14}
                      width="220"
                      height="82"
                      className="overflow-visible"
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement({ type: 'innovation_leaf', data: leaf });
                        }}
                        className={`p-2.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-950/95 border-emerald-400 ring-2 ring-emerald-400/50 scale-105' 
                            : 'bg-stone-950/85 hover:bg-emerald-950/95 border-emerald-600/40 hover:border-emerald-400/80 hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                            <span>🍃</span> Innovation
                          </span>
                          <span className="text-[10px] text-emerald-200/60 font-medium">
                            #{leaf.category}
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-emerald-100 leading-snug truncate">
                          {leaf.title}
                        </p>
                        <p className="text-[11px] text-emerald-200/75 leading-tight line-clamp-2 mt-0.5">
                          {leaf.sparkText}
                        </p>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>

            {/* ========================================================== */}
            {/* ZONE 4: RESULTS AT FRUITS (Beside the apples in the image) */}
            {/* ========================================================== */}
            <g id="zone-results-fruits">
              {fruitResults.map((fruit) => {
                const isSelected = selectedElement?.type === 'fruit_result' && selectedElement.data.id === fruit.id;
                const leadLineStartX = fruit.side === 'left' ? fruit.cardX + 236 : fruit.cardX;
                const leadLineStartY = fruit.cardY + 36;

                return (
                  <g 
                    key={fruit.id}
                    className="cursor-pointer group"
                  >
                    {/* Subtle connector tendril from the real apple in the photo to the thought card */}
                    <path
                      d={`M ${fruit.appleX} ${fruit.appleY} Q ${(fruit.appleX + leadLineStartX) / 2} ${(fruit.appleY + leadLineStartY) / 2 - 10}, ${leadLineStartX} ${leadLineStartY}`}
                      stroke={isSelected ? "#ef4444" : "rgba(239, 68, 68, 0.45)"}
                      strokeWidth={isSelected ? "2.5" : "1.6"}
                      strokeDasharray="4,3"
                      fill="none"
                      className="transition-all group-hover:stroke-red-400 group-hover:stroke-[2]"
                    />

                    {/* Subtle focus indicator on the real apple in the background photo */}
                    <circle
                      cx={fruit.appleX}
                      cy={fruit.appleY}
                      r={isSelected ? "18" : "13"}
                      fill="rgba(220, 38, 38, 0.15)"
                      stroke={isSelected ? "#ffffff" : "rgba(239, 68, 68, 0.75)"}
                      strokeWidth={isSelected ? "2.5" : "1.6"}
                      strokeDasharray={isSelected ? "none" : "3,2"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement({ type: 'fruit_result', data: fruit });
                      }}
                      className="transition-all group-hover:stroke-red-300 group-hover:scale-110"
                    />
                    <circle 
                      cx={fruit.appleX} 
                      cy={fruit.appleY} 
                      r="3.5" 
                      fill={isSelected ? "#ffffff" : "#ef4444"} 
                    />

                    {/* Appropriately sized thought card beside the apple */}
                    <foreignObject
                      x={fruit.cardX}
                      y={fruit.cardY}
                      width="240"
                      height="96"
                      className="overflow-visible"
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement({ type: 'fruit_result', data: fruit });
                        }}
                        className={`p-2.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-stone-950/95 border-red-500 ring-2 ring-red-400/50 scale-105' 
                            : 'bg-stone-950/85 hover:bg-stone-950/95 border-red-500/40 hover:border-red-400/80 hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-rose-300">
                            <span>🍎</span>
                            <span>{fruit.type === 'insight' ? 'Key Insight' : fruit.type === 'action_breakthrough' ? 'Action Breakthrough' : 'Fruit Result'}</span>
                          </span>
                          <span className="text-[10px] text-stone-400 shrink-0 font-medium">
                            {fruit.date}
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-white leading-snug line-clamp-2">
                          {fruit.title}
                        </p>
                        <p className="text-[11.5px] text-stone-300/90 leading-tight line-clamp-2 mt-1">
                          {fruit.description}
                        </p>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Empty Sessions State */}
        {sessions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6 z-10">
            <div 
              className="max-w-md p-8 rounded-3xl border text-center shadow-2xl pointer-events-auto backdrop-blur-md space-y-4"
              style={{ backgroundColor: `${themeConfig.paperCardBg}f2`, borderColor: themeConfig.border }}
            >
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Sprout className="h-8 w-8 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-bold">Your Living Tree Awaits Thoughts</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  As you record reflections, core themes root underground, thoughts travel the branches, innovations bloom at the leaves, and breakthroughs bear fruit as ripe apples.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================== */}
      {/* 20% SECTION: RIGHT-SIDE VERTICAL DETAILS & CONTROLS PANEL  */}
      {/* Houses All Presets, Controls, Legend, and Inspector Data   */}
      {/* ========================================================== */}
      <div 
        className="w-full lg:w-[20%] lg:min-w-[270px] max-w-full lg:max-w-[340px] h-auto lg:h-full border-t lg:border-t-0 lg:border-l flex flex-col justify-between overflow-y-auto z-20 shrink-0 p-3.5 sm:p-4 space-y-4 shadow-sm"
        style={{ 
          backgroundColor: themeConfig.paperCardBg, 
          borderColor: themeConfig.border,
          color: themeConfig.inkColor 
        }}
      >
        <div className="space-y-3.5">
          {/* Header & Seasonal Atmosphere Card */}
          <div 
            className="p-3 rounded-2xl border space-y-2.5 shadow-xs" 
            style={{ borderColor: themeConfig.border, backgroundColor: themeConfig.paperBg }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-black/5">
                  {seasonOverlay.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">{seasonOverlay.name}</h4>
                  <p className="text-[10px] opacity-65 leading-tight">{seasonOverlay.subtitle}</p>
                </div>
              </div>

              {/* Breeze Wind Toggle Button */}
              <button
                onClick={() => setIsBreezeActive(!isBreezeActive)}
                title={isBreezeActive ? "Gentle canopy breeze active" : "Canopy still"}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
                  isBreezeActive ? 'bg-amber-500/15 text-amber-800 border-amber-400/50' : 'opacity-50 hover:opacity-100 border-transparent'
                }`}
              >
                <Wind className={`h-3.5 w-3.5 ${isBreezeActive ? 'animate-pulse text-amber-600' : ''}`} />
                <span className="text-[10px] hidden sm:inline">{isBreezeActive ? 'Breeze' : 'Still'}</span>
              </button>
            </div>

            {/* Season Selector */}
            <div className="flex items-center gap-1 pt-1 border-t" style={{ borderColor: themeConfig.border }}>
              {(['auto', 'spring', 'summer', 'autumn', 'winter'] as SeasonMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSeasonPreference(mode)}
                  className={`flex-1 py-1 text-[10px] font-bold capitalize rounded-md transition-all cursor-pointer ${
                    seasonPreference === mode 
                      ? 'bg-black/10 shadow-xs font-black' 
                      : 'opacity-50 hover:opacity-90 hover:bg-black/5'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom & Viewport Controls */}
          <div 
            className="flex items-center justify-between p-2.5 rounded-2xl border shadow-xs" 
            style={{ borderColor: themeConfig.border, backgroundColor: themeConfig.paperBg }}
          >
            <span className="text-[11px] font-bold opacity-75 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-teal-700" />
              <span>Canvas View</span>
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono opacity-65 font-bold mr-1">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => { setHasUserMoved(true); setZoom(z => Math.min(z * 1.25, 2.2)); }}
                title="Zoom In"
                className="p-1.5 rounded-lg hover:bg-black/10 transition-all cursor-pointer border shadow-xs"
                style={{ borderColor: themeConfig.border }}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setHasUserMoved(true); setZoom(z => Math.max(z * 0.8, 0.32)); }}
                title="Zoom Out"
                className="p-1.5 rounded-lg hover:bg-black/10 transition-all cursor-pointer border shadow-xs"
                style={{ borderColor: themeConfig.border }}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => jumpToZone('all')}
                title="Reset View"
                className="p-1.5 rounded-lg hover:bg-black/10 transition-all cursor-pointer border shadow-xs"
                style={{ borderColor: themeConfig.border }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Botanical Zone Jump Presets (Exact elements from user screenshot) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block px-1">
              Tree Zones & Jump Presets
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button 
                onClick={() => jumpToZone('results')}
                className="w-full px-3 py-2 rounded-xl border text-left text-xs font-bold transition-all hover:bg-red-500/10 cursor-pointer flex items-center justify-between text-red-700 shadow-xs"
                style={{ borderColor: 'rgba(239, 68, 68, 0.35)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
              >
                <span className="flex items-center gap-1.5">
                  <span>🍎</span>
                  <span>Results (Fruits)</span>
                </span>
                <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                  {fruitResults.length}
                </span>
              </button>

              <button 
                onClick={() => jumpToZone('innovations')}
                className="w-full px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all hover:bg-emerald-500/10 cursor-pointer flex items-center justify-between text-emerald-800 shadow-xs"
                style={{ borderColor: 'rgba(16, 185, 129, 0.35)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}
              >
                <span className="flex items-center gap-1.5">
                  <span>🍃</span>
                  <span>Innovations (Leaves)</span>
                </span>
                <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {innovationLeaves.length}
                </span>
              </button>

              <button 
                onClick={() => jumpToZone('branches')}
                className="w-full px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all hover:bg-teal-500/10 cursor-pointer flex items-center justify-between text-teal-900 shadow-xs"
                style={{ borderColor: 'rgba(13, 148, 136, 0.35)', backgroundColor: 'rgba(13, 148, 136, 0.05)' }}
              >
                <span className="flex items-center gap-1.5">
                  <span>🌿</span>
                  <span>Thoughts (Branches)</span>
                </span>
                <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  {branchThoughts.length}
                </span>
              </button>

              <button 
                onClick={() => jumpToZone('roots')}
                className="w-full px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all hover:bg-amber-500/10 cursor-pointer flex items-center justify-between text-amber-900 shadow-xs"
                style={{ borderColor: 'rgba(217, 119, 6, 0.35)', backgroundColor: 'rgba(217, 119, 6, 0.05)' }}
              >
                <span className="flex items-center gap-1.5">
                  <span>🌱</span>
                  <span>Root Thoughts (Roots)</span>
                </span>
                <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {rootThoughts.length}
                </span>
              </button>

              <button 
                onClick={() => jumpToZone('all')}
                className="w-full px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all hover:bg-black/5 cursor-pointer flex items-center justify-between opacity-85 shadow-xs"
                style={{ borderColor: themeConfig.border, backgroundColor: themeConfig.paperBg }}
              >
                <span className="flex items-center gap-1.5">
                  <span>🌳</span>
                  <span>Whole Tree (Full View)</span>
                </span>
                <span className="text-[10.5px] opacity-60">
                  {sessions.length} nodes
                </span>
              </button>
            </div>
          </div>

          {/* Botanical 4-Zone Legend (Exact elements from user screenshot) */}
          <div 
            className="p-3 rounded-2xl border space-y-2 text-xs shadow-xs" 
            style={{ borderColor: themeConfig.border, backgroundColor: themeConfig.paperBg }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              Zone Guide
            </span>
            <div className="space-y-1.5 text-[11px] leading-snug">
              <div className="flex items-center gap-2 text-amber-900">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-600 shrink-0" />
                <span><strong>Roots:</strong> Core Thoughts & Grounding</span>
              </div>
              <div className="flex items-center gap-2 text-teal-900">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-600 shrink-0" />
                <span><strong>Branches:</strong> Lines of Inquiry</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-900">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span><strong>Leaves:</strong> Emergent Innovations</span>
              </div>
              <div className="flex items-center gap-2 text-red-800 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 shrink-0" />
                <span><strong>Fruits:</strong> Tangible Results & Insights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Element Detail Inspector OR Mind Tree Insights */}
        <div className="pt-2 border-t" style={{ borderColor: themeConfig.border }}>
          {selectedElement ? (
            <div className="space-y-3">
              {/* Header with Close */}
              <div className="flex items-center justify-between gap-1">
                <div>
                  {selectedElement.type === 'fruit_result' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                      🍎 Result at Fruit
                    </span>
                  )}
                  {selectedElement.type === 'innovation_leaf' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      🍃 Innovation at Leaf
                    </span>
                  )}
                  {selectedElement.type === 'branch_thought' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300">
                      🌿 Branch Thought
                    </span>
                  )}
                  {selectedElement.type === 'root_thought' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      🌱 Root Thought
                    </span>
                  )}
                  {selectedElement.type === 'trunk' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-900 border border-stone-300">
                      🪵 Thinking Spine
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSelectedElement(null)}
                  className="p-1 rounded-full hover:bg-black/10 opacity-60 hover:opacity-100 transition-all cursor-pointer"
                  title="Close Details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Inspected Content */}
              {selectedElement.type === 'fruit_result' && (
                <div className="space-y-2.5">
                  <div>
                    <h4 className="font-serif text-sm font-bold text-red-900 leading-tight">
                      {selectedElement.data.title}
                    </h4>
                    <p className="text-[10px] opacity-60 mt-0.5">{selectedElement.data.date}</p>
                  </div>
                  <div 
                    className="p-2.5 rounded-xl border text-[11px] leading-relaxed" 
                    style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                  >
                    {selectedElement.data.description}
                  </div>
                  {onSelectSession && (
                    <button
                      onClick={() => onSelectSession(selectedElement.data.session)}
                      className="w-full py-2 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 transition-all cursor-pointer"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Open Journal Reflection</span>
                    </button>
                  )}
                </div>
              )}

              {selectedElement.type === 'innovation_leaf' && (
                <div className="space-y-2.5">
                  <div>
                    <h4 className="font-serif text-sm font-bold text-emerald-950 leading-tight">
                      {selectedElement.data.title}
                    </h4>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                      #{selectedElement.data.category} • {selectedElement.data.date}
                    </p>
                  </div>
                  <div 
                    className="p-2.5 rounded-xl border text-[11px] leading-relaxed" 
                    style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                  >
                    {selectedElement.data.sparkText}
                  </div>
                  {onSelectSession && (
                    <button
                      onClick={() => onSelectSession(selectedElement.data.session)}
                      className="w-full py-2 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 transition-all cursor-pointer"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Explore Idea Reflection</span>
                    </button>
                  )}
                </div>
              )}

              {selectedElement.type === 'branch_thought' && (
                <div className="space-y-2.5">
                  <div>
                    <h4 className="font-serif text-sm font-bold text-teal-950 leading-tight">
                      {selectedElement.data.title}
                    </h4>
                    <p className="text-[10px] text-teal-800 font-semibold mt-0.5">
                      #{selectedElement.data.category} • {selectedElement.data.date}
                    </p>
                  </div>
                  <p className="text-[11px] opacity-80 line-clamp-3 leading-relaxed">
                    {selectedElement.data.summary}
                  </p>
                  {onSelectSession && (
                    <button
                      onClick={() => onSelectSession(selectedElement.data.session)}
                      className="w-full py-2 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 transition-all cursor-pointer"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Revisit Reflection</span>
                    </button>
                  )}
                </div>
              )}

              {selectedElement.type === 'root_thought' && (
                <div className="space-y-2.5">
                  <div>
                    <h4 className="font-serif text-sm font-bold text-amber-950 leading-tight">
                      {selectedElement.data.title}
                    </h4>
                    <p className="text-[10px] opacity-65 mt-0.5">
                      {selectedElement.data.sessions.length} rooted entries • Since {selectedElement.data.earliestDate}
                    </p>
                  </div>
                  <p className="text-[11px] opacity-80 leading-relaxed">
                    Foundational anchor in <strong>#{selectedElement.data.category}</strong>.
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {selectedElement.data.sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onSelectSession && onSelectSession(s)}
                        className="w-full text-left p-1.5 rounded-lg border text-[10.5px] flex items-center justify-between hover:bg-black/5 transition-all cursor-pointer truncate"
                        style={{ borderColor: themeConfig.border }}
                      >
                        <span className="truncate font-medium">{s.title || 'Untitled'}</span>
                        <span className="text-[9.5px] opacity-60 ml-1 shrink-0">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedElement.type === 'trunk' && (
                <div className="space-y-2.5">
                  <h4 className="font-serif text-sm font-bold leading-tight">The Living Spine</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div 
                      className="p-2 rounded-xl border text-center" 
                      style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                    >
                      <span className="text-[9px] uppercase font-bold opacity-60 block">Thoughts</span>
                      <span className="text-sm font-bold text-teal-800">{selectedElement.data.totalSessions}</span>
                    </div>
                    <div 
                      className="p-2 rounded-xl border text-center" 
                      style={{ backgroundColor: themeConfig.paperBg, borderColor: themeConfig.border }}
                    >
                      <span className="text-[9px] uppercase font-bold opacity-60 block">Streak</span>
                      <span className="text-sm font-bold text-emerald-700">{selectedElement.data.totalStreak} Days</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="space-y-2 text-center p-3 rounded-2xl border shadow-xs" 
              style={{ borderColor: themeConfig.border, backgroundColor: themeConfig.paperBg }}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-bold text-teal-800">{sessions.length} Thoughts</span>
                <span className="opacity-40">•</span>
                <span className="text-xs font-bold text-emerald-700">{totalStreak} Days Active</span>
              </div>
              <p className="text-[10.5px] opacity-65 leading-tight">
                Click any root, branch, leaf, or fruit on the tree to inspect details here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
