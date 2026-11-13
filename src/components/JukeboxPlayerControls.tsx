import React, { useState, useEffect } from 'react';
import { EICDataset, DatasetFrame, SonificationAudioState } from '../types';
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
  History,
  Scale,
  ArrowRightLeft,
} from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

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

  const [showYearCompare, setShowYearCompare] = useState(false);
  const [comparePrevYearIndex, setComparePrevYearIndex] = useState(0);
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
    <div className="w-full rounded-xl bg-[#0A1628] border border-[#1B2B44] p-4 sm:p-5 flex flex-col gap-4 select-none">
      {/* Epoch Header & Year Comparison Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[11px] font-semibold text-[#9BB0C9] uppercase tracking-wider">
            Epoch Timeline
          </span>
          <span className="text-[#9BB0C9]/40">·</span>
          <span className="text-[#EAF4FF] font-semibold">{currentFrame.label}</span>
          <span className="text-[#9BB0C9]/40">·</span>
          <span className="text-[#00D4FF] tabular-nums">
            {currentFrame.globalAvg} {dataset.unit} (Δ {currentFrame.anomaly > 0 ? `+${currentFrame.anomaly}` : currentFrame.anomaly})
          </span>
        </div>

        <button
          onClick={() => setShowYearCompare(!showYearCompare)}
          className={`px-3 py-1 rounded-md text-[11px] font-mono transition-colors border flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
            showYearCompare
              ? 'bg-[#101F35] text-[#00D4FF] border-[#00D4FF]/60 font-semibold'
              : 'bg-[#050B18] text-[#9BB0C9] hover:text-[#EAF4FF] border-[#1B2B44]'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-[#00D4FF]" />
          <span>Compare Previous Year</span>
        </button>
      </div>

      {/* Chronological Epoch Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {dataset.frames.map((f, idx) => {
          const isSelected = idx === currentFrameIndex;
          return (
            <button
              key={`frame-${f.year}-${idx}`}
              onClick={() => handleSelectAndPlayYear(idx)}
              className={`flex flex-col items-start p-2.5 rounded-lg transition-colors border text-left cursor-pointer ${
                isSelected
                  ? 'bg-[#101F35] border-[#00D4FF]/70 text-[#EAF4FF]'
                  : 'bg-[#050B18] border-[#1B2B44] text-[#9BB0C9] hover:text-[#EAF4FF] hover:border-[#2A4268]'
              }`}
              title={`Listen to Year ${f.year} (${f.audioPitchHz.toFixed(1)} Hz)`}
            >
              <div className="flex items-center justify-between w-full font-mono text-xs tabular-nums">
                <span className="font-semibold text-[#EAF4FF]">{f.year}</span>
                <span className="text-[10px] text-[#00D4FF]">{f.musicalNote.split(' ')[0]}</span>
              </div>
              <div className="w-full h-1 bg-[#101F35] rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${f.anomaly > 0 ? 'bg-rose-400' : 'bg-[#00D4FF]'}`}
                  style={{
                    width: `${Math.min(100, Math.max(15, (Math.abs(f.anomaly) / (Math.abs(dataset.maxVal) || 10)) * 100))}%`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Optional A/B Previous Year vs Current Year Comparison */}
      {showYearCompare && (
        <div className="p-4 rounded-xl bg-[#050B18] border border-[#1B2B44] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1B2B44] pb-2.5">
            <span className="font-mono text-xs font-semibold text-[#EAF4FF] uppercase tracking-wider">
              A/B Epoch Acoustic Comparison
            </span>
            <button
              onClick={() => setIsAbLooping(!isAbLooping)}
              className={`px-3 py-1 rounded-md font-mono text-[11px] transition-colors border flex items-center gap-1.5 cursor-pointer ${
                isAbLooping
                  ? 'bg-amber-400 text-[#050B18] border-amber-300 font-semibold'
                  : 'bg-[#0A1628] text-[#EAF4FF] border-[#1B2B44] hover:border-[#00D4FF]/50'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{isAbLooping ? 'Stop Alternating' : 'Alternate A/B Every 2.4s'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-stretch">
            <div
              className={`md:col-span-5 p-3 rounded-lg border flex flex-col justify-between gap-2 ${
                isAbLooping && abActiveSide === 'prev'
                  ? 'bg-[#101F35] border-[#00D4FF]'
                  : 'bg-[#0A1628] border-[#1B2B44]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#9BB0C9] uppercase">Previous Year</span>
                <select
                  value={comparePrevYearIndex}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    setComparePrevYearIndex(idx);
                    handlePlaySpecificFrame(dataset.frames[idx], idx);
                  }}
                  className="bg-[#050B18] border border-[#1B2B44] rounded px-2 py-0.5 text-[11px] font-mono text-[#00D4FF] cursor-pointer"
                >
                  {dataset.frames.slice(0, -1).map((f, idx) => (
                    <option key={`compare-opt-${f.year}-${idx}`} value={idx}>
                      {f.year} ({f.musicalNote.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-baseline justify-between font-mono tabular-nums">
                <span className="text-lg font-bold text-white">{comparePrevFrame.year}</span>
                <span className="text-xs text-[#00D4FF]">{comparePrevFrame.audioPitchHz.toFixed(1)} Hz</span>
              </div>
              <button
                onClick={() => handlePlaySpecificFrame(comparePrevFrame, comparePrevYearIndex)}
                className="w-full py-1.5 rounded-md font-mono text-[11px] bg-[#050B18] hover:bg-[#101F35] border border-[#1B2B44] text-[#00D4FF] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear {comparePrevFrame.year}</span>
              </button>
            </div>

            <div className="md:col-span-1 flex flex-col items-center justify-center text-center font-mono tabular-nums py-1">
              <span className="text-[10px] text-[#9BB0C9] uppercase">Shift</span>
              <span
                className={`text-xs font-bold ${
                  latestFrame.audioPitchHz >= comparePrevFrame.audioPitchHz ? 'text-rose-400' : 'text-[#00D4FF]'
                }`}
              >
                {latestFrame.audioPitchHz >= comparePrevFrame.audioPitchHz ? '+' : ''}
                {(latestFrame.audioPitchHz - comparePrevFrame.audioPitchHz).toFixed(1)} Hz
              </span>
            </div>

            <div
              className={`md:col-span-5 p-3 rounded-lg border flex flex-col justify-between gap-2 ${
                isAbLooping && abActiveSide === 'curr'
                  ? 'bg-[#101F35] border-rose-400'
                  : 'bg-[#0A1628] border-[#1B2B44]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-rose-300 uppercase">Current Epoch</span>
                <span className="text-[10px] font-mono text-[#9BB0C9]">Latest</span>
              </div>
              <div className="flex items-baseline justify-between font-mono tabular-nums">
                <span className="text-lg font-bold text-white">{latestFrame.year}</span>
                <span className="text-xs text-rose-300">{latestFrame.audioPitchHz.toFixed(1)} Hz</span>
              </div>
              <button
                onClick={() => handlePlaySpecificFrame(latestFrame, dataset.frames.length - 1)}
                className="w-full py-1.5 rounded-md font-mono text-[11px] bg-[#050B18] hover:bg-[#101F35] border border-[#1B2B44] text-rose-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear {latestFrame.year}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Transport Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1B2B44]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrevFrame}
            className="p-2 rounded-lg bg-[#050B18] hover:bg-[#101F35] border border-[#1B2B44] text-[#9BB0C9] hover:text-white transition-colors cursor-pointer"
            title="Previous Epoch"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              audioState.isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 text-[#050B18]'
                : 'bg-[#00D4FF] hover:bg-[#287BFF] text-[#050B18] hover:text-white'
            }`}
          >
            {audioState.isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play Sonification</span>
              </>
            )}
          </button>

          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#050B18] hover:bg-[#101F35] border border-[#1B2B44] text-[#9BB0C9] hover:text-white font-mono text-xs transition-colors cursor-pointer"
            title="Stop & Reset"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>

          <button
            onClick={handleHearPreviousYear}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#050B18] hover:bg-[#101F35] border border-[#1B2B44] text-[#00D4FF] font-mono text-xs transition-colors cursor-pointer"
            title={`Listen to Previous Year (${previousYearFrame.year})`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Hear {previousYearFrame.year}</span>
          </button>

          <button
            onClick={handleNextFrame}
            className="p-2 rounded-lg bg-[#050B18] hover:bg-[#101F35] border border-[#1B2B44] text-[#9BB0C9] hover:text-white transition-colors cursor-pointer"
            title="Next Epoch"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="hidden sm:flex items-center gap-1 bg-[#050B18] px-2 py-1.5 rounded-lg border border-[#1B2B44] text-xs">
            <Gauge className="w-3.5 h-3.5 text-[#9BB0C9] mr-1" />
            {[0.5, 1, 1.5, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => onUpdateAudioState({ tempoSpeed: spd })}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  audioState.tempoSpeed === spd
                    ? 'bg-[#101F35] text-[#00D4FF] font-semibold'
                    : 'text-[#9BB0C9] hover:text-[#EAF4FF]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSpeakDescription}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              speechActive
                ? 'bg-emerald-950 border-emerald-500/60 text-emerald-300'
                : 'bg-[#050B18] border-[#1B2B44] text-[#EAF4FF] hover:border-[#00D4FF]/50'
            }`}
          >
            <Ear className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span>{speechActive ? 'Speaking' : 'Audio Brief'}</span>
          </button>

          <button
            onClick={handleToggleRecording}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              isRecording
                ? 'bg-rose-950 border-rose-500/60 text-rose-300'
                : 'bg-[#050B18] border-[#1B2B44] text-[#EAF4FF] hover:border-[#00D4FF]/50'
            }`}
          >
            {isRecording ? (
              <>
                <CircleDot className="w-3.5 h-3.5 text-rose-400" />
                <span>Stop Rec</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[#00D4FF]" />
                <span>Export Audio</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 bg-[#050B18] px-3 py-2 rounded-lg border border-[#1B2B44]">
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
              className="w-20 accent-[#00D4FF] h-1.5 rounded-full bg-[#101F35] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
