import React, { useEffect, useRef, useState } from 'react';
import { EICDataset, DatasetFrame, SonificationAudioState } from '../types';
import { Share2, X, Copy, Check, Download } from 'lucide-react';

interface SessionShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: EICDataset;
  currentFrame: DatasetFrame;
  frameIndex: number;
  audioState: SonificationAudioState;
}

export const SessionShareModal: React.FC<SessionShareModalProps> = ({
  isOpen,
  onClose,
  dataset,
  currentFrame,
  frameIndex,
  audioState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = (() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('ds', dataset.id);
    url.searchParams.set('yr', String(frameIndex));
    url.searchParams.set('sc', audioState.activeScale);
    return url.toString();
  })();

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 1200;
    const h = 630;
    canvas.width = w;
    canvas.height = h;

    // Background
    ctx.fillStyle = '#050B18';
    ctx.fillRect(0, 0, w, h);

    // Subtle scientific grid
    ctx.strokeStyle = 'rgba(27, 43, 68, 0.55)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = '#1B2B44';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    // Right decorative planetary arc
    const cx = 960;
    const cy = 315;
    const r = 185;
    const globeGrad = ctx.createRadialGradient(cx - 50, cy - 50, 20, cx, cy, r);
    globeGrad.addColorStop(0, '#1D4ED8');
    globeGrad.addColorStop(0.6, '#0B3D91');
    globeGrad.addColorStop(1, '#050B18');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = globeGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Waveform rings around globe
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.22)';
    ctx.lineWidth = 1.5;
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + ring * 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Header label
    ctx.fillStyle = '#00D4FF';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('NASA EARTH INFORMATION CENTER · EARTH JUKEBOX', 72, 92);

    // Title
    ctx.fillStyle = '#EAF4FF';
    ctx.font = 'bold 42px sans-serif';
    const titleLines = dataset.title.length > 32 ? [dataset.title.slice(0, 32), dataset.title.slice(32)] : [dataset.title];
    ctx.fillText(titleLines[0], 72, 165);
    if (titleLines[1]) {
      ctx.fillText(titleLines[1].trim(), 72, 215);
    }

    // Sensor subtitle
    ctx.fillStyle = '#9BB0C9';
    ctx.font = '20px monospace';
    ctx.fillText(`MISSION SENSOR: ${dataset.missionSensor}`, 72, 265);

    // Telemetry metrics block
    const metricsY = 335;
    ctx.fillStyle = '#0A1628';
    ctx.fillRect(72, metricsY, 640, 175);
    ctx.strokeStyle = '#1B2B44';
    ctx.strokeRect(72, metricsY, 640, 175);

    ctx.fillStyle = '#9BB0C9';
    ctx.font = '16px monospace';
    ctx.fillText('EPOCH', 102, metricsY + 42);
    ctx.fillText('OBSERVATION VALUE', 260, metricsY + 42);
    ctx.fillText('CARRIER PITCH', 515, metricsY + 42);

    ctx.fillStyle = '#EAF4FF';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(String(currentFrame.year), 102, metricsY + 90);
    ctx.fillStyle = '#00D4FF';
    ctx.fillText(`${currentFrame.globalAvg} ${dataset.unit.split(' ')[0]}`, 260, metricsY + 90);
    ctx.fillStyle = '#EAF4FF';
    ctx.fillText(`${currentFrame.audioPitchHz.toFixed(1)} Hz`, 515, metricsY + 90);

    ctx.fillStyle = '#9BB0C9';
    ctx.font = '17px monospace';
    ctx.fillText(
      `SCALE: ${audioState.activeScale.toUpperCase()}  ·  NOTE: ${currentFrame.musicalNote}  ·  Δ ${
        currentFrame.anomaly > 0 ? `+${currentFrame.anomaly}` : currentFrame.anomaly
      }`,
      102,
      metricsY + 142
    );

    // Footer provenance
    ctx.fillStyle = '#9BB0C9';
    ctx.font = '16px monospace';
    ctx.fillText(`EOSDIS: ${dataset.nasaProductId || 'NASA EIC Level-3/4'} · 48 kHz Web Audio Sonification`, 72, 565);
  }, [isOpen, dataset, currentFrame, audioState.activeScale]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `earth-jukebox-${dataset.id}-${currentFrame.year}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-[#0A1628] border border-[#1B2B44] p-5 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1B2B44] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#00D4FF]" />
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#EAF4FF]">
              Share Sonification Session
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#9BB0C9] hover:text-white p-1 rounded hover:bg-[#101F35] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shareable Image Preview */}
        <div className="rounded-lg overflow-hidden border border-[#1B2B44] bg-[#050B18]">
          <canvas ref={canvasRef} className="w-full h-auto block" />
        </div>

        {/* Share Link Row */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-mono text-[#9BB0C9] uppercase tracking-wider">
            Direct Session URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-[#050B18] border border-[#1B2B44] rounded-lg px-3 py-2 text-xs font-mono text-[#EAF4FF] focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-lg bg-[#101F35] hover:bg-[#193052] border border-[#1B2B44] text-xs font-mono text-[#00D4FF] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#1B2B44]">
          <span className="text-[11px] font-mono text-[#9BB0C9]">
            {dataset.title} · {currentFrame.year} · {currentFrame.audioPitchHz.toFixed(1)} Hz
          </span>
          <button
            onClick={handleDownloadImage}
            className="px-4 py-2 rounded-lg bg-[#00D4FF] hover:bg-[#287BFF] text-[#050B18] hover:text-white font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Telemetry Card (PNG)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
