import React, { useRef, useEffect, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { EICDataset, DatasetFrame } from '../types';
import { Activity, Radio, Waves, Zap } from 'lucide-react';

interface AudioVisualizerProps {
  dataset: EICDataset;
  currentFrame: DatasetFrame;
  isPlaying: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  dataset,
  currentFrame,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visualMode, setVisualMode] = useState<'bars' | 'wave' | 'dual'>('dual');
  const [rmsVolume, setRmsVolume] = useState(0);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 128;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Fetch live data from AudioEngine analyser
      if (audioEngine.analyser && isPlaying) {
        audioEngine.getByteFrequencyData(freqData);
        audioEngine.getByteTimeDomainData(timeData);

        // Compute RMS level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (timeData[i] - 128) / 128;
          sum += val * val;
        }
        setRmsVolume(Math.min(100, Math.sqrt(sum / bufferLength) * 220));
      } else {
        // Idle gentle simulated hum
        for (let i = 0; i < bufferLength; i++) {
          freqData[i] = Math.max(0, 10 + Math.sin(Date.now() * 0.003 + i * 0.2) * 8);
          timeData[i] = 128 + Math.sin(Date.now() * 0.005 + i * 0.1) * 6;
        }
        setRmsVolume(6);
      }

      // Draw subtle background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Mode: Spectrum Bars
      if (visualMode === 'bars' || visualMode === 'dual') {
        const barWidth = (width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (freqData[i] / 255) * (visualMode === 'dual' ? height * 0.55 : height * 0.85);

          // Dynamic gradient based on dataset ramp
          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, dataset.colorRamp.low);
          grad.addColorStop(0.5, dataset.colorRamp.mid);
          grad.addColorStop(1, dataset.colorRamp.high);

          ctx.fillStyle = grad;
          ctx.fillRect(x, height - barHeight, barWidth - 1.5, barHeight);

          // Top peak dot
          if (barHeight > 4) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, height - barHeight - 2, barWidth - 1.5, 2);
          }

          x += barWidth;
          if (x > width) break;
        }
      }

      // Mode: Oscilloscope Waveform
      if (visualMode === 'wave' || visualMode === 'dual') {
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#0284c7';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * (visualMode === 'dual' ? height * 0.35 : height * 0.5)) + (visualMode === 'dual' ? height * 0.2 : height * 0.25);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [visualMode, isPlaying, dataset, currentFrame]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-[#101F35] border border-[#00D4FF]/20 p-4 flex flex-col justify-between select-none glass-panel shadow-2xl">
      {/* Top Header & Frequency Telemetry */}
      <div className="flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#EAF4FF] uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span>Harmonic Spectrogram</span>
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#0A1628] border border-[#00D4FF]/30 text-[#00D4FF] font-bold">
            {currentFrame.musicalNote}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#050B18] border border-[#00D4FF]/20 text-[#EAF4FF] tabular-nums font-bold">
            {currentFrame.audioPitchHz.toFixed(1)} Hz
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono text-[#9BB0C9]">
            FFT-128 · 48 kHz PCM
          </span>
        </div>

        {/* Display Mode Selector */}
        <div className="flex items-center gap-0.5 bg-[#0A1628] p-0.5 rounded-lg border border-[#00D4FF]/20 text-[10px] font-mono uppercase">
          <button
            onClick={() => setVisualMode('dual')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              visualMode === 'dual' ? 'bg-[#00D4FF] text-[#050B18] font-bold shadow-sm' : 'text-[#9BB0C9] hover:text-[#EAF4FF]'
            }`}
          >
            Dual
          </button>
          <button
            onClick={() => setVisualMode('bars')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              visualMode === 'bars' ? 'bg-[#00D4FF] text-[#050B18] font-bold shadow-sm' : 'text-[#9BB0C9] hover:text-[#EAF4FF]'
            }`}
          >
            FFT
          </button>
          <button
            onClick={() => setVisualMode('wave')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              visualMode === 'wave' ? 'bg-[#00D4FF] text-[#050B18] font-bold shadow-sm' : 'text-[#9BB0C9] hover:text-[#EAF4FF]'
            }`}
          >
            Waveform
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full my-1 rounded-lg" />

      {/* Bottom Meter Strip */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[#9BB0C9] z-10 pt-2 border-t border-[#00D4FF]/15">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#00D4FF]" />
          <span className="uppercase text-[#9BB0C9]">VU RMS:</span>
          <div className="w-28 h-2 bg-[#050B18] border border-[#00D4FF]/25 rounded-full overflow-hidden flex items-center p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#287BFF] via-[#00D4FF] to-amber-400 transition-all duration-75 rounded-full"
              style={{ width: `${Math.min(100, rmsVolume)}%` }}
            />
          </div>
          <span className="text-[#00D4FF] font-mono tabular-nums font-bold">{rmsVolume.toFixed(0)} dBFS</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Waves className="w-3 h-3 text-[#00D4FF]" />
            <span className="uppercase text-[#EAF4FF] font-semibold">SCALE: {dataset.sonificationConfig.scale.toUpperCase()}</span>
          </div>
          <span className="text-[#9BB0C9]/40">·</span>
          <span className="uppercase text-[#9BB0C9]">LEAD: {dataset.sonificationConfig.leadWave}</span>
          <span className="text-[#9BB0C9]/40">·</span>
          <span className="uppercase text-[#9BB0C9]">DRONE: {dataset.sonificationConfig.droneWave}</span>
        </div>
      </div>
    </div>
  );
};

