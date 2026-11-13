import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

interface CinematicOpeningProps {
  onBeginExploration: () => void;
}

export const CinematicOpening: React.FC<CinematicOpeningProps> = ({ onBeginExploration }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [ambientAudio, setAmbientAudio] = useState(false);
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize and run Canvas Cinematic 3D Earth, Stars, Satellites & Cosmic Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // 1. Generate Realistic Multi-Depth Stars
    const starCount = 340;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.6 + 0.3,
      alpha: Math.random() * 0.75 + 0.2,
      speed: Math.random() * 0.06 + 0.015,
      layer: Math.floor(Math.random() * 3),
      color:
        Math.random() > 0.8
          ? '#00D4FF'
          : Math.random() > 0.5
          ? '#EAF4FF'
          : '#9BB0C9',
      twinkleSpeed: Math.random() * 0.025 + 0.008,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    // 2. Cosmic Dust / Solar Wind Particles
    const particleCount = 36;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3 + 0.12,
      vy: (Math.random() - 0.5) * 0.15,
      radius: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let sat1Angle = 0.4;
    let sat2Angle = 2.8;
    let rotation = 0;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        50,
        width * 0.5,
        height * 0.45,
        Math.max(width, height) * 0.85
      );
      bgGrad.addColorStop(0, '#0A1628');
      bgGrad.addColorStop(0.55, '#050B18');
      bgGrad.addColorStop(1, '#02050B');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha * twinkle;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();

        s.x -= s.speed;
        if (s.x < 0) s.x = width;
      }
      ctx.globalAlpha = 1;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.fillStyle = '#00D4FF';
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;
        if (p.y > height) p.y = 0;
        if (p.y < 0) p.y = height;
      }
      ctx.globalAlpha = 1;

      const earthRadius = Math.min(width, height) * 0.25;
      const earthCX = width * 0.5;
      const earthCY = height * 0.42;

      const outerCorona = ctx.createRadialGradient(
        earthCX,
        earthCY,
        earthRadius * 0.95,
        earthCX,
        earthCY,
        earthRadius * 1.32
      );
      outerCorona.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
      outerCorona.addColorStop(0.4, 'rgba(40, 123, 255, 0.16)');
      outerCorona.addColorStop(1, 'transparent');
      ctx.fillStyle = outerCorona;
      ctx.beginPath();
      ctx.arc(earthCX, earthCY, earthRadius * 1.32, 0, Math.PI * 2);
      ctx.fill();

      const atmosphericLimb = ctx.createRadialGradient(
        earthCX,
        earthCY,
        earthRadius * 0.96,
        earthCX,
        earthCY,
        earthRadius * 1.07
      );
      atmosphericLimb.addColorStop(0, 'rgba(0, 212, 255, 0.65)');
      atmosphericLimb.addColorStop(0.5, 'rgba(40, 123, 255, 0.35)');
      atmosphericLimb.addColorStop(1, 'transparent');
      ctx.fillStyle = atmosphericLimb;
      ctx.beginPath();
      ctx.arc(earthCX, earthCY, earthRadius * 1.07, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(earthCX, earthCY, earthRadius, 0, Math.PI * 2);
      ctx.clip();

      const oceanGrad = ctx.createRadialGradient(
        earthCX - earthRadius * 0.35,
        earthCY - earthRadius * 0.35,
        earthRadius * 0.1,
        earthCX,
        earthCY,
        earthRadius
      );
      oceanGrad.addColorStop(0, '#103565');
      oceanGrad.addColorStop(0.45, '#0A2145');
      oceanGrad.addColorStop(0.85, '#06132A');
      oceanGrad.addColorStop(1, '#020610');
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      rotation += 0.003;

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = earthCY + Math.sin((lat * Math.PI) / 180) * earthRadius;
        const w = Math.cos((lat * Math.PI) / 180) * earthRadius;
        ctx.beginPath();
        ctx.ellipse(earthCX, y, w, w * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 18; i++) {
        const lon = ((i * 20 + rotation * 57.3) % 360) - 180;
        const xRad = (lon * Math.PI) / 180;
        if (Math.cos(xRad) > 0) {
          const px = earthCX + Math.sin(xRad) * earthRadius * 0.95;
          const py = earthCY + Math.sin(i * 1.3) * earthRadius * 0.6;
          const rw = (22 + (i % 5) * 8) * Math.cos(xRad);
          const rh = 16 + (i % 4) * 6;

          ctx.fillStyle = i % 2 === 0 ? 'rgba(40, 123, 255, 0.35)' : 'rgba(0, 212, 255, 0.3)';
          ctx.beginPath();
          ctx.ellipse(px, py, Math.abs(rw), rh, i * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = 'rgba(234, 244, 255, 0.11)';
      for (let c = 0; c < 5; c++) {
        const cloudLon = ((c * 72 + rotation * 85) % 360) - 180;
        const cxRad = (cloudLon * Math.PI) / 180;
        if (Math.cos(cxRad) > -0.2) {
          const cx = earthCX + Math.sin(cxRad) * earthRadius * 0.9;
          const cy = earthCY + (c - 2) * (earthRadius * 0.3);
          ctx.beginPath();
          ctx.ellipse(cx, cy, earthRadius * 0.45 * Math.abs(Math.cos(cxRad)), earthRadius * 0.08, 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const sunShade = ctx.createRadialGradient(
        earthCX - earthRadius * 0.4,
        earthCY - earthRadius * 0.4,
        earthRadius * 0.2,
        earthCX + earthRadius * 0.3,
        earthCY + earthRadius * 0.3,
        earthRadius * 1.15
      );
      sunShade.addColorStop(0, 'rgba(0, 212, 255, 0.04)');
      sunShade.addColorStop(0.5, 'rgba(5, 11, 24, 0.25)');
      sunShade.addColorStop(0.75, 'rgba(5, 11, 24, 0.72)');
      sunShade.addColorStop(1, 'rgba(2, 5, 11, 0.95)');
      ctx.fillStyle = sunShade;
      ctx.fillRect(earthCX - earthRadius, earthCY - earthRadius, earthRadius * 2, earthRadius * 2);

      ctx.restore();

      sat1Angle += 0.009;
      const sat1X = earthCX + Math.cos(sat1Angle) * (earthRadius * 1.25);
      const sat1Y = earthCY + Math.sin(sat1Angle) * (earthRadius * 0.55);

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.14)';
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.ellipse(earthCX, earthCY, earthRadius * 1.25, earthRadius * 0.55, 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.save();
      ctx.translate(sat1X, sat1Y);
      ctx.rotate(sat1Angle + Math.PI / 2);
      ctx.fillStyle = '#00D4FF';
      ctx.fillRect(-10, -1.5, 7, 3);
      ctx.fillRect(3, -1.5, 7, 3);
      ctx.fillStyle = '#EAF4FF';
      ctx.fillRect(-2, -3, 4, 6);
      ctx.restore();

      sat2Angle += 0.006;
      const sat2X = earthCX + Math.sin(sat2Angle) * (earthRadius * 0.45);
      const sat2Y = earthCY + Math.cos(sat2Angle) * (earthRadius * 1.28);

      ctx.save();
      ctx.translate(sat2X, sat2Y);
      ctx.fillStyle = '#287BFF';
      ctx.fillRect(-7, -1, 5, 2);
      ctx.fillRect(2, -1, 5, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-1.5, -2, 3, 4);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Trigger entrance chime & welcome voice on first click anywhere or button press
  const triggerWelcomeSequence = () => {
    if (!hasWelcomed) {
      setHasWelcomed(true);
      audioEngine.playEntranceChime('portal');
      audioEngine.speakWelcomeMessage('Welcome to NASA Earth Jukebox. Listen to the changing planet.');
    }
  };

  // Ambient sound synthesizer for subtle space drone
  const toggleAmbientAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, ctx.currentTime);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
      setAmbientAudio(true);
      triggerWelcomeSequence();
    } else if (audioCtxRef.current.state === 'running') {
      if (ambientAudio) {
        audioCtxRef.current.suspend();
        setAmbientAudio(false);
      } else {
        audioCtxRef.current.resume();
        setAmbientAudio(true);
        triggerWelcomeSequence();
      }
    }
  };

  const handleBegin = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngine.playEntranceChime('portal');
    audioEngine.speakWelcomeMessage('Welcome to NASA Earth Jukebox. Please register or sign in to enter the observatory.');
    setIsTransitioning(true);
    setTimeout(() => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      onBeginExploration();
    }, 600);
  };

  const STAGES = [
    { num: '01', title: 'Satellite Data', detail: 'MODIS, OCO-2, GRACE-FO' },
    { num: '02', title: 'Data Processing', detail: 'Anomaly Extraction' },
    { num: '03', title: 'Sonification Engine', detail: 'Pitch & Rhythm Mapping' },
    { num: '04', title: 'Earth Jukebox', detail: 'Synchronized Audio-Visuals' },
  ];

  return (
    <div
      onClick={triggerWelcomeSequence}
      className={`fixed inset-0 z-50 overflow-hidden bg-[#050B18] text-[#EAF4FF] transition-all duration-700 select-none ${
        isTransitioning ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Clean Single-Row Top Header */}
      <header className="absolute top-0 left-0 right-0 z-20 px-6 sm:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#0B3D91] border border-white/25 flex items-center justify-center font-bold text-[11px] tracking-widest text-white">
            NASA
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Earth Information Center
          </span>
        </div>

        <button
          onClick={toggleAmbientAudio}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#0A1628]/90 hover:bg-[#101F35] border border-[#1E3354] text-[#EAF4FF] transition-colors cursor-pointer"
          title="Play Entrance Welcome Audio & Space Drone"
        >
          {ambientAudio ? (
            <>
              <Volume2 className="w-4 h-4 text-[#00D4FF]" />
              <span>Audio Active</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-[#9BB0C9]" />
              <span>Enable Welcome Audio</span>
            </>
          )}
        </button>
      </header>

      {/* Bottom Center Editorial Hero & 4-Stage Pipeline */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex flex-col items-center justify-center text-center px-6">
        <div className="max-w-3xl flex flex-col items-center gap-3">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#00D4FF]">
            NASA Space Apps Challenge · Multisensory Earth Science
          </p>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white">
            Earth Jukebox
          </h1>

          <p className="text-lg sm:text-xl font-normal text-[#EAF4FF]/90 max-w-xl">
            Listen to the Changing Planet
          </p>

          <p className="text-xs sm:text-sm text-[#9BB0C9] max-w-lg leading-relaxed hidden sm:block">
            Translating optical, thermal, and radiometric satellite observations into real-time harmonic soundscapes.
          </p>

          <div className="mt-3">
            <button
              onClick={handleBegin}
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg text-sm font-semibold text-[#050B18] bg-[#00D4FF] hover:bg-[#38BDF8] transition-colors cursor-pointer"
            >
              <span>Begin Exploration</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* 4 Mission Stages Strip */}
          <div className="mt-6 w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-white/10 text-left">
            {STAGES.map((st) => (
              <div key={st.num} className="flex flex-col gap-0.5 px-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <span className="font-mono text-[#00D4FF]">{st.num}.</span>
                  <span>{st.title}</span>
                </div>
                <span className="text-[11px] text-[#9BB0C9]">{st.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
