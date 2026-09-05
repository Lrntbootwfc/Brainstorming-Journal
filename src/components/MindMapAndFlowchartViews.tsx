import React, { useMemo, useState, useRef } from 'react';
import { MindMapNode, FlowchartData, FlowchartNode, IdeaNode, JournalSession, ActionItem } from '../types';
import { 
  Network, 
  Workflow, 
  ExternalLink, 
  CheckCircle2, 
  HelpCircle, 
  Flag, 
  ArrowDown, 
  ArrowRight,
  Sparkles, 
  Layers, 
  Compass, 
  ChevronRight,
  Lightbulb,
  Calendar,
  Clock,
  CheckCircle,
  Circle,
  Plus,
  Trash2,
  X,
  Check,
  Tag,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookOpen
} from 'lucide-react';

interface MindMapViewProps {
  mindMap?: MindMapNode[];
  nodes?: IdeaNode[];
  sessions?: JournalSession[];
  themeConfig: any;
  onSelectNode: (node: IdeaNode) => void;
  onOpenEditor: (id: string) => void;
}

export const MindMapView: React.FC<MindMapViewProps> = ({
  mindMap,
  nodes = [],
  sessions = [],
  themeConfig,
  onSelectNode,
  onOpenEditor,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected node for detailed overlay / modal
  const [activeInspector, setActiveInspector] = useState<{
    id: string;
    title: string;
    category?: string;
    summary?: string;
    type: 'central' | 'primary' | 'satellite';
    sourceEntryId?: string;
    color?: string;
  } | null>(null);

  // Derive theme-harmonized color palettes for the branches
  const branchPalette = useMemo(() => {
    return [
      {
        id: 'orange-coral',
        mainStart: '#fb923c',
        mainEnd: '#ea580c',
        satStart: '#fdba74',
        satEnd: '#f97316',
        label: 'IDEA 1',
        stroke: '#ffffff',
      },
      {
        id: 'cyan-teal',
        mainStart: '#38bdf8',
        mainEnd: '#0284c7',
        satStart: '#7dd3fc',
        satEnd: '#0ea5e9',
        label: 'IDEA 2',
        stroke: '#ffffff',
      },
      {
        id: 'lime-green',
        mainStart: '#a3e635',
        mainEnd: '#65a30d',
        satStart: '#bef264',
        satEnd: '#84cc16',
        label: 'IDEA 3',
        stroke: '#ffffff',
      },
      {
        id: 'berry-magenta',
        mainStart: '#f472b6',
        mainEnd: '#c026d3',
        satStart: '#fbcfe8',
        satEnd: '#db2777',
        label: 'IDEA 4',
        stroke: '#ffffff',
      },
    ];
  }, []);

  // Center node color derived directly from active themeConfig
  const centerColor = useMemo(() => {
    return {
      start: themeConfig.accent || '#38bdf8',
      end: themeConfig.primary || '#4338ca',
    };
  }, [themeConfig]);

  // Build the 4-hub infographic mind map model
  const mindMapModel = useMemo(() => {
    const totalItems = nodes.length > 0 ? nodes.length : sessions.length;
    const centralLabel = "MIND MAP";
    const centralSub = totalItems > 0 ? `${totalItems} Reflections Connected` : "Knowledge Web";

    // Group items into 4 clusters/themes
    const groups: {
      category: string;
      items: { id: string; title: string; summary: string; entryId?: string }[];
    }[] = [
      { category: 'Key Themes', items: [] },
      { category: 'Explorations', items: [] },
      { category: 'Insights', items: [] },
      { category: 'Breakthroughs', items: [] },
    ];

    if (nodes.length > 0) {
      const clusters = Array.from(new Set(nodes.map((n) => n.cluster || n.category || 'General')));
      nodes.forEach((node, idx) => {
        const groupIdx = idx % 4;
        groups[groupIdx].items.push({
          id: node.id,
          title: node.title,
          summary: node.summary || (node.keyInsights && node.keyInsights[0]) || '',
          entryId: node.id,
        });
        if (clusters[groupIdx] && groups[groupIdx].category === 'Key Themes' && groupIdx === 0) {
          groups[0].category = clusters[0].toUpperCase();
        } else if (clusters[groupIdx]) {
          groups[groupIdx].category = clusters[groupIdx].toUpperCase();
        }
      });
    } else if (sessions.length > 0) {
      sessions.forEach((s, idx) => {
        const groupIdx = idx % 4;
        const fallbackText = s.summary || (s.messages && s.messages[0]?.content) || s.title || '';
        groups[groupIdx].items.push({
          id: s.id,
          title: s.title,
          summary: fallbackText.slice(0, 90) + (fallbackText.length > 90 ? '...' : ''),
          entryId: s.id,
        });
        if (s.category && groups[groupIdx].items.length === 1) {
          groups[groupIdx].category = s.category.toUpperCase();
        }
      });
    }

    // Exact infographic geometry matching the circular diagram in reference image:
    // Center: (600, 375)
    // 4 Primary Hubs positioned radially in 4 quadrants:
    const hubs = [
      // IDEA 1 (Top Left)
      {
        id: 'primary-idea-1',
        label: 'IDEA 1',
        category: groups[0].category || 'CONCEPTS',
        x: 320,
        y: 200,
        r: 68,
        palette: branchPalette[0],
        satellites: [
          {
            id: 'sat-1-1',
            x: 140,
            y: 140,
            r: 42,
            label: groups[0].items[0]?.title || 'Core Idea',
            summary: groups[0].items[0]?.summary || 'Primary focal thesis',
            entryId: groups[0].items[0]?.entryId,
          },
          {
            id: 'sat-1-2',
            x: 480,
            y: 155,
            r: 50,
            label: groups[0].items[1]?.title || 'Evolution',
            summary: groups[0].items[1]?.summary || 'Secondary progression',
            entryId: groups[0].items[1]?.entryId,
          },
          {
            id: 'sat-1-3',
            x: 195,
            y: 345,
            r: 34,
            label: groups[0].items[2]?.title || 'Action',
            summary: groups[0].items[2]?.summary || 'Immediate takeaway',
            entryId: groups[0].items[2]?.entryId,
          },
        ],
      },
      // IDEA 2 (Top Right)
      {
        id: 'primary-idea-2',
        label: 'IDEA 2',
        category: groups[1].category || 'DISCOVERY',
        x: 880,
        y: 215,
        r: 70,
        palette: branchPalette[1],
        satellites: [
          {
            id: 'sat-2-1',
            x: 710,
            y: 125,
            r: 46,
            label: groups[1].items[0]?.title || 'Method',
            summary: groups[1].items[0]?.summary || 'Systematic approach',
            entryId: groups[1].items[0]?.entryId,
          },
          {
            id: 'sat-2-2',
            x: 1060,
            y: 175,
            r: 36,
            label: groups[1].items[1]?.title || 'Angle',
            summary: groups[1].items[1]?.summary || 'Lateral perspective',
            entryId: groups[1].items[1]?.entryId,
          },
          {
            id: 'sat-2-3',
            x: 1000,
            y: 380,
            r: 48,
            label: groups[1].items[2]?.title || 'Impact',
            summary: groups[1].items[2]?.summary || 'Measurable outcome',
            entryId: groups[1].items[2]?.entryId,
          },
          {
            id: 'sat-2-4',
            x: 735,
            y: 300,
            r: 32,
            label: groups[1].items[3]?.title || 'Context',
            summary: groups[1].items[3]?.summary || 'Background environment',
            entryId: groups[1].items[3]?.entryId,
          },
        ],
      },
      // IDEA 3 (Bottom Left)
      {
        id: 'primary-idea-3',
        label: 'IDEA 3',
        category: groups[2].category || 'GROWTH',
        x: 310,
        y: 565,
        r: 68,
        palette: branchPalette[2],
        satellites: [
          {
            id: 'sat-3-1',
            x: 145,
            y: 545,
            r: 44,
            label: groups[2].items[0]?.title || 'Pattern',
            summary: groups[2].items[0]?.summary || 'Recurring behavior',
            entryId: groups[2].items[0]?.entryId,
          },
          {
            id: 'sat-3-2',
            x: 445,
            y: 670,
            r: 40,
            label: groups[2].items[1]?.title || 'Strategy',
            summary: groups[2].items[1]?.summary || 'Forward direction',
            entryId: groups[2].items[1]?.entryId,
          },
          {
            id: 'sat-3-3',
            x: 325,
            y: 440,
            r: 28,
            label: groups[2].items[2]?.title || 'Next Step',
            summary: groups[2].items[2]?.summary || 'Concrete application',
            entryId: groups[2].items[2]?.entryId,
          },
        ],
      },
      // IDEA 4 (Bottom Right)
      {
        id: 'primary-idea-4',
        label: 'IDEA 4',
        category: groups[3].category || 'RESULTS',
        x: 870,
        y: 555,
        r: 68,
        palette: branchPalette[3],
        satellites: [
          {
            id: 'sat-4-1',
            x: 1045,
            y: 530,
            r: 40,
            label: groups[3].items[0]?.title || 'Clarity',
            summary: groups[3].items[0]?.summary || 'Cognitive breakthrough',
            entryId: groups[3].items[0]?.entryId,
          },
          {
            id: 'sat-4-2',
            x: 730,
            y: 675,
            r: 36,
            label: groups[3].items[1]?.title || 'Synthesis',
            summary: groups[3].items[1]?.summary || 'Harmonized takeaway',
            entryId: groups[3].items[1]?.entryId,
          },
          {
            id: 'sat-4-3',
            x: 980,
            y: 675,
            r: 46,
            label: groups[3].items[2]?.title || 'Vision',
            summary: groups[3].items[2]?.summary || 'Long-term direction',
            entryId: groups[3].items[2]?.entryId,
          },
        ],
      },
    ];

    return {
      central: {
        x: 600,
        y: 375,
        r: 88,
        label: centralLabel,
        sub: centralSub,
      },
      hubs,
    };
  }, [nodes, sessions, branchPalette]);

  // Background Constellation Mesh (matching the subtle network mesh in the image)
  const constellationMesh = useMemo(() => {
    const points = [
      { x: 90, y: 80 }, { x: 190, y: 50 }, { x: 260, y: 110 }, { x: 140, y: 220 },
      { x: 70, y: 320 }, { x: 120, y: 440 }, { x: 60, y: 580 }, { x: 210, y: 640 },
      { x: 420, y: 80 }, { x: 520, y: 60 }, { x: 670, y: 90 }, { x: 780, y: 70 },
      { x: 950, y: 80 }, { x: 1080, y: 100 }, { x: 1130, y: 240 }, { x: 1120, y: 440 },
      { x: 1080, y: 630 }, { x: 910, y: 710 }, { x: 810, y: 680 }, { x: 620, y: 710 },
      { x: 510, y: 700 }, { x: 370, y: 720 }, { x: 480, y: 320 }, { x: 720, y: 430 },
      { x: 490, y: 490 }, { x: 700, y: 210 }, { x: 410, y: 240 }, { x: 800, y: 360 },
    ];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 170) {
          lines.push({
            x1: points[i].x,
            y1: points[i].y,
            x2: points[j].x,
            y2: points[j].y,
          });
        }
      }
    }
    return { points, lines };
  }, []);

  // Mouse pan / zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.45), 2.2));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden select-none flex flex-col"
      style={{ backgroundColor: themeConfig.paperBg || '#f8fafc' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-6 z-20 flex items-center gap-2">
        <div 
          className="px-3.5 py-1.5 rounded-full border shadow-xs text-xs font-semibold flex items-center gap-2"
          style={{
            backgroundColor: themeConfig.paperCardBg,
            borderColor: themeConfig.border,
            color: themeConfig.inkColor
          }}
        >
          <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: themeConfig.primary }} />
          <span>Interactive Mind Map</span>
        </div>
      </div>

      {/* Floating Zoom & Pan Controls */}
      <div className="absolute top-4 right-6 z-20 flex items-center gap-1.5">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2.2))}
          className="h-8 w-8 rounded-full border shadow-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
          style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.45))}
          className="h-8 w-8 rounded-full border shadow-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
          style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2.5 h-8 rounded-full border shadow-xs text-xs font-bold flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          style={{ backgroundColor: themeConfig.paperCardBg, borderColor: themeConfig.border, color: themeConfig.inkColor }}
          title="Reset Center"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{Math.round(zoom * 100)}%</span>
        </button>
      </div>

      {/* Main Mind Map SVG Diagram */}
      <div 
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1200 750"
          className="w-full h-full transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <defs>
            {/* Elevated 3D disk drop shadow matching reference image */}
            <filter id="disk-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.25" />
            </filter>

            <filter id="small-disk-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.20" />
            </filter>

            {/* Central Node Radial Gradient */}
            <radialGradient id="grad-center" cx="40%" cy="40%" r="65%">
              <stop offset="0%" stopColor={centerColor.start} />
              <stop offset="100%" stopColor={centerColor.end} />
            </radialGradient>

            {/* Dynamic Branch Gradients matching the infographic disks */}
            {mindMapModel.hubs.map((hub, idx) => (
              <React.Fragment key={hub.id}>
                <radialGradient id={`grad-hub-${idx}`} cx="38%" cy="38%" r="65%">
                  <stop offset="0%" stopColor={hub.palette.mainStart} />
                  <stop offset="100%" stopColor={hub.palette.mainEnd} />
                </radialGradient>
                <radialGradient id={`grad-sat-${idx}`} cx="38%" cy="38%" r="65%">
                  <stop offset="0%" stopColor={hub.palette.satStart} />
                  <stop offset="100%" stopColor={hub.palette.satEnd} />
                </radialGradient>
              </React.Fragment>
            ))}
          </defs>

          {/* Background Canvas & Constellation Mesh (exact to reference image) */}
          <rect id="bg-canvas" x="0" y="0" width="1200" height="750" fill="transparent" />

          {/* Constellation Connecting Lines */}
          <g opacity="0.22">
            {constellationMesh.lines.map((l, i) => (
              <line
                key={`mesh-line-${i}`}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            ))}
            {/* Constellation Dots */}
            {constellationMesh.points.map((p, i) => (
              <circle
                key={`mesh-dot-${i}`}
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#64748b"
              />
            ))}
          </g>

          {/* 1. Main Connecting Branches (Thick lines from Center to Primary Hubs) */}
          <g>
            {mindMapModel.hubs.map((hub) => (
              <line
                key={`link-center-${hub.id}`}
                x1={mindMapModel.central.x}
                y1={mindMapModel.central.y}
                x2={hub.x}
                y2={hub.y}
                stroke="#334155"
                strokeWidth="5"
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            ))}
          </g>

          {/* 2. Satellite Connecting Branches (Thick lines from Primary Hubs to Satellite Circles) */}
          <g>
            {mindMapModel.hubs.map((hub) =>
              hub.satellites.map((sat) => (
                <line
                  key={`link-sat-${sat.id}`}
                  x1={hub.x}
                  y1={hub.y}
                  x2={sat.x}
                  y2={sat.y}
                  stroke="#334155"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              ))
            )}
          </g>

          {/* 3. Satellite Circles (Sub-Ideas / Reflections) */}
          <g>
            {mindMapModel.hubs.map((hub, hubIdx) =>
              hub.satellites.map((sat) => {
                const isSelected = activeInspector?.id === sat.id;
                return (
                  <g
                    key={sat.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveInspector({
                        id: sat.id,
                        title: sat.label,
                        category: hub.category,
                        summary: sat.summary,
                        type: 'satellite',
                        sourceEntryId: sat.entryId,
                        color: hub.palette.mainEnd,
                      });
                      const matchingNode = nodes.find((n) => n.id === sat.entryId);
                      if (matchingNode) onSelectNode(matchingNode);
                    }}
                    className="cursor-pointer transition-transform duration-200 hover:scale-105"
                  >
                    {/* Shadow & Circular Disk */}
                    <circle
                      cx={sat.x}
                      cy={sat.y}
                      r={sat.r}
                      fill={`url(#grad-sat-${hubIdx})`}
                      stroke={isSelected ? '#fef08a' : '#ffffff'}
                      strokeWidth={isSelected ? '4' : '3'}
                      filter="url(#small-disk-shadow)"
                      className="transition-all"
                    />

                    {/* Short Text inside Satellite Circle */}
                    <text
                      x={sat.x}
                      y={sat.y + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={sat.r > 40 ? '11' : '9.5'}
                      fontWeight="700"
                      className="pointer-events-none drop-shadow-xs"
                      style={{ letterSpacing: '0.3px' }}
                    >
                      {sat.label.length > 14 ? sat.label.slice(0, 12) + '…' : sat.label}
                    </text>
                  </g>
                );
              })
            )}
          </g>

          {/* 4. Primary Idea Hub Circles ("IDEA 1", "IDEA 2", "IDEA 3", "IDEA 4") */}
          <g>
            {mindMapModel.hubs.map((hub, hubIdx) => {
              const isSelected = activeInspector?.id === hub.id;
              return (
                <g
                  key={hub.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveInspector({
                      id: hub.id,
                      title: `${hub.label} - ${hub.category}`,
                      category: hub.category,
                      summary: `Explore cluster: ${hub.satellites.length} interconnected idea nodes and reflections.`,
                      type: 'primary',
                      color: hub.palette.mainEnd,
                    });
                  }}
                  className="cursor-pointer transition-transform duration-200 hover:scale-105"
                >
                  {/* Outer Elevated Circle */}
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r={hub.r}
                    fill={`url(#grad-hub-${hubIdx})`}
                    stroke={isSelected ? '#fef08a' : '#ffffff'}
                    strokeWidth={isSelected ? '5' : '4'}
                    filter="url(#disk-shadow)"
                    className="transition-all"
                  />

                  {/* Primary Label (e.g. "IDEA 1") */}
                  <text
                    x={hub.x}
                    y={hub.y - 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="18"
                    fontWeight="900"
                    className="pointer-events-none drop-shadow-sm font-sans"
                    style={{ letterSpacing: '1px' }}
                  >
                    {hub.label}
                  </text>

                  {/* Category Subtitle */}
                  <text
                    x={hub.x}
                    y={hub.y + 16}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="700"
                    opacity="0.9"
                    className="pointer-events-none drop-shadow-xs uppercase tracking-wider"
                  >
                    {hub.category.length > 12 ? hub.category.slice(0, 11) + '…' : hub.category}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 5. Central Hub Node ("MIND MAP") */}
          <g
            onClick={(e) => {
              e.stopPropagation();
              setActiveInspector({
                id: 'central-hub',
                title: mindMapModel.central.label,
                category: 'Central Thesis',
                summary: mindMapModel.central.sub,
                type: 'central',
                color: centerColor.end,
              });
            }}
            className="cursor-pointer transition-transform duration-200 hover:scale-105"
          >
            {/* Center Circle */}
            <circle
              cx={mindMapModel.central.x}
              cy={mindMapModel.central.y}
              r={mindMapModel.central.r}
              fill="url(#grad-center)"
              stroke="#ffffff"
              strokeWidth="5"
              filter="url(#disk-shadow)"
            />

            {/* Central All-Caps Label */}
            <text
              x={mindMapModel.central.x}
              y={mindMapModel.central.y + 2}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="23"
              fontWeight="900"
              className="pointer-events-none drop-shadow-md font-sans"
              style={{ letterSpacing: '1.5px' }}
            >
              {mindMapModel.central.label}
            </text>

            {/* Sub-label */}
            <text
              x={mindMapModel.central.x}
              y={mindMapModel.central.y + 24}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontWeight="700"
              opacity="0.85"
              className="pointer-events-none uppercase tracking-widest"
            >
              CORE ARCHITECTURE
            </text>
          </g>
        </svg>
      </div>

      {/* Interactive Detail Inspector Overlay (Bottom-Right) */}
      {activeInspector && (
        <div 
          className="absolute bottom-6 right-6 max-w-sm w-full p-5 rounded-2xl border shadow-xl backdrop-blur-md z-30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
          style={{
            backgroundColor: `${themeConfig.paperCardBg}f5`,
            borderColor: themeConfig.border,
            color: themeConfig.inkColor,
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span 
                className="h-3 w-3 rounded-full shrink-0" 
                style={{ backgroundColor: activeInspector.color || themeConfig.primary }} 
              />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                {activeInspector.category || activeInspector.type}
              </span>
            </div>
            <button
              onClick={() => setActiveInspector(null)}
              className="h-6 w-6 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h4 className="font-serif font-bold text-base mb-1.5 leading-snug">
            {activeInspector.title}
          </h4>

          {activeInspector.summary && (
            <p className="text-xs opacity-75 leading-relaxed mb-4 line-clamp-3">
              {activeInspector.summary}
            </p>
          )}

          {activeInspector.sourceEntryId && (
            <button
              onClick={() => onOpenEditor(activeInspector.sourceEntryId!)}
              className="w-full py-2 px-3 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 transition-all cursor-pointer"
              style={{ backgroundColor: themeConfig.primary }}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Open in Journal Editor</span>
              <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface FlowchartViewProps {
  flowchart?: FlowchartData;
  nodes?: IdeaNode[];
  sessions?: JournalSession[];
  themeConfig: any;
  onUpdateSession?: (sessionId: string, updates: Partial<JournalSession>) => void;
  onSelectNode: (node: IdeaNode) => void;
  onOpenEditor: (id: string) => void;
}

interface ProcessTaskItem {
  id: string;
  taskNumber: number;
  label: string;
  deadline?: string;
  priority?: string;
  isCompleted?: boolean;
  sourceEntryId?: string;
  sessionTitle?: string;
  subtasks?: string[];
  condition?: string;
  reason?: string;
  isManual?: boolean;
}

export const FlowchartView: React.FC<FlowchartViewProps> = ({
  flowchart,
  nodes = [],
  sessions = [],
  themeConfig,
  onUpdateSession,
  onSelectNode,
  onOpenEditor,
}) => {
  // Manual Task Creation State for Flowchart
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState('');
  const [newStepDeadline, setNewStepDeadline] = useState('');
  const [newStepPriority, setNewStepPriority] = useState<string>('Medium');
  const [newStepSubtasks, setNewStepSubtasks] = useState('');
  const [newStepSessionId, setNewStepSessionId] = useState('');

  // Extract and assemble tasks strictly ordered by deadline
  const deadlineOrderedTasks = useMemo(() => {
    let taskList: ProcessTaskItem[] = [];

    // 1. Gather all tasks from sessions
    if (sessions && sessions.length > 0) {
      sessions.forEach((s) => {
        if (s.structuredTasks && s.structuredTasks.length > 0) {
          s.structuredTasks.forEach((st) => {
            taskList.push({
              id: st.id,
              taskNumber: 0,
              label: st.text,
              deadline: st.deadline,
              priority: st.priority,
              isCompleted: Boolean(st.isCompleted || st.status === 'completed'),
              sourceEntryId: st.sourceEntryId || s.id,
              sessionTitle: st.sessionTitle || s.title,
              isManual: st.isManual,
              subtasks: st.subtasks && st.subtasks.length > 0 
                ? st.subtasks.map((sub: any) => typeof sub === 'string' ? sub : sub?.text || '').filter(Boolean)
                : undefined,
            });
          });
        } else if (s.actionItems && s.actionItems.length > 0) {
          s.actionItems.forEach((text, idx) => {
            const sessionBaseTime = new Date(s.createdAt).getTime() || Date.now();
            const fallbackDeadline = new Date(sessionBaseTime + 86400000 * (idx + 2)).toISOString().split('T')[0];
            taskList.push({
              id: `legacy-${s.id}-${idx}`,
              taskNumber: 0,
              label: text,
              deadline: fallbackDeadline,
              priority: 'Medium',
              isCompleted: false,
              sourceEntryId: s.id,
              sessionTitle: s.title,
            });
          });
        }
      });
    }

    // 2. If sessions didn't produce tasks but flowchart.nodes exists, incorporate them
    if (taskList.length === 0 && flowchart?.nodes && flowchart.nodes.length > 0) {
      flowchart.nodes.forEach((fn, idx) => {
        taskList.push({
          id: fn.id,
          taskNumber: 0,
          label: fn.label,
          deadline: fn.deadline,
          sourceEntryId: fn.sourceEntryId,
          condition: fn.condition,
          reason: fn.reason,
          subtasks: fn.subtasks,
        });
      });
    }

    // Strict Ordering According to Deadlines Only:
    taskList.sort((a, b) => {
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      return a.label.localeCompare(b.label);
    });

    // Assign sequential numbers: Task 1, Task 2, ..., Task N
    return taskList.map((item, idx) => ({
      ...item,
      taskNumber: idx + 1,
    }));
  }, [sessions, flowchart]);

  // Handler to create a step in the process flowchart
  const handleCreateFlowchartStep = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newStepLabel.trim() || !onUpdateSession) return;

    const targetSession = sessions.find((s) => s.id === newStepSessionId) || sessions[0];
    if (!targetSession) return;

    const subtasksParsed = newStepSubtasks
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: `sub_${Date.now()}_${idx}`,
        text,
        isCompleted: false,
      }));

    const newTask: ActionItem = {
      id: `manual_flow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: newStepLabel.trim(),
      sourceEntryId: targetSession.id,
      sessionId: targetSession.id,
      sessionTitle: targetSession.title,
      priority: (newStepPriority as any) || 'Medium',
      deadline: newStepDeadline || undefined,
      status: 'pending',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      isManual: true,
      subtasks: subtasksParsed.length > 0 ? subtasksParsed : undefined,
    };

    const existing = targetSession.structuredTasks || [];
    onUpdateSession(targetSession.id, {
      structuredTasks: [newTask, ...existing],
      updatedAt: new Date().toISOString(),
    });

    setNewStepLabel('');
    setNewStepDeadline('');
    setNewStepPriority('Medium');
    setNewStepSubtasks('');
    setIsAddingStep(false);
  };

  // Handler to delete a task/step from session
  const handleDeleteTask = (task: ProcessTaskItem) => {
    if (!onUpdateSession || !task.sourceEntryId) return;
    const session = sessions.find((s) => s.id === task.sourceEntryId);
    if (!session) return;

    let updatedTasks = (session.structuredTasks || []).filter(
      (t) => t.id !== task.id && t.text.trim().toLowerCase() !== task.label.trim().toLowerCase()
    );
    onUpdateSession(session.id, {
      structuredTasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handler to toggle completion status of a task/step
  const handleToggleComplete = (task: ProcessTaskItem) => {
    if (!onUpdateSession || !task.sourceEntryId) return;
    const session = sessions.find((s) => s.id === task.sourceEntryId);
    if (!session || !session.structuredTasks) return;

    const updatedTasks = session.structuredTasks.map((t) => {
      if (t.id === task.id || t.text.trim().toLowerCase() === task.label.trim().toLowerCase()) {
        const nextDone = !t.isCompleted;
        return {
          ...t,
          isCompleted: nextDone,
          status: nextDone ? ('completed' as const) : ('pending' as const),
        };
      }
      return t;
    });

    onUpdateSession(session.id, {
      structuredTasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  const setQuickDeadline = (daysFromNow: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysFromNow);
    setNewStepDeadline(targetDate.toISOString().split('T')[0]);
  };

  const hasTasks = deadlineOrderedTasks.length > 0;

  // Manual Step Creation Form Component
  const renderManualStepForm = () => (
    <form 
      onSubmit={handleCreateFlowchartStep}
      className="p-5 rounded-2xl border shadow-sm mb-6 space-y-4 transition-all"
      style={{
        backgroundColor: themeConfig.paperCardBg,
        borderColor: themeConfig.border,
      }}
    >
      <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: themeConfig.border }}>
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" style={{ color: themeConfig.primary }} />
          <span className="font-bold text-sm" style={{ color: themeConfig.inkColor }}>Add Manual Process Step</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">
            Manual Addition
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingStep(false)}
          className="p-1 rounded-md opacity-60 hover:opacity-100 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold mb-1 opacity-80">
            Step Title / Action Description *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Schedule team retrospective or Outline project roadmap..."
            value={newStepLabel}
            onChange={(e) => setNewStepLabel(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border outline-hidden transition-colors"
            style={{
              backgroundColor: themeConfig.chipBg,
              borderColor: themeConfig.border,
              color: themeConfig.inkColor,
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Target Session */}
          {sessions.length > 1 && (
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">
                Attach to Reflection
              </label>
              <select
                value={newStepSessionId || sessions[0]?.id || ''}
                onChange={(e) => setNewStepSessionId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border outline-hidden cursor-pointer"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  borderColor: themeConfig.border,
                  color: themeConfig.inkColor,
                }}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title.length > 30 ? s.title.slice(0, 30) + '...' : s.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80">
              Priority
            </label>
            <div className="flex items-center gap-1.5">
              {['High', 'Medium', 'Low'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewStepPriority(p)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    newStepPriority === p ? 'ring-2' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    borderColor: themeConfig.border,
                    color: p === 'High' ? '#e11d48' : p === 'Medium' ? '#d97706' : '#16a34a',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deadline Selection */}
        <div>
          <label className="block text-xs font-semibold mb-1 opacity-80">
            Target Completion Deadline
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={newStepDeadline}
              onChange={(e) => setNewStepDeadline(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border outline-hidden"
              style={{
                backgroundColor: themeConfig.chipBg,
                borderColor: themeConfig.border,
                color: themeConfig.inkColor,
              }}
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQuickDeadline(1)}
                className="px-2 py-1 text-[10px] font-semibold rounded-lg border hover:opacity-100 opacity-70 cursor-pointer"
                style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setQuickDeadline(3)}
                className="px-2 py-1 text-[10px] font-semibold rounded-lg border hover:opacity-100 opacity-70 cursor-pointer"
                style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => setQuickDeadline(7)}
                className="px-2 py-1 text-[10px] font-semibold rounded-lg border hover:opacity-100 opacity-70 cursor-pointer"
                style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
              >
                +1 Week
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Sub-tasks */}
        <div>
          <label className="block text-xs font-semibold mb-1 opacity-80">
            Horizontal Sub-steps (comma or newline separated)
          </label>
          <input
            type="text"
            placeholder="e.g. Gather references, Draft outline, Review with team"
            value={newStepSubtasks}
            onChange={(e) => setNewStepSubtasks(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border outline-hidden"
            style={{
              backgroundColor: themeConfig.chipBg,
              borderColor: themeConfig.border,
              color: themeConfig.inkColor,
            }}
          />
          <p className="text-[10px] opacity-60 mt-1">
            Sub-steps will render horizontally as (e.g. Task 2a ➔ Task 2b ➔ Task 2c).
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: themeConfig.border }}>
        <button
          type="button"
          onClick={() => setIsAddingStep(false)}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border opacity-70 hover:opacity-100 cursor-pointer"
          style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!newStepLabel.trim()}
          className="px-4 py-1.5 text-xs font-bold rounded-xl text-white shadow-xs hover:opacity-90 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          style={{ backgroundColor: themeConfig.primary }}
        >
          <Check className="h-3.5 w-3.5" />
          <span>Save Step</span>
        </button>
      </div>
    </form>
  );

  // Empty state if no workflow steps or tasks detected
  if (!hasTasks) {
    return (
      <div className="w-full h-full p-6 sm:p-8 overflow-y-auto space-y-6">
        <div className="max-w-lg mx-auto py-8 text-center space-y-6">
          <div 
            className="p-6 rounded-3xl border shadow-xs text-center"
            style={{
              backgroundColor: themeConfig.paperBg,
              borderColor: themeConfig.border,
            }}
          >
            <Workflow className="h-12 w-12 mx-auto mb-3 opacity-40" style={{ color: themeConfig.primary }} />
            <h4 className="font-serif text-lg font-bold mb-2" style={{ color: themeConfig.inkColor }}>
              No Sequenced Workflow Steps Yet
            </h4>
            <p className="text-xs opacity-80 leading-relaxed mb-4">
              Flowcharts organize tasks strictly by chronological deadline order (Task 1 ➔ Task 2 ➔ Task N) with horizontal subtasks.
            </p>

            {/* Philosophy Note */}
            <div 
              className="p-3 rounded-xl border text-[11px] opacity-85 text-left mb-5 space-y-1"
              style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border }}
            >
              <div className="flex items-center gap-1.5 font-bold" style={{ color: themeConfig.primary }}>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Sequencing is completely optional</span>
              </div>
              <p className="opacity-75 leading-relaxed">
                Reflections and brainstorms are valuable on their own without requiring actionable flowcharts. You can manually introduce process steps at any time when ready to plan execution.
              </p>
            </div>

            {onUpdateSession && !isAddingStep && (
              <button
                onClick={() => setIsAddingStep(true)}
                className="px-4 py-2 rounded-full text-xs font-bold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-all"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Step Manually</span>
              </button>
            )}
          </div>

          {isAddingStep && renderManualStepForm()}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 sm:p-8 overflow-y-auto space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: themeConfig.border }}>
          <div>
            <h3 className="font-serif text-xl font-bold flex items-center gap-2" style={{ color: themeConfig.inkColor }}>
              <Workflow className="h-5 w-5" style={{ color: themeConfig.primary }} />
              <span>Deadline-Sequenced Process Flowchart</span>
            </h3>
            <p className="text-xs opacity-75 mt-1">
              Ordered strictly by deadlines: Task 1 ➔ Task 2 ➔ Task N, with horizontal subtasks.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div 
              className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5"
              style={{ backgroundColor: themeConfig.chipBg, borderColor: themeConfig.border, color: themeConfig.primary }}
            >
              <Calendar className="h-3 w-3" />
              <span>{deadlineOrderedTasks.length} Sequenced Tasks</span>
            </div>

            {onUpdateSession && (
              <button
                onClick={() => setIsAddingStep(!isAddingStep)}
                className="px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-all cursor-pointer"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isAddingStep ? 'Close Form' : 'Add Flowchart Step'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Philosophy Callout: Workflow sequencing is optional */}
        <div 
          className="p-3.5 rounded-2xl border text-xs flex items-start gap-3 shadow-2xs"
          style={{ 
            backgroundColor: themeConfig.chipBg, 
            borderColor: themeConfig.border, 
            color: themeConfig.inkColor 
          }}
        >
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">Workflow sequencing is strictly optional</span>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                style={{ 
                  backgroundColor: themeConfig.paperCardBg, 
                  borderColor: themeConfig.border, 
                  color: themeConfig.primary 
                }}
              >
                Flexible Exploration
              </span>
            </div>
            <p className="opacity-80 leading-relaxed">
              Not all ideas need to be reduced to sequential flowcharts or task ladders. Freeform reflections, mind mapping, and creative explorations are self-contained. Add workflow steps manually whenever you're actively constructing a process timeline.
            </p>
          </div>
        </div>

        {/* Manual Step Form (if toggled) */}
        {isAddingStep && renderManualStepForm()}

        {/* Sequential Task Flow Nodes (Ordered by deadline) */}
        <div className="space-y-4 relative py-2">
          {deadlineOrderedTasks.map((task, index) => {
            const isLast = index === deadlineOrderedTasks.length - 1;
            const matchingNode = nodes.find((n) => n.id === task.sourceEntryId);

            return (
              <React.Fragment key={task.id}>
                {/* Task Node Card */}
                <div 
                  className={`p-5 rounded-2xl border shadow-xs transition-all relative hover:shadow-md ${
                    task.isCompleted ? 'opacity-55 grayscale' : ''
                  }`}
                  style={{
                    backgroundColor: themeConfig.paperCardBg,
                    borderColor: themeConfig.border,
                  }}
                >
                  {/* Top metadata line */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Checkbox toggle */}
                      {onUpdateSession && (
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(task)}
                          className="p-0.5 rounded-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                          style={{ color: task.isCompleted ? themeConfig.primary : '#9ca3af' }}
                          title={task.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                        >
                          {task.isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4 hover:text-emerald-600" />
                          )}
                        </button>
                      )}

                      {/* Task Sequential Badge */}
                      <span 
                        className="text-xs font-extrabold px-2.5 py-1 rounded-lg text-white shadow-2xs"
                        style={{ backgroundColor: themeConfig.primary }}
                      >
                        Task {task.taskNumber}
                      </span>

                      {/* Manual Badge */}
                      {task.isManual ? (
                        <span 
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1"
                          style={{ 
                            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                            color: '#2563eb', 
                            borderColor: 'rgba(59, 130, 246, 0.25)' 
                          }}
                        >
                          <Tag className="h-2.5 w-2.5" />
                          Manual Step
                        </span>
                      ) : (
                        <span 
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md border opacity-70"
                          style={{ 
                            backgroundColor: themeConfig.chipBg, 
                            borderColor: themeConfig.border 
                          }}
                        >
                          From Reflection
                        </span>
                      )}

                      {/* Deadline Badge (Highlighted) */}
                      <span 
                        className="text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-2xs"
                        style={task.deadline ? {
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          borderColor: 'rgba(245, 158, 11, 0.35)',
                          color: '#b45309'
                        } : {
                          backgroundColor: themeConfig.chipBg,
                          borderColor: themeConfig.border,
                          color: themeConfig.inkColor,
                          opacity: 0.7
                        }}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {task.deadline ? `Due: ${task.deadline}` : 'No deadline set'}
                      </span>

                      {/* Status / Priority */}
                      {task.isCompleted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Done
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 border border-blue-500/25">
                          {task.priority || 'To Do'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {/* Source Journal Link */}
                      {task.sourceEntryId && (
                        <button
                          onClick={() => {
                            if (matchingNode) onSelectNode(matchingNode);
                            else onOpenEditor(task.sourceEntryId!);
                          }}
                          className="text-[10px] font-semibold opacity-60 hover:opacity-100 flex items-center gap-1 transition-all cursor-pointer"
                          title="View origin reflection"
                        >
                          <span>{task.sessionTitle ? (task.sessionTitle.length > 20 ? task.sessionTitle.slice(0, 20) + '...' : task.sessionTitle) : 'From Journal'}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}

                      {/* Delete Button */}
                      {onUpdateSession && (
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="text-[10px] p-1 rounded-md opacity-40 hover:opacity-100 hover:text-rose-600 transition-all cursor-pointer"
                          title="Delete this step"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Task Description */}
                  <h4 className={`text-base font-bold leading-snug mb-2 ${task.isCompleted ? 'line-through opacity-70' : ''}`} style={{ color: themeConfig.inkColor }}>
                    {task.label}
                  </h4>

                  {/* Context / Reason */}
                  {task.reason && (
                    <p className="text-xs opacity-75 mb-3 italic">
                      Rationale: {task.reason}
                    </p>
                  )}

                  {/* Horizontal Subtasks: task 2 -> 2a - 2b - 2c - 2d in horizontal addings */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: themeConfig.border }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
                          Horizontal Sub-Tasks ({task.subtasks.length}):
                        </span>
                      </div>
                      
                      {/* Horizontal Flex Container */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                        {task.subtasks.map((sub, subIdx) => {
                          const subtaskIdentifier = `${task.taskNumber}${String.fromCharCode(97 + (subIdx % 26))}`;
                          const isLastSub = subIdx === task.subtasks!.length - 1;

                          return (
                            <React.Fragment key={subIdx}>
                              <div 
                                className="px-3 py-2 rounded-xl border flex items-center gap-2 shrink-0 shadow-xs transition-all hover:scale-102"
                                style={{
                                  backgroundColor: themeConfig.chipBg,
                                  borderColor: themeConfig.border,
                                  color: themeConfig.inkColor
                                }}
                              >
                                <span 
                                  className="px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white"
                                  style={{ backgroundColor: themeConfig.primary }}
                                >
                                  {subtaskIdentifier}
                                </span>
                                <span className="text-xs font-semibold whitespace-nowrap">
                                  {sub}
                                </span>
                              </div>

                              {/* Horizontal connector arrow */}
                              {!isLastSub && (
                                <ArrowRight className="h-3.5 w-3.5 opacity-40 shrink-0" style={{ color: themeConfig.primary }} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vertical Step Connector Arrow */}
                {!isLast && (
                  <div className="flex flex-col items-center justify-center py-1">
                    <div className="w-0.5 h-3 opacity-30" style={{ backgroundColor: themeConfig.primary }} />
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center border shadow-xs my-0.5"
                      style={{ 
                        backgroundColor: themeConfig.paperCardBg, 
                        borderColor: themeConfig.border,
                        color: themeConfig.primary 
                      }}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </div>
                    <div className="w-0.5 h-3 opacity-30" style={{ backgroundColor: themeConfig.primary }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
