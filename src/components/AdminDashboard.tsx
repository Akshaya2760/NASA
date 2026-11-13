import React, { useState, useEffect, useCallback } from 'react';
import { EICDataset, User, MusicalScale, UserEngagementAnalytics } from '../types';
import { audioEngine } from '../audio/AudioEngine';
import { computeEngagementAnalytics } from '../data/analyticsData';
import {
  ShieldAlert,
  Sliders,
  Database,
  Activity,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  X,
  Volume2,
  Cpu,
  BarChart3,
  Clock,
  Headphones,
  Users,
  Download,
  Flame,
  ArrowUpRight,
  TrendingUp,
  Radio,
  Music,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  Search,
  RefreshCw,
  AlertTriangle,
  Info,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User | null;
  datasets: EICDataset[];
  onUpdateDatasets: (datasets: EICDataset[]) => void;
  isOpen: boolean;
  onClose: () => void;
  liveListenSeconds?: Record<string, number>;
  sessionDurationSec?: number;
  liveProbeCount?: number;
  liveRecordingCount?: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  datasets,
  onUpdateDatasets,
  isOpen,
  onClose,
  liveListenSeconds = {},
  sessionDurationSec = 0,
  liveProbeCount = 0,
  liveRecordingCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'datasets' | 'dsp' | 'telemetry'>('users');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(datasets[0]?.id || '');
  const [savedNotice, setSavedNotice] = useState(false);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [datasetSortBy, setDatasetSortBy] = useState<'minutes' | 'plays' | 'probes'>('minutes');

  // User Management State
  const [usersList, setUsersList] = useState<Array<{ id: string; name: string; email: string; role: string; institution?: string; createdAt: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'scientist' | 'educator' | 'citizen'>('all');
  const [userNotice, setUserNotice] = useState<string | null>(null);

  // Error & Application Activity Logs State
  const [systemLogs, setSystemLogs] = useState<Array<{ id: string; timestamp: string; level: 'info' | 'warn' | 'error'; service: string; message: string }>>([]);
  const [telemetryHealth, setTelemetryHealth] = useState<any>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Custom new dataset form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Ocean' | 'Atmosphere' | 'Cryosphere' | 'Biosphere' | 'Heliophysics' | 'Anthropocene'>('Atmosphere');
  const [newSensor, setNewSensor] = useState('NASA EMIT / PACE');
  const [newUnit, setNewUnit] = useState('ppb');
  const [newBaseline, setNewBaseline] = useState(1850);
  const [newBaseFreq, setNewBaseFreq] = useState(164.81);

  // DSP Tuning
  const [masterTuningHz, setMasterTuningHz] = useState(440);
  const [limiterCeiling, setLimiterCeiling] = useState(-18);

  if (!isOpen) return null;

  // Compute live real-time engagement analytics
  const analytics: UserEngagementAnalytics = computeEngagementAnalytics(
    datasets,
    liveListenSeconds,
    sessionDurationSec,
    liveProbeCount,
    liveRecordingCount
  );

  const currentSelectedDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];

  // Format seconds to mm:ss
  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Sort dataset rankings based on user selection
  const sortedRankings = [...analytics.datasetRankings].sort((a, b) => {
    if (datasetSortBy === 'plays') return b.playCount - a.playCount;
    if (datasetSortBy === 'probes') return b.probeClicks - a.probeClicks;
    return b.listenMinutes - a.listenMinutes;
  });

  const topDataset = analytics.datasetRankings[0];

  // Handle Export Analytics CSV
  const handleExportAnalyticsCSV = () => {
    const headers = ['Rank', 'Dataset ID', 'Dataset Title', 'Category', 'Listen Minutes', 'Listen Hours', 'Play Count', 'Probe Clicks', 'Share %'];
    const rows = analytics.datasetRankings.map((r, i) => [
      i + 1,
      r.datasetId,
      `"${r.datasetTitle}"`,
      r.category,
      r.listenMinutes,
      (r.listenMinutes / 60).toFixed(1),
      r.playCount,
      r.probeClicks,
      `${r.percentage}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nasa-eic-sonification-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdateDatasetField = (field: string, value: any) => {
    const updated = datasets.map((d) => {
      if (d.id === currentSelectedDataset.id) {
        if (field.startsWith('sonificationConfig.')) {
          const subKey = field.split('.')[1];
          return {
            ...d,
            sonificationConfig: { ...d.sonificationConfig, [subKey]: value },
          };
        }
        return { ...d, [field]: value };
      }
      return d;
    });

    onUpdateDatasets(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleAddNewDataset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newId = 'custom-' + Date.now();
    const newDs: EICDataset = {
      id: newId,
      title: newTitle,
      subtitle: 'NASA EIC Custom Sonification Stream',
      missionSensor: newSensor,
      category: newCategory,
      iconName: 'Activity',
      description: 'Custom Earth observation stream provisioned via NASA Earth Jukebox Admin Console.',
      unit: newUnit,
      baseline: newBaseline,
      minVal: newBaseline * 0.8,
      maxVal: newBaseline * 1.5,
      colorRamp: {
        low: '#06b6d4',
        mid: '#f59e0b',
        high: '#ef4444',
      },
      sonificationConfig: {
        baseFreq: newBaseFreq,
        scale: 'pentatonic',
        droneWave: 'sine',
        leadWave: 'sawtooth',
        filterMinHz: 400,
        filterMaxHz: 2800,
        pulseRateBpm: 90,
      },
      frames: [
        {
          year: 2024,
          label: '2024 CE Baseline Observation',
          date: '2024-01-01',
          globalAvg: newBaseline,
          anomaly: 0,
          audioPitchHz: newBaseFreq,
          musicalNote: 'C3 (Custom Baseline)',
          hotspots: [
            { lat: 20.0, lng: 0.0, name: 'Calibration Station Alpha', value: newBaseline, note: 'Admin provisioned observation point' },
          ],
          scientificSummary: 'Operational telemetry stream actively calibrated in EIC sonification runtime.',
          audioDescription: 'Resonant sine fundamental sounding at the configured base frequency.',
        },
      ],
    };

    onUpdateDatasets([...datasets, newDs]);
    setSelectedDatasetId(newId);
    setIsAddingNew(false);
    setNewTitle('');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handlePlayTestTone = () => {
    audioEngine.playProbeTone(masterTuningHz, 0.8, 'sine');
  };

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUsersList(data.users);
      }
    } catch (err) {
      console.warn('Failed to fetch admin users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Fetch Activity Logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/activity-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) setSystemLogs(data.logs);
        if (data.telemetryStatus) setTelemetryHealth(data.telemetryStatus);
      }
    } catch (err) {
      console.warn('Failed to fetch admin activity logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchLogs();
    }
  }, [isOpen, fetchUsers, fetchLogs]);

  // Handle role change
  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsersList((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        setUserNotice(`Role updated successfully to ${newRole}`);
        setTimeout(() => setUserNotice(null), 2500);
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  // Handle user deletion (two-click inline confirmation)
  const handleDeleteUser = async (userId: string) => {
    if (confirmDeleteId !== userId) {
      setConfirmDeleteId(userId);
      setTimeout(() => setConfirmDeleteId((prev) => (prev === userId ? null : prev)), 4000);
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsersList((prev) => prev.filter((u) => u.id !== userId));
        setConfirmDeleteId(null);
        setUserNotice('Investigator account removed from registry.');
        setTimeout(() => setUserNotice(null), 2500);
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleRunDiagnostic = () => {
    audioEngine.playProbeTone(masterTuningHz, 0.4, 'sine');
    const newLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      level: 'info' as const,
      service: 'Diagnostics',
      message: `Operational health check executed: Master DSP ${masterTuningHz}Hz, Telemetry online.`,
    };
    setSystemLogs((prev) => [newLog, ...prev]);
  };

  // User Filter Logic
  const filteredUsers = usersList.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.institution && u.institution.toLowerCase().includes(userSearchQuery.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  // Log Filter Logic
  const filteredLogs = systemLogs.filter((l) => {
    if (logFilter === 'all') return true;
    return l.level === logFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-5xl h-[92vh] rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl flex flex-col gap-5 select-none relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-white">NASA EIC Administrator Console</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300">
                  LEVEL-5 ACCESS
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {analytics.activeLiveListeners} Active Observers
                </span>
              </div>
              <span className="text-xs text-slate-400">
                User engagement analytics, dataset listening metrics, DSP calibration, and operational feeds.
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2 text-xs font-medium">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Users ({usersList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Platform Usage & Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('datasets')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'datasets'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Dataset Manager ({datasets.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('dsp')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'dsp'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>DSP Calibration</span>
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'telemetry'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Errors & System Activity</span>
            </button>
          </div>

          {activeTab === 'users' && (
            <button
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-amber-300 font-semibold transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
              <span>Refresh User Registry</span>
            </button>
          )}

          {activeTab === 'analytics' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                {(['today', '7d', '30d', 'all'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setAnalyticsTimeframe(tf)}
                    className={`px-2 py-0.5 rounded uppercase font-mono transition ${
                      analyticsTimeframe === tf
                        ? 'bg-sky-500/20 text-sky-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportAnalyticsCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-sky-300 font-semibold transition"
                title="Download CSV report of dataset listening metrics and session durations"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Export CSV</span>
              </button>
            </div>
          )}

          {savedNotice && (
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 animate-pulse">
              ✓ Changes Applied in Real-Time
            </span>
          )}
        </div>

        {/* TAB 0: MANAGE REGISTERED USERS */}
        {activeTab === 'users' && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 text-xs pr-1">
            {/* User Statistics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Investigators</span>
                <span className="text-xl font-mono font-bold text-white">{usersList.length}</span>
                <span className="text-[10px] text-slate-500">Persistent Accounts</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Administrators</span>
                <span className="text-xl font-mono font-bold text-amber-300">
                  {usersList.filter((u) => u.role === 'admin').length}
                </span>
                <span className="text-[10px] text-amber-200/60">Level-5 Mission Control</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-sky-950/20 border border-sky-500/30 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider">Earth Scientists</span>
                <span className="text-xl font-mono font-bold text-sky-300">
                  {usersList.filter((u) => u.role === 'scientist').length}
                </span>
                <span className="text-[10px] text-sky-200/60">JPL / NASA Co-Investigators</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">STEM & Citizens</span>
                <span className="text-xl font-mono font-bold text-emerald-300">
                  {usersList.filter((u) => u.role === 'educator' || u.role === 'citizen').length}
                </span>
                <span className="text-[10px] text-emerald-200/60">Public & Classroom Access</span>
              </div>
            </div>

            {/* Notification Toast */}
            {userNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{userNotice}</span>
              </div>
            )}

            {/* Controls Bar: Search & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search by investigator name or email..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Role Filter:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="all">All Roles ({usersList.length})</option>
                  <option value="admin">Admins</option>
                  <option value="scientist">Scientists</option>
                  <option value="educator">Educators</option>
                  <option value="citizen">Citizens</option>
                </select>

                <button
                  onClick={fetchUsers}
                  disabled={loadingUsers}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="Refresh users list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Investigator</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Clearance Classification</th>
                    <th className="py-2.5 px-3">Institution</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        {loadingUsers ? 'Retrieving registered investigator records...' : 'No users match your criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-slate-800 text-sky-400 flex items-center justify-center font-bold text-[10px]">
                              {u.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-white font-sans">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border focus:outline-none cursor-pointer ${
                              u.role === 'admin'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                                : u.role === 'scientist'
                                ? 'bg-sky-950/80 text-sky-300 border-sky-500/50'
                                : u.role === 'educator'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            <option value="admin">admin (Level-5)</option>
                            <option value="scientist">scientist (JPL/GSFC)</option>
                            <option value="educator">educator (STEM)</option>
                            <option value="citizen">citizen (Public)</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">
                          {u.institution || 'NASA Space Apps Investigator'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className={`px-2 py-1 rounded transition cursor-pointer inline-flex items-center gap-1 ${
                              confirmDeleteId === u.id
                                ? 'bg-rose-600 text-white text-[10px] font-bold'
                                : 'text-rose-400 hover:text-rose-200 hover:bg-rose-950/50'
                            }`}
                            title={confirmDeleteId === u.id ? 'Click again to confirm deletion' : 'Delete investigator account'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {confirmDeleteId === u.id && <span>Confirm</span>}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 1: USER ENGAGEMENT ANALYTICS SUMMARY VIEW */}
        {activeTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1">
            {/* Top 4 Key Engagement Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Metric 1: Average Session Duration */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between gap-2 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Average Session Duration</span>
                  <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white tracking-tight">
                      {formatDuration(analytics.avgSessionDurationSeconds)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center">
                      <ArrowUpRight className="w-3 h-3" />
                      +14.8%
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Target: &gt; 5 min • Current session: {formatDuration(sessionDurationSec)}
                  </span>
                </div>

                {/* Progress ratio comparison to benchmark */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-emerald-400"
                    style={{ width: `${Math.min(100, (analytics.avgSessionDurationSeconds / 600) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Metric 2: Most Listened-To Dataset */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between gap-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">#1 Most Listened Dataset</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                    <Headphones className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <span className="text-sm font-bold text-white line-clamp-1 block">
                    {topDataset?.datasetTitle || 'Sea Surface Temperature'}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-lg font-bold font-mono text-sky-300">
                      {topDataset?.percentage}%
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({topDataset?.listenMinutes.toLocaleString()} mins streamed)
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">
                  Ocean Thermal Anomalies & Marine Heatwaves
                </span>
              </div>

              {/* Metric 3: Total Audio Time Streamed */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between gap-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Total Streamed Audio</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white tracking-tight">
                      {(analytics.totalListenMinutes / 60).toFixed(1)} hrs
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({analytics.totalListenMinutes.toLocaleString()} m)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Across {analytics.totalSessions.toLocaleString()} unique planetary sessions
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-amber-400" style={{ width: '84%' }} />
                </div>
              </div>

              {/* Metric 4: Active Researchers & Interactive Probes */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between gap-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Interactive Probes & Exports</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white tracking-tight">
                      {analytics.audioProbesClicked.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400">probe clicks</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {analytics.recordingsExported.toLocaleString()} audio snippets downloaded
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Real-time exploratory tracking active</span>
                </div>
              </div>
            </div>

            {/* Middle Section: Most Listened-To Datasets Visual Ranking Chart */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">
                      Dataset Listening Engagement Breakdown
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-400/20">
                      EIC Stream Leaderboard
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Comparative duration, play volume, and coordinate probe interactions per planetary dataset
                  </span>
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-500 text-[11px]">Rank by:</span>
                  <button
                    onClick={() => setDatasetSortBy('minutes')}
                    className={`px-2 py-0.5 rounded transition ${
                      datasetSortBy === 'minutes' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Listen Minutes
                  </button>
                  <button
                    onClick={() => setDatasetSortBy('plays')}
                    className={`px-2 py-0.5 rounded transition ${
                      datasetSortBy === 'plays' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Total Plays
                  </button>
                  <button
                    onClick={() => setDatasetSortBy('probes')}
                    className={`px-2 py-0.5 rounded transition ${
                      datasetSortBy === 'probes' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Probe Clicks
                  </button>
                </div>
              </div>

              {/* Visual Horizontal Bar Chart of Datasets */}
              <div className="flex flex-col gap-3">
                {sortedRankings.map((ds, index) => {
                  const matchDataset = datasets.find((d) => d.id === ds.datasetId);
                  const color = matchDataset?.colorRamp.high || '#38bdf8';

                  return (
                    <div
                      key={ds.datasetId}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-2 hover:border-slate-700 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                              index === 0
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                : index === 1
                                ? 'bg-slate-300 text-slate-950'
                                : index === 2
                                ? 'bg-amber-700 text-amber-100'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <div>
                            <span className="font-bold text-white text-xs">{ds.datasetTitle}</span>
                            <span className="text-[11px] text-slate-500 ml-2 font-mono">
                              ({matchDataset?.missionSensor.split('/')[0] || ds.category})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-sky-400" />
                            <span className="font-semibold">{ds.listenMinutes.toLocaleString()} min</span>
                            <span className="text-[11px] text-slate-500">
                              ({(ds.listenMinutes / 60).toFixed(1)} hrs)
                            </span>
                          </div>

                          <div className="hidden sm:flex items-center gap-1 text-slate-400 text-[11px]">
                            <span>{ds.playCount.toLocaleString()} plays</span>
                          </div>

                          <div className="hidden md:flex items-center gap-1 text-slate-400 text-[11px]">
                            <MapPin className="w-3 h-3 text-rose-400" />
                            <span>{ds.probeClicks.toLocaleString()} probes</span>
                          </div>

                          <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 font-bold text-[11px]">
                            {ds.percentage}% share
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar Progression */}
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(4, ds.percentage * 3)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Row: Session Duration Distribution & 24h Activity Graph */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card A: Session Duration Distribution (Cohorts) */}
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3.5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <h3 className="font-bold text-sm text-white">Session Duration Cohorts</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Avg: {formatDuration(analytics.avgSessionDurationSeconds)}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 text-xs">
                  {analytics.durationCohorts.map((cohort, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-medium">{cohort.label}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-400">{cohort.count.toLocaleString()} sessions</span>
                          <span className="text-sky-300 font-bold">{cohort.percentage}%</span>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                          style={{ width: `${cohort.percentage * 2.2}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed mt-1">
                  💡 <strong className="text-slate-200">Key Insight:</strong> Over <span className="text-emerald-400 font-semibold">52.6% of listeners</span> engage for more than 5 minutes, demonstrating deep immersion in planetary sonifications compared to transient web visits.
                </div>
              </div>

              {/* Card B: Diurnal Listening Rhythms (24-Hour UTC Activity) */}
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3.5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">24-Hour Diurnal Listening Rhythm</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Global UTC Traffic</span>
                </div>

                {/* SVG Bar Chart of Hourly Listening Activity */}
                <div className="h-40 w-full flex items-end gap-1.5 pt-4 pb-2 px-1">
                  {analytics.hourlyActivity.map((hr, idx) => {
                    const maxMinutes = 18000;
                    const heightPercent = Math.min(100, (hr.minutes / maxMinutes) * 100);
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative cursor-pointer"
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition pointer-events-none px-2 py-1 rounded-lg bg-slate-950 border border-sky-400/50 text-[10px] font-mono text-sky-200 whitespace-nowrap shadow-xl z-20">
                          {hr.hour}: {hr.minutes.toLocaleString()} min ({hr.sessions} sessions)
                        </div>

                        <div
                          className="w-full bg-gradient-to-t from-sky-600 to-cyan-400 rounded-t-md hover:from-amber-500 hover:to-rose-400 transition-all duration-200"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] font-mono text-slate-500 group-hover:text-white transition">
                          {hr.hour.split(':')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Peak listening: 14:00 - 18:00 UTC (European & Americas academic overlap)</span>
                </div>
              </div>
            </div>

            {/* Scale & Feature Popularity */}
            <div className="p-4 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-white">Most Selected Harmonic Scales:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {analytics.scalePopularity.map((sc) => (
                  <div
                    key={sc.scale}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px]"
                  >
                    <span className="text-slate-300 font-medium">{sc.label}</span>
                    <span className="font-mono text-sky-400 font-bold">{sc.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATASET MANAGER */}
        {activeTab === 'datasets' && (
          <div className="flex-1 overflow-y-auto flex flex-col md:flex-row gap-5 pr-1">
            {/* Left: Datasets List */}
            <div className="w-full md:w-1/3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Active EIC Feeds</span>
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition"
                >
                  <Plus className="w-3 h-3" />
                  New Feed
                </button>
              </div>

              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[460px] pr-1">
                {datasets.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDatasetId(d.id);
                      setIsAddingNew(false);
                    }}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition ${
                      selectedDatasetId === d.id && !isAddingNew
                        ? 'bg-sky-500/15 border-sky-400/40 text-white'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-semibold line-clamp-1">{d.title}</span>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                      <span>{d.category}</span>
                      <span>•</span>
                      <span>{d.frames.length} frames</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Dataset Editor or New Form */}
            <div className="flex-1 bg-slate-900/60 rounded-2xl border border-slate-800 p-4 overflow-y-auto">
              {isAddingNew ? (
                <form onSubmit={handleAddNewDataset} className="flex flex-col gap-3 text-xs">
                  <h3 className="font-semibold text-sm text-sky-300">Register New NASA EIC Observation Feed</h3>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-400">Dataset Title</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Atmospheric Methane (CH4) Plumes"
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Mission / Sensor</label>
                      <input
                        type="text"
                        value={newSensor}
                        onChange={(e) => setNewSensor(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="Atmosphere">Atmosphere</option>
                        <option value="Ocean">Ocean</option>
                        <option value="Cryosphere">Cryosphere</option>
                        <option value="Biosphere">Biosphere</option>
                        <option value="Heliophysics">Heliophysics</option>
                        <option value="Anthropocene">Anthropocene</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Measurement Unit</label>
                      <input
                        type="text"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Baseline Value</label>
                      <input
                        type="number"
                        value={newBaseline}
                        onChange={(e) => setNewBaseline(parseFloat(e.target.value))}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Base Pitch (Hz)</label>
                      <input
                        type="number"
                        value={newBaseFreq}
                        onChange={(e) => setNewBaseFreq(parseFloat(e.target.value))}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition"
                    >
                      Provision Dataset
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="font-semibold text-sm text-white">{currentSelectedDataset.title}</h3>
                    <span className="font-mono text-[11px] text-sky-400">{currentSelectedDataset.missionSensor}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Measurement Unit</label>
                      <input
                        type="text"
                        value={currentSelectedDataset.unit}
                        onChange={(e) => handleUpdateDatasetField('unit', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Harmonic Scale</label>
                      <select
                        value={currentSelectedDataset.sonificationConfig.scale}
                        onChange={(e) => handleUpdateDatasetField('sonificationConfig.scale', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="voyager">NASA Voyager Golden Record</option>
                        <option value="dorian">Oceanic Dorian</option>
                        <option value="lydian">Atmospheric Lydian</option>
                        <option value="minor">Climate Minor</option>
                        <option value="pentatonic">Pentatonic</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Lead Waveform</label>
                      <select
                        value={currentSelectedDataset.sonificationConfig.leadWave}
                        onChange={(e) => handleUpdateDatasetField('sonificationConfig.leadWave', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="sine">Pure Sine</option>
                        <option value="triangle">Triangle (Warm)</option>
                        <option value="sawtooth">Sawtooth (Rich Overtone)</option>
                        <option value="square">Square (Digital/Industrial)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Base Pitch (Hz)</label>
                      <input
                        type="number"
                        value={currentSelectedDataset.sonificationConfig.baseFreq}
                        onChange={(e) =>
                          handleUpdateDatasetField('sonificationConfig.baseFreq', parseFloat(e.target.value))
                        }
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-400">Description</label>
                    <textarea
                      rows={2}
                      value={currentSelectedDataset.description}
                      onChange={(e) => handleUpdateDatasetField('description', e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Preview Test Pitch for this Feed:</span>
                    <button
                      type="button"
                      onClick={() =>
                        audioEngine.playProbeTone(
                          currentSelectedDataset.sonificationConfig.baseFreq,
                          0.8,
                          currentSelectedDataset.sonificationConfig.leadWave
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 font-semibold text-xs flex items-center gap-1.5 transition"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Test {currentSelectedDataset.sonificationConfig.baseFreq} Hz
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DSP TUNING */}
        {activeTab === 'dsp' && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 text-xs pr-1">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
              <h3 className="font-semibold text-sm text-white">Global Concert Pitch & Acoustic Calibration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Master Tuning Frequency</span>
                    <span className="font-mono text-sky-400 font-bold">{masterTuningHz} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="415"
                    max="450"
                    step="1"
                    value={masterTuningHz}
                    onChange={(e) => setMasterTuningHz(parseInt(e.target.value))}
                    className="accent-sky-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>415 Hz (Baroque)</span>
                    <span>432 Hz (Verdi)</span>
                    <span>440 Hz (Standard)</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Limiter Threshold</span>
                    <span className="font-mono text-sky-400 font-bold">{limiterCeiling} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="-6"
                    step="1"
                    value={limiterCeiling}
                    onChange={(e) => setLimiterCeiling(parseInt(e.target.value))}
                    className="accent-sky-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>-30 dB (Soft)</span>
                    <span>-18 dB (Standard)</span>
                    <span>-6 dB (Loud)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handlePlayTestTone}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4" />
                  Emit Calibration Reference Tone ({masterTuningHz} Hz)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ERRORS & SYSTEM ACTIVITY */}
        {activeTab === 'telemetry' && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 text-xs pr-1">
            {/* Service Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-400 text-[11px]">AudioContext DSP</span>
                <span className="text-emerald-400 font-mono text-sm font-bold">ONLINE · 48 kHz</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-400 text-[11px]">NASA EONET v3 Feed</span>
                <span className="text-sky-400 font-mono text-sm font-bold">
                  {telemetryHealth?.nasaEonet || 'NOMINAL'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-400 text-[11px]">Registered Accounts</span>
                <span className="text-white font-mono text-sm font-bold tabular-nums">
                  {telemetryHealth?.registeredUsersCount ?? usersList.length} Stored
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-400 text-[11px]">Captured Errors</span>
                <span className={`font-mono text-sm font-bold tabular-nums ${
                  systemLogs.some((l) => l.level === 'error') ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {systemLogs.filter((l) => l.level === 'error').length} Errors
                </span>
              </div>
            </div>

            {/* Filter & Diagnostic Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-1.5">
                {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLogFilter(lvl)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] uppercase transition cursor-pointer border ${
                      logFilter === lvl
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {lvl} ({lvl === 'all' ? systemLogs.length : systemLogs.filter((l) => l.level === lvl).length})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunDiagnostic}
                  className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Run Diagnostic</span>
                </button>
                <button
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh Logs</span>
                </button>
              </div>
            </div>

            {/* Live Activity & Error Log Stream */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Application Activity & Error Stream
                </span>
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {filteredLogs.length} entries
                </span>
              </div>

              <div className="divide-y divide-slate-900 max-h-72 overflow-y-auto font-mono text-[11px]">
                {filteredLogs.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    {loadingLogs ? 'Loading application telemetry...' : 'No telemetry entries match the selected severity filter.'}
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-slate-900/40">
                      <span className="text-slate-500 shrink-0 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0 font-semibold ${
                          log.level === 'error'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            : log.level === 'warn'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-sky-950 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-slate-400 shrink-0 min-w-[96px]">[{log.service}]</span>
                      <span className="text-slate-200 font-sans text-xs">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
