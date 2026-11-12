import React from 'react';
import { EICDataset, DatasetFrame, MusicalScale, SonificationAudioState } from '../types';
import { Sliders, Music, Radio, Volume2, Info, Compass, Layers, Activity, Check } from 'lucide-react';

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
    { id: 'voyager', label: 'NASA Voyager Golden Record', desc: 'Harmonic series inspired by the interstellar phonograph' },
    { id: 'dorian', label: 'Oceanic Dorian Mode', desc: 'Natural minor 6th mode for circulation and thermal transport' },
    { id: 'lydian', label: 'Atmospheric Lydian', desc: 'Augmented 4th mode for cloud canopy and gaseous flux' },
    { id: 'minor', label: 'Cryosphere Minor Mode', desc: 'Harmonic minor mode for mass deficit and thermal anomalies' },
    { id: 'pentatonic', label: 'Planetary Pentatonic', desc: '5-tone equal temperament universal balance' },
  ];

  return (
    <div className="w-full rounded-2xl bg-[#101F35] border border-[#00D4FF]/20 p-5 flex flex-col gap-4 select-none glass-panel shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#00D4FF]/15 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#00D4FF]" />
          <h3 className="font-mono text-xs font-bold text-[#EAF4FF] uppercase tracking-wider">DSP Sonification Synthesizer Rack</h3>
        </div>
        <span className="text-[10px] font-mono text-[#00D4FF] bg-[#0A1628] px-2.5 py-1 rounded-md border border-[#00D4FF]/25 font-bold">
          WEB AUDIO CORE • 48 kHz
        </span>
      </div>

      {/* Layer Toggles Strip */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#00D4FF]" />
          <span>Acoustic Layer Generators</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Sub-Bass Drone */}
          <button
            onClick={() => onUpdateAudioState({ layerDrone: !audioState.layerDrone })}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer ${
              audioState.layerDrone
                ? 'bg-[#287BFF]/25 border-[#00D4FF] text-[#EAF4FF] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                : 'bg-[#0A1628]/70 border-[#00D4FF]/10 text-[#9BB0C9] hover:bg-[#0A1628]'
            }`}
          >
            <div className="flex flex-col items-start">
              <span className="font-mono text-xs font-bold uppercase">Sub-Bass Drone</span>
              <span className="text-[10px] font-mono text-[#00D4FF]">Wave: {dataset.sonificationConfig.droneWave.toUpperCase()}</span>
            </div>
            <div
              className={`w-2 h-2 rounded-full ${
                audioState.layerDrone ? 'bg-[#00D4FF] animate-pulse shadow-[0_0_8px_#00D4FF]' : 'bg-[#101F35]'
              }`}
            />
          </button>

          {/* Anomaly Lead */}
          <button
            onClick={() => onUpdateAudioState({ layerLead: !audioState.layerLead })}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer ${
              audioState.layerLead
                ? 'bg-[#287BFF]/25 border-[#00D4FF] text-[#EAF4FF] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                : 'bg-[#0A1628]/70 border-[#00D4FF]/10 text-[#9BB0C9] hover:bg-[#0A1628]'
            }`}
          >
            <div className="flex flex-col items-start">
              <span className="font-mono text-xs font-bold uppercase">Anomaly Lead</span>
              <span className="text-[10px] font-mono text-[#00D4FF] tabular-nums font-bold">{currentFrame.audioPitchHz.toFixed(1)} Hz</span>
            </div>
            <div
              className={`w-2 h-2 rounded-full ${
                audioState.layerLead ? 'bg-[#00D4FF] animate-pulse shadow-[0_0_8px_#00D4FF]' : 'bg-[#101F35]'
              }`}
            />
          </button>

          {/* Environmental Filter Noise */}
          <button
            onClick={() => onUpdateAudioState({ layerAtmosphere: !audioState.layerAtmosphere })}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer ${
              audioState.layerAtmosphere
                ? 'bg-[#287BFF]/25 border-[#00D4FF] text-[#EAF4FF] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                : 'bg-[#0A1628]/70 border-[#00D4FF]/10 text-[#9BB0C9] hover:bg-[#0A1628]'
            }`}
          >
            <div className="flex flex-col items-start">
              <span className="font-mono text-xs font-bold uppercase">Atmosphere Filter</span>
              <span className="text-[10px] font-mono text-[#00D4FF]">Biquad Q: 4.0</span>
            </div>
            <div
              className={`w-2 h-2 rounded-full ${
                audioState.layerAtmosphere ? 'bg-[#00D4FF] animate-pulse shadow-[0_0_8px_#00D4FF]' : 'bg-[#101F35]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Scale Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-[#00D4FF]" />
          <span>Harmonic Quantization Mode</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {scales.map((s) => {
            const isSelected = audioState.activeScale === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onUpdateAudioState({ activeScale: s.id })}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#287BFF]/30 border-[#00D4FF] text-white shadow-[0_0_15px_rgba(0,212,255,0.25)]'
                    : 'bg-[#0A1628]/60 border-[#00D4FF]/10 text-[#9BB0C9] hover:text-[#EAF4FF] hover:bg-[#0A1628] hover:border-[#00D4FF]/30'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono font-bold uppercase tracking-wide">{s.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#00D4FF]" />}
                </div>
                <span className="text-[10px] text-[#9BB0C9] mt-0.5 line-clamp-1 font-sans">{s.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scientific Sonification Algorithm Note */}
      <div className="p-3.5 rounded-xl bg-[#0A1628]/80 border border-[#00D4FF]/20 text-xs text-[#EAF4FF] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#00D4FF] shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-bold text-[#00D4FF] uppercase tracking-wider">
            Mathematical Transduction Function
          </span>
          <p className="text-[#9BB0C9] text-[11px] leading-relaxed font-sans">
            Observation values map logarithmically: <code className="text-[#00D4FF] font-mono bg-[#050B18] px-1.5 py-0.5 rounded">f(x) = f_base · [1 + (ΔV / Range) · 1.5]</code>. Positive temperature or gas anomalies elevate pitch and harmonic density, while ice loss and moisture deficits trigger low-frequency descending drone contours.
          </p>
        </div>
      </div>
    </div>
  );
};


