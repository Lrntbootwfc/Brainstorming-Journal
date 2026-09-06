import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Sparkles, 
  GitBranch, 
  Layers, 
  Calendar, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Lightbulb, 
  ArrowRight, 
  ExternalLink, 
  Plus, 
  Filter, 
  Info,
  ChevronRight,
  TrendingUp,
  X,
  Share2,
  Network,
  Workflow,
  TreeDeciduous
} from 'lucide-react';
import { 
  JournalSession, 
  PaperThemePreference, 
  IdeaNode, 
  IdeaLink, 
  IdeaEvolutionGraphData, 
  EvolutionStory, 
  EvolutionStage 
} from '../types';
import { getThemeConfig } from '../utils/theme';
import { MindMapView, FlowchartView } from './MindMapAndFlowchartViews';
import { MindGarden } from './MindGarden';

interface IdeaEvolutionGraphProps {
  sessions: JournalSession[];
  theme?: PaperThemePreference;
  onOpenEditor: (sessionId: string) => void;
  onNewSessionWithPrompt?: (initialText: string, category: string) => void;
  onUpdateSession?: (sessionId: string, updates: Partial<JournalSession>) => void;
  initialViewMode?: 'garden' | 'mindmap' | 'flowchart' | 'stories';
  userName?: string;
}

export const IdeaEvolutionGraph: React.FC<IdeaEvolutionGraphProps> = ({
  sessions,
  theme,
  onOpenEditor,
  onNewSessionWithPrompt,
  onUpdateSession,
  initialViewMode,
  userName,
}) => {
  const themeConfig = getThemeConfig(theme);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // States
  const [graphData, setGraphData] = useState<IdeaEvolutionGraphData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<IdeaNode | null>(null);
  const [selectedStory, setSelectedStory] = useState<EvolutionStory | null>(null);
  const [viewMode, setViewMode] = useState<'garden' | 'mindmap' | 'flowchart' | 'stories'>(initialViewMode || 'garden');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  // Fetch or analyze graph
  const analyzeConnections = async () => {
    if (sessions.length === 0) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/gemini/connect-dots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions }),
      });
      if (response.ok) {
        const data = await response.json();
        setGraphData(data);
      }
    } catch (err) {
      console.error('Failed to load connect-dots graph:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    analyzeConnections();
  }, [sessions.length]);

  // Stage styling helpers
  const getStageBadgeColor = (stage: EvolutionStage | string) => {
    switch (stage) {
      case 'Original Thought':
      case 'Seed Idea':
        return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', icon: '🌱' };
      case 'Exploration':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', icon: '🌿' };
      case 'Refinement':
        return { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe', icon: '💎' };
      case 'New Direction':
        return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa', icon: '🧭' };
      case 'Outcome':
      case 'Action / Breakthrough':
        return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', icon: '⚡' };
      default:
        return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', icon: '✨' };
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'related':
        return '#6366f1'; // indigo
      case 'evolved_from':
      case 'evolution':
        return '#0284c7'; // sky blue
      case 'refined_from':
        return '#8b5cf6'; // violet/purple
      case 'expands':
        return '#0d9488'; // teal
      case 'leads_to':
      case 'breakthrough':
        return '#16a34a'; // emerald green
      case 'diverges_from':
      case 'pivot':
        return '#ea580c'; // amber/orange
      case 'thematic':
      default:
        return '#64748b'; // slate
    }
  };

  // Filtered nodes & links
  const filteredNodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes;
  }, [graphData]);

  const activeNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredLinks = useMemo(() => {
    if (!graphData?.links) return [];
    return graphData.links.filter((l) => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return activeNodeIds.has(sourceId) && activeNodeIds.has(targetId);
    });
  }, [graphData, activeNodeIds]);

  // Direct connected nodes for the selected node
  const connectedInfo = useMemo(() => {
    if (!selectedNode || !graphData) return { inbound: [], outbound: [] };
    const inbound: { node: IdeaNode; link: IdeaLink }[] = [];
    const outbound: { node: IdeaNode; link: IdeaLink }[] = [];

    graphData.links.forEach((l) => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;

      if (sId === selectedNode.id) {
        const targetNode = graphData.nodes.find((n) => n.id === tId);
        if (targetNode) outbound.push({ node: targetNode, link: l });
      } else if (tId === selectedNode.id) {
        const sourceNode = graphData.nodes.find((n) => n.id === sId);
        if (sourceNode) inbound.push({ node: sourceNode, link: l });
      }
    });

    return { inbound, outbound };
  }, [selectedNode, graphData]);

  // D3 Render Effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredNodes.length === 0) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 560;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs for glowing markers and arrowheads
    const defs = svg.append('defs');

    // Arrowhead markers
    const markerTypes = [
      { id: 'arrow-related', color: '#6366f1' },
      { id: 'arrow-evolved_from', color: '#0284c7' },
      { id: 'arrow-refined_from', color: '#8b5cf6' },
      { id: 'arrow-expands', color: '#0d9488' },
      { id: 'arrow-leads_to', color: '#16a34a' },
      { id: 'arrow-diverges_from', color: '#ea580c' },
      { id: 'arrow-evolution', color: '#0284c7' },
      { id: 'arrow-breakthrough', color: '#16a34a' },
      { id: 'arrow-pivot', color: '#ea580c' },
      { id: 'arrow-thematic', color: '#64748b' },
      { id: 'arrow-default', color: '#94a3b8' },
    ];

    markerTypes.forEach(({ id, color }) => {
      defs
        .append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 24)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Root Group with Zoom
    const g = svg.append('g').attr('class', 'main-graph-group');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomTransform(event.transform);
      });

    svg.call(zoom);

    // Deep clones of nodes & links to prevent D3 mutating state directly
    const nodesCopy: IdeaNode[] = filteredNodes.map((d) => ({ ...d }));
    const linksCopy: any[] = filteredLinks.map((d) => ({ ...d }));

    if ((viewMode as any) === 'network') {
      // Force Simulation
      const simulation = d3
        .forceSimulation<IdeaNode>(nodesCopy)
        .force(
          'link',
          d3
            .forceLink<IdeaNode, any>(linksCopy)
            .id((d) => d.id)
            .distance((d) => 130 - (d.strength || 3) * 12)
        )
        .force('charge', d3.forceManyBody().strength(-340))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(45));

      // Draw Links
      const link = g
        .append('g')
        .attr('class', 'links')
        .selectAll('path')
        .data(linksCopy)
        .enter()
        .append('path')
        .attr('stroke', (d) => getRelationshipColor(d.relationshipType))
        .attr('stroke-width', (d) => Math.max(1.8, (d.strength || 3) * 0.8))
        .attr('stroke-dasharray', (d) => (d.relationshipType === 'thematic' ? '4,4' : 'none'))
        .attr('stroke-opacity', 0.6)
        .attr('fill', 'none')
        .attr('marker-end', (d) => `url(#arrow-${d.relationshipType || 'default'})`);

      // Link Label Hover
      link
        .append('title')
        .text((d) => `${d.relationship}: ${d.explanation}`);

      // Draw Node Groups
      const node = g
        .append('g')
        .attr('class', 'nodes')
        .selectAll('.node')
        .data(nodesCopy)
        .enter()
        .append('g')
        .attr('class', 'node cursor-pointer')
        .call(
          d3
            .drag<SVGGElement, IdeaNode>()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on('drag', (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on('end', (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            })
        )
        .on('click', (_, d) => {
          setSelectedNode(d);
          setIsDrawerOpen(true);
        })
        .on('mouseenter', (_, d) => setHoveredNodeId(d.id))
        .on('mouseleave', () => setHoveredNodeId(null));

      // Outer Halo Ring for Stage
      node
        .append('circle')
        .attr('r', (d) => (d.id === selectedNode?.id ? 26 : 21))
        .attr('fill', (d) => (d.id === selectedNode?.id ? themeConfig.primary : '#ffffff'))
        .attr('stroke', (d) => {
          if (d.id === selectedNode?.id) return themeConfig.primary;
          const badge = getStageBadgeColor(d.evolutionStage);
          return badge.border;
        })
        .attr('stroke-width', (d) => (d.id === selectedNode?.id ? 3 : 2))
        .attr('filter', 'drop-shadow(0 2px 5px rgba(0,0,0,0.12))');

      // Inner Node Emoji / Icon
      node
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '13px')
        .text((d) => {
          const badge = getStageBadgeColor(d.evolutionStage);
          return badge.icon;
        });

      // Node Label (Title)
      node
        .append('text')
        .attr('dy', 34)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', themeConfig.inkColor)
        .text((d) => (d.title.length > 18 ? d.title.slice(0, 18) + '…' : d.title))
        .style('pointer-events', 'none')
        .style('text-shadow', '0 1px 3px rgba(255,255,255,0.85)');

      // Category Pill label below
      node
        .append('text')
        .attr('dy', 47)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', '500')
        .attr('fill', '#64748b')
        .text((d) => `#${d.category}`)
        .style('pointer-events', 'none');

      // Simulation Tick
      simulation.on('tick', () => {
        link.attr('d', (d: any) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dr = Math.sqrt(dx * dx + dy * dy) * 1.3;
          return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        });

        node.attr('transform', (d) => `translate(${d.x},${d.y})`);
      });

      return () => {
        simulation.stop();
      };
    } else if ((viewMode as any) === 'tree') {
      // Chronological Tree / Evolutionary Timeline
      const sorted = [...nodesCopy].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const stageColumns: Record<EvolutionStage, number> = {
        'Original Thought': width * 0.12,
        'Seed Idea': width * 0.12,
        'Exploration': width * 0.32,
        'Refinement': width * 0.52,
        'New Direction': width * 0.70,
        'Outcome': width * 0.88,
        'Action / Breakthrough': width * 0.88,
      };

      const stageCounters: Record<string, number> = {
        'Original Thought': 0,
        'Seed Idea': 0,
        'Exploration': 0,
        'Refinement': 0,
        'New Direction': 0,
        'Outcome': 0,
        'Action / Breakthrough': 0,
      };

      sorted.forEach((n) => {
        const colX = stageColumns[n.evolutionStage] || width * 0.5;
        const count = stageCounters[n.evolutionStage] || 0;
        stageCounters[n.evolutionStage] = count + 1;
        n.x = colX + (Math.sin(count) * 18);
        n.y = 90 + count * 85;
      });

      const nodeMap = new Map(sorted.map((n) => [n.id, n]));

      // Column Backdrop Headers
      const stages: EvolutionStage[] = [
        'Original Thought',
        'Exploration',
        'Refinement',
        'New Direction',
        'Outcome',
      ];

      stages.forEach((st) => {
        const x = stageColumns[st];
        const badge = getStageBadgeColor(st);

        // Column line
        g.append('line')
          .attr('x1', x)
          .attr('y1', 40)
          .attr('x2', x)
          .attr('y2', height - 20)
          .attr('stroke', '#e2e8f0')
          .attr('stroke-dasharray', '3,3');

        // Column Header Chip
        const headerG = g.append('g').attr('transform', `translate(${x}, 35)`);
        headerG
          .append('rect')
          .attr('x', -60)
          .attr('y', -14)
          .attr('width', 120)
          .attr('height', 24)
          .attr('rx', 12)
          .attr('fill', badge.bg)
          .attr('stroke', badge.border);

        headerG
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.25em')
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .attr('fill', badge.text)
          .text(`${badge.icon} ${st}`);
      });

      // Links in Tree Mode
      g.append('g')
        .attr('class', 'tree-links')
        .selectAll('path')
        .data(linksCopy)
        .enter()
        .append('path')
        .attr('d', (d: any) => {
          const s = nodeMap.get(typeof d.source === 'object' ? d.source.id : d.source);
          const t = nodeMap.get(typeof d.target === 'object' ? d.target.id : d.target);
          if (!s || !t) return '';
          const curvature = 0.5;
          const xi = d3.interpolateNumber(s.x || 0, t.x || 0);
          const x2 = xi(curvature);
          const x3 = xi(1 - curvature);
          return `M${s.x},${s.y}C${x2},${s.y} ${x3},${t.y} ${t.x},${t.y}`;
        })
        .attr('stroke', (d) => getRelationshipColor(d.relationshipType))
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.5)
        .attr('fill', 'none')
        .attr('marker-end', (d) => `url(#arrow-${d.relationshipType || 'default'})`);

      // Tree Nodes
      const treeNode = g
        .append('g')
        .attr('class', 'tree-nodes')
        .selectAll('.t-node')
        .data(sorted)
        .enter()
        .append('g')
        .attr('class', 't-node cursor-pointer')
        .attr('transform', (d) => `translate(${d.x},${d.y})`)
        .on('click', (_, d) => {
          setSelectedNode(d);
          setIsDrawerOpen(true);
        });

      treeNode
        .append('circle')
        .attr('r', 18)
        .attr('fill', (d) => (d.id === selectedNode?.id ? themeConfig.primary : '#ffffff'))
        .attr('stroke', (d) => {
          if (d.id === selectedNode?.id) return themeConfig.primary;
          return getStageBadgeColor(d.evolutionStage).border;
        })
        .attr('stroke-width', 2.5)
        .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

      treeNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .text((d) => getStageBadgeColor(d.evolutionStage).icon);

      treeNode
        .append('text')
        .attr('dy', 28)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', themeConfig.inkColor)
        .text((d) => (d.title.length > 15 ? d.title.slice(0, 15) + '…' : d.title));
    }
  }, [filteredNodes, filteredLinks, viewMode, selectedNode, themeConfig]);

  // Zoom control helpers
  const handleZoom = (delta: number) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().scaleBy, delta);
  };

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(400).call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
  };

  return (
    <div 
      className="paper-card w-full rounded-3xl border shadow-sm overflow-hidden flex flex-col relative transition-all"
      style={{
        backgroundColor: themeConfig.paperCardBg,
        borderColor: themeConfig.border,
        color: themeConfig.inkColor
      }}
    >
      {/* Top Banner & Control Bar */}
      <div 
        className="px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{
          backgroundColor: themeConfig.paperBg,
          borderColor: themeConfig.border
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-xs"
            style={{ backgroundColor: themeConfig.primary, color: '#ffffff' }}
          >
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight" style={{ color: themeConfig.inkColor }}>
                Connect the Dots & Idea Evolution
              </h2>
              <span 
                className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border shadow-2xs"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  borderColor: themeConfig.border,
                  color: themeConfig.primary
                }}
              >
                Gemini Neural Graph
              </span>
            </div>
            <p className="text-xs opacity-70">
              Discover how your sparks evolve into structured thinking and breakthrough milestones.
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div 
            className="flex items-center rounded-full p-1 border shadow-2xs"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border
            }}
          >
            <button
              onClick={() => setViewMode('garden')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'garden' ? 'shadow-xs text-white' : 'opacity-70 hover:opacity-100'
              }`}
              style={viewMode === 'garden' ? { backgroundColor: themeConfig.primary } : {}}
            >
              <TreeDeciduous className="h-3.5 w-3.5" />
              <span>Mind Tree</span>
            </button>

            <button
              onClick={() => setViewMode('mindmap')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'mindmap' ? 'shadow-xs text-white' : 'opacity-70 hover:opacity-100'
              }`}
              style={viewMode === 'mindmap' ? { backgroundColor: themeConfig.primary } : {}}
            >
              <Network className="h-3.5 w-3.5" />
              <span>Mind Map</span>
            </button>

            <button
              onClick={() => setViewMode('flowchart')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'flowchart' ? 'shadow-xs text-white' : 'opacity-70 hover:opacity-100'
              }`}
              style={viewMode === 'flowchart' ? { backgroundColor: themeConfig.primary } : {}}
            >
              <Workflow className="h-3.5 w-3.5" />
              <span>Flowchart</span>
            </button>

            <button
              onClick={() => setViewMode('stories')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'stories' ? 'shadow-xs text-white' : 'opacity-70 hover:opacity-100'
              }`}
              style={viewMode === 'stories' ? { backgroundColor: themeConfig.primary } : {}}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Story Threads</span>
            </button>
          </div>

          <button
            onClick={analyzeConnections}
            disabled={isLoading || sessions.length === 0}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border shadow-2xs hover:opacity-90 transition-all disabled:opacity-50"
            style={{
              backgroundColor: themeConfig.paperCardBg,
              borderColor: themeConfig.border,
              color: themeConfig.primary
            }}
            title="Rescan and discover deep cognitive connections"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Synthesizing...' : 'Rescan Connections'}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area or Story View */}
      <div 
        ref={containerRef}
        className={`relative w-full overflow-hidden flex items-center justify-center select-none ${
          viewMode === 'garden' 
            ? 'h-[720px] sm:h-[800px]' 
            : viewMode === 'mindmap' 
            ? 'h-[680px] sm:h-[760px]' 
            : 'h-[540px] sm:h-[620px]'
        }`}
        style={{
          backgroundColor: themeConfig.paperCardBg,
        }}
      >
        {sessions.length === 0 ? (
          <div className="text-center p-8 max-w-md">
            <div className="h-14 w-14 rounded-full mx-auto mb-3 flex items-center justify-center shadow-xs" style={{ backgroundColor: themeConfig.chipBg }}>
              <GitBranch className="h-7 w-7 opacity-60" style={{ color: themeConfig.primary }} />
            </div>
            <h3 className="font-serif text-lg font-bold mb-1">Your Idea Graph is Waiting</h3>
            <p className="text-xs opacity-70 mb-4 leading-relaxed">
              Write your first brainstorm or reflection entry. As you record your thoughts, Gemini connects them automatically into an evolving neural web.
            </p>
            {onNewSessionWithPrompt && (
              <button
                onClick={() => onNewSessionWithPrompt("Today I want to brainstorm an exciting new concept...", "Brainstorm")}
                className="px-4 py-2 rounded-full text-white text-xs font-semibold shadow-xs hover:opacity-90 transition-all flex items-center gap-1.5 mx-auto"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <Plus className="h-4 w-4" />
                <span>Start First Brainstorm</span>
              </button>
            )}
          </div>
        ) : viewMode === 'garden' ? (
          <div className="w-full h-full overflow-hidden flex flex-col relative">
            <MindGarden 
              sessions={sessions}
              theme={theme}
              onSelectSession={(session) => onOpenEditor(session.id)}
            />
          </div>
        ) : viewMode === 'mindmap' ? (
          <MindMapView 
            mindMap={graphData?.mindMap} 
            nodes={graphData?.nodes || []} 
            sessions={sessions}
            themeConfig={themeConfig} 
            userName={userName}
            onSelectNode={(node) => {
              setSelectedNode(node);
              setIsDrawerOpen(true);
            }} 
            onOpenEditor={onOpenEditor} 
          />
        ) : viewMode === 'flowchart' ? (
          <FlowchartView 
            flowchart={graphData?.flowchart} 
            nodes={graphData?.nodes || []} 
            sessions={sessions}
            themeConfig={themeConfig} 
            onUpdateSession={onUpdateSession}
            onSelectNode={(node) => {
              setSelectedNode(node);
              setIsDrawerOpen(true);
            }} 
            onOpenEditor={onOpenEditor} 
          />
        ) : viewMode === 'stories' ? (
          // Evolution Storylines View
          <div className="w-full h-full p-6 sm:p-8 overflow-y-auto space-y-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="border-b pb-4" style={{ borderColor: themeConfig.border }}>
                <h3 className="font-serif text-xl font-bold flex items-center gap-2" style={{ color: themeConfig.inkColor }}>
                  <Sparkles className="h-5 w-5" style={{ color: themeConfig.primary }} />
                  <span>Curated Idea Evolution Threads</span>
                </h3>
                <p className="text-xs opacity-75 mt-1">
                  How your core thoughts transformed across time from earliest inspirations to concrete outcomes.
                </p>
              </div>

              {graphData?.evolutionStories && graphData.evolutionStories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {graphData.evolutionStories.map((story) => (
                    <div
                      key={story.id}
                      className="p-5 rounded-2xl border shadow-2xs hover:shadow-sm transition-all relative overflow-hidden"
                      style={{
                        backgroundColor: themeConfig.paperBg,
                        borderColor: themeConfig.border,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span 
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border"
                          style={{
                            backgroundColor: themeConfig.chipBg,
                            borderColor: themeConfig.border,
                            color: themeConfig.primary
                          }}
                        >
                          {story.cluster}
                        </span>
                        <span className="text-[11px] opacity-60">
                          {story.milestoneNodeIds.length} milestones
                        </span>
                      </div>

                      <h4 className="font-serif text-base font-bold mb-2" style={{ color: themeConfig.inkColor }}>
                        {story.theme}
                      </h4>

                      <p className="text-xs leading-relaxed opacity-80 mb-4">
                        {story.narrative}
                      </p>

                      {/* Milestone pills */}
                      <div className="pt-3 border-t flex flex-wrap gap-1.5" style={{ borderColor: themeConfig.border }}>
                        <span className="text-[10px] font-bold opacity-60 uppercase w-full">Connected Entries:</span>
                        {story.milestoneNodeIds.map((nodeId) => {
                          const matchingNode = graphData.nodes.find((n) => n.id === nodeId);
                          if (!matchingNode) return null;
                          return (
                            <button
                              key={nodeId}
                              onClick={() => {
                                setSelectedNode(matchingNode);
                                setIsDrawerOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 hover:opacity-80 transition-all"
                              style={{
                                backgroundColor: themeConfig.paperCardBg,
                                borderColor: themeConfig.border,
                                color: themeConfig.inkColor
                              }}
                            >
                              <span>{matchingNode.title}</span>
                              <ChevronRight className="h-3 w-3 opacity-50" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 opacity-70 text-xs">
                  Writing more journal entries will allow Gemini to synthesize comprehensive evolution storylines.
                </div>
              )}

              {/* Overall Strategic Insights */}
              {graphData?.overallInsights && graphData.overallInsights.length > 0 && (
                <div 
                  className="p-5 rounded-2xl border shadow-xs mt-6"
                  style={{
                    backgroundColor: themeConfig.chipBg,
                    borderColor: themeConfig.border
                  }}
                >
                  <h4 className="font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: themeConfig.primary }}>
                    <Lightbulb className="h-4 w-4" />
                    <span>Cognitive Macro Insights</span>
                  </h4>
                  <ul className="space-y-2 text-xs leading-relaxed opacity-85">
                    {graphData.overallInsights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: themeConfig.primary }} />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          // SVG Interactive Canvas
          <>
            <svg 
              ref={svgRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            />

            {/* Canvas Zoom & Center Floating Toolset */}
            <div 
              className="absolute bottom-4 right-4 flex items-center gap-1.5 p-1 rounded-2xl border shadow-md"
              style={{
                backgroundColor: themeConfig.paperBg,
                borderColor: themeConfig.border
              }}
            >
              <button
                onClick={() => handleZoom(1.2)}
                className="p-2 rounded-xl opacity-75 hover:opacity-100 hover:bg-black/5 transition-all"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleZoom(0.8)}
                className="p-2 rounded-xl opacity-75 hover:opacity-100 hover:bg-black/5 transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-2 rounded-xl opacity-75 hover:opacity-100 hover:bg-black/5 transition-all"
                title="Reset View"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Legend Overlay */}
            <div 
              className="absolute bottom-4 left-4 p-3 rounded-2xl border shadow-md text-[11px] hidden sm:flex flex-col gap-1.5 pointer-events-auto max-w-[200px]"
              style={{
                backgroundColor: themeConfig.paperBg + 'ee',
                borderColor: themeConfig.border,
                backdropFilter: 'blur(4px)'
              }}
            >
              <div className="font-bold opacity-60 uppercase text-[9px] tracking-wider mb-0.5">Evolution Stages</div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                <span>🌱 Original Thought</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span>🌿 Exploration</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                <span>💎 Refinement</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                <span>🧭 New Direction</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>⚡ Outcome</span>
              </div>

              <div className="font-bold opacity-60 uppercase text-[9px] tracking-wider mt-1.5 mb-0.5 pt-1.5 border-t" style={{ borderColor: themeConfig.border }}>
                Relationship Links
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#6366f1' }} />
                  <span>related</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#0284c7' }} />
                  <span>evolved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                  <span>refined</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#0d9488' }} />
                  <span>expands</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#16a34a' }} />
                  <span>leads to</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#ea580c' }} />
                  <span>diverges</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Slide-out Inspector Drawer for Selected Node */}
      {isDrawerOpen && selectedNode && (
        <div 
          className="absolute inset-y-0 right-0 w-full sm:w-96 shadow-2xl border-l z-20 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
          style={{
            backgroundColor: themeConfig.paperCardBg,
            borderColor: themeConfig.border,
            color: themeConfig.inkColor
          }}
        >
          {/* Drawer Header */}
          <div 
            className="p-4 border-b flex items-center justify-between"
            style={{
              backgroundColor: themeConfig.paperBg,
              borderColor: themeConfig.border
            }}
          >
            <div className="flex items-center gap-2">
              <span 
                className="text-xs px-2.5 py-0.5 rounded-full font-bold border"
                style={{
                  backgroundColor: getStageBadgeColor(selectedNode.evolutionStage).bg,
                  color: getStageBadgeColor(selectedNode.evolutionStage).text,
                  borderColor: getStageBadgeColor(selectedNode.evolutionStage).border,
                }}
              >
                {getStageBadgeColor(selectedNode.evolutionStage).icon} {selectedNode.evolutionStage}
              </span>
              <span className="text-xs opacity-60">#{selectedNode.category}</span>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 rounded-full opacity-60 hover:opacity-100 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
            <div>
              <h3 className="font-serif text-lg font-bold" style={{ color: themeConfig.inkColor }}>
                {selectedNode.title}
              </h3>
              <p className="text-[11px] opacity-60 mt-1 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>{new Date(selectedNode.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}</span>
                {selectedNode.mood && <span>• Mood: {selectedNode.mood}</span>}
              </p>
            </div>

            {/* Core Summary */}
            <div 
              className="p-3.5 rounded-2xl border"
              style={{
                backgroundColor: themeConfig.paperBg,
                borderColor: themeConfig.border
              }}
            >
              <span className="font-bold opacity-60 uppercase text-[10px] tracking-wider block mb-1">
                Core Idea Summary
              </span>
              <p className="leading-relaxed opacity-90">{selectedNode.summary}</p>
            </div>

            {/* Key Takeaways */}
            {selectedNode.keyInsights && selectedNode.keyInsights.length > 0 && (
              <div 
                className="p-3.5 rounded-2xl border"
                style={{
                  backgroundColor: themeConfig.chipBg,
                  borderColor: themeConfig.border
                }}
              >
                <span className="font-bold uppercase text-[10px] tracking-wider block mb-2" style={{ color: themeConfig.primary }}>
                  💡 Key Insights
                </span>
                <ul className="space-y-1.5 opacity-90">
                  {selectedNode.keyInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: themeConfig.primary }} />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inbound & Outbound Connections */}
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: themeConfig.border }}>
              <span className="font-bold opacity-60 uppercase text-[10px] tracking-wider block">
                Direct Neural Connections ({connectedInfo.inbound.length + connectedInfo.outbound.length})
              </span>

              {connectedInfo.inbound.length === 0 && connectedInfo.outbound.length === 0 ? (
                <p className="text-[11px] opacity-60 italic">This entry represents an independent spark awaiting further cross-pollination.</p>
              ) : (
                <div className="space-y-2">
                  {connectedInfo.inbound.map(({ node: inNode, link }) => (
                    <div 
                      key={inNode.id}
                      onClick={() => setSelectedNode(inNode)}
                      className="p-2.5 rounded-xl border cursor-pointer hover:opacity-90 transition-all"
                      style={{
                        backgroundColor: themeConfig.paperBg,
                        borderColor: themeConfig.border
                      }}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-sky-600 mb-1">
                        <span>⬅️ Inspired By / Preceded By</span>
                        <span>{link.relationship}</span>
                      </div>
                      <div className="font-semibold text-xs mb-0.5">{inNode.title}</div>
                      <p className="text-[11px] opacity-70 line-clamp-2">{link.explanation}</p>
                    </div>
                  ))}

                  {connectedInfo.outbound.map(({ node: outNode, link }) => (
                    <div 
                      key={outNode.id}
                      onClick={() => setSelectedNode(outNode)}
                      className="p-2.5 rounded-xl border cursor-pointer hover:opacity-90 transition-all"
                      style={{
                        backgroundColor: themeConfig.paperBg,
                        borderColor: themeConfig.border
                      }}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 mb-1">
                        <span>➡️ Evolved Into / Feeds Into</span>
                        <span>{link.relationship}</span>
                      </div>
                      <div className="font-semibold text-xs mb-0.5">{outNode.title}</div>
                      <p className="text-[11px] opacity-70 line-clamp-2">{link.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div 
            className="p-4 border-t flex items-center justify-between gap-2"
            style={{
              backgroundColor: themeConfig.paperBg,
              borderColor: themeConfig.border
            }}
          >
            <button
              onClick={() => {
                onOpenEditor(selectedNode.id);
                setIsDrawerOpen(false);
              }}
              className="flex-1 py-2 px-3 rounded-full text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
              style={{ backgroundColor: themeConfig.primary }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in Journal</span>
            </button>

            {onNewSessionWithPrompt && (
              <button
                onClick={() => {
                  onNewSessionWithPrompt(
                    `Building upon my reflection "${selectedNode.title}" (${selectedNode.evolutionStage}), I want to explore: `,
                    'Brainstorm'
                  );
                  setIsDrawerOpen(false);
                }}
                className="py-2 px-3 rounded-full border text-xs font-semibold flex items-center gap-1 hover:opacity-90 transition-all"
                style={{
                  backgroundColor: themeConfig.paperCardBg,
                  borderColor: themeConfig.border,
                  color: themeConfig.inkColor
                }}
                title="Branch off a new entry connected to this thought"
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>Evolve Idea</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
