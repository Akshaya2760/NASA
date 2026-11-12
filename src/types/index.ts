export type MusicalScale = 'pentatonic' | 'dorian' | 'lydian' | 'minor' | 'chromatic' | 'voyager';

export interface Hotspot {
  lat: number;
  lng: number;
  name: string;
  value: number;
  note: string;
}

export interface LiveNasaEvent {
  id: string;
  title: string;
  category: string;
  categoryTitle: string;
  date: string;
  lat: number;
  lng: number;
  magnitude?: number;
  magnitudeUnit?: string;
  sourceUrl?: string;
  sourceName?: string;
  sonificationFreqHz: number;
  sonificationWave: OscillatorType;
  acousticNote: string;
}

export interface DatasetFrame {
  year: number;
  label: string;
  date: string;
  globalAvg: number;
  anomaly: number;
  audioPitchHz: number;
  musicalNote: string;
  hotspots: Hotspot[];
  scientificSummary: string;
  audioDescription: string;
}

export interface EICDataset {
  id: string;
  title: string;
  subtitle: string;
  missionSensor: string;
  category: 'Ocean' | 'Atmosphere' | 'Cryosphere' | 'Biosphere' | 'Heliophysics' | 'Anthropocene';
  iconName: string;
  description: string;
  unit: string;
  baseline: number;
  minVal: number;
  maxVal: number;
  colorRamp: {
    low: string;
    mid: string;
    high: string;
  };
  sonificationConfig: {
    baseFreq: number;
    scale: MusicalScale;
    droneWave: OscillatorType;
    leadWave: OscillatorType;
    filterMinHz: number;
    filterMaxHz: number;
    pulseRateBpm: number;
  };
  nasaProductId?: string;
  nasaDoi?: string;
  nasaDaac?: string;
  dataProcessingPipeline?: string;
  frames: DatasetFrame[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'scientist' | 'educator' | 'citizen';
  institution?: string;
  avatarBg: string;
  savedPresets: string[];
  bookmarks: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  simulated?: boolean;
}

export interface SonificationAudioState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  tempoSpeed: number; // 0.5, 1, 1.5, 2
  layerDrone: boolean;
  layerLead: boolean;
  layerPulse: boolean;
  layerAtmosphere: boolean;
  activeScale: MusicalScale;
  baseKey: string;
  isRecording: boolean;
  spatialMode: 'stereo' | 'orbit' | 'mono';
}

export interface DatasetEngagementMetric {
  datasetId: string;
  datasetTitle: string;
  category: string;
  listenMinutes: number;
  playCount: number;
  probeClicks: number;
  percentage: number;
}

export interface UserEngagementAnalytics {
  totalSessions: number;
  uniqueListeners: number;
  avgSessionDurationSeconds: number;
  totalListenMinutes: number;
  activeLiveListeners: number;
  audioProbesClicked: number;
  recordingsExported: number;
  aiQueriesAnswered: number;
  datasetRankings: DatasetEngagementMetric[];
  hourlyActivity: { hour: string; sessions: number; minutes: number }[];
  durationCohorts: { label: string; count: number; percentage: number }[];
  scalePopularity: { scale: MusicalScale; label: string; percentage: number }[];
}

export interface AdminTelemetry {
  totalSessions: number;
  framesPlayed: number;
  audioSynthesizerHz: number;
  activeVoiceNodes: number;
  lastTunedTimestamp: string;
}
