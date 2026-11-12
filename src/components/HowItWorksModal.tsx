import React, { useState } from 'react';
import {
  Satellite,
  Cpu,
  Music,
  Headphones,
  CheckCircle2,
  X,
  ArrowRight,
  ExternalLink,
  Volume2,
  Sparkles,
  Layers,
  Activity,
} from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: 'NASA Earth Data',
      subtitle: 'Earth observations and visual frames',
      icon: Satellite,
      badge: 'Level 1-2 Radiometry',
      color: 'from-sky-500 to-cyan-500',
      description:
        'Raw multispectral radiance, infrared thermal readings, radar backscatter, and laser altimetry acquired directly from NASA Earth observing satellite constellations.',
      details: [
        'MODIS (Terra & Aqua): Thermal sea surface & NDVI greening',
        'OCO-2 / AIRS: Column atmospheric CO₂ & methane absorption lines',
        'GRACE-FO: Satellite-to-satellite K-band gravimetric polar mass loss',
        'VIIRS (Suomi NPP): Day-Night Band lights & 375m active fire radiometry',
        'GPM IMERG: Multi-satellite constellation precipitation radar',
      ],
      soundDemo: () => audioEngine.playProbeTone(130.81, 0.7, 'triangle'),
      soundLabel: 'Listen: Raw Baseline Carrier (130.8 Hz)',
    },
    {
      step: 2,
      title: 'Data Processing',
      subtitle: 'Extract changing values and patterns',
      icon: Cpu,
      badge: 'Level 3-4 Grid Anomaly',
      color: 'from-amber-500 to-orange-500',
      description:
        'Raw orbital swaths are calibrated, atmospheric-corrected, and interpolated into gridded global time series (2000 to present) to isolate historical anomalies against scientific baselines.',
      details: [
        'Climatological Baseline Subtraction: Computing ΔV (anomalies)',
        'Spatial Coordinate Clustering: Geo-located hotspots & extreme weather events',
        'Time-Series Normalization: Logarithmic scaling across sensor dynamic ranges',
        'Atmospheric Filtering: Separating aerosol optical depth from cloud masking',
      ],
      soundDemo: () => audioEngine.playProbeTone(220.0, 0.7, 'sawtooth'),
      soundLabel: 'Listen: Extracted Anomaly Frequency (220 Hz)',
    },
    {
      step: 3,
      title: 'Sonification Engine',
      subtitle: 'Map scientific values to pitch, rhythm and volume',
      icon: Music,
      badge: 'Web Audio DSP Architecture',
      color: 'from-purple-500 to-indigo-500',
      description:
        'Mathematical transduction converts changing environmental metrics into musical frequencies, resonant filter cutoffs, dynamic rhythm pulses, and spatial stereo panning.',
      details: [
        'Frequency Formula: f(x) = f_base * (1 + (ΔV / Range) * 1.5)',
        'Harmonic Scales: NASA Voyager Golden Record, Dorian, Lydian, Minor, Pentatonic',
        'Atmospheric Resonance: BiquadFilter Q-factor swept by aerosol opacity',
        'Spatial Panning: Longitude azimuth maps to real-time stereo orbital panning',
      ],
      soundDemo: () => {
        audioEngine.playProbeTone(146.83, 0.4, 'sine');
        setTimeout(() => audioEngine.playProbeTone(220.0, 0.4, 'triangle'), 150);
        setTimeout(() => audioEngine.playProbeTone(293.66, 0.6, 'sawtooth'), 300);
      },
      soundLabel: 'Listen: Synthesized Harmonic Triad',
    },
    {
      step: 4,
      title: 'Earth Jukebox Interface',
      subtitle: 'Synchronized Earth visuals and sound',
      icon: Headphones,
      badge: 'Multisensory Planetary Experience',
      color: 'from-emerald-500 to-teal-500',
      description:
        'The final experience brings together synchronized 3D/2D Earth visual frames, real-time audio FFT visualizers, interactive coordinate probing, and the AeroSonic AI co-pilot.',
      details: [
        '3D/2D Earth Visualizer: Raycasted interactive coordinate probe',
        'FFT Spectrum & Oscilloscope: Visual feedback matching audio timbre',
        'AeroSonic AI: Gemini 3.8 Flash answers questions about sound science',
        'Accessible Design: Screen-reader voice descriptions & keyboard shortcuts',
      ],
      soundDemo: () => {
        audioEngine.playProbeTone(261.63, 0.3, 'sine');
        setTimeout(() => audioEngine.playProbeTone(329.63, 0.3, 'sine'), 120);
        setTimeout(() => audioEngine.playProbeTone(392.00, 0.3, 'sine'), 240);
        setTimeout(() => audioEngine.playProbeTone(523.25, 0.8, 'sawtooth'), 360);
      },
      soundLabel: 'Listen: Earth Jukebox Complete Sonification',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050B18]/85 backdrop-blur-xl">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#0A1628] border border-[#00D4FF]/30 p-6 shadow-2xl flex flex-col gap-6 select-none relative overflow-hidden glass-panel">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9BB0C9] hover:text-white p-1 rounded-lg hover:bg-[#101F35] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col gap-1 border-b border-[#00D4FF]/20 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#101F35] border border-[#00D4FF]/30 text-[#00D4FF]">
              NASA Space Apps Challenge
            </span>
            <span className="text-xs text-[#9BB0C9] font-mono">EIC Science Translation Architecture</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            03. How It Works: Translating NASA Earth Data Into Sound
          </h2>
          <p className="text-xs text-[#9BB0C9] leading-relaxed max-w-2xl">
            From raw satellite radiometric observations down to synthesized harmonic audio, follow the 4-step pipeline that powers the Earth Jukebox.
          </p>
        </div>

        {/* 4-Step Stepper Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {steps.map((s) => {
            const Icon = s.icon;
            const isSelected = activeStep === s.step;
            return (
              <button
                key={s.step}
                onClick={() => setActiveStep(s.step)}
                className={`flex flex-col p-3 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#101F35] border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.25)]'
                    : 'bg-[#050B18]/70 border-[#00D4FF]/10 hover:border-[#00D4FF]/30 hover:bg-[#101F35]/60'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs bg-[#00D4FF] text-[#050B18] shadow-sm`}
                  >
                    0{s.step}
                  </div>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#00D4FF]' : 'text-[#9BB0C9]'}`} />
                </div>
                <span className="font-semibold text-xs text-white line-clamp-1">{s.title}</span>
                <span className="text-[10px] text-[#9BB0C9] line-clamp-1 mt-0.5">{s.subtitle}</span>
              </button>
            );
          })}
        </div>

        {/* Active Step Detailed Showcase */}
        {(() => {
          const current = steps.find((s) => s.step === activeStep) || steps[0];
          const CurrentIcon = current.icon;
          return (
            <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-900/50 border border-slate-800/80 p-5 flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr ${current.color}`}
                    >
                      <CurrentIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        Step {current.step}: {current.title}
                      </h3>
                      <span className="text-xs text-sky-400 font-mono">{current.subtitle}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    {current.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{current.description}</p>

                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Core Pipeline Operations:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {current.details.map((d, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] flex items-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sound Simulation Probe for this stage */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Acoustic Stage Preview:</span>
                </div>

                <button
                  onClick={current.soundDemo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-semibold text-xs transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  {current.soundLabel}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Stage {activeStep} of 4</span>
          </div>

          <div className="flex items-center gap-2">
            {activeStep > 1 && (
              <button
                onClick={() => setActiveStep((prev) => prev - 1)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              >
                Previous Stage
              </button>
            )}
            {activeStep < 4 ? (
              <button
                onClick={() => setActiveStep((prev) => prev + 1)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition"
              >
                Next Stage
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition"
              >
                Listen to Our Planet! 🚀
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
