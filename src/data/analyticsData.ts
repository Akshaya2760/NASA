import { UserEngagementAnalytics, DatasetEngagementMetric, EICDataset, MusicalScale } from '../types';

export const INITIAL_ANALYTICS_BASE = {
  totalSessions: 14820,
  uniqueListeners: 5490,
  baseAvgDurationSec: 564, // 9 minutes 24 seconds
  baseTotalListenMinutes: 139308,
  activeLiveListeners: 184,
  baseAudioProbes: 68420,
  baseRecordingsExported: 1942,
  baseAiQueries: 11280,
  datasetSeedMinutes: {
    'sea-surface-temp': 38450,
    'atmospheric-co2': 31200,
    'polar-ice-mass': 24900,
    'wildfire-thermal': 18750,
    'vegetation-ndvi': 12400,
    'solar-aurora': 7890,
    'precipitation-storms': 3820,
    'urban-lights': 1898,
  } as Record<string, number>,
  datasetSeedPlays: {
    'sea-surface-temp': 12480,
    'atmospheric-co2': 9820,
    'polar-ice-mass': 7450,
    'wildfire-thermal': 5610,
    'vegetation-ndvi': 3890,
    'solar-aurora': 2480,
    'precipitation-storms': 1920,
    'urban-lights': 980,
  } as Record<string, number>,
};

export function computeEngagementAnalytics(
  datasets: EICDataset[],
  liveListenSeconds: Record<string, number>,
  currentSessionDurationSec: number,
  liveProbeCount: number,
  liveRecordingCount: number
): UserEngagementAnalytics {
  // Aggregate live session time with platform baseline
  let totalMinutes = INITIAL_ANALYTICS_BASE.baseTotalListenMinutes;
  Object.values(liveListenSeconds).forEach((sec) => {
    totalMinutes += Math.round(sec / 60);
  });

  const totalSessions = INITIAL_ANALYTICS_BASE.totalSessions + (currentSessionDurationSec > 5 ? 1 : 0);
  const avgSessionDurationSeconds = Math.round(
    (INITIAL_ANALYTICS_BASE.baseAvgDurationSec * INITIAL_ANALYTICS_BASE.totalSessions + currentSessionDurationSec) /
      totalSessions
  );

  // Compute dataset rankings
  const rankings: DatasetEngagementMetric[] = datasets.map((d) => {
    const seedMin = INITIAL_ANALYTICS_BASE.datasetSeedMinutes[d.id] || 850;
    const liveSec = liveListenSeconds[d.id] || 0;
    const liveMin = Math.round(liveSec / 60);
    const totalDsMin = seedMin + liveMin;

    const seedPlays = INITIAL_ANALYTICS_BASE.datasetSeedPlays[d.id] || 250;
    const playCount = seedPlays + (liveSec > 3 ? 1 : 0);

    return {
      datasetId: d.id,
      datasetTitle: d.title,
      category: d.category,
      listenMinutes: totalDsMin,
      playCount: playCount,
      probeClicks: Math.round(playCount * 3.8) + (liveProbeCount > 0 ? liveProbeCount : 0),
      percentage: 0, // computed below
    };
  });

  // Calculate percentage shares
  const sumRankingsMinutes = rankings.reduce((acc, r) => acc + r.listenMinutes, 0) || 1;
  rankings.forEach((r) => {
    r.percentage = parseFloat(((r.listenMinutes / sumRankingsMinutes) * 100).toFixed(1));
  });

  // Sort descending by listen minutes
  rankings.sort((a, b) => b.listenMinutes - a.listenMinutes);

  // Hourly distribution (24-hour UTC activity pattern)
  const hourlyActivity = [
    { hour: '00:00', sessions: 280, minutes: 2630 },
    { hour: '02:00', sessions: 190, minutes: 1780 },
    { hour: '04:00', sessions: 140, minutes: 1310 },
    { hour: '06:00', sessions: 320, minutes: 3010 },
    { hour: '08:00', sessions: 740, minutes: 6950 },
    { hour: '10:00', sessions: 1280, minutes: 12030 },
    { hour: '12:00', sessions: 1540, minutes: 14470 },
    { hour: '14:00', sessions: 1890, minutes: 17760 },
    { hour: '16:00', sessions: 1720, minutes: 16160 },
    { hour: '18:00', sessions: 1410, minutes: 13250 },
    { hour: '20:00', sessions: 980, minutes: 9210 },
    { hour: '22:00', sessions: 530, minutes: 4980 },
  ];

  // Session duration cohorts
  const durationCohorts = [
    { label: '< 2 min (Quick Scans)', count: 2150, percentage: 14.5 },
    { label: '2 - 5 min (Targeted Analysis)', count: 4280, percentage: 28.9 },
    { label: '5 - 15 min (Standard Research)', count: 5690, percentage: 38.4 },
    { label: '15 - 30 min (Classroom Study)', count: 2110, percentage: 14.2 },
    { label: '30+ min (Ambient Immersion)', count: 590, percentage: 4.0 },
  ];

  // Scale popularity
  const scalePopularity: { scale: MusicalScale; label: string; percentage: number }[] = [
    { scale: 'voyager', label: 'NASA Voyager Golden Record', percentage: 38.5 },
    { scale: 'dorian', label: 'Oceanic Dorian Mode', percentage: 25.4 },
    { scale: 'minor', label: 'Climate Requiem Minor', percentage: 18.2 },
    { scale: 'lydian', label: 'Atmospheric Lydian', percentage: 11.3 },
    { scale: 'pentatonic', label: 'Universal Pentatonic', percentage: 6.6 },
  ];

  return {
    totalSessions,
    uniqueListeners: INITIAL_ANALYTICS_BASE.uniqueListeners,
    avgSessionDurationSeconds,
    totalListenMinutes: totalMinutes,
    activeLiveListeners: INITIAL_ANALYTICS_BASE.activeLiveListeners + 1,
    audioProbesClicked: INITIAL_ANALYTICS_BASE.baseAudioProbes + liveProbeCount,
    recordingsExported: INITIAL_ANALYTICS_BASE.baseRecordingsExported + liveRecordingCount,
    aiQueriesAnswered: INITIAL_ANALYTICS_BASE.baseAiQueries,
    datasetRankings: rankings,
    hourlyActivity,
    durationCohorts,
    scalePopularity,
  };
}
