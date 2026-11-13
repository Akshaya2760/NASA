import React, { useRef, useEffect, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { EICDataset, DatasetFrame } from '../types';
import { Radio } from 'lucide-react';

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

      if (audioEngine.analyser && isPlaying) {
        audioEngine.getByteFrequencyData(freqData);
        audioEngine.getByteTimeDomainData(timeData);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (timeData[i] - 128) / 128;
          sum += val * val;
        }
        setRmsVolume(Math.min(100, Math.sqrt(sum / bufferLength) * 220));
      } else {
        for (let i = 0; i < bufferLength; i++) {
          freqData[i] = Math.max(0, 8 + Math.sin(Date.now() * 0.003 + i * 0.2) * 6);
          timeData[i] = 128 + Math.sin(Date.now() * 0.004 + i * 0.1) * 5;
        }
        setRmsVolume(5);
      }

      // Instrument graticule
      ctx.strokeStyle = 'rgba(155, 176, 201, 0.06)';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (visualMode === 'bars' || visualMode === 'dual') {
        const barWidth = (width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (freqData[i] / 255) * (visualMode === 'dual' ? height * 0.52 : height * 0.85);
          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, dataset.colorRamp.low);
          grad.addColorStop(0.55, dataset.colorRamp.mid);
          grad.addColorStop(1, dataset.colorRamp.high);

          ctx.fillStyle = grad;
          ctx.fillRect(x, height - barHeight, barWidth - 1.5, barHeight);
          x += barWidth;
          if (x > width) break;
        }
      }

      if (visualMode === 'wave' || visualMode === 'dual') {
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y =
            v * (visualMode === 'dual' ? height * 0.34 : height * 0.5) +
            (visualMode === 'dual' ? height * 0.2 : height * 0.25);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [visualMode, isPlaying, dataset, currentFrame]);

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
    <div className="relative w-full h-40 rounded-xl overflow-hidden bg-[#070D19] border border-[#1B2B44] p-3.5 flex flex-col justify-between select-none">
      <div className="flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-2 font-mono">
          <Radio className="w-3.5 h-3.5 text-[#00D4FF]" />
          <span className="text-[11px] font-semibold text-[#EAF4FF] uppercase tracking-wider">
            Spectrogram
          </span>
          <span className="text-[#9BB0C9]/40">·</span>
          <span className="text-[11px] text-[#00D4FF] font-semibold tabular-nums">
            {currentFrame.audioPitchHz.toFixed(1)} Hz
          </span>
          <span className="text-[11px] text-[#9BB0C9] hidden sm:inline">
            ({currentFrame.musicalNote})
          </span>
        </div>

        <div className="flex items-center gap-0.5 bg-[#050B18] p-0.5 rounded-md border border-[#1B2B44] text-[10px] font-mono uppercase">
          {(['dual', 'bars', 'wave'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setVisualMode(mode)}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                visualMode === mode
                  ? 'bg-[#101F35] text-[#00D4FF] font-semibold'
                  : 'text-[#9BB0C9] hover:text-[#EAF4FF]'
              }`}
            >
              {mode === 'bars' ? 'FFT' : mode === 'wave' ? 'Wave' : 'Dual'}
            </button>
          ))}
        </div>
      </div>

      <canvas ref={canvasRef} className="w-full h-full my-1" />

      <div className="flex items-center justify-between text-[10px] font-mono text-[#9BB0C9] z-10 pt-2 border-t border-[#1B2B44]">
        <div className="flex items-center gap-2">
          <span>RMS</span>
          <div className="w-24 h-1.5 bg-[#050B18] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00D4FF] transition-all duration-75"
              style={{ width: `${Math.min(100, rmsVolume)}%` }}
            />
          </div>
          <span className="text-[#EAF4FF] tabular-nums">{rmsVolume.toFixed(0)} dBFS</span>
        </div>

        <div className="flex items-center gap-2 uppercase">
          <span>{dataset.sonificationConfig.scale}</span>
          <span className="text-[#9BB0C9]/40">·</span>
          <span>{dataset.sonificationConfig.leadWave}</span>
        </div>
      </div>
    </div>
  );
};
