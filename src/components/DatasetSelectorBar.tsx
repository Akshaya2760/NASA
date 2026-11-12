import React, { useState } from 'react';
import { EICDataset } from '../types';
import {
  Waves,
  Wind,
  Snowflake,
  Flame,
  Trees,
  Sun,
  CloudRain,
  Zap,
  Activity,
  Layers,
  Filter,
  Radio,
  RefreshCw,
} from 'lucide-react';

interface DatasetSelectorBarProps {
  datasets: EICDataset[];
  selectedDatasetId: string;
  onSelectDataset: (datasetId: string) => void;
  onRefreshLiveFeed?: () => void;
  isFetchingLiveFeed?: boolean;
  liveEventCount?: number;
  lastUpdatedText?: string;
}

const ICONS: Record<string, React.ElementType> = {
  Waves,
  Wind,
  Snowflake,
  Flame,
  Trees,
  Sun,
  CloudRain,
  Zap,
  Activity,
  Radio,
};

export const DatasetSelectorBar: React.FC<DatasetSelectorBarProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onRefreshLiveFeed,
  isFetchingLiveFeed,
  liveEventCount = 25,
  lastUpdatedText = 'Real-Time',
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Extract unique categories
  const categories = ['ALL', 'Atmosphere', 'Ocean', 'Cryosphere', 'Biosphere', 'Heliophysics'];

  const filteredDatasets =
    activeCategory === 'ALL'
      ? datasets
      : datasets.filter(
          (d) =>
            d.category.toLowerCase() === activeCategory.toLowerCase() ||
            (activeCategory === 'Atmosphere' && d.category === 'Anthropocene')
        );

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {/* Category Filter Tabs & Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        {/* Left: Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-[#00D4FF]" />
            <span>Category:</span>
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
                activeCategory === cat
                  ? 'bg-[#00D4FF] text-[#050B18] font-bold shadow-[0_0_12px_rgba(0,212,255,0.35)]'
                  : 'bg-[#101F35] text-[#9BB0C9] hover:text-[#EAF4FF] hover:bg-[#101F35]/80 border border-[#00D4FF]/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Right: Operational Feeds Counter & Live Sync Button */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          {onRefreshLiveFeed && (
            <button
              onClick={onRefreshLiveFeed}
              disabled={isFetchingLiveFeed}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101F35] hover:bg-[#00D4FF]/20 border border-[#00D4FF]/30 text-[#00D4FF] transition-all cursor-pointer disabled:opacity-50"
              title="Query NASA EONET v3 for latest satellite events"
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingLiveFeed ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Live NASA Data</span>
              <span className="sm:hidden">Sync</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0A1628] border border-[#00D4FF]/15 text-[#9BB0C9]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#EAF4FF] font-semibold">{liveEventCount}</span>
            <span>Live Events</span>
            <span className="text-[#9BB0C9]/40 hidden md:inline">·</span>
            <span className="text-[10px] text-[#00D4FF] hidden md:inline">{lastUpdatedText}</span>
          </div>
        </div>
      </div>

      {/* Dataset Cards Carousel / Grid */}
      <div className="flex gap-2.5 overflow-x-auto pb-1.5 no-scrollbar">
        {filteredDatasets.map((d) => {
          const isSelected = d.id === selectedDatasetId;
          const isLiveEonet = d.id === 'nasa-live-eonet';
          const IconComponent = ICONS[d.iconName] || Activity;
          const latestFrame = d.frames[d.frames.length - 1];

          return (
            <button
              key={d.id}
              onClick={() => onSelectDataset(d.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-200 shrink-0 text-left cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-[#101F35] border-[#00D4FF] text-[#EAF4FF] shadow-[0_0_18px_rgba(0,212,255,0.25)]'
                  : 'bg-[#0A1628]/90 border-[#00D4FF]/15 text-[#9BB0C9] hover:text-[#EAF4FF] hover:bg-[#101F35] hover:border-[#00D4FF]/40'
              }`}
            >
              {isLiveEonet && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-rose-500/80 to-transparent px-2 py-0.5 rounded-bl-lg font-mono text-[8px] font-bold tracking-widest text-white uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>CURRENT LIVE</span>
                </div>
              )}

              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  isSelected
                    ? 'bg-[#00D4FF] text-[#050B18] shadow-sm font-bold'
                    : isLiveEonet
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                    : 'bg-[#050B18] text-[#00D4FF] border border-[#00D4FF]/25'
                }`}
              >
                <IconComponent className="w-4 h-4" />
              </div>

              <div className="flex flex-col min-w-[145px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold line-clamp-1 text-[#EAF4FF]">
                    {d.title.split('&')[0].replace('(EONET Current)', '')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-[#9BB0C9]">
                  <span className={`${isLiveEonet ? 'text-rose-300' : 'text-[#00D4FF]'} font-semibold tabular-nums`}>
                    {isLiveEonet ? 'Live Feed' : `${latestFrame?.globalAvg} ${d.unit.split(' ')[0]}`}
                  </span>
                  <span>·</span>
                  <span className="text-[#9BB0C9]/80 uppercase">{d.category}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

