import React, { useState, useEffect } from 'react';
import { EICDataset, DatasetFrame, SonificationAudioState } from '../types';
import { audioEngine } from '../audio/AudioEngine';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  CircleDot,
  Download,
  Gauge,
  Ear,
  RotateCcw,
  History,
  Scale,
  ArrowRightLeft,
  Sparkles,
  Clock,
} from 'lucide-react';

interface JukeboxPlayerControlsProps {
  dataset: EICDataset;
  currentFrameIndex: number;
  onSelectFrameIndex: (idx: number) => void;
  audioState: SonificationAudioState;
  onUpdateAudioState: (partial: Partial<SonificationAudioState>) => void;
}

export const JukeboxPlayerControls: React.FC<JukeboxPlayerControlsProps> = ({
  dataset,
  currentFrameIndex,
  onSelectFrameIndex,
  audioState,
  onUpdateAudioState,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);

  // Previous Year & A/B Audio Comparison States
  const [showYearCompare, setShowYearCompare] = useState(false);
  const [comparePrevYearIndex, setComparePrevYearIndex] = useState(0); // Default to earliest historical baseline
  const [isAbLooping, setIsAbLooping] = useState(false);
  const [abActiveSide, setAbActiveSide] = useState<'prev' | 'curr'>('curr');

  const currentFrame = dataset.frames[currentFrameIndex] || dataset.frames[0];
  const previousYearIndex = currentFrameIndex > 0 ? currentFrameIndex - 1 : 0;
  const previousYearFrame = dataset.frames[previousYearIndex] || dataset.frames[0];
  const latestFrame = dataset.frames[dataset.frames.length - 1] || currentFrame;
  const comparePrevFrame = dataset.frames[comparePrevYearIndex] || dataset.frames[0];

  const handleTogglePlay = async () => {
    await audioEngine.init();
    const nextPlay = !audioState.isPlaying;
    onUpdateAudioState({ isPlaying: nextPlay });

    if (nextPlay) {
      audioEngine.updateFrame(
        currentFrame.audioPitchHz,
        currentFrame.anomaly,
        dataset.sonificationConfig.droneWave,
        dataset.sonificationConfig.leadWave,
        dataset.sonificationConfig.filterMinHz,
        { ...audioState, isPlaying: true }
      );
    } else {
      audioEngine.applyState({ ...audioState, isPlaying: false });
    }
  };

  const handleStop = () => {
    setIsAbLooping(false);
    onUpdateAudioState({ isPlaying: false });
    audioEngine.applyState({ ...audioState, isPlaying: false });
    onSelectFrameIndex(0);
  };

  const handlePrevFrame = () => {
    const nextIdx = (currentFrameIndex - 1 + dataset.frames.length) % dataset.frames.length;
    handleSelectAndPlayYear(nextIdx);
  };

  const handleNextFrame = () => {
    const nextIdx = (currentFrameIndex + 1) % dataset.frames.length;
    handleSelectAndPlayYear(nextIdx);
  };

  // Jump to and immediately audition the sound of the previous year
  const handleHearPreviousYear = async () => {
    await audioEngine.init();
    setIsAbLooping(false);
    const prevIdx = currentFrameIndex > 0 ? currentFrameIndex - 1 : 0;
    onSelectFrameIndex(prevIdx);
    const targetFrame = dataset.frames[prevIdx];
    onUpdateAudioState({ isPlaying: true });
    audioEngine.updateFrame(
      targetFrame.audioPitchHz,
      targetFrame.anomaly,
      dataset.sonificationConfig.droneWave,
      dataset.sonificationConfig.leadWave,
      dataset.sonificationConfig.filterMinHz,
      { ...audioState, isPlaying: true }
    );
  };

  // Immediately select and audition any year from the timeline
  const handleSelectAndPlayYear = async (idx: number) => {
    await audioEngine.init();
    setIsAbLooping(false);
    onSelectFrameIndex(idx);
    const targetFrame = dataset.frames[idx];
    onUpdateAudioState({ isPlaying: true });
    audioEngine.updateFrame(
      targetFrame.audioPitchHz,
      targetFrame.anomaly,
      dataset.sonificationConfig.droneWave,
      dataset.sonificationConfig.leadWave,
      dataset.sonificationConfig.filterMinHz,
      { ...audioState, isPlaying: true }
    );
  };

  // Play specific frame for A/B audition
  const handlePlaySpecificFrame = async (frame: DatasetFrame, idx: number) => {
    await audioEngine.init();
    setIsAbLooping(false);
    onSelectFrameIndex(idx);
    onUpdateAudioState({ isPlaying: true });
    audioEngine.updateFrame(
      frame.audioPitchHz,
      frame.anomaly,
      dataset.sonificationConfig.droneWave,
      dataset.sonificationConfig.leadWave,
      dataset.sonificationConfig.filterMinHz,
      { ...audioState, isPlaying: true }
    );
  };

  // Automatic A/B alternation loop: flip between previous year and current year every 2.4s
  useEffect(() => {
    if (!isAbLooping) return;

    const interval = setInterval(() => {
      setAbActiveSide((prev) => {
        const nextSide = prev === 'prev' ? 'curr' : 'prev';
        const targetFrame = nextSide === 'prev' ? comparePrevFrame : latestFrame;
        const targetIdx = nextSide === 'prev' ? comparePrevYearIndex : dataset.frames.length - 1;

        onSelectFrameIndex(targetIdx);
        audioEngine.updateFrame(
          targetFrame.audioPitchHz,
          targetFrame.anomaly,
          dataset.sonificationConfig.droneWave,
          dataset.sonificationConfig.leadWave,
          dataset.sonificationConfig.filterMinHz,
          { ...audioState, isPlaying: true }
        );
        return nextSide;
      });
    }, 2400);

    return () => clearInterval(interval);
  }, [isAbLooping, comparePrevFrame, latestFrame, comparePrevYearIndex, dataset, audioState, onSelectFrameIndex]);

  const handleToggleRecording = async () => {
    await audioEngine.init();
    if (!isRecording) {
      const started = audioEngine.startRecording();
      if (started) {
        setIsRecording(true);
      }
    } else {
      const blob = await audioEngine.stopRecording();
      setIsRecording(false);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nasa-eic-${dataset.id}-${currentFrame.year}-sonification.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  // Accessibility: Read verbal description via Web Speech API
  const handleSpeakDescription = () => {
    if (!('speechSynthesis' in window)) return;
    if (speechActive) {
      window.speechSynthesis.cancel();
      setSpeechActive(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${currentFrame.label}. Metric value: ${currentFrame.globalAvg} ${dataset.unit}. Scientific summary: ${currentFrame.scientificSummary}. Sound characteristics: ${currentFrame.audioDescription}`
    );
    utterance.rate = 1.05;
    utterance.onend = () => setSpeechActive(false);
    utterance.onerror = () => setSpeechActive(false);

    setSpeechActive(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full rounded-2xl bg-[#101F35] border border-[#00D4FF]/20 p-5 shadow-2xl flex flex-col gap-4 select-none glass-panel">
      {/* Top Scrubber Strip: Multi-year Anomaly Timeline */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#EAF4FF] uppercase tracking-wider">Mission Chronological Epoch</span>
            <span className="text-[#9BB0C9]">·</span>
            <span className="text-[#00D4FF] font-mono text-xs uppercase font-bold">{currentFrame.label}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle A/B Year Audio Comparator */}
            <button
              onClick={() => setShowYearCompare(!showYearCompare)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
                showYearCompare
                  ? 'bg-[#00D4FF] text-[#050B18] font-bold border-[#00D4FF] shadow-sm'
                  : 'bg-[#0A1628] text-[#00D4FF] hover:text-white border-[#00D4FF]/30 hover:border-[#00D4FF]'
              }`}
              title="Compare the acoustic pitch of previous historical years with the current year"
            >
              <Scale className="w-3 h-3" />
              <span>A/B Year Audio Compare</span>
            </button>

            <div className="flex items-center gap-2 font-mono text-xs text-[#9BB0C9]">
              <span className="uppercase text-[10px]">Baseline:</span>
              <span className="text-[#EAF4FF] font-mono font-bold tabular-nums">
                {currentFrame.globalAvg} {dataset.unit}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-bold ${
                  currentFrame.anomaly > 0
                    ? 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                    : 'bg-[#0A1628] border border-[#00D4FF]/40 text-[#00D4FF]'
                }`}
              >
                Δ {currentFrame.anomaly > 0 ? `+${currentFrame.anomaly}` : currentFrame.anomaly}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Timeline Stepper Buttons - Click to Hear That Year */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {dataset.frames.map((f, idx) => {
            const isSelected = idx === currentFrameIndex;
            return (
              <button
                key={`frame-${f.year}-${idx}`}
                onClick={() => handleSelectAndPlayYear(idx)}
                className={`flex flex-col items-start p-2.5 rounded-xl transition-all border text-left cursor-pointer group relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#287BFF]/30 border-[#00D4FF] text-[#EAF4FF] shadow-[0_0_15px_rgba(0,212,255,0.25)]'
                    : 'bg-[#0A1628]/80 border-[#00D4FF]/10 text-[#9BB0C9] hover:text-[#EAF4FF] hover:bg-[#0A1628] hover:border-[#00D4FF]/30'
                }`}
                title={`Click to listen to Year ${f.year} (${f.audioPitchHz.toFixed(1)} Hz)`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs font-bold tabular-nums">{f.year}</span>
                    {isSelected && audioState.isPlaying && (
                      <Volume2 className="w-3 h-3 text-[#00D4FF] animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#00D4FF]">{f.musicalNote.split(' ')[0]}</span>
                </div>
                <div className="w-full h-1.5 bg-[#050B18] border border-[#00D4FF]/15 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      f.anomaly > 0 ? 'bg-gradient-to-r from-amber-400 to-rose-500' : 'bg-gradient-to-r from-[#287BFF] to-[#00D4FF]'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(15, (Math.abs(f.anomaly) / (Math.abs(dataset.maxVal) || 10)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[8px] font-mono text-[#9BB0C9]/60 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to hear
                </span>
              </button>
            );
          })}
        </div>

        {/* A/B Year Audio Comparator Panel (Hear Sound of Previous Years) */}
        {showYearCompare && (
          <div className="p-4 rounded-xl bg-[#0A1628]/95 border border-[#00D4FF]/30 flex flex-col gap-3 shadow-xl mt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#00D4FF]/15 pb-2.5">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#00D4FF]" />
                <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                  Planetary Acoustic Shift Comparator
                </span>
                <span className="text-[10px] font-mono text-[#00D4FF] bg-[#101F35] px-2 py-0.5 rounded border border-[#00D4FF]/25">
                  Hear Previous Year vs Current Year
                </span>
              </div>

              {/* Loop A/B Button */}
              <button
                onClick={() => setIsAbLooping(!isAbLooping)}
                className={`px-3 py-1 rounded-lg font-mono text-[10px] uppercase tracking-wider font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                  isAbLooping
                    ? 'bg-amber-400 text-[#050B18] border-amber-300 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                    : 'bg-[#101F35] text-[#EAF4FF] border-[#00D4FF]/30 hover:border-[#00D4FF]'
                }`}
                title="Automatically alternate audio playback between Previous Year and Current Year every 2.4 seconds"
              >
                <ArrowRightLeft className={`w-3 h-3 ${isAbLooping ? 'animate-spin' : ''}`} />
                <span>{isAbLooping ? 'Stop A/B Loop' : 'Alternate A ↔ B Audio (Every 2s)'}</span>
              </button>
            </div>

            {/* Comparison Grid: Side A (Previous Year) vs Side B (Current Year) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
              {/* Side A: Previous Year (Historical Baseline) */}
              <div className={`md:col-span-5 p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                isAbLooping && abActiveSide === 'prev'
                  ? 'bg-[#287BFF]/25 border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.3)]'
                  : 'bg-[#101F35]/80 border-[#00D4FF]/15'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#9BB0C9] uppercase">
                    <History className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Previous Year Epoch</span>
                  </div>
                  {/* Select previous year */}
                  <select
                    value={comparePrevYearIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value, 10);
                      setComparePrevYearIndex(idx);
                      handlePlaySpecificFrame(dataset.frames[idx], idx);
                    }}
                    className="bg-[#050B18] border border-[#00D4FF]/30 rounded-lg px-2 py-0.5 text-[11px] font-mono text-[#00D4FF] focus:outline-none cursor-pointer"
                  >
                    {dataset.frames.slice(0, -1).map((f, idx) => (
                      <option key={`compare-opt-${f.year}-${idx}`} value={idx}>
                        Year {f.year} ({f.musicalNote.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-white tabular-nums">
                    {comparePrevFrame.year}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-xs text-[#00D4FF] font-bold">
                      {comparePrevFrame.audioPitchHz.toFixed(1)} Hz
                    </span>
                    <span className="text-[10px] font-mono text-[#9BB0C9]">
                      {comparePrevFrame.musicalNote}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[#9BB0C9] line-clamp-1 font-sans">
                  {comparePrevFrame.label}: {comparePrevFrame.globalAvg} {dataset.unit}
                </div>

                {/* Instant Audition Button for Previous Year */}
                <button
                  onClick={() => handlePlaySpecificFrame(comparePrevFrame, comparePrevYearIndex)}
                  className="w-full py-2 rounded-lg font-mono text-[11px] uppercase tracking-wider font-bold bg-[#0A1628] hover:bg-[#287BFF]/30 border border-[#00D4FF]/30 text-[#00D4FF] hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Hear Year {comparePrevFrame.year} Sound</span>
                </button>
              </div>

              {/* Center Shift Delta Indicator (2 cols) */}
              <div className="md:col-span-2 flex flex-col items-center justify-center p-2 rounded-xl bg-[#050B18]/70 border border-[#00D4FF]/10 text-center gap-1.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#9BB0C9]">Frequency Shift</span>
                <span className={`text-sm font-bold font-mono tabular-nums ${
                  latestFrame.audioPitchHz >= comparePrevFrame.audioPitchHz ? 'text-rose-400' : 'text-[#00D4FF]'
                }`}>
                  {latestFrame.audioPitchHz >= comparePrevFrame.audioPitchHz ? '+' : ''}
                  {(latestFrame.audioPitchHz - comparePrevFrame.audioPitchHz).toFixed(1)} Hz
                </span>
                <span className="text-[10px] font-mono text-[#EAF4FF] px-1.5 py-0.5 rounded bg-[#101F35] border border-[#00D4FF]/20">
                  {Math.round(((latestFrame.audioPitchHz - comparePrevFrame.audioPitchHz) / comparePrevFrame.audioPitchHz) * 100)}% Shift
                </span>
                <span className="text-[9px] font-mono text-[#9BB0C9]">
                  {comparePrevFrame.year} → {latestFrame.year}
                </span>
              </div>

              {/* Side B: Current Year (Live Telemetry) */}
              <div className={`md:col-span-5 p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                isAbLooping && abActiveSide === 'curr'
                  ? 'bg-rose-950/40 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-[#101F35]/80 border-[#00D4FF]/15'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-300 uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span>Current Observation Year</span>
                  </div>
                  <span className="bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                    Latest Epoch
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-white tabular-nums">
                    {latestFrame.year}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-xs text-rose-300 font-bold">
                      {latestFrame.audioPitchHz.toFixed(1)} Hz
                    </span>
                    <span className="text-[10px] font-mono text-[#9BB0C9]">
                      {latestFrame.musicalNote}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[#9BB0C9] line-clamp-1 font-sans">
                  {latestFrame.label}: {latestFrame.globalAvg} {dataset.unit} (Δ +{latestFrame.anomaly})
                </div>

                {/* Instant Audition Button for Current Year */}
                <button
                  onClick={() => handlePlaySpecificFrame(latestFrame, dataset.frames.length - 1)}
                  className="w-full py-2 rounded-lg font-mono text-[11px] uppercase tracking-wider font-bold bg-[#0A1628] hover:bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Hear Year {latestFrame.year} Sound</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Transport Controls: Play, Pause, Stop, Volume, Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#00D4FF]/15">
        {/* Left: Playback Controls (Play, Pause, Stop, Hear Previous Year, Prev, Next) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevFrame}
            className="p-2.5 rounded-xl bg-[#0A1628] hover:bg-[#287BFF]/20 border border-[#00D4FF]/20 text-[#9BB0C9] hover:text-[#EAF4FF] transition-all cursor-pointer"
            title="Step to Previous Epoch Frame"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause Button */}
          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-lg cursor-pointer ${
              audioState.isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 text-[#050B18] shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                : 'bg-[#00D4FF] hover:bg-[#287BFF] text-[#050B18] hover:text-white shadow-[0_0_20px_rgba(0,212,255,0.4)]'
            }`}
          >
            {audioState.isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                PAUSE
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                PLAY SONIFICATION
              </>
            )}
          </button>

          {/* Dedicated Stop Button */}
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0A1628] hover:bg-rose-950/60 border border-[#00D4FF]/20 hover:border-rose-500/50 text-[#9BB0C9] hover:text-rose-300 font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer"
            title="Stop Sonification and Reset Timeline to Beginning"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>STOP</span>
          </button>

          {/* Dedicated "Hear Previous Year" Instant Audition Button */}
          <button
            onClick={handleHearPreviousYear}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0A1628] hover:bg-[#287BFF]/25 border border-[#00D4FF]/35 text-[#00D4FF] hover:text-[#EAF4FF] font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer shadow-sm group"
            title={`Listen directly to Previous Year (${previousYearFrame.year})`}
          >
            <History className="w-3.5 h-3.5 text-[#00D4FF] group-hover:-rotate-45 transition-transform" />
            <span className="hidden sm:inline">Hear Previous Year</span>
            <span className="sm:hidden">Prev Year</span>
            <span className="font-bold text-white font-mono">({previousYearFrame.year})</span>
          </button>

          <button
            onClick={handleNextFrame}
            className="p-2.5 rounded-xl bg-[#0A1628] hover:bg-[#287BFF]/20 border border-[#00D4FF]/20 text-[#9BB0C9] hover:text-[#EAF4FF] transition-all cursor-pointer"
            title="Step to Next Epoch Frame"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed Multiplier */}
          <div className="hidden sm:flex items-center gap-1 bg-[#0A1628] px-2 py-1.5 rounded-xl border border-[#00D4FF]/20 text-xs">
            <Gauge className="w-3.5 h-3.5 text-[#00D4FF] mr-1" />
            {[0.5, 1, 1.5, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => onUpdateAudioState({ tempoSpeed: spd })}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  audioState.tempoSpeed === spd
                    ? 'bg-[#00D4FF] text-[#050B18] font-bold shadow-sm'
                    : 'text-[#9BB0C9] hover:text-[#EAF4FF]'
                }`}
              >
                {spd}X
              </button>
            ))}
          </div>
        </div>

        {/* Center: Accessibility Audio Narration */}
        <button
          onClick={handleSpeakDescription}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all cursor-pointer ${
            speechActive
              ? 'bg-emerald-950 border-emerald-400 text-emerald-300 animate-pulse'
              : 'bg-[#0A1628] border-[#00D4FF]/20 text-[#EAF4FF] hover:border-[#00D4FF]'
          }`}
          title="Narrate current scientific telemetry and sound characteristics"
        >
          <Ear className="w-3.5 h-3.5 text-[#00D4FF]" />
          <span>{speechActive ? 'Speaking...' : 'Audio Description'}</span>
        </button>

        {/* Right: Record Audio & Volume Slider */}
        <div className="flex items-center gap-3">
          {/* Record to WebM */}
          <button
            onClick={handleToggleRecording}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-[#0A1628] border-[#00D4FF]/20 text-[#EAF4FF] hover:border-[#00D4FF]'
            }`}
            title="Record live sonification stream to WebM audio"
          >
            {isRecording ? (
              <>
                <CircleDot className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[#00D4FF]" />
                <span>Export Sound</span>
              </>
            )}
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 bg-[#0A1628] px-3 py-2 rounded-xl border border-[#00D4FF]/20">
            <button
              onClick={() => onUpdateAudioState({ isMuted: !audioState.isMuted })}
              className="text-[#9BB0C9] hover:text-[#00D4FF] transition-colors cursor-pointer"
              title={audioState.isMuted ? 'Unmute' : 'Mute'}
            >
              {audioState.isMuted || audioState.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#00D4FF]" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioState.isMuted ? 0 : audioState.volume}
              onChange={(e) =>
                onUpdateAudioState({
                  volume: parseFloat(e.target.value),
                  isMuted: false,
                })
              }
              className="w-20 sm:w-24 accent-[#00D4FF] h-1.5 rounded-full bg-[#050B18] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

