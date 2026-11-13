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
      {/* Category Filter & Live NASA Feed Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer shrink-0 border ${
                activeCategory === cat
                  ? 'bg-[#101F35] text-[#00D4FF] border-[#00D4FF]/50 font-semibold'
                  : 'bg-transparent text-[#9BB0C9] hover:text-[#EAF4FF] border-transparent hover:border-[#1B2B44]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-[#9BB0C9]">
          <span className="tabular-nums">
            <strong className="text-[#EAF4FF] font-semibold">{liveEventCount}</strong> live NASA EONET events
            <span className="hidden md:inline text-[#9BB0C9]/70"> · {lastUpdatedText}</span>
          </span>

          {onRefreshLiveFeed && (
            <button
              onClick={onRefreshLiveFeed}
              disabled={isFetchingLiveFeed}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0A1628] hover:bg-[#101F35] border border-[#1B2B44] hover:border-[#00D4FF]/40 text-[#EAF4FF] transition-colors cursor-pointer disabled:opacity-50"
              title="Query NASA EONET v3 for latest satellite events"
            >
              <RefreshCw className={`w-3 h-3 text-[#00D4FF] ${isFetchingLiveFeed ? 'animate-spin' : ''}`} />
              <span>Sync NASA Feed</span>
            </button>
          )}
        </div>
      </div>

      {/* Observation Channel Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filteredDatasets.map((d) => {
          const isSelected = d.id === selectedDatasetId;
          const isLiveEonet = d.id === 'nasa-live-eonet';
          const IconComponent = ICONS[d.iconName] || Activity;
          const latestFrame = d.frames[d.frames.length - 1];

          return (
            <button
              key={d.id}
              onClick={() => onSelectDataset(d.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-colors shrink-0 text-left cursor-pointer ${
                isSelected
                  ? 'bg-[#101F35] border-[#00D4FF]/70 text-[#EAF4FF]'
                  : 'bg-[#0A1628] border-[#1B2B44] text-[#9BB0C9] hover:text-[#EAF4FF] hover:border-[#2A4268]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  isSelected
                    ? 'bg-[#00D4FF]/15 text-[#00D4FF] border-[#00D4FF]/40'
                    : isLiveEonet
                    ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                    : 'bg-[#050B18] text-[#9BB0C9] border-[#1B2B44]'
                }`}
              >
                <IconComponent className="w-4 h-4" />
              </div>

              <div className="flex flex-col min-w-[148px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold line-clamp-1 text-[#EAF4FF]">
                    {d.title.split('&')[0].replace('(EONET Current)', '').trim()}
                  </span>
                  {isLiveEonet && (
                    <span className="text-[9px] font-mono font-semibold text-rose-300 uppercase tracking-wider shrink-0">
                      LIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-[#9BB0C9] tabular-nums">
                  <span className={isLiveEonet ? 'text-rose-300' : 'text-[#00D4FF]'}>
                    {isLiveEonet ? 'EONET v3' : `${latestFrame?.globalAvg} ${d.unit.split(' ')[0]}`}
                  </span>
                  <span className="text-[#9BB0C9]/40">·</span>
                  <span>{d.category}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
