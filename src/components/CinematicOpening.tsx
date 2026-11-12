import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Volume2, VolumeX, Sparkles, Satellite, Compass, Shield } from 'lucide-react';

interface CinematicOpeningProps {
  onBeginExploration: () => void;
}

export const CinematicOpening: React.FC<CinematicOpeningProps> = ({ onBeginExploration }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [ambientAudio, setAmbientAudio] = useState(false);
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
    const starCount = 380;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.3,
      alpha: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.08 + 0.02,
      layer: Math.floor(Math.random() * 3), // 0: distant, 1: mid, 2: foreground
      color:
        Math.random() > 0.8
          ? '#00D4FF'
          : Math.random() > 0.6
          ? '#EAF4FF'
          : Math.random() > 0.3
          ? '#9BB0C9'
          : '#FFDFBA',
      twinkleSpeed: Math.random() * 0.03 + 0.008,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    // 2. Cosmic Dust / Solar Wind Particles
    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35 + 0.15,
      vy: (Math.random() - 0.5) * 0.2,
      radius: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    // 3. Realistic Satellites Orbiting
    let sat1Angle = 0.4;
    let sat2Angle = 2.8;

    // Continental landmass points approximation (lat/lng in radians)
    const LAND_POINTS: [number, number][] = [
      // North America
      [-1.8, 0.9], [-1.6, 0.7], [-1.4, 0.5], [-1.7, 0.4], [-2.1, 0.7], [-2.2, 1.0],
      // South America
      [-1.1, 0.1], [-0.8, -0.4], [-1.0, -0.8], [-1.2, -0.2],
      // Eurasia
      [0.2, 0.9], [0.8, 1.1], [1.8, 1.0], [2.2, 0.6], [1.3, 0.4], [0.5, 0.6],
      // Africa
      [0.2, 0.5], [0.5, 0.1], [0.4, -0.5], [0.1, -0.5], [-0.1, 0.1],
      // Australia
      [2.1, -0.4], [2.5, -0.5], [2.3, -0.7], [2.0, -0.5],
    ];

    let rotation = 0;
    let startTime = performance.now();

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Deep space background gradient
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.8
      );
      bgGrad.addColorStop(0, '#0A1628');
      bgGrad.addColorStop(0.5, '#050B18');
      bgGrad.addColorStop(1, '#02050B');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle Nebula Cloud in upper right
      const nebulaGrad = ctx.createRadialGradient(
        width * 0.75,
        height * 0.25,
        10,
        width * 0.75,
        height * 0.25,
        width * 0.45
      );
      nebulaGrad.addColorStop(0, 'rgba(40, 123, 255, 0.08)');
      nebulaGrad.addColorStop(0.5, 'rgba(0, 212, 255, 0.03)');
      nebulaGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw Multi-Depth Stars with realistic twinkle
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha * twinkle;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();

        // Parallax drift
        s.x -= s.speed;
        if (s.x < 0) s.x = width;
      }
      ctx.globalAlpha = 1;

      // Draw Cosmic Particles / Solar Wind
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

      // Earth Positioning
      const earthRadius = Math.min(width, height) * 0.28;
      const earthCX = width * 0.5;
      const earthCY = height * 0.48;

      // 4. Atmospheric Outer Glow Layers (Rayleigh Scattering)
      // Layer 1: Broad soft outer corona
      const outerCorona = ctx.createRadialGradient(
        earthCX,
        earthCY,
        earthRadius * 0.95,
        earthCX,
        earthCY,
        earthRadius * 1.35
      );
      outerCorona.addColorStop(0, 'rgba(0, 212, 255, 0.35)');
      outerCorona.addColorStop(0.35, 'rgba(40, 123, 255, 0.2)');
      outerCorona.addColorStop(0.7, 'rgba(10, 22, 40, 0.1)');
      outerCorona.addColorStop(1, 'transparent');
      ctx.fillStyle = outerCorona;
      ctx.beginPath();
      ctx.arc(earthCX, earthCY, earthRadius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Layer 2: Vivid inner atmospheric limb
      const atmosphericLimb = ctx.createRadialGradient(
        earthCX,
        earthCY,
        earthRadius * 0.96,
        earthCX,
        earthCY,
        earthRadius * 1.08
      );
      atmosphericLimb.addColorStop(0, 'rgba(0, 212, 255, 0.7)');
      atmosphericLimb.addColorStop(0.5, 'rgba(40, 123, 255, 0.4)');
      atmosphericLimb.addColorStop(1, 'transparent');
      ctx.fillStyle = atmosphericLimb;
      ctx.beginPath();
      ctx.arc(earthCX, earthCY, earthRadius * 1.08, 0, Math.PI * 2);
      ctx.fill();

      // 5. Earth Base Sphere with Ocean Gradient & Deep Oceanic Depth
      ctx.save();
      ctx.beginPath();
      ctx.arc(earthCX, earthCY, earthRadius, 0, Math.PI * 2);
      ctx.clip();

      // Ocean base texture with spherical shading
      const oceanGrad = ctx.createRadialGradient(
        earthCX - earthRadius * 0.35,
        earthCY - earthRadius * 0.35,
        earthRadius * 0.1,
        earthCX,
        earthCY,
        earthRadius
      );
      oceanGrad.addColorStop(0, '#103565');
      oceanGrad.addColorStop(0.4, '#0A2145');
      oceanGrad.addColorStop(0.8, '#06132A');
      oceanGrad.addColorStop(1, '#020610');
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // Slowly rotating continents
      rotation += 0.0035;

      // Draw rotating continents/islands
      ctx.fillStyle = 'rgba(0, 212, 255, 0.25)';
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
      ctx.lineWidth = 1.2;

      // Draw latitude / longitude grid lines on Earth
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = earthCY + Math.sin((lat * Math.PI) / 180) * earthRadius;
        const w = Math.cos((lat * Math.PI) / 180) * earthRadius;
        ctx.beginPath();
        ctx.ellipse(earthCX, y, w, w * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw rotating continental land outlines
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
          ctx.ellipse(px, py, Math.abs(rw), rh, (i * 0.2), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Swirling atmospheric white cloud bands
      ctx.fillStyle = 'rgba(234, 244, 255, 0.12)';
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

      // Day / Night Terminator Shading (Realistic Sun Angle from top-left)
      const sunShade = ctx.createRadialGradient(
        earthCX - earthRadius * 0.4,
        earthCY - earthRadius * 0.4,
        earthRadius * 0.2,
        earthCX + earthRadius * 0.3,
        earthCY + earthRadius * 0.3,
        earthRadius * 1.15
      );
      sunShade.addColorStop(0, 'rgba(0, 212, 255, 0.05)');
      sunShade.addColorStop(0.45, 'rgba(5, 11, 24, 0.2)');
      sunShade.addColorStop(0.7, 'rgba(5, 11, 24, 0.7)');
      sunShade.addColorStop(1, 'rgba(2, 5, 11, 0.94)');
      ctx.fillStyle = sunShade;
      ctx.fillRect(earthCX - earthRadius, earthCY - earthRadius, earthRadius * 2, earthRadius * 2);

      ctx.restore();

      // 6. Subtle Orbiting Satellites with Vectors & Solar Panels
      // Satellite 1: Low Earth Orbit (ISS / Terra)
      sat1Angle += 0.009;
      const sat1X = earthCX + Math.cos(sat1Angle) * (earthRadius * 1.25);
      const sat1Y = earthCY + Math.sin(sat1Angle) * (earthRadius * 0.55);

      // Orbit path arc
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.ellipse(earthCX, earthCY, earthRadius * 1.25, earthRadius * 0.55, 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Satellite 1 Body & Solar Wings
      ctx.save();
      ctx.translate(sat1X, sat1Y);
      ctx.rotate(sat1Angle + Math.PI / 2);

      // Solar Wings
      ctx.fillStyle = '#00D4FF';
      ctx.fillRect(-10, -1.5, 7, 3);
      ctx.fillRect(3, -1.5, 7, 3);
      // Main Chassis
      ctx.fillStyle = '#EAF4FF';
      ctx.fillRect(-2, -3, 4, 6);
      // Flashing telemetry beacon
      const beaconAlpha = 0.5 + 0.5 * Math.sin(time * 0.008);
      ctx.fillStyle = `rgba(0, 212, 255, ${beaconAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Satellite 2: Polar Orbit (Aqua / ICESat-2)
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

  // Ambient sound synthesizer for subtle space drone
  const toggleAmbientAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // Sub-drone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, ctx.currentTime); // A1 note
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
      setAmbientAudio(true);
    } else if (audioCtxRef.current.state === 'running') {
      if (ambientAudio) {
        audioCtxRef.current.suspend();
        setAmbientAudio(false);
      } else {
        audioCtxRef.current.resume();
        setAmbientAudio(true);
      }
    }
  };

  const handleBegin = () => {
    setIsTransitioning(true);
    // Smooth transition delay to allow zoom fade animation
    setTimeout(() => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      onBeginExploration();
    }, 600);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden bg-[#050B18] text-[#EAF4FF] transition-all duration-700 select-none ${
        isTransitioning ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top NASA Badge & Sound Control */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* NASA Meatball vector */}
          <div className="w-10 h-10 rounded-full bg-[#0B3D91] border border-white/20 flex items-center justify-center font-bold text-xs tracking-widest text-white shadow-lg">
            NASA
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-[#00D4FF]">
              Earth Information Center
            </span>
            <span className="text-[10px] text-[#9BB0C9] font-mono">
              Space Apps Challenge • Global Sonification Lab
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleAmbientAudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-[#0A1628]/80 hover:bg-[#101F35] border border-[#00D4FF]/25 text-[#9BB0C9] hover:text-[#EAF4FF] transition-all backdrop-blur-md"
            title="Toggle Ambient Cosmic Drone"
          >
            {ambientAudio ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#00D4FF] animate-pulse" />
                <span>SOUND ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>AMBIENT SOUND</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Center Hero Content & Call to Action */}
      <div className="absolute bottom-12 left-0 right-0 z-20 flex flex-col items-center justify-center text-center px-6">
        <div className="max-w-3xl flex flex-col items-center gap-3 animate-fade-in">
          {/* Scientific Stream Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#101F35]/80 border border-[#00D4FF]/30 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-ping" />
            <span className="font-mono text-[11px] font-semibold text-[#00D4FF] tracking-wider uppercase">
              Operational Earth Observation Transduction
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white uppercase drop-shadow-2xl">
            <span className="text-gradient-space">EARTH JUKEBOX</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-2xl font-light text-[#9BB0C9] tracking-wide max-w-xl">
            Listen to the Changing Planet
          </p>

          <p className="text-xs sm:text-sm text-[#9BB0C9]/80 max-w-lg leading-relaxed mt-1 hidden sm:block">
            Translating optical, thermal, and radiometric satellite telemetry from MODIS, OCO-2, GRACE-FO, and VIIRS into dynamic real-time acoustic sonifications.
          </p>

          {/* Begin Exploration Button */}
          <div className="mt-5">
            <button
              onClick={handleBegin}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl font-mono text-sm uppercase tracking-wider font-bold text-[#050B18] bg-[#00D4FF] hover:bg-[#287BFF] hover:text-white transition-all duration-300 shadow-[0_0_28px_rgba(0,212,255,0.45)] hover:shadow-[0_0_36px_rgba(40,123,255,0.6)] cursor-pointer"
            >
              <span>Begin Exploration</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="flex items-center gap-4 mt-4 font-mono text-[10px] text-[#9BB0C9]/70">
            <span>MODIS</span>
            <span>·</span>
            <span>OCO-2</span>
            <span>·</span>
            <span>GRACE-FO</span>
            <span>·</span>
            <span>LANDSAT</span>
            <span>·</span>
            <span>VIIRS</span>
            <span>·</span>
            <span>GPM IMERG</span>
          </div>
        </div>
      </div>
    </div>
  );
};
