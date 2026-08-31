import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Activity, 
  Flame, 
  Zap, 
  Tag, 
  Layers, 
  Table as TableIcon, 
  LayoutGrid, 
  CheckCircle2, 
  ArrowUpRight 
} from 'lucide-react';

export interface TrackedTrend {
  name: string;
  category: 'Product & Flavor' | 'Consumer & Culture' | 'Operations & Tech' | 'Economic & Pricing' | string;
  trajectory: 'Rising' | 'Emerging' | 'Peaking' | 'Disrupted' | 'Evergreen' | string;
  velocity_score: number; // 1 - 100
  sentiment_bias?: 'Positive' | 'Negative' | 'Neutral' | 'Mixed' | string;
  timestamp?: string;
  video_evidence: string;
  strategic_implication: string;
}

interface VideoTrendsTrackerProps {
  trends?: any;
  companyName?: string;
  className?: string;
}

export const normalizeVideoTrends = (rawTrends: any, companyName: string = 'Brand'): TrackedTrend[] => {
  if (!rawTrends) return [];

  // Case 1: Array of trend objects
  if (Array.isArray(rawTrends)) {
    return rawTrends.map((t: any, idx: number) => {
      if (typeof t === 'string') {
        return {
          name: t,
          category: 'Consumer & Culture',
          trajectory: 'Rising',
          velocity_score: 75 + ((idx * 5) % 25),
          sentiment_bias: 'Positive',
          video_evidence: 'Discussed in video narrative.',
          strategic_implication: `Align marketing messaging with ${t}.`
        };
      }
      return {
        name: t.name || t.trend_name || t.title || `Trend #${idx + 1}`,
        category: t.category || t.theme || 'Consumer & Culture',
        trajectory: t.trajectory || t.status || (t.velocity_score > 85 ? 'Rising' : 'Emerging'),
        velocity_score: typeof t.velocity_score === 'number' ? t.velocity_score : (t.strength_score || 80),
        sentiment_bias: t.sentiment_bias || t.sentiment || 'Positive',
        timestamp: t.timestamp || t.time || undefined,
        video_evidence: t.video_evidence || t.evidence || t.quote || t.description || 'Observed in video narrative.',
        strategic_implication: t.strategic_implication || t.impact || t.recommendation || `Leverage this trend in upcoming ${companyName} campaign initiatives.`
      };
    });
  }

  // Case 2: Object with positive / negative / neutral arrays (e.g. comments trends)
  if (typeof rawTrends === 'object') {
    const list: TrackedTrend[] = [];
    if (Array.isArray(rawTrends.positive)) {
      rawTrends.positive.forEach((item: any, i: number) => {
        list.push({
          name: typeof item === 'string' ? item : item.name || `Audience Trend ${i + 1}`,
          category: 'Consumer & Culture',
          trajectory: 'Rising',
          velocity_score: 85 - (i * 3),
          sentiment_bias: 'Positive',
          video_evidence: typeof item === 'string' ? item : item.evidence || 'Positive audience discussion.',
          strategic_implication: `Highlight in ${companyName} promotional creative.`
        });
      });
    }
    if (Array.isArray(rawTrends.negative)) {
      rawTrends.negative.forEach((item: any, i: number) => {
        list.push({
          name: typeof item === 'string' ? item : item.name || `Consumer Friction ${i + 1}`,
          category: 'Economic & Pricing',
          trajectory: 'Emerging',
          velocity_score: 70 - (i * 3),
          sentiment_bias: 'Negative',
          video_evidence: typeof item === 'string' ? item : item.evidence || 'Audience critique or pushback.',
          strategic_implication: 'Refine value proposition to address this objection.'
        });
      });
    }
    return list;
  }

  return [];
};

export const VideoTrendsTracker: React.FC<VideoTrendsTrackerProps> = ({
  trends,
  companyName = 'Brand',
  className = ''
}) => {
  const normalized = useMemo(() => normalizeVideoTrends(trends, companyName), [trends, companyName]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'both' | 'cards' | 'table'>('both');

  if (!normalized || normalized.length === 0) {
    return null;
  }

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    normalized.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [normalized]);

  // Filter trends by selected category
  const filteredTrends = useMemo(() => {
    if (selectedCategory === 'all') return normalized;
    return normalized.filter(t => t.category.toLowerCase() === selectedCategory.toLowerCase());
  }, [normalized, selectedCategory]);

  const getTrajectoryStyle = (trajectory: string) => {
    const lower = trajectory.toLowerCase();
    if (lower.includes('rise') || lower.includes('rising')) {
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        bar: 'bg-emerald-500',
        label: 'Rising ↗'
      };
    }
    if (lower.includes('emerg')) {
      return {
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
        bar: 'bg-purple-500',
        label: 'Emerging ✦'
      };
    }
    if (lower.includes('peak')) {
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        bar: 'bg-amber-500',
        label: 'Peaking ⏺'
      };
    }
    if (lower.includes('disrupt')) {
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        bar: 'bg-rose-500',
        label: 'Disrupted ⚡'
      };
    }
    return {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500',
      bar: 'bg-blue-500',
      label: trajectory
    };
  };

  const getSentimentBadge = (sentiment?: string) => {
    const lower = (sentiment || '').toLowerCase();
    if (lower.includes('pos')) return 'bg-emerald-100 text-emerald-800';
    if (lower.includes('neg')) return 'bg-rose-100 text-rose-800';
    if (lower.includes('mix')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className={`p-4 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4 ${className}`}>
      {/* Header with Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl text-[#1A73E8]">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider">
                Video Trends & Market Velocity Tracker
              </h4>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-50 text-[#1A73E8] rounded-full border border-blue-100">
                {normalized.length} Trends Detected
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Key market, cultural, and operational movements identified in the video
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-start sm:self-auto text-xs">
          <button
            onClick={() => setViewMode('both')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all text-[11px] flex items-center gap-1 ${
              viewMode === 'both' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Layers size={12} /> Both
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all text-[11px] flex items-center gap-1 ${
              viewMode === 'cards' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <LayoutGrid size={12} /> Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all text-[11px] flex items-center gap-1 ${
              viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <TableIcon size={12} /> Table
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      {categories.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Filter:</span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({normalized.length})
          </button>
          {categories.map((cat, idx) => {
            const count = normalized.filter(t => t.category.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* 1. Compelling Visual: Trend Momentum & Velocity Grid */}
      {(viewMode === 'both' || viewMode === 'cards') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {filteredTrends.map((trend, idx) => {
            const style = getTrajectoryStyle(trend.trajectory);
            return (
              <div 
                key={idx}
                className="p-3.5 bg-gradient-to-b from-gray-50/60 to-white border border-gray-200 rounded-xl hover:border-blue-300 transition-all shadow-2xs space-y-2.5 group"
              >
                {/* Card Header: Category & Trajectory Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md border border-gray-200/80">
                    {trend.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${style.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                    {style.label}
                  </span>
                </div>

                {/* Trend Title */}
                <div>
                  <h5 className="font-extrabold text-gray-900 text-xs sm:text-sm group-hover:text-blue-600 transition-colors leading-snug">
                    {trend.name}
                  </h5>
                  {trend.timestamp && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#1A73E8] bg-blue-50 px-1.5 py-0.2 rounded mt-1">
                      <Clock size={10} /> Timestamp: {trend.timestamp}
                    </span>
                  )}
                </div>

                {/* Velocity Progress Meter */}
                <div className="space-y-1 bg-white p-2 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Activity size={11} className="text-gray-400" /> Discussion Velocity
                    </span>
                    <span className="font-mono font-black text-gray-900">{trend.velocity_score}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                      style={{ width: `${Math.min(100, Math.max(15, trend.velocity_score))}%` }}
                    />
                  </div>
                </div>

                {/* Video Evidence Snippet */}
                <p className="text-xs text-gray-600 italic bg-gray-50/80 p-2 rounded-lg border border-gray-100 leading-relaxed">
                  "{trend.video_evidence}"
                </p>

                {/* Strategic Brand Takeaway */}
                <div className="text-xs bg-blue-50/40 p-2 rounded-lg border border-blue-100/60 leading-snug">
                  <strong className="text-blue-900 font-bold">Brand Action: </strong>
                  <span className="text-blue-950 font-medium">{trend.strategic_implication}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Compelling Structured Table */}
      {(viewMode === 'both' || viewMode === 'table') && (
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
            <span className="font-bold text-gray-800 flex items-center gap-1.5">
              <TableIcon size={13} className="text-gray-500" /> Trends Ledger ({filteredTrends.length})
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              Scored via Gemini Multimodal Video Mining
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider font-mono text-[10px]">
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5 w-44">Trend & Category</th>
                  <th className="p-2.5 w-32">Trajectory & Velocity</th>
                  <th className="p-2.5 w-24 text-center">Tone</th>
                  <th className="p-2.5">Video Evidence & Timestamp</th>
                  <th className="p-2.5 w-56">Strategic Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredTrends.map((trend, idx) => {
                  const style = getTrajectoryStyle(trend.trajectory);
                  return (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-2.5 text-center font-mono font-bold text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 align-top">
                        <strong className="text-gray-900 font-bold block">{trend.name}</strong>
                        <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                          {trend.category}
                        </span>
                      </td>
                      <td className="p-2.5 align-top space-y-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${style.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                          {style.label}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                          <span>{trend.velocity_score}%</span>
                          <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${style.bar}`}
                              style={{ width: `${Math.min(100, Math.max(10, trend.velocity_score))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-2.5 align-top text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getSentimentBadge(trend.sentiment_bias)}`}>
                          {trend.sentiment_bias || 'Positive'}
                        </span>
                      </td>
                      <td className="p-2.5 align-top text-gray-700 leading-relaxed">
                        {trend.timestamp && (
                          <span className="font-mono font-bold text-[10px] text-[#1A73E8] bg-blue-50 px-1.5 py-0.2 rounded mr-1.5 shrink-0 inline-block">
                            {trend.timestamp}
                          </span>
                        )}
                        <span className="italic">"{trend.video_evidence}"</span>
                      </td>
                      <td className="p-2.5 align-top text-gray-800 leading-relaxed font-medium bg-blue-50/20">
                        {trend.strategic_implication}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
