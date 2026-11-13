import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EICDataset, DatasetFrame, User, SonificationAudioState, Hotspot, LiveNasaEvent, MusicalScale } from './types';
import { INITIAL_DATASETS } from './data/datasets';
import { audioEngine } from './audio/AudioEngine';
import { CinematicOpening } from './components/CinematicOpening';
import { RegistrationPage } from './components/RegistrationPage';
import { EarthGlobeCanvas } from './components/EarthGlobeCanvas';
import { AudioVisualizer } from './components/AudioVisualizer';
import { JukeboxPlayerControls } from './components/JukeboxPlayerControls';
import { SonificationSynthesizerPanel } from './components/SonificationSynthesizerPanel';
import { DatasetSelectorBar } from './components/DatasetSelectorBar';
import { MissionStagesBar, MissionStageId } from './components/MissionStagesBar';
import { AeroSonicChatbot } from './components/AeroSonicChatbot';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AccessibilityToolbar } from './components/AccessibilityToolbar';
import { HowItWorksModal } from './components/HowItWorksModal';
import { SessionShareModal } from './components/SessionShareModal';
import {
  Bot,
  Shield,
  Volume2,
  MapPin,
  HelpCircle,
  Database,
  Film,
  Share2,
  Radio,
} from 'lucide-react';

type AppStage = 'cinematic' | 'register' | 'dashboard';
type InspectorTab = 'overview' | 'data' | 'synth';

export default function App() {
  const [datasets, setDatasets] = useState<EICDataset[]>(() => {
    const saved = localStorage.getItem('nasa_eic_custom_datasets');
    if (saved) {
      try {
        const parsed: EICDataset[] = JSON.parse(saved);
        const missing = INITIAL_DATASETS.filter((init) => !parsed.some((p) => p.id === init.id));
        return [...missing, ...parsed];
      } catch {
        return INITIAL_DATASETS;
      }
    }
    return INITIAL_DATASETS;
  });

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const dsParam = new URLSearchParams(window.location.search).get('ds');
      if (dsParam && INITIAL_DATASETS.some((d) => d.id === dsParam)) {
        return dsParam;
      }
    }
    return INITIAL_DATASETS[0].id;
  });

  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const yrParam = parseInt(new URLSearchParams(window.location.search).get('yr') || '', 10);
      if (!isNaN(yrParam) && yrParam >= 0) return yrParam;
    }
    return 0;
  });

  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  // Mission Stage & Right Inspector Tab
  const [activeStage, setActiveStage] = useState<MissionStageId>(2);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('overview');
  const datasetBarRef = useRef<HTMLDivElement | null>(null);
  const playerControlsRef = useRef<HTMLDivElement | null>(null);

  // Live NASA Satellite Telemetry Stream (EONET v3)
  const [liveNasaEvents, setLiveNasaEvents] = useState<LiveNasaEvent[]>([]);
  const [isFetchingLiveEvents, setIsFetchingLiveEvents] = useState<boolean>(false);
  const [lastLiveSyncTime, setLastLiveSyncTime] = useState<string>('');

  const fetchLiveNasaEvents = useCallback(async () => {
    setIsFetchingLiveEvents(true);
    try {
      const res = await fetch('/api/nasa/current-events');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const text = await res.text();
      const data = JSON.parse(text);
      if (data && data.events && Array.isArray(data.events)) {
        setLiveNasaEvents(data.events);
        setLastLiveSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        setDatasets((prevDatasets) =>
          prevDatasets.map((ds) => {
            if (ds.id === 'nasa-live-eonet') {
              const liveHotspots: Hotspot[] = data.events.slice(0, 8).map((ev: LiveNasaEvent) => ({
                name: ev.title,
                lat: ev.lat,
                lng: ev.lng,
                value: ev.magnitude || Math.round(ev.sonificationFreqHz),
                note: `${ev.categoryTitle}: ${ev.acousticNote} (${ev.sourceName})`,
              }));

              const updatedFrames = [...ds.frames];
              if (updatedFrames[0]) {
                updatedFrames[0] = {
                  ...updatedFrames[0],
                  label: `Live Stream (${new Date().toLocaleDateString()})`,
                  date: `${new Date().toISOString().split('T')[0]} (Live)`,
                  hotspots: liveHotspots,
                  scientificSummary: `Near-real-time satellite stream from NASA EONET v3 monitoring ${data.count || data.events.length} active natural events.`,
                };
              }
              return { ...ds, frames: updatedFrames };
            }
            return ds;
          })
        );
      }
    } catch (err) {
      console.warn('NASA live data stream warning:', err);
    } finally {
      setIsFetchingLiveEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveNasaEvents();
    const interval = setInterval(fetchLiveNasaEvents, 120000);
    return () => clearInterval(interval);
  }, [fetchLiveNasaEvents]);

  // Audio Synthesis State
  const [audioState, setAudioState] = useState<SonificationAudioState>(() => {
    const scParam = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('sc') as MusicalScale | null) : null;
    const validScales: MusicalScale[] = ['voyager', 'dorian', 'lydian', 'minor', 'pentatonic'];
    return {
      isPlaying: false,
      isMuted: false,
      volume: 0.75,
      tempoSpeed: 1,
      layerDrone: true,
      layerLead: true,
      layerPulse: true,
      layerAtmosphere: true,
      activeScale: scParam && validScales.includes(scParam) ? scParam : INITIAL_DATASETS[0].sonificationConfig.scale,
      baseKey: 'D',
      isRecording: false,
      spatialMode: 'orbit',
    };
  });

  // User Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('nasa_eic_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Primary App Journey Stage
  const [appStage, setAppStage] = useState<AppStage>('cinematic');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Accessibility
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderSpeech, setScreenReaderSpeech] = useState(false);

  // Analytics
  const [sessionDurationSec, setSessionDurationSec] = useState<number>(0);
  const [liveListenSeconds, setLiveListenSeconds] = useState<Record<string, number>>({});
  const [liveProbeCount, setLiveProbeCount] = useState<number>(0);
  const [liveRecordingCount] = useState<number>(0);

  const currentDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];
  const safeFrameIdx = Math.min(currentFrameIndex, Math.max(0, currentDataset.frames.length - 1));
  const currentFrame = currentDataset.frames[safeFrameIdx] || currentDataset.frames[0];

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

  const handleUpdateDatasets = (newDatasets: EICDataset[]) => {
    setDatasets(newDatasets);
    localStorage.setItem('nasa_eic_custom_datasets', JSON.stringify(newDatasets));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('nasa_eic_user', JSON.stringify(user));
    setAppStage('dashboard');
    audioEngine.playEntranceChime('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('nasa_eic_user');
    localStorage.removeItem('nasa_eic_auth_token');
    audioEngine.applyState({ ...audioState, isPlaying: false });
    setAudioState((prev) => ({ ...prev, isPlaying: false }));
    setAppStage('cinematic');
  };

  const handleUpdateAudioState = (partial: Partial<SonificationAudioState>) => {
    setAudioState((prev) => {
      const next = { ...prev, ...partial };
      audioEngine.applyState(next);
      return next;
    });
  };

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

  const handleSelectDataset = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) return;
    setSelectedDatasetId(id);
    setCurrentFrameIndex(0);
    setSelectedHotspot(null);
    handleUpdateAudioState({ activeScale: ds.sonificationConfig.scale });
    syncAudioWithFrame(ds.frames[0], ds);
  };

  const handleSelectFrameIndex = (idx: number) => {
    setCurrentFrameIndex(idx);
    const targetFrame = currentDataset.frames[idx];
    if (targetFrame) {
      syncAudioWithFrame(targetFrame, currentDataset);
    }
  };

  // Stage navigation linking 4-stage pipeline cleanly to workspace views
  const handleSelectMissionStage = (stage: MissionStageId) => {
    setActiveStage(stage);
    if (stage === 1) {
      setInspectorTab('data');
      datasetBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (stage === 2) {
      setInspectorTab('overview');
    } else if (stage === 3) {
      setInspectorTab('synth');
    } else if (stage === 4) {
      playerControlsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Automatic Timeline Playback
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
        handleSelectFrameIndex((safeFrameIdx + 1) % currentDataset.frames.length);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSelectFrameIndex((safeFrameIdx - 1 + currentDataset.frames.length) % currentDataset.frames.length);
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
  }, [audioState, safeFrameIdx, currentDataset, currentFrame, datasets, appStage]);

  // 1. CINEMATIC OPENING
  if (appStage === 'cinematic') {
    return (
      <CinematicOpening
        onBeginExploration={() => setAppStage('register')}
      />
    );
  }

  // 2. ACCESS PORTAL (Register, Login & Admin Login)
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

  // 3. MAIN EARTH JUKEBOX DASHBOARD (Clean, Uncrowded Scientific Workspace)
  return (
    <div
      className={`min-h-screen text-[#EAF4FF] flex flex-col font-sans transition-colors duration-200 ${
        highContrast ? 'bg-black text-white' : 'bg-[#050B18] text-[#EAF4FF]'
      }`}
    >
      {/* Single Clean 3-Zone Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#1B2B44] bg-[#070D19]/95 backdrop-blur-md px-4 sm:px-6 h-14 flex items-center select-none">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
          {/* Left: Institutional Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0B3D91] border border-white/20 flex items-center justify-center text-white font-bold text-[10px] tracking-wider shrink-0">
              NASA
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                Earth Jukebox
              </span>
              <span className="hidden md:inline text-xs font-mono text-[#9BB0C9]">
                EIC Sonification Lab
              </span>
            </div>
          </div>

          {/* Center: Primary Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-[#9BB0C9]">
            <button
              onClick={() => setAppStage('cinematic')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#101F35] hover:text-white transition-colors cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span>Opening View</span>
            </button>
            <button
              onClick={() => setIsHowItWorksOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#101F35] hover:text-white transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span>Pipeline Guide</span>
            </button>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                isChatOpen ? 'bg-[#101F35] text-[#00D4FF]' : 'hover:bg-[#101F35] hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span>Science Analyst</span>
            </button>
            <button
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#101F35] hover:text-white transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentUser?.role === 'admin' ? 'Admin Console' : 'Analytics'}</span>
            </button>
          </nav>

          {/* Right: Share, Accessibility & Account */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A1628] hover:bg-[#101F35] border border-[#1B2B44] text-xs font-mono text-[#EAF4FF] transition-colors cursor-pointer"
              title="Share Session Link or Telemetry Card"
            >
              <Share2 className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <div className="hidden sm:block">
              <AccessibilityToolbar
                highContrast={highContrast}
                onToggleHighContrast={() => setHighContrast(!highContrast)}
                screenReaderSpeech={screenReaderSpeech}
                onToggleScreenReaderSpeech={() => setScreenReaderSpeech(!screenReaderSpeech)}
              />
            </div>

            {currentUser && (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0A1628] hover:bg-[#101F35] border border-[#1B2B44] text-xs text-[#EAF4FF] transition-colors cursor-pointer"
                title="Account & Role Settings"
              >
                <div className="w-5 h-5 rounded-full bg-[#00D4FF] text-[#050B18] font-bold text-[10px] flex items-center justify-center font-mono">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate font-mono text-[11px]">
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Scientific Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {/* Channel Selector */}
        <div ref={datasetBarRef}>
          <DatasetSelectorBar
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={handleSelectDataset}
            onRefreshLiveFeed={fetchLiveNasaEvents}
            isFetchingLiveFeed={isFetchingLiveEvents}
            liveEventCount={liveNasaEvents.length}
            lastUpdatedText={lastLiveSyncTime ? `Synced ${lastLiveSyncTime}` : 'Live Feed'}
          />
        </div>

        {/* Interactive 4-Stage Pipeline */}
        <MissionStagesBar
          activeStage={activeStage}
          onSelectStage={handleSelectMissionStage}
          datasetTitle={currentDataset.title}
          currentYear={currentFrame.year}
          pitchHz={currentFrame.audioPitchHz}
        />

        {/* Balanced 12-Column Globe + Tabbed Scientific Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left (7 cols): Unobstructed Interactive Earth Globe */}
          <div className="lg:col-span-7 flex flex-col">
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

          {/* Right (5 cols): Spectrogram + Single 3-Tab Inspector */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <AudioVisualizer
              dataset={currentDataset}
              currentFrame={currentFrame}
              isPlaying={audioState.isPlaying}
            />

            <div className="flex-1 rounded-xl bg-[#0A1628] border border-[#1B2B44] p-4 sm:p-5 flex flex-col gap-4">
              {/* Clean 3-Tab Segmented Switch */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#050B18] border border-[#1B2B44] text-[11px] font-mono">
                <button
                  onClick={() => setInspectorTab('overview')}
                  className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                    inspectorTab === 'overview'
                      ? 'bg-[#101F35] text-[#00D4FF] font-semibold'
                      : 'text-[#9BB0C9] hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setInspectorTab('data')}
                  className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                    inspectorTab === 'data'
                      ? 'bg-[#101F35] text-[#00D4FF] font-semibold'
                      : 'text-[#9BB0C9] hover:text-white'
                  }`}
                >
                  NASA Data
                </button>
                <button
                  onClick={() => setInspectorTab('synth')}
                  className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                    inspectorTab === 'synth'
                      ? 'bg-[#101F35] text-[#00D4FF] font-semibold'
                      : 'text-[#9BB0C9] hover:text-white'
                  }`}
                >
                  Synthesizer
                </button>
              </div>

              {/* TAB 1: OVERVIEW & GEOGRAPHICAL ANOMALIES */}
              {inspectorTab === 'overview' && (
                <div className="flex flex-col justify-between flex-1 gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-2 border-b border-[#1B2B44] pb-2.5">
                      <h2 className="text-sm font-semibold text-white">
                        {currentDataset.title}
                      </h2>
                      <span className="text-[11px] font-mono text-[#00D4FF] tabular-nums shrink-0">
                        {currentFrame.date}
                      </span>
                    </div>

                    <p className="text-xs text-[#9BB0C9] leading-relaxed">
                      {currentFrame.scientificSummary}
                    </p>

                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#00D4FF]" />
                        <span>Anomaly Regions (Click to Audition)</span>
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
                              className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-[#101F35] text-white border-[#00D4FF]'
                                  : 'bg-[#050B18] border-[#1B2B44] text-[#9BB0C9] hover:text-white hover:border-[#2A4268]'
                              }`}
                            >
                              <span>{hs.name}</span>
                              <span className="text-[#00D4FF] tabular-nums">
                                {hs.value} {currentDataset.unit.split(' ')[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1B2B44] flex items-start gap-2.5 text-xs">
                    <Volume2 className="w-4 h-4 text-[#00D4FF] shrink-0 mt-0.5" />
                    <p className="text-[#9BB0C9] text-[11px] leading-relaxed">
                      <strong className="text-[#EAF4FF] font-medium">Acoustic Mapping: </strong>
                      {currentFrame.audioDescription}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: NASA EOSDIS PROVENANCE & LIVE EONET EVENTS */}
              {inspectorTab === 'data' && (
                <div className="flex flex-col gap-4 text-xs">
                  <div className="flex flex-col gap-2 pb-3 border-b border-[#1B2B44]">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#9BB0C9] flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-[#00D4FF]" />
                        Product ID
                      </span>
                      <span className="text-[#EAF4FF] font-semibold">
                        {currentDataset.nasaProductId || 'NASA EIC Level-3/4'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#9BB0C9]">Archive DAAC</span>
                      <span className="text-[#EAF4FF] text-right truncate max-w-[210px]">
                        {currentDataset.nasaDaac || 'NASA EOSDIS'}
                      </span>
                    </div>
                    {currentDataset.dataProcessingPipeline && (
                      <p className="text-[11px] text-[#9BB0C9] leading-relaxed pt-1">
                        {currentDataset.dataProcessingPipeline}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-[#00D4FF]" />
                        <span>Live NASA EONET Telemetry ({liveNasaEvents.length})</span>
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                      {liveNasaEvents.slice(0, 6).map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => {
                            const hs: Hotspot = {
                              name: ev.title,
                              lat: ev.lat,
                              lng: ev.lng,
                              value: ev.magnitude || Math.round(ev.sonificationFreqHz),
                              note: `${ev.categoryTitle}: ${ev.acousticNote}`,
                            };
                            setSelectedHotspot(hs);
                            audioEngine.playProbeTone(
                              ev.sonificationFreqHz,
                              0.65,
                              currentDataset.sonificationConfig.leadWave
                            );
                          }}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#050B18] hover:bg-[#101F35] border border-[#1B2B44] text-left transition-colors cursor-pointer"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[11px] font-medium text-[#EAF4FF] truncate">
                              {ev.title}
                            </span>
                            <span className="text-[10px] font-mono text-[#9BB0C9]">
                              {ev.categoryTitle} · {ev.lat.toFixed(1)}°, {ev.lng.toFixed(1)}°
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#00D4FF] shrink-0 tabular-nums">
                            {ev.sonificationFreqHz.toFixed(0)} Hz
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SONIFICATION SYNTHESIZER */}
              {inspectorTab === 'synth' && (
                <SonificationSynthesizerPanel
                  dataset={currentDataset}
                  currentFrame={currentFrame}
                  audioState={audioState}
                  onUpdateAudioState={handleUpdateAudioState}
                />
              )}
            </div>
          </div>
        </div>

        {/* Full-Width Clean Epoch Transport & Previous Year Comparator */}
        <div ref={playerControlsRef}>
          <JukeboxPlayerControls
            dataset={currentDataset}
            currentFrameIndex={safeFrameIdx}
            onSelectFrameIndex={handleSelectFrameIndex}
            audioState={audioState}
            onUpdateAudioState={handleUpdateAudioState}
          />
        </div>
      </main>

      {/* Modals & Drawers */}
      <AeroSonicChatbot
        dataset={currentDataset}
        currentFrame={currentFrame}
        audioState={audioState}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      <AuthModal
        currentUser={currentUser}
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

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

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      <SessionShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        dataset={currentDataset}
        currentFrame={currentFrame}
        frameIndex={safeFrameIdx}
        audioState={audioState}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-[#1B2B44] bg-[#050B18] px-4 sm:px-6 py-3.5 text-xs text-[#9BB0C9] mt-auto select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px]">
          <span>
            NASA Space Apps Challenge · Earth Information Center Sonification Lab
          </span>
          <span className="tabular-nums text-[#9BB0C9]">
            Session {Math.floor(sessionDurationSec / 60)}m {sessionDurationSec % 60}s · Sensor {currentDataset.missionSensor.split('/')[0]} · 48 kHz Web Audio
          </span>
        </div>
      </footer>
    </div>
  );
}
