import React from 'react';
import { EICDataset, DatasetFrame, MusicalScale, SonificationAudioState } from '../types';
import { Sliders, Music, Info, Layers, Check } from 'lucide-react';

interface SonificationSynthesizerPanelProps {
  dataset: EICDataset;
  currentFrame: DatasetFrame;
  audioState: SonificationAudioState;
  onUpdateAudioState: (partial: Partial<SonificationAudioState>) => void;
}

export const SonificationSynthesizerPanel: React.FC<SonificationSynthesizerPanelProps> = ({
  dataset,
  currentFrame,
  audioState,
  onUpdateAudioState,
}) => {
  const scales: { id: MusicalScale; label: string; desc: string }[] = [
    { id: 'voyager', label: 'Voyager Harmonic Series', desc: 'Interstellar harmonic intervals' },
    { id: 'dorian', label: 'Oceanic Dorian', desc: 'Circulation & thermal transport' },
    { id: 'lydian', label: 'Atmospheric Lydian', desc: 'Cloud canopy & gaseous flux' },
    { id: 'minor', label: 'Cryosphere Minor', desc: 'Ice deficit & thermal shifts' },
    { id: 'pentatonic', label: 'Planetary Pentatonic', desc: '5-tone equal temperament' },
  ];

  return (
    <div className="w-full flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1B2B44] pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#00D4FF]" />
          <h3 className="font-mono text-xs font-semibold text-[#EAF4FF] uppercase tracking-wider">
            Sonification Synthesizer
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#9BB0C9]">48 kHz Web Audio</span>
      </div>

      {/* Acoustic Layer Toggles */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#00D4FF]" />
          <span>Acoustic Layers</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onUpdateAudioState({ layerDrone: !audioState.layerDrone })}
            className={`flex flex-col items-start p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              audioState.layerDrone
                ? 'bg-[#101F35] border-[#00D4FF]/60 text-[#EAF4FF]'
                : 'bg-[#050B18] border-[#1B2B44] text-[#9BB0C9] hover:text-white'
            }`}
          >
            <span className="font-semibold text-[11px]">Sub-Bass</span>
            <span className="text-[10px] font-mono text-[#00D4FF] mt-0.5 uppercase">
              {dataset.sonificationConfig.droneWave}
            </span>
          </button>

          <button
            onClick={() => onUpdateAudioState({ layerLead: !audioState.layerLead })}
            className={`flex flex-col items-start p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              audioState.layerLead
                ? 'bg-[#101F35] border-[#00D4FF]/60 text-[#EAF4FF]'
                : 'bg-[#050B18] border-[#1B2B44] text-[#9BB0C9] hover:text-white'
            }`}
          >
            <span className="font-semibold text-[11px]">Anomaly Lead</span>
            <span className="text-[10px] font-mono text-[#00D4FF] mt-0.5 tabular-nums">
              {currentFrame.audioPitchHz.toFixed(1)} Hz
            </span>
          </button>

          <button
            onClick={() => onUpdateAudioState({ layerAtmosphere: !audioState.layerAtmosphere })}
            className={`flex flex-col items-start p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              audioState.layerAtmosphere
                ? 'bg-[#101F35] border-[#00D4FF]/60 text-[#EAF4FF]'
                : 'bg-[#050B18] border-[#1B2B44] text-[#9BB0C9] hover:text-white'
            }`}
          >
            <span className="font-semibold text-[11px]">Biquad Filter</span>
            <span className="text-[10px] font-mono text-[#00D4FF] mt-0.5">Q 4.0</span>
          </button>
        </div>
      </div>

      {/* Harmonic Quantization Mode */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-[#00D4FF]" />
          <span>Harmonic Quantization Scale</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {scales.map((s) => {
            const isSelected = audioState.activeScale === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onUpdateAudioState({ activeScale: s.id })}
                className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#101F35] border-[#00D4FF]/60 text-white'
                    : 'bg-[#050B18] border-[#1B2B44] text-[#9BB0C9] hover:text-[#EAF4FF]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-medium">{s.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#00D4FF]" />}
                </div>
                <span className="text-[10px] text-[#9BB0C9]/80 line-clamp-1">{s.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mathematical Formula Note */}
      <div className="pt-2 border-t border-[#1B2B44] text-[11px] text-[#9BB0C9] flex items-start gap-2 leading-relaxed">
        <Info className="w-3.5 h-3.5 text-[#00D4FF] shrink-0 mt-0.5" />
        <p>
          Observations map logarithmically:{' '}
          <code className="text-[#00D4FF] font-mono">f(x) = f_base · [1 + (ΔV / Range) · 1.5]</code>.
        </p>
      </div>
    </div>
  );
};
