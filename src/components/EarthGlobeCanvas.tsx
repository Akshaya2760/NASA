import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EICDataset, DatasetFrame, Hotspot, LiveNasaEvent } from '../types';
import { audioEngine } from '../audio/AudioEngine';
import { Globe, Map, RotateCw, ZoomIn, ZoomOut, Compass, Sparkles, Volume2, Radio } from 'lucide-react';

interface EarthGlobeCanvasProps {
  dataset: EICDataset;
  currentFrame: DatasetFrame;
  onSelectHotspot?: (hotspot: Hotspot) => void;
  selectedHotspot?: Hotspot | null;
  spatialPanningEnabled?: boolean;
  liveEvents?: LiveNasaEvent[];
}

// Approximate simplified continental outlines for rendering on canvas
// (Collection of major land polygon approximations)
const CONTINENT_POLYGONS: [number, number][][] = [
  // North America
  [[-130, 50], [-125, 35], [-110, 25], [-95, 20], [-80, 25], [-75, 40], [-60, 50], [-65, 60], [-95, 65], [-130, 60], [-130, 50]],
  // South America
  [[-80, 10], [-75, -5], [-70, -20], [-65, -45], [-75, -50], [-55, -25], [-35, -5], [-50, 5], [-80, 10]],
  // Eurasia
  [[-10, 36], [0, 45], [15, 55], [30, 65], [60, 70], [100, 70], [140, 65], [170, 60], [140, 35], [120, 20], [100, 10], [75, 10], [60, 25], [40, 35], [20, 38], [-10, 36]],
  // Africa
  [[-17, 15], [-15, 5], [10, 5], [12, -5], [20, -34], [32, -28], [40, -10], [50, 12], [42, 15], [32, 32], [-5, 36], [-17, 15]],
  // Australia
  [[115, -22], [115, -34], [130, -32], [140, -38], [150, -35], [150, -20], [135, -12], [120, -18], [115, -22]],
  // Greenland
  [[-50, 60], [-25, 70], [-20, 80], [-45, 83], [-60, 75], [-50, 60]],
  // Antarctica (approximate coastal band)
  [[-180, -70], [-120, -72], [-60, -68], [0, -70], [60, -67], [120, -68], [180, -70], [180, -90], [-180, -90]],
];

export const EarthGlobeCanvas: React.FC<EarthGlobeCanvasProps> = ({
  dataset,
  currentFrame,
  onSelectHotspot,
  selectedHotspot,
  spatialPanningEnabled = true,
  liveEvents = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [isRotating, setIsRotating] = useState(true);
  const [showLiveStream, setShowLiveStream] = useState(true);
  const [rotationAngle, setRotationAngle] = useState(0); // Longitude offset
  const [tiltAngle, setTiltAngle] = useState(0.25); // Latitude tilt in radians (~15 deg)
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredCoordinate, setHoveredCoordinate] = useState<{ lat: number; lng: number; val: number } | null>(null);
  const [probePing, setProbePing] = useState<{ x: number; y: number; label: string } | null>(null);

  // Animation Frame Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const radius = Math.min(width, height) * 0.40 * zoomLevel;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Auto rotation in 3D
      if (isRotating && viewMode === '3d' && !isDragging) {
        setRotationAngle((prev) => {
          const next = (prev + 0.3) % 360;
          if (spatialPanningEnabled) {
            // Calculate orbital panning (-1 to 1) based on rotation
            const pan = Math.sin((next * Math.PI) / 180);
            audioEngine.setSpatialPanning(pan);
          }
          return next;
        });
      }

      if (viewMode === '3d') {
        draw3DGlobe(ctx, centerX, centerY, radius, rotationAngle, tiltAngle);
      } else {
        draw2DMap(ctx, width, height);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [viewMode, isRotating, isDragging, rotationAngle, tiltAngle, zoomLevel, dataset, currentFrame, selectedHotspot, spatialPanningEnabled]);

  // Handle Canvas Resizing
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

  /**
   * Draw 3D Orthographic Sphere
   */
  const draw3DGlobe = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    rotDeg: number,
    tiltRad: number
  ) => {
    const rotRad = (rotDeg * Math.PI) / 180;

    // Atmospheric Glow / Nebula halo
    const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.35);
    glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    glowGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.08)');
    glowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // Ocean Globe Base Sphere
    const oceanGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    oceanGrad.addColorStop(0, '#0f2b48'); // Illuminated ocean
    oceanGrad.addColorStop(0.7, '#071626'); // Deep oceanic abyss
    oceanGrad.addColorStop(1, '#020813'); // Planetary shadow rim
    ctx.fillStyle = oceanGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Clip to globe circle for surface layers
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Graticule Lines (Latitude & Longitude)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;

    // Latitude circles
    for (let lat = -60; lat <= 60; lat += 30) {
      const latRad = (lat * Math.PI) / 180;
      ctx.beginPath();
      for (let lon = -180; lon <= 180; lon += 5) {
        const pt = project3D(lat, lon, r, rotRad, tiltRad, cx, cy);
        if (pt.visible) {
          if (lon === -180) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();
    }

    // Longitude meridians
    for (let lon = -180; lon < 180; lon += 45) {
      ctx.beginPath();
      for (let lat = -90; lat <= 90; lat += 5) {
        const pt = project3D(lat, lon, r, rotRad, tiltRad, cx, cy);
        if (pt.visible) {
          if (lat === -90) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();
    }

    // Render Continents
    ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
    ctx.lineWidth = 1.5;

    CONTINENT_POLYGONS.forEach((poly) => {
      ctx.beginPath();
      let started = false;
      poly.forEach(([lng, lat]) => {
        const pt = project3D(lat, lng, r, rotRad, tiltRad, cx, cy);
        if (pt.visible) {
          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
      });
      if (started) {
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });

    // Render Data Heat Field / Colored Anomaly Rings
    const datasetColor = currentFrame.anomaly > 0 ? dataset.colorRamp.high : dataset.colorRamp.low;
    currentFrame.hotspots.forEach((hs, idx) => {
      const pt = project3D(hs.lat, hs.lng, r, rotRad, tiltRad, cx, cy);
      if (pt.visible) {
        const pulseSize = 14 + Math.sin(Date.now() * 0.004 + idx) * 5;
        const grad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, pulseSize * 2.5);
        grad.addColorStop(0, datasetColor);
        grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.35)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pulseSize * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core Pin
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Outer Ring
        ctx.strokeStyle = datasetColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pulseSize, 0, Math.PI * 2);
        ctx.stroke();

        // Selected Hotspot Indicator
        if (selectedHotspot?.name === hs.name) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pulseSize + 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });

    // Render Live NASA EONET Current Events on 3D Globe
    if (showLiveStream && liveEvents && liveEvents.length > 0) {
      liveEvents.forEach((ev, idx) => {
        const pt = project3D(ev.lat, ev.lng, r, rotRad, tiltRad, cx, cy);
        if (pt.visible) {
          let evColor = '#00D4FF';
          if (ev.category === 'severeStorms') evColor = '#38bdf8';
          else if (ev.category === 'wildfires') evColor = '#f97316';
          else if (ev.category === 'seaLakeIce') evColor = '#a5f3fc';
          else if (ev.category === 'volcanoes') evColor = '#ef4444';

          const pulse = 11 + Math.sin(Date.now() * 0.005 + idx * 1.7) * 4.5;

          // Outer pulsating radar wave
          ctx.strokeStyle = evColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pulse, 0, Math.PI * 2);
          ctx.stroke();

          // Core pin
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = evColor;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fill();

          // Selection highlight
          if (selectedHotspot?.name === ev.title) {
            ctx.strokeStyle = '#00D4FF';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pulse + 6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });
    }

    // Satellite Orbital Path (NASA EIC Observation Track)
    const timeSec = Date.now() * 0.001;
    const satOrbRad = (timeSec * 0.4) % (Math.PI * 2);
    const satLat = Math.sin(satOrbRad) * 65;
    const satLng = ((satOrbRad * 180) / Math.PI * 1.5) % 360 - 180;
    const satPt = project3D(satLat, satLng, r * 1.08, rotRad, tiltRad, cx, cy);

    if (satPt.visible) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(satPt.x, satPt.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Satellite Label
      ctx.fillStyle = '#bae6fd';
      ctx.font = '11px JetBrains Mono';
      ctx.fillText(`🛰️ ${dataset.missionSensor.split('/')[0]}`, satPt.x + 8, satPt.y - 6);
    }

    ctx.restore();

    // 3D Glass Atmosphere Edge Ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  };

  /**
   * Draw 2D Equirectangular Plate Carrée Projection
   */
  const draw2DMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Background Space / Ocean
    ctx.fillStyle = '#071220';
    ctx.fillRect(0, 0, width, height);

    // Map Coordinates Range
    const padX = 40;
    const padY = 40;
    const mapW = width - padX * 2;
    const mapH = height - padY * 2;

    const toX = (lng: number) => padX + ((lng + 180) / 360) * mapW;
    const toY = (lat: number) => padY + ((90 - lat) / 180) * mapH;

    // Grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 1;

    for (let lat = -60; lat <= 60; lat += 30) {
      const y = toY(lat);
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + mapW, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`${lat > 0 ? '+' : ''}${lat}°`, 10, y + 3);
    }

    for (let lng = -180; lng <= 180; lng += 45) {
      const x = toX(lng);
      ctx.beginPath();
      ctx.moveTo(x, padY);
      ctx.lineTo(x, padY + mapH);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`${lng}°`, x - 10, padY + mapH + 18);
    }

    // Continents
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
    ctx.lineWidth = 1.5;

    CONTINENT_POLYGONS.forEach((poly) => {
      ctx.beginPath();
      poly.forEach(([lng, lat], i) => {
        const x = toX(lng);
        const y = toY(lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Hotspots
    const datasetColor = currentFrame.anomaly > 0 ? dataset.colorRamp.high : dataset.colorRamp.low;
    currentFrame.hotspots.forEach((hs, idx) => {
      const x = toX(hs.lng);
      const y = toY(hs.lat);
      const pulse = 10 + Math.sin(Date.now() * 0.005 + idx) * 4;

      const grad = ctx.createRadialGradient(x, y, 2, x, y, pulse * 2);
      grad.addColorStop(0, datasetColor);
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, pulse * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = datasetColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#f3f4f6';
      ctx.font = '11px Space Grotesk';
      ctx.fillText(hs.name, x + 10, y - 4);
    });
  };

  /**
   * 3D Sphere Orthographic Projection
   */
  const project3D = (
    lat: number,
    lng: number,
    r: number,
    rotRad: number,
    tiltRad: number,
    cx: number,
    cy: number
  ) => {
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180 + rotRad;

    // Spherical coordinates to 3D Cartesian
    let x = r * Math.cos(latRad) * Math.sin(lngRad);
    let y = -r * Math.sin(latRad);
    let z = r * Math.cos(latRad) * Math.cos(lngRad);

    // Apply latitude tilt (around X-axis)
    const yTilted = y * Math.cos(tiltRad) - z * Math.sin(tiltRad);
    const zTilted = y * Math.sin(tiltRad) + z * Math.cos(tiltRad);

    const visible = zTilted > -r * 0.05; // Visible hemisphere

    return {
      x: cx + x,
      y: cy + yTilted,
      z: zTilted,
      visible,
    };
  };

  /**
   * Interactive Probe Clicking: Click anywhere on globe to trigger scientific pitch
   */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(canvas.width, canvas.height) * 0.40 * zoomLevel;

    // Check if clicked near any hotspot
    if (viewMode === '3d') {
      const rotRad = (rotationAngle * Math.PI) / 180;
      for (const hs of currentFrame.hotspots) {
        const pt = project3D(hs.lat, hs.lng, r, rotRad, tiltAngle, cx, cy);
        if (pt.visible) {
          const dist = Math.hypot(clickX - pt.x, clickY - pt.y);
          if (dist < 22) {
            // Trigger hotspot tone and notify parent
            const probeFreq = currentFrame.audioPitchHz * (1 + (hs.value / (dataset.maxVal || 100)) * 0.35);
            audioEngine.playProbeTone(probeFreq, 0.6, dataset.sonificationConfig.leadWave);
            if (onSelectHotspot) onSelectHotspot(hs);
            setProbePing({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: `${hs.name} (${hs.value} ${dataset.unit})` });
            setTimeout(() => setProbePing(null), 2500);
            return;
          }
        }
      }

      // Check if clicked near any live NASA event
      if (showLiveStream && liveEvents && liveEvents.length > 0) {
        for (const ev of liveEvents) {
          const pt = project3D(ev.lat, ev.lng, r, rotRad, tiltAngle, cx, cy);
          if (pt.visible) {
            const dist = Math.hypot(clickX - pt.x, clickY - pt.y);
            if (dist < 22) {
              audioEngine.playProbeTone(ev.sonificationFreqHz, 0.7, ev.sonificationWave);
              if (onSelectHotspot) {
                onSelectHotspot({
                  name: ev.title,
                  lat: ev.lat,
                  lng: ev.lng,
                  value: ev.magnitude || Math.round(ev.sonificationFreqHz),
                  note: `${ev.categoryTitle}: ${ev.acousticNote} (Source: ${ev.sourceName})`,
                });
              }
              setProbePing({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                label: `LIVE NASA: ${ev.title} (${ev.acousticNote})`,
              });
              setTimeout(() => setProbePing(null), 3000);
              return;
            }
          }
        }
      }

      // Check if clicked on globe surface
      const distFromCenter = Math.hypot(clickX - cx, clickY - cy);
      if (distFromCenter <= r) {
        // Calculate approximate latitude and longitude
        const nx = (clickX - cx) / r;
        const ny = (clickY - cy) / r;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const lat = -ny * 90;
        const lng = ((Math.atan2(nx, nz) * 180) / Math.PI - rotationAngle + 540) % 360 - 180;

        // Calculate pitch proportional to latitude & current frame
        const latRatio = (lat + 90) / 180;
        const freq = 120 + latRatio * 440;
        audioEngine.playProbeTone(freq, 0.4, 'sine');

        setProbePing({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          label: `${lat.toFixed(1)}° Lat, ${lng.toFixed(1)}° Lng [${freq.toFixed(0)} Hz]`,
        });
        setTimeout(() => setProbePing(null), 2200);
      }
    }
  };

  /**
   * Drag to Rotate Controls
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;

    setRotationAngle((prev) => (prev + dx * 0.4 + 360) % 360);
    setTiltAngle((prev) => Math.max(-0.6, Math.min(0.6, prev - dy * 0.005)));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="relative w-full h-full min-h-[480px] lg:min-h-[540px] rounded-xl overflow-hidden bg-[#070D19] border border-[#1B2B44] flex flex-col justify-between select-none">
      {/* Clean Minimalist Top Bar Overlay */}
      <div className="absolute top-3.5 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        {/* Quiet unboxed sensor label */}
        <div className="flex flex-col pointer-events-auto">
          <span className="text-xs font-semibold text-white tracking-tight">
            {dataset.missionSensor}
          </span>
          <span className="text-[11px] font-mono text-[#9BB0C9]">
            Click surface to probe coordinate pitch
          </span>
        </div>

        {/* Compact Single-Strip View Controls */}
        <div className="flex items-center gap-1 p-1 bg-[#0A1628]/90 border border-[#1B2B44] pointer-events-auto rounded-lg">
          {liveEvents.length > 0 && (
            <button
              onClick={() => setShowLiveStream(!showLiveStream)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-md transition-colors cursor-pointer ${
                showLiveStream
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                  : 'text-[#9BB0C9] hover:text-white'
              }`}
              title="Toggle live NASA EONET event markers on globe"
            >
              <Radio className="w-3 h-3" />
              <span className="hidden sm:inline">Events</span>
              <span className="tabular-nums font-semibold">({liveEvents.length})</span>
            </button>
          )}

          <button
            onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-md text-[#EAF4FF] hover:bg-[#101F35] transition-colors cursor-pointer"
            title="Toggle 3D Sphere vs 2D Projection"
          >
            {viewMode === '3d' ? <Globe className="w-3.5 h-3.5 text-[#00D4FF]" /> : <Map className="w-3.5 h-3.5 text-[#00D4FF]" />}
            <span>{viewMode.toUpperCase()}</span>
          </button>

          {viewMode === '3d' && (
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isRotating ? 'text-[#050B18] bg-[#00D4FF]' : 'text-[#9BB0C9] hover:text-white hover:bg-[#101F35]'
              }`}
              title={isRotating ? 'Pause Orbit' : 'Resume Auto-Rotate'}
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
            className="p-1.5 rounded-md text-[#9BB0C9] hover:text-white hover:bg-[#101F35] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
            className="p-1.5 rounded-md text-[#9BB0C9] hover:text-white hover:bg-[#101F35] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setRotationAngle(0);
              setTiltAngle(0.25);
              setZoomLevel(1.0);
            }}
            className="p-1.5 rounded-md text-[#9BB0C9] hover:text-white hover:bg-[#101F35] transition-colors cursor-pointer"
            title="Reset Orientation"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-crosshair active:cursor-grabbing"
      />

      {/* Interactive Probe Ping HUD overlay */}
      {probePing && (
        <div
          style={{ left: probePing.x, top: probePing.y }}
          className="absolute z-20 -translate-x-1/2 -translate-y-12 pointer-events-none px-3 py-1.5 rounded-md bg-[#050B18]/95 border border-[#00D4FF]/60 text-[#EAF4FF] text-xs font-mono flex items-center gap-1.5"
        >
          <Volume2 className="w-3.5 h-3.5 text-[#00D4FF]" />
          <span>{probePing.label}</span>
        </div>
      )}

      {/* Clean Quiet Bottom Telemetry Readout */}
      <div className="absolute bottom-3.5 left-4 right-4 z-10 flex items-center justify-between pointer-events-none text-[11px] font-mono text-[#9BB0C9]">
        <span>
          Spatial Pan: {spatialPanningEnabled ? 'Active' : 'Bypass'}
        </span>
        <span className="text-[#EAF4FF] tabular-nums">
          LON {rotationAngle.toFixed(1)}°E · LAT {(-tiltAngle * 57.3).toFixed(1)}°N · ZOOM {(zoomLevel * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
};
