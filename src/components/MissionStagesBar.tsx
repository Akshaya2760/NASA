import React from 'react';
import { Satellite, Globe2, Sliders, Headphones, Volume2 } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

export type MissionStageId = 1 | 2 | 3 | 4;

interface MissionStagesBarProps {
  activeStage: MissionStageId;
  onSelectStage: (stage: MissionStageId) => void;
  datasetTitle: string;
  currentYear: number;
  pitchHz: number;
}

const STAGES: {
  id: MissionStageId;
  num: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  toneHz: number;
}[] = [
  {
    id: 1,
    num: 'Stage 01',
    title: 'NASA Earth Data',
    subtitle: 'Select satellite channel',
    icon: Satellite,
    toneHz: 196.0,
  },
  {
    id: 2,
    num: 'Stage 02',
    title: 'Data Processing',
    subtitle: 'Inspect globe & anomalies',
    icon: Globe2,
    toneHz: 261.63,
  },
  {
    id: 3,
    num: 'Stage 03',
    title: 'Sonification Engine',
    subtitle: 'Tune harmonic layers',
    icon: Sliders,
    toneHz: 329.63,
  },
  {
    id: 4,
    num: 'Stage 04',
    title: 'Earth Jukebox',
    subtitle: 'Listen & compare epochs',
    icon: Headphones,
    toneHz: 392.0,
  },
];

export const MissionStagesBar: React.FC<MissionStagesBarProps> = ({
  activeStage,
  onSelectStage,
  datasetTitle,
  currentYear,
  pitchHz,
}) => {
  const handleStageClick = async (stage: (typeof STAGES)[number]) => {
    onSelectStage(stage.id);
    try {
      await audioEngine.init();
      audioEngine.playProbeTone(stage.toneHz, 0.25, 'sine');
    } catch {
      // Ignore if audio context not yet permitted
    }
  };

  return (
    <section
      aria-label="Mission Stages"
      className="w-full rounded-xl bg-[#0A1628] border border-[#1B2B44] p-2.5 sm:p-3 select-none"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => handleStageClick(stage)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-colors cursor-pointer border ${
                isActive
                  ? 'bg-[#101F35] border-[#00D4FF]/60 text-white'
                  : 'bg-transparent border-transparent text-[#9BB0C9] hover:bg-[#101F35]/50 hover:text-white'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-[#00D4FF] text-[#050B18]'
                    : 'bg-[#050B18] text-[#9BB0C9] border border-[#1B2B44]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex flex-col min-w-0">
                <span className={`text-[10px] font-mono ${isActive ? 'text-[#00D4FF]' : 'text-[#9BB0C9]/70'}`}>
                  {stage.num}
                </span>
                <span className="text-xs font-semibold truncate text-white">
                  {stage.title}
                </span>
                <span className="text-[11px] text-[#9BB0C9] truncate">
                  {stage.id === 1 && isActive
                    ? datasetTitle.split('&')[0]
                    : stage.id === 4 && isActive
                    ? `${currentYear} · ${pitchHz.toFixed(0)} Hz`
                    : stage.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
