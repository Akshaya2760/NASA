import React, { useState, useEffect, useCallback } from 'react';
import { EICDataset, DatasetFrame, User, SonificationAudioState, Hotspot, LiveNasaEvent } from './types';
import { INITIAL_DATASETS } from './data/datasets';
import { audioEngine } from './audio/AudioEngine';
import { CinematicOpening } from './components/CinematicOpening';
import { RegistrationPage } from './components/RegistrationPage';
import { EarthGlobeCanvas } from './components/EarthGlobeCanvas';
import { AudioVisualizer } from './components/AudioVisualizer';
import { JukeboxPlayerControls } from './components/JukeboxPlayerControls';
import { SonificationSynthesizerPanel } from './components/SonificationSynthesizerPanel';
import { DatasetSelectorBar } from './components/DatasetSelectorBar';
import { AeroSonicChatbot } from './components/AeroSonicChatbot';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AccessibilityToolbar } from './components/AccessibilityToolbar';
import { HowItWorksModal } from './components/HowItWorksModal';
import {
  Globe2,
  Bot,
  Shield,
  User as UserIcon,
  Radio,
  ExternalLink,
  Volume2,
  Layers,
  MapPin,
  HelpCircle,
  Database,
  Film,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

type AppStage = 'cinematic' | 'register' | 'dashboard';

export default function App() {
  // Datasets & Playback State - with automated merging of new NASA live stream channels
  const [datasets, setDatasets] = useState<EICDataset[]>(() => {
    const saved = localStorage.getItem('nasa_eic_custom_datasets');
    if (saved) {
      try {
        const parsed: EICDataset[] = JSON.parse(saved);
        const missing = INITIAL_DATASETS.filter((init) => !parsed.some((p) => p.id === init.id));
        return [...missing, ...parsed];
      } catch (e) {
        return INITIAL_DATASETS;
      }
    }
    return INITIAL_DATASETS;
  });

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(INITIAL_DATASETS[0].id);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  // Live NASA Satellite Telemetry Stream (EONET v3)
  const [liveNasaEvents, setLiveNasaEvents] = useState<LiveNasaEvent[]>([]);
  const [isFetchingLiveEvents, setIsFetchingLiveEvents] = useState<boolean>(false);
  const [lastLiveSyncTime, setLastLiveSyncTime] = useState<string>('');

  const fetchLiveNasaEvents = useCallback(async () => {
    setIsFetchingLiveEvents(true);
    try {
      const res = await fetch('/api/nasa/current-events');
      if (!res.ok) {
        console.warn(`NASA telemetry API returned status ${res.status}`);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('Expected JSON response from /api/nasa/current-events, received:', contentType);
        return;
      }
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.warn('Could not parse NASA EONET response as JSON:', parseErr);
        return;
      }
      if (data && data.events && Array.isArray(data.events)) {
        setLiveNasaEvents(data.events);
        setLastLiveSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        // Dynamically update the 'nasa-live-eonet' dataset with latest open satellite events
        setDatasets((prevDatasets) => {
          return prevDatasets.map((ds) => {
            if (ds.id === 'nasa-live-eonet') {
              const liveHotspots: Hotspot[] = data.events.slice(0, 8).map((ev: LiveNasaEvent) => ({
                name: ev.title,
                lat: ev.lat,
                lng: ev.lng,
                value: ev.magnitude || Math.round(ev.sonificationFreqHz),
                note: `${ev.categoryTitle}: ${ev.acousticNote} (Source: ${ev.sourceName})`,
              }));

              const updatedFrames = [...ds.frames];
              if (updatedFrames[0]) {
                updatedFrames[0] = {
                  ...updatedFrames[0],
                  label: `Live Stream (${new Date().toLocaleDateString()})`,
                  date: `${new Date().toISOString().split('T')[0]} (Live)`,
                  hotspots: liveHotspots,
                  scientificSummary: `Direct near-real-time satellite stream from NASA EONET v3. Actively monitoring ${data.count || data.events.length} open natural events with optical, infrared, and radar sensors.`,
                };
              }
              return { ...ds, frames: updatedFrames };
            }
            return ds;
          });
        });
      }
    } catch (err) {
      console.warn('NASA live data stream warning (gracefully recovered):', err);
    } finally {
      setIsFetchingLiveEvents(false);
    }
  }, []);

  // Poll live NASA EONET data stream
  useEffect(() => {
    fetchLiveNasaEvents();
    const interval = setInterval(fetchLiveNasaEvents, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, [fetchLiveNasaEvents]);

  // Audio Synthesis State
  const [audioState, setAudioState] = useState<SonificationAudioState>({
    isPlaying: false,
    isMuted: false,
    volume: 0.75,
    tempoSpeed: 1,
    layerDrone: true,
    layerLead: true,
    layerPulse: true,
    layerAtmosphere: true,
    activeScale: INITIAL_DATASETS[0].sonificationConfig.scale,
    baseKey: 'D',
    isRecording: false,
    spatialMode: 'orbit',
  });

  // User Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('nasa_eic_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Primary App Journey Stage: 'cinematic' -> 'register' -> 'dashboard'
  const [appStage, setAppStage] = useState<AppStage>('cinematic');

  // UI Modal & Drawer States
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Accessibility States
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderSpeech, setScreenReaderSpeech] = useState(false);

  // Real-Time Engagement Analytics Tracking
  const [sessionDurationSec, setSessionDurationSec] = useState<number>(0);
  const [liveListenSeconds, setLiveListenSeconds] = useState<Record<string, number>>({});
  const [liveProbeCount, setLiveProbeCount] = useState<number>(0);
  const [liveRecordingCount, setLiveRecordingCount] = useState<number>(0);

  // Currently active dataset & frame
  const currentDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];
  const currentFrame = currentDataset.frames[currentFrameIndex] || currentDataset.frames[0];

  // Active Session Duration Timer & Live Listening Accumulator
  useEffect(() => {
    if (appStage !== 'dashboard') return;

    const timer = setInterval(() => {
      setSessionDurationSec((prev) => prev + 1);

      if (audioState.isPlaying && !audioState.isMuted) {
        setLiveListenSeconds((prev) => ({
          ...prev,
          [selectedDatasetId]: (prev[selectedDatasetId] || 0) + 1,
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [audioState.isPlaying, audioState.isMuted, selectedDatasetId, appStage]);

  // Save updated datasets to localStorage
  const handleUpdateDatasets = (newDatasets: EICDataset[]) => {
    setDatasets(newDatasets);
    localStorage.setItem('nasa_eic_custom_datasets', JSON.stringify(newDatasets));
  };

  // Login & Logout Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('nasa_eic_user', JSON.stringify(user));
    setAppStage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('nasa_eic_user');
    localStorage.removeItem('nasa_eic_auth_token');
    audioEngine.applyState({ ...audioState, isPlaying: false });
    setAudioState((prev) => ({ ...prev, isPlaying: false }));
    setAppStage('cinematic');
  };

  // Partial audio state updater
  const handleUpdateAudioState = (partial: Partial<SonificationAudioState>) => {
    setAudioState((prev) => {
      const next = { ...prev, ...partial };
      audioEngine.applyState(next);
      return next;
    });
  };

  // Sync sound engine whenever frame or dataset changes
  const syncAudioWithFrame = useCallback(
    (frame: DatasetFrame, ds: EICDataset) => {
      if (audioState.isPlaying) {
        audioEngine.updateFrame(
          frame.audioPitchHz,
          frame.anomaly,
          ds.sonificationConfig.droneWave,
          ds.sonificationConfig.leadWave,
          ds.sonificationConfig.filterMinHz,
          audioState
        );
      }

      if (screenReaderSpeech && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const text = `${ds.title}. Year ${frame.year}: ${frame.globalAvg} ${ds.unit}. Pitch ${frame.audioPitchHz.toFixed(0)} Hertz. ${frame.scientificSummary}`;
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.1;
        window.speechSynthesis.speak(u);
      }
    },
    [audioState, screenReaderSpeech]
  );

  // Handle dataset switch
  const handleSelectDataset = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) return;
    setSelectedDatasetId(id);
    setCurrentFrameIndex(0);
    setSelectedHotspot(null);
    handleUpdateAudioState({ activeScale: ds.sonificationConfig.scale });
    syncAudioWithFrame(ds.frames[0], ds);
  };

  // Handle frame switch
  const handleSelectFrameIndex = (idx: number) => {
    setCurrentFrameIndex(idx);
    const targetFrame = currentDataset.frames[idx];
    if (targetFrame) {
      syncAudioWithFrame(targetFrame, currentDataset);
    }
  };

  // Automatic Timeline Jukebox playback loop
  useEffect(() => {
    if (!audioState.isPlaying || appStage !== 'dashboard') return;

    const intervalMs = 3800 / audioState.tempoSpeed;
    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        const nextIdx = (prev + 1) % currentDataset.frames.length;
        const targetFrame = currentDataset.frames[nextIdx];
        if (targetFrame) {
          syncAudioWithFrame(targetFrame, currentDataset);
        }
        return nextIdx;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [audioState.isPlaying, audioState.tempoSpeed, currentDataset, syncAudioWithFrame, appStage]);

  // Global Keyboard Navigation
  useEffect(() => {
    if (appStage !== 'dashboard') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        const nextPlay = !audioState.isPlaying;
        handleUpdateAudioState({ isPlaying: nextPlay });
        if (nextPlay) {
          audioEngine.init().then(() => syncAudioWithFrame(currentFrame, currentDataset));
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSelectFrameIndex((currentFrameIndex + 1) % currentDataset.frames.length);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSelectFrameIndex((currentFrameIndex - 1 + currentDataset.frames.length) % currentDataset.frames.length);
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleUpdateAudioState({ isMuted: !audioState.isMuted });
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      } else if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (datasets[idx]) {
          handleSelectDataset(datasets[idx].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioState, currentFrameIndex, currentDataset, currentFrame, datasets, appStage]);

  // 1. CINEMATIC OPENING STAGE
  if (appStage === 'cinematic') {
    return (
      <CinematicOpening
        onBeginExploration={() => setAppStage('register')}
      />
    );
  }

  // 2. REGISTRATION PAGE STAGE (ONLY Register option, glassmorphism, backend hashing)
  if (appStage === 'register') {
    return (
      <RegistrationPage
        onRegisterSuccess={(user) => {
          setCurrentUser(user);
          setAppStage('dashboard');
        }}
        onBackToCinematic={() => setAppStage('cinematic')}
      />
    );
  }

  // 3. MAIN EARTH JUKEBOX DASHBOARD
  return (
    <div
      className={`min-h-screen text-[#EAF4FF] flex flex-col font-sans transition-colors duration-200 ${
        highContrast ? 'bg-black text-white' : 'bg-[#050B18] text-[#EAF4FF]'
      }`}
    >
      {/* Precision Telemetry Ribbon */}
      <div className="w-full bg-[#050B18] border-b border-[#00D4FF]/15 px-4 sm:px-6 py-1.5 text-[11px] font-mono text-[#9BB0C9] flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <span className="text-[#00D4FF] font-semibold tracking-wider uppercase font-bold">
            NASA Earth Information Center
          </span>
          <span className="text-[#00D4FF]/30">·</span>
          <span>Mission Elapsed: T+{Math.floor(sessionDurationSec / 60)}m {sessionDurationSec % 60}s</span>
          <span className="hidden md:inline text-[#00D4FF]/30">·</span>
          <span className="hidden md:inline font-mono text-[#9BB0C9]">Sensor: {currentDataset.missionSensor.split('/')[0]}</span>
          <span className="hidden lg:inline text-[#00D4FF]/30">·</span>
          <span className="hidden lg:inline text-[#9BB0C9]">Archive: {currentDataset.nasaDaac?.split('(')[0] || 'EOSDIS'}</span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span className="text-[#00D4FF] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
            Stream: Nominal
          </span>
          <span className="text-[#00D4FF]/30">·</span>
          <span className="text-[#EAF4FF] font-bold">Carrier: {currentFrame.audioPitchHz.toFixed(1)} Hz</span>
        </div>
      </div>

      {/* Institutional NASA Space Science Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#00D4FF]/20 bg-[#0A1628]/95 backdrop-blur-md px-4 sm:px-6 py-3 select-none glass-panel">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* NASA Meatball Vector & EIC Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B3D91] border border-white/25 flex items-center justify-center text-white font-bold text-xs tracking-widest shadow-lg shrink-0">
              NASA
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase text-gradient-space">
                  Earth Jukebox
                </span>
                <span className="text-[#00D4FF]/40">·</span>
                <span className="text-xs text-[#00D4FF] font-medium font-mono">EIC Sonification Lab</span>
              </div>
              <span className="text-[11px] text-[#9BB0C9] font-mono hidden sm:inline">
                Translating Satellite Observations into Dynamic Audio • Space Apps Challenge
              </span>
            </div>
          </div>

          {/* Action Tools: Live Stream Indicator, Cinematic View, How It Works, Spectrogram Analyst, Admin Console, Accessibility, Profile */}
          <div className="flex items-center gap-2">
            {/* Real-Time NASA Live Feed Telemetry Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0A1628] border border-rose-500/30 text-[11px] font-mono shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-rose-300 font-bold uppercase tracking-wider">NASA Live Stream</span>
              <span className="text-white/30">|</span>
              <span className="text-[#00D4FF] font-semibold">{liveNasaEvents.length} Active Events</span>
            </div>

            {/* Re-enter Cinematic Opening Button */}
            <button
              onClick={() => setAppStage('cinematic')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101F35] hover:bg-[#287BFF]/20 border border-[#00D4FF]/25 text-xs font-mono font-medium text-[#00D4FF] hover:text-white transition-all cursor-pointer"
              title="Return to Full-Screen 3D Cinematic Opening View"
            >
              <Film className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span className="hidden sm:inline">Cinematic View</span>
            </button>

            {/* 03. How It Works Pipeline Button */}
            <button
              onClick={() => setIsHowItWorksOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101F35] hover:bg-[#287BFF]/20 border border-[#00D4FF]/25 text-xs font-medium text-[#EAF4FF] hover:text-[#00D4FF] transition-all cursor-pointer"
              title="Inspect 4-Stage NASA Data to Sound Pipeline"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span className="hidden sm:inline">03. How It Works</span>
            </button>

            {/* EIC Spectrogram Intelligence Console Toggle */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                isChatOpen
                  ? 'bg-[#00D4FF] text-[#050B18] font-bold border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                  : 'bg-[#101F35] hover:bg-[#287BFF]/20 border-[#00D4FF]/25 text-[#EAF4FF]'
              }`}
              title="Open EIC Science Intelligence & Spectrogram Analyst"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Science AI</span>
            </button>

            <AccessibilityToolbar
              highContrast={highContrast}
              onToggleHighContrast={() => setHighContrast(!highContrast)}
              screenReaderSpeech={screenReaderSpeech}
              onToggleScreenReaderSpeech={() => setScreenReaderSpeech(!screenReaderSpeech)}
            />

            {/* Admin Console */}
            <button
              onClick={() => setIsAdminOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                currentUser?.role === 'admin'
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : 'bg-[#101F35] hover:bg-[#287BFF]/20 border-[#00D4FF]/25 text-[#EAF4FF]'
              }`}
              title="Administrator Operations, Engagement Analytics & Telemetry"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Analytics</span>
            </button>

            {/* Profile & Credentials */}
            {currentUser && (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101F35] hover:bg-[#287BFF]/20 border border-[#00D4FF]/25 text-xs font-medium text-[#EAF4FF] transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-[#00D4FF] text-[#050B18] font-bold text-[10px] flex items-center justify-center font-mono">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="hidden sm:inline line-clamp-1 max-w-[110px] font-mono text-[11px]">
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Top: Dataset Channel Selector Bar with Categories & Real-Time Sync */}
        <DatasetSelectorBar
          datasets={datasets}
          selectedDatasetId={selectedDatasetId}
          onSelectDataset={handleSelectDataset}
          onRefreshLiveFeed={fetchLiveNasaEvents}
          isFetchingLiveFeed={isFetchingLiveEvents}
          liveEventCount={liveNasaEvents.length}
          lastUpdatedText={lastLiveSyncTime ? `Live ${lastLiveSyncTime}` : 'Live Stream'}
        />

        {/* Center Grid: Interactive Globe Viewport + Spectrometer & Science Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column (7 cols): Interactive 3D/2D Earth Canvas with Live NASA Telemetry */}
          <div className="lg:col-span-7 flex flex-col gap-3 min-h-[440px]">
            <EarthGlobeCanvas
              dataset={currentDataset}
              currentFrame={currentFrame}
              selectedHotspot={selectedHotspot}
              liveEvents={liveNasaEvents}
              onSelectHotspot={(hs) => {
                setSelectedHotspot(hs);
                setLiveProbeCount((p) => p + 1);
                if ('speechSynthesis' in window && screenReaderSpeech) {
                  window.speechSynthesis.cancel();
                  const u = new SpeechSynthesisUtterance(`${hs.name}: ${hs.value} ${currentDataset.unit}. ${hs.note}`);
                  window.speechSynthesis.speak(u);
                }
              }}
            />
          </div>

          {/* Right Column (5 cols): Live Spectrometer & Current Scientific Frame Insight */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Audio Spectrometer & Waveform */}
            <AudioVisualizer
              dataset={currentDataset}
              currentFrame={currentFrame}
              isPlaying={audioState.isPlaying}
            />

            {/* EIC Scientific Frame Insight Card */}
            <div className="flex-1 rounded-2xl bg-[#101F35] border border-[#00D4FF]/20 p-5 flex flex-col justify-between gap-3 shadow-2xl glass-panel">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-[#00D4FF]/15 pb-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#00D4FF] font-mono">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span className="font-bold tracking-wider uppercase text-[10px]">Active Observation Epoch</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#9BB0C9] tabular-nums">{currentFrame.date}</span>
                </div>

                <div className="flex items-baseline justify-between gap-2 mt-1">
                  <h2 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
                    {currentDataset.title}
                  </h2>
                  <span className="text-[10px] font-mono text-[#00D4FF] bg-[#0A1628] px-2 py-0.5 border border-[#00D4FF]/30 rounded-md uppercase font-bold">
                    {currentFrame.label}
                  </span>
                </div>

                <p className="text-xs text-[#9BB0C9] leading-relaxed font-sans">
                  {currentFrame.scientificSummary}
                </p>

                {/* Hotspots Carousel / List */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#00D4FF]" />
                    <span>Geographical Anomaly Regions (Click to Probe):</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentFrame.hotspots.map((hs, hIdx) => {
                      const isSelected = selectedHotspot?.name === hs.name;
                      return (
                        <button
                          key={`hotspot-${hs.name}-${hIdx}`}
                          onClick={() => {
                            setSelectedHotspot(hs);
                            setLiveProbeCount((p) => p + 1);
                            const probeFreq =
                              currentFrame.audioPitchHz *
                              (1 + (hs.value / (currentDataset.maxVal || 100)) * 0.35);
                            audioEngine.playProbeTone(
                              probeFreq,
                              0.6,
                              currentDataset.sonificationConfig.leadWave
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#00D4FF] text-[#050B18] font-bold border-[#00D4FF] shadow-sm'
                              : 'bg-[#0A1628] border-[#00D4FF]/20 text-[#EAF4FF] hover:border-[#00D4FF]'
                          }`}
                        >
                          <span className="font-semibold">{hs.name}</span>
                          <span className="font-mono tabular-nums text-[#00D4FF]">
                            ({hs.value} {currentDataset.unit})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* NASA Provenance & Data Processing Details */}
                <div className="p-3 rounded-xl bg-[#0A1628]/80 border border-[#00D4FF]/15 flex flex-col gap-1.5 text-[10px] font-mono mt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#00D4FF] font-bold uppercase">
                      <Database className="w-3 h-3" />
                      <span>NASA EOSDIS Product:</span>
                    </div>
                    <span className="font-mono text-[#EAF4FF] bg-[#050B18] px-2 py-0.5 rounded border border-[#00D4FF]/20 font-bold">
                      {currentDataset.nasaProductId || 'NASA EIC Level-3/4'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#9BB0C9]">
                    <span className="uppercase">Archive DAAC:</span>
                    <span className="text-[#EAF4FF] text-right truncate max-w-[220px]">
                      {currentDataset.nasaDaac || 'NASA EOSDIS'}
                    </span>
                  </div>

                  {currentDataset.dataProcessingPipeline && (
                    <div className="pt-1.5 border-t border-[#00D4FF]/15 text-[#9BB0C9] leading-relaxed font-sans text-[10px]">
                      <span className="font-mono uppercase font-semibold text-[#00D4FF]">Data Processing: </span>
                      <span>{currentDataset.dataProcessingPipeline}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Accessible Sensory Audio Guidance Badge */}
              <div className="p-3 rounded-xl bg-[#0A1628]/80 border border-[#00D4FF]/15 text-[11px] text-[#EAF4FF] flex items-start gap-2.5">
                <Volume2 className="w-4 h-4 text-[#00D4FF] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00D4FF]">Acoustic Audio Signature:</span>
                  <span className="text-[#9BB0C9] text-[11px] leading-normal font-sans">{currentFrame.audioDescription}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Jukebox Player Controls & Acoustic Tuning Rack */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Jukebox Transport Controls (7 cols) */}
          <div className="lg:col-span-7">
            <JukeboxPlayerControls
              dataset={currentDataset}
              currentFrameIndex={currentFrameIndex}
              onSelectFrameIndex={handleSelectFrameIndex}
              audioState={audioState}
              onUpdateAudioState={handleUpdateAudioState}
            />
          </div>

          {/* Sonification Synthesizer Rack (5 cols) */}
          <div className="lg:col-span-5">
            <SonificationSynthesizerPanel
              dataset={currentDataset}
              currentFrame={currentFrame}
              audioState={audioState}
              onUpdateAudioState={handleUpdateAudioState}
            />
          </div>
        </div>
      </main>

      {/* EIC Science Intelligence & Spectrogram Analyst Console */}
      <AeroSonicChatbot
        dataset={currentDataset}
        currentFrame={currentFrame}
        audioState={audioState}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        currentUser={currentUser}
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Admin Dashboard */}
      <AdminDashboard
        currentUser={currentUser}
        datasets={datasets}
        onUpdateDatasets={handleUpdateDatasets}
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        liveListenSeconds={liveListenSeconds}
        sessionDurationSec={sessionDurationSec}
        liveProbeCount={liveProbeCount}
        liveRecordingCount={liveRecordingCount}
      />

      {/* 3. How It Works Pipeline Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-[#00D4FF]/15 bg-[#050B18] px-4 py-4 text-center text-xs text-[#9BB0C9] mt-auto select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px]">
          <span>
            NASA Space Apps Challenge • NASA Earth Information Center (EIC) Sonification Lab
          </span>
          <div className="flex items-center gap-3 text-[#00D4FF]">
            <span>Web Audio PCM 48kHz</span>
            <span className="text-[#9BB0C9]/40">•</span>
            <span>Gemini 3.8 Flash Intelligence</span>
            <span className="text-[#9BB0C9]/40">•</span>
            <span>NASA Section 508 A11y</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

